import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import type { EllipsoidComponent } from "../component/EllipsoidComponent";
import type { HDMFComponent } from "../component/HDMFComponent";

/**
 * @description MeshSystem
 * - gpu-driven mesh system. all vertex in single big buffer.
 * - support mesh in streaming
 */
class MeshSystem extends BaseSystem {
    /**
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
    }

    public override async Update(): Promise<void> {

        if (!this.scene_._state_system_.cameraSystem.hasMainCamera()) {
            return;
        }

        // update ellipsoid component.
        const camera = this.scene_._state_system_.cameraSystem.MainCamera!;
        const cw = this.scene_.Canvas.clientWidth;
        const ch = this.scene_.Canvas.clientHeight;

        // update all ellipsoid components.
        const ellipsoidComponents = this.scene_.getComponents('EllipsoidComponent');
        if (ellipsoidComponents) {
            for (const [key, c] of ellipsoidComponents) {
                try {
                    const ellipsoidComponent = c as EllipsoidComponent;
                    await ellipsoidComponent.update(camera, cw, ch);
                }
                catch (err) {
                    console.error(`[E][MeshSystem][Update] type 'EllipsoidComponent' update failed, key: ${key}.`);
                }
            }
        }

        // update all hdmf component.
        const hdmfComponents = this.scene_.getComponents('HardwareDenseMeshFriendlyComponent');
        if (hdmfComponents) {
            for (const [key, c] of hdmfComponents) {
                try {
                    const hdmfComponent = c as HDMFComponent;
                    const depC = ellipsoidComponents?.get(key);
                    if (depC) {
                        const actualDepC = depC as EllipsoidComponent;
                        await hdmfComponent.update(actualDepC.VisualRevealTiles, actualDepC.Level);
                    }
                }
                catch (err) {
                    console.error(`[E][MeshSystem][Update] type 'HardwareDenseMeshFriendlyComponent' update failed, key: ${key}.`);
                }
            }
        }

    }

}

export {
    MeshSystem
}