import type { QuadtreeTile } from "@pipegpu/geography";
import type { MetaData } from "@pipegpu/spec";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import type { HardwareDenseMeshFriendlyCursor, HardwareDenseMeshFriendlyComponent } from "../component/HardwareDenseMeshFriendlyComponent";

/**
 * @description
 */
// const _MEMORY_BLOCK_ERR_OFFSET_ = -1;



// /**
//  * @description
//  */
// type Block = {
//     /**
//      * @description
//      *  实例内存块
//      */
//     instanceDescBlock: EntityOffset;

//     /**
//      * @description
//      *  网格体内存块
//      */
//     meshDescBlock: EntityOffset;

//     /**
//      * @description
//      *  材质内存块
//      */
//     materialDescBlock: EntityOffset;

//     /**
//      * @description
//      *  顶点内存块
//      */
//     vertexBlock: EntityOffset;

//     /**
//      * @description
//      *  簇内存块
//      */
//     meshletDescBlock: EntityOffset;

//     /**
//      * @description
//      *  索引内存块
//      */
//     meshletIndicesBlock: EntityOffset;

//     /**
//      * @description
//      * 未分簇索引内存块
//      */
//     indicesBlock: EntityOffset;

//     /**
//      * @description
//      * 纹理内存块
//      */
//     textureBlock: EntityOffset;
// };

// /**
//  * @description 
//  *  single HDMF memory block.
//  * @param metaData 
//  * @returns 
//  */
// const createBlock = (metaData: MetaData) => {
//     const b: Block = {
//         instanceDescBlock: {
//             size: metaData.instance_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         meshDescBlock: {
//             size: metaData.mesh_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         materialDescBlock: {
//             size: metaData.material_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         vertexBlock: {
//             size: metaData.vertex_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         meshletDescBlock: {
//             size: metaData.meshlet_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         meshletIndicesBlock: {
//             size: metaData.meshlet_indices_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         indicesBlock: {
//             size: metaData.indices_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         },
//         textureBlock: {
//             size: metaData.texture_count * 1,
//             isFree: false,
//             runtimeByteOffset: _MEMORY_BLOCK_ERR_OFFSET_,
//         }
//     };
//     return b;
// }

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
    private allocatedMap_: Map<string, HardwareDenseMeshFriendlyCursor> = new Map();

    /**
     * @description
     */
    public get AllocatedMap(): Map<string, HardwareDenseMeshFriendlyCursor> {
        return this.allocatedMap_;
    }

    /**
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
    }

    /**
     * @description
     *  refresh 
     *  - block update.
     * - 每帧读取所有component数据
     * - 按照entityID分配连续内存区域
     * - 标记更新内容
     * - 注意，typescript Map 对象保留插入顺序，c++ undorder map 不保留；
     */
    private refresh = () => {

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
                    quotaCount = await component.update(visualRevealTiles, quotaCount, this.allocatedMap_);
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
        //
        this.refresh();
    }
}

export {
    HardwareDenseMeshFriendlySystem
}