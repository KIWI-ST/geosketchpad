// 定义泛型约束：动画目标对象必须是「键值为数值」的对象
type AnimatableTarget = Record<string, number>;

// 定义缓动函数类型：接收 0~1 的进度值，返回 0~1 的插值结果
type EasingFunction = (progress: number) => number;

// 定义回调函数类型
type TweenStartCallback = (target: AnimatableTarget) => void;
type TweenUpdateCallback = (target: AnimatableTarget) => void;
type TweenCompleteCallback = (target: AnimatableTarget) => void;

// animation cache：明确 Map 的键值类型，替代原有的任意 Function
const TweenCache: Map<number, (framestamp: number) => void> = new Map();

/**
 * 补间计算方法：明确缓动函数返回类型，约束输入参数为 0~1
 */
const Easing = {
    /** 线性插值 */
    Linear: {
        None: (k: number): number => {
            // 边界值校验：确保 k 始终在 0~1 范围内
            const clampedK = Math.max(0, Math.min(1, k));
            return clampedK;
        }
    },

    /** 二次方程插值 */
    Quadratic: {
        In: (k: number): number => {
            const clampedK = Math.max(0, Math.min(1, k));
            return clampedK * clampedK;
        },
        Out: (k: number): number => {
            const clampedK = Math.max(0, Math.min(1, k));
            return clampedK * (2 - clampedK);
        },
        InOut: (k: number): number => {
            const clampedK = Math.max(0, Math.min(1, k));
            let t = clampedK * 2;
            if (t < 1) return 0.5 * t * t;
            t--;
            return -0.5 * (t * (t - 2) - 1);
        }
    }
};

/**
 * 补间动画类：泛型 T 约束动画目标对象（必须是可动画的数值对象）
 * @example
 * const coord0: { x: number; y: number } = { x: 0, y: 0 };
 * const coord1: { x: number; y: number } = { x: 100, y: 100 };
 * const tween = new Tween(coord0).to(coord1).updateHandler(() => {}).start();
 * 
 * import { Tween, Easing } from './tween';
 * 定义动画目标对象（具备完整类型提示）
 * const coord: { x: number; y: number } = { x: 0, y: 0 };
 * 
 * // 构造动画（链式调用更简洁，类型校验严格）
 * const tween = new Tween(coord)
 * .to({ x: 100, y: 200 }) // 仅允许 x、y 两个数值属性，非法属性会报错
 * .easing(Easing.Quadratic.InOut)
 * .setDuration(1000) // 传入负数会给出警告
 * .onStart((target) => {
 *   console.log('动画开始', target);
 * })
 * .onUpdate((target) => {
 *   console.log('动画更新', target.x, target.y);
 * })
 * .onComplete((target) => {
 *   console.log('动画完成', target);
 * });
 * 
 * // 启动动画
 * tween.start();
 */
class Tween<T extends AnimatableTarget> {
    /** 动画唯一ID自增器 */
    private static idx = 0;

    /** 动画缓存：存储当前运行中的动画实例，键为动画ID，值为 Tween 实例 */
    private static tweens: Record<number, Tween<AnimatableTarget>> = {};

    /** 动画唯一ID */
    private readonly id: number;

    /** 动画目标对象（要修改属性的对象） */
    private readonly objective: T;

    /** 动画开始回调 */
    private onStartCallback?: TweenStartCallback;

    /** 动画完成回调 */
    private onCompleteCallback?: TweenCompleteCallback;

    /** 动画更新回调 */
    private onUpdateCallback?: TweenUpdateCallback;

    /** 开始回调是否已触发 */
    private onStartCallbackFired = false;

    /** 缓动函数 */
    private easingFunction: EasingFunction = Easing.Quadratic.In;

    /** 动画属性起始值 */
    private valuesStart: Partial<T> = {};

    /** 动画属性结束值 */
    private valuesEnd: Partial<T> = {};

    /** 动画开始时间戳 */
    private startTime?: number;

    /** 动画是否正在播放 */
    private isPlaying = false;

    /** 动画持续时间（毫秒） */
    private duration = 600;

