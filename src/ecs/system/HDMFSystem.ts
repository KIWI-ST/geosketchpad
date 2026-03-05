import type { QuadtreeTile } from "@pipegpu/geography";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import { HDMFComponent, HDMFCursor, type InstanceDesc, type MaterialDesc, type MeshDesc, type MeshletDesc, type SamplerDesc, type TextureDesc } from "../component/HDMFComponent";
import type { BaseComponent } from "../BaseComponent";

/**
 * @class HDMF, HardwareDenseMeshFriendly
 * @description MeshSystem
 * - gpu-driven mesh system. all vertex in single big buffer.
 * - support mesh in streaming
 */
class HDMFSystem extends BaseSystem {
    /**
     * @description
     * per frame task count.
     */
    private perFrameLimit_: number = 8;

    private instanceDescQueue_: InstanceDesc[] = [];
    public get InstanceDescQueue(): InstanceDesc[] {
        return this.instanceDescQueue_;
    }

    private meshDescQueue_: MeshDesc[] = [];
    public get MeshDescQueue(): MeshDesc[] {
        return this.meshDescQueue_;
    }


    private meshletDescQueue_: MeshletDesc[] = [];
    public get MeshletDescQueue(): MeshletDesc[] {
        return this.meshletDescQueue_;
    }

    private materialDescQueue_: MaterialDesc[] = [];
    public get MaterialDescQueue(): MaterialDesc[] {
        return this.materialDescQueue_;
    }

    private textureQueue_: TextureDesc[] = [];
    public get TextureQueue(): TextureDesc[] {
        return this.textureQueue_;
    }


    private vertexQueue_: Float32Array[] = [];
    public get VertexQueue(): Float32Array[] {
        return this.vertexQueue_;
    }

    private meshletIndicesQueue_: Uint32Array[] = [];
    public get MeshletIndicesQueue(): Uint32Array[] {
        return this.meshletIndicesQueue_;
    }

    private indicesQueue_: Uint32Array[] = [];
    public get IndicesQueue(): Uint32Array[] {
        return this.indicesQueue_;
    }

    private samplerQueue_: SamplerDesc[] = [];
    public get SamplerQueue(): SamplerDesc[] {
        return this.samplerQueue_;
    }

    /**
     * @description
     *  mapping of HDMFComponent UUID and HMDFComponent Cursor.
     */
    private allocatedMap_: Map<string, HDMFCursor> = new Map();

    /**
     * @description
     */
    public get AllocatedMap(): Map<string, HDMFCursor> {
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
        for (const [_k, v] of HDMFComponent.SharedSamplerDataMap) {
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
            const c = v as HDMFComponent;
            const metaData = c.MetaData;
            if (!metaData) {
                continue;
            }
            const initCur: HDMFCursor = new HDMFCursor();
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
        const globalCur: HDMFCursor = new HDMFCursor();
        for (const [_k, v] of this.allocatedMap_) {
            // copy cursor.
            const copyedCur = new HDMFCursor();
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
     * 
     * @param component 
     */
    private enqueue(component: HDMFComponent) {
        this.instanceDescQueue_.push(...component.InstanceDescQueue.splice(0));
        this.meshDescQueue_.push(...component.MeshDescQueue.splice(0));
        this.meshletDescQueue_.push(...component.meshletDescQueue.splice(0));
        this.materialDescQueue_.push(...component.MaterialDescQueue.splice(0));
        this.textureQueue_.push(...component.TextureQueue.splice(0));
        this.vertexQueue_.push(...component.VertexQueue.splice(0));
        this.meshletIndicesQueue_.push(...component.MeshletIndicesQueue.splice(0));
        this.indicesQueue_.push(...component.IndicesQueue.splice(0));
        this.samplerQueue_.push(...component.SamplerQueue.splice(0));
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
                const component = c as HDMFComponent;
                const visualRevealTiles = visualRevealTilesMap?.get(key);
                if (visualRevealTiles) {
                    quotaCount = await component.update(visualRevealTiles, quotaCount, this.allocatedMap_);
                    // queue update.
                    this.enqueue(component);
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
    HDMFSystem
}