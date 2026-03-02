import type { Scene } from "../scene/Scene";

/**
 * @class BaseSystem
 * @description
 */
abstract class BaseSystem {
    /**
     * @description
     */
    protected scene_: Scene;

    /**
     * @description
     */
    constructor(scene: Scene) {
        this.scene_ = scene;
    }
}

export {
    BaseSystem
}