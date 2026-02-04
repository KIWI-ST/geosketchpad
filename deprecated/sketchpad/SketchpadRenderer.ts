import { Earth } from "../Earth";

import { IRendererOS } from "../render/IRendererOS";
import { PerspectiveCamera } from "../camera/PerspectiveCamera";
import { Sketchpad, TSketchpadDataSchema } from "./Sektchpad";


/**
 * renderer implemention
 */
class SketchpadRenderer<T extends TSketchpadDataSchema> implements IRendererOS<T> {

    /**
     * 
     */
    protected skpd: Sketchpad<T>;

    /**
     * 
     */
    protected ctx3d: PipeGL;

    /**
     * 
     */
    protected g: Earth;

    /**
     * 
     * @param skpd 
     * @param ctx3d 
     */
    constructor(skpd: Sketchpad<T>, ctx3d: PipeGL) {
        this.skpd = skpd;
        this.ctx3d = ctx3d;
        this.g = skpd.Globe;
    }

    /**
     * 
     * @param arg 
     */
    public prepare?(arg: T): void {
        throw new Error("Method not implemented.");
    }

    /**
     * 
     * @param arg 
     */
    public sort?<T0>(arg: T0): void {
        throw new Error("Method not implemented.");
    }

    /**
     * 
     */
    public getCanvasImage?(): ImageBitmap {
        throw new Error("Method not implemented.");
    }

    /**
     * 渲染
     * @param framestamp 
     * @param camera 
     */
    public render(framestamp: number, camera: PerspectiveCamera): void {
        throw new Error("Method not implemented.");
    }

}

//注册渲染方法
Sketchpad.registerRenderer(Sketchpad.name, SketchpadRenderer);

export { SketchpadRenderer }
