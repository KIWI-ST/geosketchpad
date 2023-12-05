import { merge } from "../util/merge";

//animation cache
const TweenCache: Map<number, Function> = new Map();

/**
 * 补间计算方法
 */
const Easing = {
    /**
     * 线性插值
     */
    Linear: {
        None: (k: number): number => {
            return k;
        }
    },

    /**
     * 二次方程插值
     */
    Quadratic: {
        In: (k: number): number => {
            return k * k;
        },
        Out: (k: number): number => {
            return k * (2 - k);
        },
        InOut: (k: number): number => {
            if ((k *= 2) < 1) return 0.5 * k * k;
            return -0.5 * (--k * (k - 2) - 1);
        }
    }
};

/**
 * @example
 * const coord0 = {x:0, y:0};
 * const coord1 = {x:100, y:100};
 * //构造动画
 * const tween = new Tween(coord0).fixEnd(coord1).fixUpdate(()=>{});
 * //执行
 * tween.start();
 */
class Tween {

    /**
     * 动画id
     */
    private static idx = 0;

    /**
     * 动画缓存
     */
    private static tweens = {};

    /**
     * 记录动画
     * @param tween 
     */
    private static add = (tween: Tween) => {
        Tween.tweens[tween.ID] = tween;
    }

    public get ID(): number {
        return this.id;
    }

    private id: number;

    private objective: object;

    private onStartCallback: Function;

    private onCompleteCallback: Function;

    private onUpdateCallback: Function;

    private onStartCallbackFired: boolean;

    private easingFunction: Function;

    private valuesStart: object;

    private valuesEnd: object;

    private startTime: number;

    private isPlaying: boolean;

    private dura: number;

    constructor() {
        this.id = Tween.idx++;
        this.dura = 600;
        this.onStartCallbackFired = false;
        this.isPlaying = false;
        this.easingFunction = Easing.Quadratic.In;
        this.objective = {};
    }

    public start = () => {
        if (this.isPlaying) return true;
        Tween.add(this);
        this.isPlaying = true;
        this.onStartCallbackFired = false;
        for (const property in this.valuesEnd) {
            // Check if an Array was provided as property value
            if (this.valuesEnd[property] instanceof Array) {
                if (this.valuesEnd[property].length === 0) continue;
                // Create a local copy of the Array with the start value at the front 
                this.valuesEnd[property] = [this.objective[property]].concat(this.valuesEnd[property]);
            }
            // If `to()` specifies a property that doesn't exist in the source object, we should not set that property in the object
            if (this.objective[property] === undefined) continue;
            // Save the starting value.
            this.valuesStart[property] = this.objective[property];
            // Ensures we're using numbers, not strings
            if ((this.valuesStart[property] instanceof Array) === false) this.valuesStart[property] *= 1.0;
        }
        //animation loop
        TweenCache.set(this.ID, (framestamp: number) => { this.update(framestamp); });
    }

    private update = (framestamp: number) => {
        this.startTime = this.startTime || framestamp;
        if (framestamp < this.startTime) return true;
        //开始事件触发
        if (this.onStartCallbackFired === false) {
            if (this.onStartCallback !== null && this.onStartCallback !== undefined)
                this.onStartCallback.call(this, this.objective);
            this.onStartCallbackFired = true;
        }
        //计算当前时间
        const pssedTime = (framestamp - this.startTime) / this.dura;
        const elapsed = pssedTime > 1 ? 1 : pssedTime;
        const value = this.easingFunction(elapsed);
        //更新属性值
        for (const property in this.valuesEnd) {
            // Don't update properties that do not exist in the source object
            if (this.valuesStart[property] === undefined) continue;
            const start = this.valuesStart[property] || 0;
            let end = this.valuesEnd[property];
            const typeName = typeof (end);
            if (typeName === 'string') {
                if (end.charAt(0) === '+' || end.charAt(0) === '-') {
                    end = start + parseFloat(end);
                } else {
                    end = parseFloat(end);
                }
            } else if (typeName === 'number') {
                this.objective[property] = start + (end - start) * value;
            }
        }
        //返回当前时间状态（比例）
        if (this.onUpdateCallback !== null)
            this.onUpdateCallback(this.objective);
        //结束状态
        if (elapsed === 1) {
            if (this.onCompleteCallback !== null)
                this.onCompleteCallback.call(this.objective);
            delete TweenCache[this.id];
        }
        //结束前更新
        else TweenCache.set(this.ID, (framestamp: number) => { this.update(framestamp); });
    }

    public from = (properties: object): Tween => {
        this.valuesStart = properties;
        merge(this.objective, properties);
        return this;
    }

    public to = (properties: object): Tween => {
        this.valuesEnd = properties;
        return this;
    }

    public fixStart = (cb: Function): Tween => {
        this.onStartCallback = cb;
        return this;
    }

    public completeHandler = (cb: Function): Tween => {
        this.onCompleteCallback = cb;
        return this;
    }

    public updateHandler = (cb: Function): Tween => {
        this.onUpdateCallback = cb;
        return this;
    }

    public easingHandler = (fn: Function): Tween => {
        this.easingFunction = fn;
        return this;
    }

    /**
     * 
     * @param dura 
     * @returns 
     */
    public duration = (dura:number):Tween =>{
        this.dura = dura;
        return this;
    }
}

export {
    TweenCache,
    Easing,
    Tween
}
