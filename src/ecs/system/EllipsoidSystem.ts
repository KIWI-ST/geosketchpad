import type { Camera } from "@pipegpu/camera/src/camera/Camera";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import type { EllipsoidComponent } from "../component/EllipsoidComponent";
import type { QuadtreeTile } from "@pipegpu/geography";

/**
 * @description EllipsoidSystem
 */
class EllipsoidSystem extends BaseSystem {
    /**
     * mapping of:
     * entity uuuid - quadtree tiles array. 
     */
    private visualRevealTilesMap_: Map<string, QuadtreeTile[]> = new Map();

    /**
     * 
     */
    public get VisualRevealTilesMap() {
        return this.visualRevealTilesMap_;
    }

    /**
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
    }

    /**
     * @description update all ellipsoid components.
     * @param camera 
     * @param cw 
     * @param ch 
     */
    public async update(camera: Camera, cw: number, ch: number): Promise<void> {
        const ellipsoidComponents = this.scene_.getComponents('EllipsoidComponent');
        if (!ellipsoidComponents) {
            return;
        }
        for (const [key, c] of ellipsoidComponents) {
            try {
                if (!c.IsEnable) {
                    continue;
                }
                const component = c as EllipsoidComponent;
                await component.update(camera, cw, ch);
                this.visualRevealTilesMap_.set(key, component.VisualRevealTiles);
            }
            catch (err) {
                console.error(`[E][MeshSystem][Update] type 'EllipsoidComponent' update failed, key: ${key}.`);
            }
        }
    }
}

export {
    EllipsoidSystem
}