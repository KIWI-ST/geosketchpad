import type { Mat4d } from "wgpu-matrix";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import type { EllipsoidComponent } from "../component/EllipsoidComponent";
import type { HardwareDenseMeshFriendlyComponent } from "../component/HardwareDenseMeshFriendlyComponent";

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
            const keys = Array.from(ellipsoidComponents.keys());
            const len = keys.length;
            for (let k = 0; k < len; k++) {
                const key = keys[k];
                const c = ellipsoidComponents.get(key) as EllipsoidComponent;
                await c.update(camera, cw, ch);
            }
        }

        // update all hdmf component.
        const hardwareDenseMeshFriendlyComponents = this.scene_.getComponents('HardwareDenseMeshFriendlyComponent');
        if (hardwareDenseMeshFriendlyComponents) {
            const keys = Array.from(hardwareDenseMeshFriendlyComponents.keys());
            const len = keys.length;
            for (let k = 0; k < len; k++) {
                const key = keys[k];
                const c = hardwareDenseMeshFriendlyComponents.get(key) as HardwareDenseMeshFriendlyComponent;
                // const depC = this.scene_.findComponents(key, 'EllipsoidComponent');
                const depC = ellipsoidComponents?.get(key);
                if (depC) {
                    const actualDepC = depC as EllipsoidComponent;
                    await c.update(actualDepC.VisualRevealTiles, actualDepC.Level);
                } else {
                    await c.update();
                }
            }
        }
    }

}

export {
    MeshSystem
}