import type { QuadtreeTile } from "@pipegpu/geography";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import { HDMFComponent, HDMFCursor, initQueueGroup, type HDMFQueueGroup } from "../component/HDMFComponent";
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

    /**
     * 
     */
    private group_: HDMFQueueGroup;

    /**
     * @description
     */
    public get Group(): HDMFQueueGroup {
        return this.Group;
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
     * @description 
     *  stats hdmf cursor.
     */
    private statsCur_: HDMFCursor = new HDMFCursor();
    public get StatsCursor(): HDMFCursor {
        return this.statsCur_;
    }

    /**
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
        this.group_ = initQueueGroup();
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
                // hdmf runtime index.
                initCur.HdmfSceneDescCursor = 1;
                initCur.IndexedIndirectCursor = metaData.instance_spread_meshlet_count;
                initCur.InstanceDescCursor = metaData.instance_count;
                initCur.MeshDescCursor = metaData.mesh_count;
                initCur.VertexCursor = metaData.vertex_count;
                initCur.IndicesCursor = metaData.indices_count;
                initCur.MeshletDescCursor = metaData.meshlet_count;
                initCur.MeshletIndicesCursor = metaData.meshlet_indices_count;
                initCur.DeferredMaterialDescCursor = metaData.material_count;
                initCur.TextureCursor = metaData.texture_count;
                initCur.InstanceMeshletMapCursor = metaData.instance_spread_meshlet_count;
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
        // statc cursor
        this.statsCur_.copy(globalCur);
        // update shared memory, static cached in HDMFComponent.
        this.refreshSharedMemory();
        return true;
    }

    /**
     * @description
     * @param component 
     */
    private enqueue(component: HDMFComponent) {
        this.group_.sceneDescQueue_.push(...component.Group.sceneDescQueue_.splice(0));
        this.group_.instanceDescQueue_.push(...component.Group.instanceDescQueue_.splice(0));
        this.group_.meshDescQueue_.push(...component.Group.meshDescQueue_.splice(0));
        this.group_.meshletDescQueue_.push(...component.Group.meshletDescQueue_.splice(0));
        this.group_.deferredMaterialDescQueue_.push(...component.Group.deferredMaterialDescQueue_.splice(0));
        this.group_.textureQueue_.push(...component.Group.textureQueue_.splice(0));
        this.group_.vertexQueue_.push(...component.Group.vertexQueue_.splice(0));
        this.group_.meshletIndicesQueue_.push(...component.Group.meshletIndicesQueue_.splice(0));
        this.group_.indicesQueue_.push(...component.Group.indicesQueue_.splice(0));
        this.group_.samplerQueue_.push(...component.Group.samplerQueue_.splice(0));
        this.group_.instanceMeshletMapQueue_.push(...component.Group.instanceMeshletMapQueue_.splice(0));
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