import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";

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