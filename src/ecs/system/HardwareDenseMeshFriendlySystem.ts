import type { QuadtreeTile } from "@pipegpu/geography";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import type { HardwareDenseMeshFriendlyComponent } from "../component/HardwareDenseMeshFriendlyComponent";

// const MEM_ERR_CODE: number = -1;

/**
 * @description 内存碎片
 * memory fragment
 */
type MEM = {
    entityUUID: string;
    vertexByteLength: number;
    indicesByteLength: number;
    meshletIndicesByteLength: number;
};

/**
 * @description MeshSystem
 * - gpu-driven mesh system. all vertex in single big buffer.
 * - support mesh in streaming
 */
class HardwareDenseMeshFriendlySystem extends BaseSystem {
    /**
     * @description
     * per frame task count.
     */
    private perFrameLimit_: number = 8;

    /**
     * @description
     */
    private memMap_: Map<string, MEM> = new Map();

    /**
     * 
     */
    public get MemMap(): Map<string, MEM> {
        return this.memMap_;
    }

    /**
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
    }

    /**
     * @description update all hdmf component.
     * @param visualRevealTilesMap 
     * @returns 
     */
    public async update(visualRevealTilesMap: Map<string, QuadtreeTile[]>): Promise<void> {
        // hdmf components collection.
        const hdmfComponents = this.scene_.getComponents('HardwareDenseMeshFriendlyComponent');
        if (!hdmfComponents) {
            return;
        }
        // components share quotaCount per frame.
        let quotaCount = this.perFrameLimit_;
        for (const [key, c] of hdmfComponents) {
            try {
                if (!c.IsEnable) {
                    continue;
                }
                const component = c as HardwareDenseMeshFriendlyComponent;
                const visualRevealTiles = visualRevealTilesMap?.get(key);
                if (visualRevealTiles) {
                    quotaCount = await component.update(visualRevealTiles, quotaCount);
                    if (!this.memMap_.has(key)) {
                        const mem: MEM = {
                            entityUUID: key,
                            vertexByteLength: component.MetaData.vertex_byte_length,
                            indicesByteLength: component.MetaData.indices_byte_length,
                            meshletIndicesByteLength: component.MetaData.meshlet_indices_byte_length,
                        };
                        // override mem meta data.
                        this.memMap_.set(key, mem);
                    }
                    // computing power exhausted, cancel.
                    if (quotaCount <= 0) {
                        return;
                    }
                } else {
                    console.error(`[E][MeshSystem][Update] 'HardwareDenseMeshFriendlyComponent' deps 'EllipsoidComponent', update failed. key: ${key}.`);
                }
            }
            catch (err) {
                console.error(`[E][MeshSystem][Update] type 'HardwareDenseMeshFriendlyComponent' update failed, key: ${key}.`);
            }
        }
    }
}

export {
    HardwareDenseMeshFriendlySystem
}