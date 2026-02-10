import type { Scene } from "../../scene/Scene";
import type { BaseComponent } from "../BaseComponent";
import { BaseSystem } from "../BaseSystem";
import type { MeshComponent } from "../component/HardwareDenseMeshFriendlyComponent";

/**
 * @description MeshSystem
 * - support mesh in streaming
 */
class MeshSystem extends BaseSystem {

    constructor(scene: Scene) {
        super(scene);
    }

    public override Update(): void {
        // support mesh component.
        this.scene_.getComponents('MeshComponent')?.forEach((v: BaseComponent, _key: String) => {
            (v as MeshComponent).update();
        });

        // support meshlet component.

    }

}

export {
    MeshSystem
}