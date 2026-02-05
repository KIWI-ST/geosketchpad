import type { Scene } from "../../Scene";
import { BaseSystem } from "../BaseSystem";
import '../../scene/Scene.Handler.Pan';
import '../../scene/Scene.Handler.Zoom';

/**
 * @class CameraSystem
 * @description
 * need registor event
 */
class CameraSystem extends BaseSystem {
    /**
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);

    }

    Update(): void {
        this.scene_.getComponents('PerspectiveCameraComponent')?.forEach((c, k) => {

        });
    }
}

export {
    CameraSystem
}