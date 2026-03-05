import type { QuadtreeTile } from "@pipegpu/geography";
import type { MetaData } from "@pipegpu/spec";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import { HardwareDenseMeshFriendlyComponent, HardwareDenseMeshFriendlyCursor } from "../component/HardwareDenseMeshFriendlyComponent";
import type { BaseComponent } from "../BaseComponent";

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
     *  mapping of HDMFComponent UUID and HMDFComponent Cursor.
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
     * 分配/更新 共享内存数据和运行时索引
     */
    private refreshSharedMemory = () => {
        let samplerCursor = 0;
        for (const [_k, v] of HardwareDenseMeshFriendlyComponent.SharedSamplerDataMap) {
            v.rt_sampler_idx = samplerCursor++;
        }
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
    private tryAllocatedMemory = (componentMap: Map<string, BaseComponent>): boolean => {
        // register hdmf uuid with cursor memory.
        for (const [_entityUUID, v] of componentMap) {
            const c = v as HardwareDenseMeshFriendlyComponent;
            const metaData = c.MetaData;
            if (!metaData) {
                continue;
            }
            const initCur: HardwareDenseMeshFriendlyCursor = new HardwareDenseMeshFriendlyCursor();
            {
                initCur.InstanceDescCursor = metaData.instance_count;
                initCur.MeshDescCursor = metaData.mesh_count;
                initCur.VertexCursor = metaData.vertex_count;
                initCur.IndicesCursor = metaData.indices_count;
                initCur.MeshletDescCursor = metaData.meshlet_count;
                initCur.MeshletIndicesCursor = metaData.meshlet_indices_count;
                initCur.MaterialDescCursor = metaData.material_count;
                initCur.TextureCursor = metaData.texture_count;
            }
            const componentUUID = c.UUID;
            this.allocatedMap_.set(componentUUID, initCur);
        }
        // update alloacted map
        // cursor for hdmf allocated.
        const globalCur: HardwareDenseMeshFriendlyCursor = new HardwareDenseMeshFriendlyCursor();
        for (const [_k, v] of this.allocatedMap_) {
            // copy cursor.
            const copyedCur = new HardwareDenseMeshFriendlyCursor();
            copyedCur.copy(v);
            // copy global cur to v.
            v.copy(globalCur);
            // update global cur with copyed offset.
            globalCur.plus(copyedCur);
        }
        // update shared memory, static cached in HDMFComponent.
        this.refreshSharedMemory();
        return true;
    }

    /**
     * @description update all hdmf component.
     * @param visualRevealTilesMap 
     * @returns 
     */
    public async update(visualRevealTilesMap: Map<string, QuadtreeTile[]>): Promise<void> {
        // hdmf components collection.
        const hdmfComponentMap = this.scene_.getComponents('HardwareDenseMeshFriendlyComponent');
        if (!hdmfComponentMap) {
            return;
        }
        // allocate memory.
        if (!this.tryAllocatedMemory(hdmfComponentMap)) {
            console.warn(`[E][HardwareDenseMeshFriendlySystem][update] tryAllocatedMemory failed. system update skipped.`);
            return;
        }
        // components share quotaCount per frame.
        let quotaCount = this.perFrameLimit_;
        for (const [key, c] of hdmfComponentMap) {
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

    }
}

export {
    HardwareDenseMeshFriendlySystem
}