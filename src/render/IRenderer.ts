import type { PerspectiveCamera } from "@pipegpu/camera";


/**
 * - Globe
 * - Sketchpad
 */
interface IRenderer {
    /** 
     * 执行一次渲染
     */
    render(framestamp: number, camera: PerspectiveCamera): void;
}

export {
    type IRenderer
}
