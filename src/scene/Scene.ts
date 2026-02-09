import { isString } from '../util/isString';
import { BaseEntity } from '../ecs/BaseEntity';
import type { BaseComponent, ComponentTYPE } from '../ecs/BaseComponent';

/**
 * @class Scene
 * @description need init with async funciton style.
 * @example
 * const scene = new Scene();
 * await scene.init();
 *
 * @WARNING
 * function should not written in lambda style. for 'this' binding it not runtime bind.
 */
class Scene {
    /**
     * @description scene startup loading hook.
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
     * canvas
     */
    protected canvas_: HTMLCanvasElement;

    /**
     * @description device pixel ratio.
     */
    protected devicePixelRatio_: number;

    /**
     * @description view area width (px)
     */
    protected width_: number;

    /**
     * @description view area height (px)
     */
    protected height_: number;

    /**
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
     * dom元素
     */
    public get Canvas(): HTMLCanvasElement {
        return this.canvas_;
    }

    /**
     * @description width (px) of render view area.
     */
    public get Width(): number {
        return this.width_;
    }

    /**
     * @description height (px) of render view area
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

    public async init() {
        await this.initHooks();
    }

    private initCavnas(): void {
        // const c = this.origin_.center, 
        const r = this.devicePixelRatio_;
        const w = this.width_, h = this.height_, rw = r * w, rh = r * h;
        this.canvas_.width = rw;
        this.canvas_.height = rh;
        this.canvas_.style.width = `${w}px`;
        this.canvas_.style.height = `${h}px`;
        // this.registerCamera(c);
    }

    /**
     * @description
     */
    private async initHooks(): Promise<void> {
        const scene = this as Scene;
        Scene.hooks?.forEach(async hook => {
            const { func, args = [] } = hook;
            await func.apply(scene, [scene, ...args]);
        });
    }

    /**
     * @returns 
     */
    private getUUID() {
        return `${this.entityIDX_++}`;
    }

    /**
     * @param EntityConstructor 
     * @returns 
     */
    public createEntity<T extends BaseEntity>(EntityConstructor: new (uuid: string) => T = BaseEntity as unknown as new (uuid: string) => T): T {
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

    /**
     * @param t 
     * @returns 
     */
    public getComponents(t: ComponentTYPE): Map<string, BaseComponent> | undefined {
        return this.componentMap_.get(t);
    }
}

export {
    Scene
}