
import { EventEmitter } from '@pipegpu/camera';
import { WebMercatorProjection, type Ellipsoid, type GeodeticCoordinate, type Projection } from '@pipegpu/geography';

import { isString } from '../core/isString';
import type { IRenderer } from '../render/IRenderer';
import type { Sketchpad, TSketchpadDataSchema } from '../sketchpad/Sektchpad';

/**
 * @class Globe
 * @description need init with async funciton style.
 * @example
 * const g = new Globe();
 * await g.init();
 */
class Globe extends EventEmitter {
    /**
    * Global启动时执行的钩子
    */
    public static hooks: { func: Function, args: any[] }[] = [];

    /**
     * @param func 
     * @param args 
     */
    static registerHook(func: Function, ...args: any[]) {
        Globe.hooks.push({ func, args });
    }

    /**
     * 初始化地图对象参数
     */
    protected origin: {
        center: GeodeticCoordinate,
        zoom: number,
        zoomMin: number,
        zoomMax: number
    }

    /**
     * canvas
     */
    protected canvas: HTMLCanvasElement;

    /**
     * 设备ppi比率
     */
    protected devicePixelRatio: number;

    /**
     * 当前参考椭球
     */
    protected ellipsoid: Ellipsoid;

    /**
     * 当前地图投影
     */
    protected prjection: Projection;

    /**
     * 显示区域像素宽度
     */
    protected width: number;

    /**
     * 显示区域像素高度
     */
    protected height: number;

    /**
     * Globe总渲染器，调度入口
     */
    protected renderer?: IRenderer;

    /**
     * 装载到场景的可渲染对象集合
     */
    private sketchpads: Sketchpad<TSketchpadDataSchema>[] = [];

    /**
     * 初始化地图信息快照
     */
    public get Origin() {
        return this.origin;
    }

    /**
     * dom元素
     */
    public get Canvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * 获取投影的参考椭球
     */
    public get Ellipsoid(): Ellipsoid {
        return this.ellipsoid;
    }

    /**
     * 最长半径（椭球最长轴）
     */
    public get MaximumRadius(): number {
        return this.ellipsoid.MaximumRadius;
    }

    /**
     * 地图当前缩放层级
     */
    public get Zoom(): number {
        return this._state_quadtree_.level;
    }

    /**
     * 
     */
    public get Width(): number {
        return this.width;
    }

    /**
     * 
     */
    public get Height(): number {
        return this.height;
    }

    public get DevicePixelRatio(): number {
        return this.devicePixelRatio;
    }

    /**
     * 
     */
    public get Sketchpads(): Sketchpad<TSketchpadDataSchema>[] {
        return this.sketchpads;
    }

    /**
    * @param opts 
    */
    constructor(
        opts: {
            width: number,
            height: number,
            coordinate: GeodeticCoordinate,
            canvas: string | HTMLCanvasElement,
            zoom: number,
            zoomMax?: number,
            zoomMin?: number,
            zoomable?: boolean,
            panable?: boolean,
            devicePixelRatio?: number,
        }
    ) {
        super();
        this.canvas = (isString(opts.canvas) ? document.getElementById(opts.canvas as string) : opts.canvas) as HTMLCanvasElement;
        this.devicePixelRatio = opts.devicePixelRatio || 1.0;
        this.width = opts.width;
        this.height = opts.height;
        this.prjection = new WebMercatorProjection();
        this.ellipsoid = this.prjection.Ellipsoid;
        this.origin = {
            center: opts.coordinate.toGeodetic(),
            zoom: opts.zoom,
            zoomMax: opts.zoomMax || 20,
            zoomMin: opts.zoomMin || 0
        };
    }

    public init = async () => {
        this.initCavnasAndCamera();
        this.initHooks();
        // 辅助功能，待设计开启关闭
        // this.initAuxTools();
    }

    private initCavnasAndCamera = (): void => {
        const c = this.origin.center, r = this.devicePixelRatio;
        const w = this.width, h = this.height, rw = r * w, rh = r * h;
        this.canvas.width = rw;
        this.canvas.height = rh;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.registerCamera(c);
    }

    private initHooks = (): void => {
        Globe.hooks?.forEach(hook => {
            const { func, args } = hook;
            func.apply(this, args);
        });
    }

    private initAuxTools = (): void => {
        // this.EnableCursorAuxTool();
    }

    /**
     * 添加图层到地球场景进行渲染
     * @param skpd 
     */
    public add = <T extends TSketchpadDataSchema>(skpd: Sketchpad<T>) => {
        this.sketchpads.push(skpd);
        skpd.attach(this);
        this.updateQuadtreeTileByDistanceError();
    }
}

export { Globe }