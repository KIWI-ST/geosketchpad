import type { Camera } from "@pipegpu/camera";
import type { Scene } from "../../scene/Scene";
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
    public override async Update(): Promise<void> {
        const cameraComponents = this.scene_.getComponents('OrbitCameraComponent');
        if (!cameraComponents) {
            return;
        }
        for (const [key, c] of cameraComponents) {
            try {
                const cameraComponent = c as OrbitCameraComponent;
                await cameraComponent.update();

                // check camera, only one camera could be set as 'mainCamera'.
                if (cameraComponent.IsMainCamera) {
                    this.mainCamera_ = cameraComponent.Camrea;
                    this.mainCameraEntity_ = key;
                }
            }
            catch (err) {
                console.error(`[E][CameraSystem][Update] type 'OrbitCameraComponent' update failed, key: ${key}.`);
            }
        }
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