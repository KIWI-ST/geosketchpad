import { Globe } from "../globe/Globe";
import { IRendererOS } from "../render/IRendererOS";
import { Renderable } from "../render/Renderable";

interface TSketchpadDataSchema {

}

/**
 * https://github.com/pixijs/pixi.js/blob/dev/packages/display/src/Container.ts
 * 
 * 绘图板作为渲染容器，汇聚各个加入到了Globe中的对象
 * 作为地理可视化库，
 * -有且仅支持解析地理矢量要素对象
 * -所有待绘制的对象都是一个Sketchpad的子集
 * 
 * const g = new Globe();
 * const skpd = new Sketchpad();
 * g.add(skpd);
 * 
 */
class Sketchpad<T extends TSketchpadDataSchema> extends Renderable {

    /** 
     * globe 
     */
    protected g: Globe;

    /**
     * 离屏渲染对象 
     */
    private renderer: IRendererOS<T>;

    /**
     * globe object 
     */
    public get Globe() {
        return this.g;
    }

    /**
     * geo-sketchpad offscreen-rendering
     */
    constructor() {
        super();
    }

    protected registerData?(): void;

    /** 
     * Sketchpad 总事件注册，其他扩展Sketchpad的同类时间不再另外处理 
     */
    protected registerEvents?(): void;

    /*
     * 注销事件 
     */
    protected removeEvents?(): void;

    /**
     * 构造渲染对象
     * @example sptachpad.attach(globe);
     * @param globe 
     */
    public attach(globe: Globe): void {
        this.g = globe;
        const clazz = this.getRegisterRender(this.constructor.name);
        this.renderer = new clazz(this, globe.getContext3D()) as IRendererOS<T>;
        this.registerData?.call(this);
        this.registerEvents?.call(this);
    }

    /** 
     * 渲染器 
     */
    public get Renderer(): IRendererOS<T> {
        return this.renderer;
    }

}

export {
    type TSketchpadDataSchema,
    Sketchpad
}