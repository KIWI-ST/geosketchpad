import type { Camera } from "@pipegpu/camera";
import type { Scene } from "../../scene/Scene";
import type { BaseComponent } from "../BaseComponent";
import { BaseSystem } from "../BaseSystem";
import type { OrbitCameraComponent } from "../component/OrbitCameraComponent";

/**
 * @class CameraSystem
 * @description
 * need registor event
 */
class CameraSystem extends BaseSystem {
    /**
     * 
     */
    private mainCamera_?: Camera;

    /**
     * 
     */
    private mainCameraEntity_?: string;

    /**
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
    }

    /**
     * @description camera system update.
     */
    public override Update(): void {
        // component update
        this.scene_.getComponents('OrbitCameraComponent')?.forEach((v: BaseComponent, key: string) => {
            // update component.
            const c = v as OrbitCameraComponent;
            c.update();

            // check camera, only one camera could be set as 'mainCamera'.
            if (c.IsMainCamera) {
                this.mainCamera_ = c.Camrea;
                this.mainCameraEntity_ = key;
            }
        });
    }

    /**
     * @description has main camera? skip rendering while missing main camera.
     * @returns 
     */
    hasMainCamera(): boolean {
        return !!this.mainCameraEntity_;
    }

    get MainCamera(): Camera | undefined {
        return this.mainCamera_;
    }

    get ProjectionMatrix() {
        return this.mainCamera_?.ProjectionMatrix;
    }

    get ViewMatrix() {
        return this.mainCamera_?.ViewMatrix;
    }

    get ViewProjectionMatrix() {
        return this.mainCamera_?.ViewProjectionMatrix;
    }
}

export {
    CameraSystem
}