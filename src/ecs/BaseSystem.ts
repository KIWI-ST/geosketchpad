import type { Scene } from "../scene/Scene";

/**
 * @class BaseSystem
 */
abstract class BaseSystem {
    /**
     * 
     */
    protected scene_: Scene;

    /**
     * 
     */
    constructor(scene: Scene) {
        this.scene_ = scene;
    }

    /**
     * 
     */
    abstract Update(): void;
}

export {
    BaseSystem
}