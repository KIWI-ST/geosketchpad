/**
 * renderer in off-screen
 * 离屏渲染
 * 1. 为Sketchpad准备，所有绘制到sketchpad的对象均由离屏渲染完成
 * 2. 为webworker准备，在webworer里使用离屏渲染绘制纹理，将结果传递到主线程贴图
 */
import type { IRenderer } from "./IRenderer";

/**
 * off-screen renderer
 */
interface IRendererOS<T> extends IRenderer {
    /** 
     * 渲染前准备（一般是将原始数据处理成primitives) 
     */
    prepare?(arg: T): void;

    /**
     * 地理要素排序
     * @param args 
     */
    sort?<T0>(arg: T0): void;

    /*** 
     * 离屏渲染结果 
     */
    getCanvasImage?(): ImageBitmap;
}

export {
    type IRendererOS
}