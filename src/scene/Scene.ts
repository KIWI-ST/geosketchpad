
import { isString } from '../util/isString';
import { BaseEntity } from '../ecs/BaseEntity';
import type { BaseComponent, ComponentTYPE } from '../ecs/BaseComponent';

// import type { IRenderer } from './render/IRenderer';
// import type { Sketchpad, TSketchpadDataSchema } from './Sektchpad';

/**
 * @class Scene
 * @description need init with async funciton style.
 * @example
 * const scene = new Scene();
 * await scene.init();
 */
class Scene {
    /**
    *  scene startup loading hook.
    */
    public static hooks: { func: (scene: Scene, ...args: any[]) => Promise<void>; args: any[] }[] = [];

    /**
     * @param func 
     * @param args 
     */
    public static registerHook(func: (scene: Scene, ...args: any[]) => Promise<void>, ...args: any[]) {
        Scene.hooks.push({ func, args });
    }

    /**
     * index of entity
     */
    private entityIDX_: number = 0;

    /**
     * 初始化地图对象参数
     */
    // protected origin_: {
    //     center: GeodeticCoordinate,
    //     zoom: number,
    //     zoomMin: number,
    //     zoomMax: number
    // }

    /**
     * canvas
     */
    protected canvas_: HTMLCanvasElement;

    /**
     * 设备ppi比率
     */
    protected devicePixelRatio_: number;

    /**
     * 当前参考椭球
     */
    // protected ellipsoid_: Ellipsoid;

    /**
     * 当前地图投影
     */
    // protected prjection_: Projection;

    /**
     * 显示区域像素宽度
     */
    protected width_: number;

    /**
     * 显示区域像素高度
     */
    protected height_: number;

    /**
     * 装载到场景的可渲染对象集合
     * @todo ecs entities
     */
    private entities_: BaseEntity[] = [];

    /**
     * @description all components maintenance
     * key: component type.
     * value: Map
     * - key: uuid of entity
     * - value: instance of component
     * e.g:
     * <'MeshComponent', <001, new MeshComponent()>>
     */
    private componentMap_: Map<ComponentTYPE, Map<string, BaseComponent>> = new Map();

    /**
     * 初始化地图信息快照
     */
    // public get Origin() {
    //     return this.origin_;
    // }

    /**
     * dom元素
     */
    public get Canvas(): HTMLCanvasElement {
        return this.canvas_;
    }

    /**
     * 获取投影的参考椭球
     */
    // public get Ellipsoid(): Ellipsoid {
    //     return this.ellipsoid_;
    // }

    /**
     * 最长半径（椭球最长轴）
     */
    // public get MaximumRadius(): number {
    //     return this.ellipsoid_.MaximumRadius;
    // }

    /**
     * 地图当前缩放层级
     */
    // public get Zoom(): number {
    //     return this._state_quadtree_.level;
    // }

    /**
     * 
     */
    public get Width(): number {
        return this.width_;
    }

    /**
     * 
     */
    public get Height(): number {
        return this.height_;
    }

    public get DevicePixelRatio(): number {
        return this.devicePixelRatio_;
    }

    /**
     * @description all eneities
     */
    public get Entites(): ReadonlyArray<BaseEntity> {
        return this.entities_;
    }

    /**
    * @param opts 
    */
    constructor(
        opts: {
            width: number,
            height: number,
            // coordinate: GeodeticCoordinate,
            canvas: string | HTMLCanvasElement,
            // zoom: number,
            // zoomMax?: number,
            zoomMin?: number,
            // zoomable?: boolean,
            // panable?: boolean,
            devicePixelRatio?: number,
        }
    ) {
        this.canvas_ = (isString(opts.canvas) ? document.getElementById(opts.canvas as string) : opts.canvas) as HTMLCanvasElement;
        this.devicePixelRatio_ = opts.devicePixelRatio || devicePixelRatio || 1.0;
        this.width_ = opts.width;
        this.height_ = opts.height;
        this.initCavnas();
        // this.prjection_ = new WebMercatorProjection();
        // this.ellipsoid_ = this.prjection_.Ellipsoid;
        // this.origin_ = {
        // center: opts.coordinate.toGeodetic(),
        // zoom: opts.zoom,
        // zoomMax: opts.zoomMax || 20,
        // zoomMin: opts.zoomMin || 0
        // };
    }

    public init = async () => {
        await this.initHooks();
    }

    private initCavnas = (): void => {
        // const c = this.origin_.center, 
        const r = this.devicePixelRatio_;
        const w = this.width_, h = this.height_, rw = r * w, rh = r * h;
        this.canvas_.width = rw;
        this.canvas_.height = rh;
        this.canvas_.style.width = `${w}px`;
        this.canvas_.style.height = `${h}px`;
        // this.registerCamera(c);
    }

    private initHooks = async (): Promise<void> => {
        const scene = this as Scene;
        Scene.hooks?.forEach(async hook => {
            const { func, args = [] } = hook;
            await func.apply(scene, [scene, ...args]);
        });
    }

    private getUUID() {
        return `${this.entityIDX_++}`;
    }

    /**
     * @param EntityConstructor 
     * @returns 
     */
    public createEntity = <T extends BaseEntity>(
        EntityConstructor: new (uuid: string) => T = BaseEntity as unknown as new (uuid: string) => T
    ): T => {
        const uuid: string = this.getUUID();
        const entity = new EntityConstructor(uuid);
        if (!(entity instanceof BaseEntity)) {
            throw new Error(`[E][createEntity] create entity error. constructor is not child of 'BaseEntity'.`);
        }
        if (!this.entities_.some(existEntity => existEntity.UUID === uuid)) {
            this.entities_.push(entity);
        } else {
            console.warn(`[W][createEntity] eneity uuid: ${uuid} already exists. duplicate addition is unnecessary.`);
        }
        return entity;
    }

    /**
     * 
     * @param {string} uuid uuid of entity 
     * @param {T} c, instance of component 
     */
    public addComponent<T extends BaseComponent>(uuid: string, c: T): void {
        if (!this.entities_.some(existEntity => existEntity.UUID === uuid)) {
            throw new Error(`[E][Scene][addComponent] invalid instance.`);
        }
        if (!this.componentMap_.has(c.TYPE)) {
            this.componentMap_.set(c.TYPE, new Map());
        }
        this.componentMap_.get(c.TYPE)!.set(uuid, c);
    }

    public getComponents = (t: ComponentTYPE): Map<string, BaseComponent> | undefined => {
        return this.componentMap_.get(t);
    }
}

export {
    Scene
}