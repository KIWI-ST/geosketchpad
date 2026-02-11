import { CameraSystem } from "../ecs/system/CameraSystem";
import { MeshSystem } from "../ecs/system/MeshSystem";
import { RenderSystem } from "../ecs/system/RenderSystem";
import { Scene } from "./Scene";

/**
 * @module Scene
 * @description
 */
declare module './Scene' {
    interface Scene {
        systemUpdate(timeStamp: number): void;
        _state_system_: {
            cameraSystem: CameraSystem,
            meshSystem: MeshSystem,
            renderSystem: RenderSystem,
        };
    }
};

/**
 * @description systemUpdate, core pipeline.
 */
Scene.prototype.systemUpdate = function (_timeStamp: number): void {
    this._state_system_.cameraSystem.Update();
    this._state_system_.meshSystem.Update();
    this._state_system_.renderSystem.Update();
}

Scene.registerHook(
    async (scene: Scene) => {
        scene._state_system_ = {
            cameraSystem: new CameraSystem(scene),
            meshSystem: new MeshSystem(scene),
            renderSystem: new RenderSystem(scene),
        };
    }
);