    /**
     * 构造函数：初始化动画目标对象
     * @param objective 动画目标对象（键值均为数值）
     */
    constructor(objective: T) {
        // 校验目标对象是否合法
        if (typeof objective !== 'object' || objective === null) {
            throw new Error('Tween 构造函数必须传入一个非空的数值对象');
        }

        this.id = Tween.idx++;
        this.objective = objective;
    }

    /**
     * 获取动画唯一ID
     */
    public get ID(): number {
        return this.id;
    }

    /**
     * 启动动画
     * @returns 动画是否启动成功（已在播放则返回 false）
     */
    public start(): boolean {
        if (this.isPlaying) {
            console.warn(`Tween [${this.id}] 已在播放中，无法重复启动`);
            return false;
        }

        // 缓存动画实例
        Tween.add(this as Tween<AnimatableTarget>);
        this.isPlaying = true;
        this.onStartCallbackFired = false;

        // 初始化属性起始值（基于目标对象当前值和结束值）
        this.initValuesStart();

        // 注册动画更新函数到缓存
        TweenCache.set(this.id, (framestamp: number) => this.update(framestamp));
        return true;
    }

    /**
     * 停止动画（强制终止，不触发完成回调）
     */
    public stop(): void {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        TweenCache.delete(this.id);
        delete Tween.tweens[this.id];
    }

    /**
     * 初始化动画属性起始值
     */
    private initValuesStart(): void {
        for (const [property, endValue] of Object.entries(this.valuesEnd)) {
            // 跳过目标对象中不存在的属性
            if (!this.objective.hasOwnProperty(property)) {
                continue;
            }
            const targetValue = this.objective[property as keyof T];
            // 确保起始值为数值类型
            this.valuesStart[property as keyof T] = (typeof targetValue === 'number' ? targetValue : 0) as T[keyof T];
            // 处理结束值为「相对数值」的情况（如 "+100"、"-50"）
            this.valuesEnd[property as keyof T] = this.parseRelativeValue(
                property as keyof T,
                endValue
            ) as Partial<T>[keyof T];
        }
    }

    /**
     * 解析相对数值（处理 "+xxx"、"-xxx" 格式）
     * @param property 属性名
     * @param value 待解析的值
     * @returns 解析后的绝对数值
     */
    private parseRelativeValue(property: keyof T, value: unknown): number {
        const startValue = this.valuesStart[property] ?? 0;
        if (typeof value === 'string') {
            if (value.startsWith('+') || value.startsWith('-')) {
                return startValue + parseFloat(value);
            }
            return parseFloat(value) || startValue;
        }
        return typeof value === 'number' ? value : startValue;
    }

    /**
     * 动画更新核心逻辑（每帧调用）
     * @param framestamp 当前时间戳
     */
    private update(framestamp: number): void {
        if (!this.isPlaying) return;

        // 初始化动画开始时间
        this.startTime = this.startTime ?? framestamp;
        if (framestamp < this.startTime) return;

        // 触发开始回调（仅触发一次）
        this.triggerStartCallback();

        // 计算动画进度（0~1）
        const elapsed = this.calculateElapsedProgress(framestamp);
        const easedProgress = this.easingFunction(elapsed);

        // 更新目标对象属性值
        this.updateTargetProperties(easedProgress);

        // 触发更新回调
        this.triggerUpdateCallback();

        // 处理动画结束
        if (elapsed === 1) {
            this.handleAnimationComplete();
        }
    }

    /**
     * 计算动画已完成进度（0~1）
     * @param framestamp 当前时间戳
     * @returns 进度值（0~1）
     */
    private calculateElapsedProgress(framestamp: number): number {
        const passedTime = framestamp - this.startTime!;
        return Math.min(1, passedTime / this.duration);
    }

    /**
     * 更新目标对象的属性值
     * @param progress 缓动处理后的进度值（0~1）
     */
    private updateTargetProperties(progress: number): void {
        for (const [property, endValue] of Object.entries(this.valuesEnd)) {
            const key = property as keyof T;
            const startValue = this.valuesStart[key] ?? 0;
            const finalEndValue = typeof endValue === 'number' ? endValue : startValue;

            // 仅更新数值类型属性
            if (typeof startValue === 'number' && typeof finalEndValue === 'number') {
                this.objective[key] = startValue + (finalEndValue - startValue) * progress as T[keyof T];
            }
        }
    }

