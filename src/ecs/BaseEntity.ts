import type { Scene } from "../scene/Scene";

/**
 * @class BaseEntity
 */
class BaseEntity {
    /**
     * 
     */
    private uuid_: string;

    /**
     * @description
     */
    private scene_: Scene;

    /**
     * 
     * @param idx 
     */
    constructor(uuid: string, scene: Scene) {
        this.uuid_ = uuid;
        this.scene_ = scene;
    }

    /**
     * 
     */
    get UUID(): string {
        return this.uuid_;
    }
}

export {
    BaseEntity
}