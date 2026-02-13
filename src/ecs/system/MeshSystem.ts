import type { Scene } from "../../scene/Scene";
import type { BaseComponent } from "../BaseComponent";
import { BaseSystem } from "../BaseSystem";
import type { EllipsoidComponent } from "../component/EllipsoidComponent";
import type { HardwareDenseMeshFriendlyComponent } from "../component/HardwareDenseMeshFriendlyComponent";

/**
 * @description MeshSystem
 * - support mesh in streaming
 */
class MeshSystem extends BaseSystem {

    constructor(scene: Scene) {
        super(scene);
    }

    public override Update(): void {
        if (!this.scene_._state_system_.cameraSystem.hasMainCamera()) {
            console.warn(`[W][RenderSystem][Update] render system skip frame, due to missing main camera.`);
            return;
        }
        // support mesh component.
        this.scene_.getComponents('HardwareDenseMeshFriendlyComponent')?.forEach((v: BaseComponent, _key: String) => {
            (v as HardwareDenseMeshFriendlyComponent).update();
        });
        const camera = this.scene_._state_system_.cameraSystem.MainCamera!;
        // support meshlet component.
        this.scene_.getComponents('EllipsoidComponent')?.forEach((v: BaseComponent, _key: String) => {
            (v as EllipsoidComponent).update(camera, this.scene_.Canvas.clientWidth, this.scene_.Canvas.clientHeight);
        });
    }

}

export {
    MeshSystem
}