    /**
     * 触发动画开始回调
     */
    private triggerStartCallback(): void {
        if (!this.onStartCallbackFired && this.onStartCallback) {
            try {
                this.onStartCallback(this.objective);
            } catch (e) {
                console.error(`Tween [${this.id}] 开始回调执行失败:`, e);
            }
            this.onStartCallbackFired = true;
        }
    }

    /**
     * 触发动画更新回调
     */
    private triggerUpdateCallback(): void {
        if (this.onUpdateCallback) {
            try {
                this.onUpdateCallback(this.objective);
            } catch (e) {
                console.error(`Tween [${this.id}] 更新回调执行失败:`, e);
            }
        }
    }

    /**
     * 处理动画完成逻辑
     */
    private handleAnimationComplete(): void {
        this.isPlaying = false;

        // 触发完成回调
        if (this.onCompleteCallback) {
            try {
                this.onCompleteCallback(this.objective);
            } catch (e) {
                console.error(`Tween [${this.id}] 完成回调执行失败:`, e);
            }
        }

        // 清理缓存
        TweenCache.delete(this.id);
        delete Tween.tweens[this.id];
    }

    /**
     * 设置动画起始属性值
     * @param properties 起始属性键值对
     * @returns Tween 实例（链式调用）
     */
    public from(properties: Partial<T>): this {
        this.valuesStart = { ...properties };
        // 合并起始属性到目标对象（保持原有逻辑）
        Object.assign(this.objective, this.valuesStart);
        return this;
    }

    /**
     * 设置动画结束属性值
     * @param properties 结束属性键值对
     * @returns Tween 实例（链式调用）
     */
    public to(properties: Partial<T>): this {
        this.valuesEnd = { ...properties };
        return this;
    }

    /**
     * 设置动画开始回调
     * @param cb 开始回调函数
     * @returns Tween 实例（链式调用）
     */
    public onStart(cb: TweenStartCallback): this {
        if (typeof cb !== 'function') {
            console.warn('Tween onStart 必须传入一个函数');
            return this;
        }
        this.onStartCallback = cb;
        return this;
    }

    /**
     * 设置动画完成回调
     * @param cb 完成回调函数
     * @returns Tween 实例（链式调用）
     */
    public onComplete(cb: TweenCompleteCallback): this {
        if (typeof cb !== 'function') {
            console.warn('Tween onComplete 必须传入一个函数');
            return this;
        }
        this.onCompleteCallback = cb;
        return this;
    }

    /**
     * 设置动画更新回调
     * @param cb 更新回调函数
     * @returns Tween 实例（链式调用）
     */
    public onUpdate(cb: TweenUpdateCallback): this {
        if (typeof cb !== 'function') {
            console.warn('Tween onUpdate 必须传入一个函数');
            return this;
        }
        this.onUpdateCallback = cb;
        return this;
    }

    /**
     * 设置缓动函数
     * @param fn 缓动函数
     * @returns Tween 实例（链式调用）
     */
    public easing(fn: EasingFunction): this {
        if (typeof fn !== 'function') {
            console.warn('Tween easing 必须传入一个缓动函数');
            return this;
        }
        this.easingFunction = fn;
        return this;
    }

    /**
     * 设置动画持续时间
     * @param ms 持续时间（毫秒，必须大于 0）
     * @returns Tween 实例（链式调用）
     */
    public setDuration(ms: number): this {
        if (typeof ms !== 'number' || ms <= 0) {
            console.warn('Tween 持续时间必须是大于 0 的数值');
            return this;
        }
        this.duration = ms;
        return this;
    }

    /**
     * 静态方法：添加动画实例到缓存
     * @param tween Tween 实例
     */
    private static add(tween: Tween<AnimatableTarget>): void {
        Tween.tweens[tween.ID] = tween;
    }
}

export {
    TweenCache,
    Easing,
    Tween
};

export {
    type AnimatableTarget,
    type EasingFunction
};