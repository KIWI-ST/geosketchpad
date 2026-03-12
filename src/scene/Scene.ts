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
     * WARNING, forEach runs 'await' error. 
     * @description
     */
    private async initHooks(): Promise<void> {
        if (Scene.hooks) {
            const scene = this as Scene;
            for (const hook of Scene.hooks) {
                const { func, args = [] } = hook;
                await func.apply(scene, [scene, ...args]);
            }
        }
    }

    /**
     * @param EntityConstructor 
     * @returns 
     */
    public createEntity<T extends BaseEntity>(EntityConstructor: new () => T = BaseEntity as unknown as new () => T): T {
        const entity = new EntityConstructor();
        if (!(entity instanceof BaseEntity)) {
            throw new Error(`[E][createEntity] create entity error. constructor is not child of 'BaseEntity'.`);
        }
        this.entities_.push(entity);
        return entity;
    }

    /**
     * @param {string} uuid uuid of entity 
     * @param {T} c, instance of component 
     */
    public setComponent<T extends BaseComponent>(entity: BaseEntity, c: T): void {
        // check if exists entity.
        if (!this.entities_.some(existEntity => existEntity.UUID === entity.UUID)) {
            throw new Error(`[E][Scene][addComponent] invalid instance.`);
        }
        // mapping of entity UUID - BaseComponent.
        const t: ComponentTYPE = c.TYPE;
        const map = this.componentMap_.get(t);
        const uuid = c.UUID;
        // remove pre entity bind.
        if (map && uuid && map.has(uuid)) {
            map.delete(uuid);
        }
        // component map.
        if (!map || (map && !map.has(t))) {
            this.componentMap_.set(t, new Map());
        }
        // bind entity with component.
        this.componentMap_.get(t)?.set(entity.UUID, c);
    }

    /**
     * @param t 
     * @returns {BaseComponent[]|undefined} 
     */
    public getComponents(t: ComponentTYPE): Map<string, BaseComponent> | undefined {
        return this.componentMap_.get(t);
    }

    /**
     * 
     * @param uuid 
     * @param t 
     * @returns 
     */
    public findComponents(uuid: string, t: ComponentTYPE): BaseComponent | undefined {
        const components = this.getComponents(t);
        if (components && components.has(uuid)) {
            return components.get(uuid);
        }
        else {
            return undefined;
        }
    }
}

export {
    Scene
}