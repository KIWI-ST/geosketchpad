import { CartoPosition, Ellipsoid, QuadtreeTile } from "@pipegpu/geography";
import {
    fetchHDMF,
    fetchTileAsset,
    fetchMetaData,
    parseHDMFv2,
    type InstanceAsset,
    type MaterialAsset,
    type MeshAsset,
    type MetaData,
    type ScalerAsset
} from "@pipegpu/spec";
import { BaseComponent } from "../BaseComponent";
import { fetchKTX2AsBc7RGBA, type KTXPackAsset as KTXPackAsset } from "../../util/ktx";
import type { Mat4, Vec4, Vec4d } from "wgpu-matrix";

/**
 * @description
 */
type LoadingStatus = 'done' | 'pending';

/**
 * @description
 *  分配
 * - 实例起始索引
 * - 网格起始索引
 * - 簇起始索引
 * - 材质起始索引
 * - 贴图起始索引
 * - 索引起始索引
 * - 顶点起始索引
 */
type HardwareDenseMeshFriendlyAllocated = {
    /**
     * @description
     */
    runtime_instance_desc_offset: number;

    /**
     * @description
     */
    runtime_mesh_desc_offset: number;

    /**
     * @description
     */
    runtime_meshlet_desc_offset: number;

    /**
     * @description
     */
    runtime_material_desc_offset: number;
};

/**
 * @description
 *  CPU-side instance descriptor
 */
type InstanceDesc = {
    /**
     * 
     */
    model: Mat4;

    /**
     * runtime mesh index
     */
    runtime_mesh_idx: number;
};

/**
 * @description
 */
type MeshDesc = {
    /**
     * @description
     *  mesh 的 bounding sphere
     *  [center x, center y, center z, radius]
     */
    bounding_sphere: Vec4d;

    /**
     * @description
     *  Mesh对应的meshlet簇总数
     */
    meshlet_count: number;

    /**
    * @description
    * TODO:: 可取消？
    *   运行时索引
    */
    runtime_idx: number;

    /**
     * @description
     *  运行时mesh的顶点在全局顶点数组的偏移值，以顶点为单位
     */
    runtime_vertex_offset: number;

    /**
     * @description
     *  运行时mesh的meshlet在全局meshlet数组的偏移值，以meshletDesc为单位
     */
    runtime_meshlet_offset: number;

    /**
     * @description
     *  运行时材质索引
     */
    runtime_material_idx: number;
};

/**
 * @description
 *  簇信息
 */
type MeshletDesc = {
    /**
     * @description
     *  细化外包球
     */
    refined_bounding_sphere: Vec4;

    /**
     * @description
     *  自身外包球
     */
    self_bounding_sphere: Vec4;

    /**
     * @description
     *  简化外包球
     */
    simplified_bounding_sphere: Vec4;

    /**
     * @description
     *  细化误差
     */
    refined_error: number;

    /**
     * @description
     *  自身误差
     */
    self_error: number;

    /**
     * @description
     *  简化误差
     */
    simplified_error: number;

    /**
     * @description
     *  索引长度
     */
    index_count: number;

    /**
     * @description
     *  运行时簇索引
     */
    runtime_idx: number;

    /**
     * @description
     *  运行时Mesh索引
     */
    runtime_mesh_idx: number;

    /**
     * @description
     *  运行时索引在全局的偏移，以uint32_t为单位
     */
    runtime_index_offset: number;
};

/**
 * @todo 待补全
 * @description
 */
type MaterialDesc = {
    /**
     * @description
     * 运行时材质索引
     */
    runtime_idx: number;
};

/**
 * @class MeshComponent
 * @description
 * HDMF 数据结构中，真正需要被异步加载的资产只有两种：
 * - 网格体包。其中网格体包存储了簇、顶点、索引、材质等信息；材质如果包含纹理信息，则以ID形式存储。
 * - 纹理，以固定压缩方式（默认BC7）压缩后存放的二进制文件。
 */
class HardwareDenseMeshFriendlyComponent extends BaseComponent {
    /**
     * 
     */
    private metaData_?: MetaData;

    /**
     * @description
     */
    private positionCarto_: CartoPosition;

    /**
     * @description ellipsoid
     */
    private ellipsoid_: Ellipsoid;

    /**
     * 
     */
    private rootDir_: string;

    /**
     * 请求instance队列.
     */
    private waitRequestInstanceQueue_: InstanceAsset[] = [];

    /**
     * 
     */
    private loadingStatus_: LoadingStatus = 'done';

    /**
     * 服务端提供的有效tileset索引集
     */
    private serverTileset_: Set<string> = new Set();

    /**
     * 
     */
    private globalAlloc_?: HardwareDenseMeshFriendlyAllocated;

    /**
     * 
     */
    private nativeAlloc_: HardwareDenseMeshFriendlyAllocated;

    /**
     * 场景运行时 TILE 集.
     */
    private rtTile_: Set<string> = new Set();

    /**
     * 
     */
    private rtMesh_: Set<string> = new Set();

    /**
     * 记录运行时 isntance 的 ID.
     */
    private instanceMap_: Map<string, InstanceAsset> = new Map();

    /**
     * 记录运行时mesh(hdmf)庶几乎.
     */
    private meshMap_: Map<string, MeshAsset> = new Map();

    /**
     * 记录运行时加载的ktx2.0
     */
    private textureMap_: Map<string, KTXPackAsset> = new Map();

    /**
     * 
     */
    public get InstanceMap(): Map<string, InstanceAsset> {
        return this.instanceMap_;
    }

    /**
     * @description
     * mapping of mesh uuid - mesh data.
     */
    public get MeshMap(): Map<string, MeshAsset> {
        return this.meshMap_;
    }

    /**
     * @description 
     *  mapping of texture uuid - ktx2.0 data pack.
     */
    public get TextureMap(): Map<string, KTXPackAsset> {
        return this.textureMap_;
    }

    /**
     * 
     */
    public get MetaData(): MetaData {
        if (this.metaData_) {
            return this.metaData_;
        }
        else {
            throw new Error(`[E][HardwareDenseMeshFriendlyComponent] invalid metadata. please 'await component.enable(true). before use.`);
        }
    }

    /**
     * @description 
     *  hdmf service.
     * @param {string} rootDir, the root dir of hdmf service. e.g http://127.0.0.1/service/DamagedHelmet/
     */
    constructor(rootDir: string, ellipsoid: Ellipsoid, positionCarto: CartoPosition = new CartoPosition(0.0, 0.0)) {
        super('HardwareDenseMeshFriendlyComponent');
        this.rootDir_ = rootDir;
        this.positionCarto_ = positionCarto;
        this.ellipsoid_ = ellipsoid;
        this.nativeAlloc_ = {
            runtime_instance_desc_offset: 0,
            runtime_mesh_desc_offset: 0,
            runtime_meshlet_desc_offset: 0,
            runtime_material_desc_offset: 0
        };
    }

    /**
     * @description
     *  enable/disable component.
     * @param b 
     */
    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
        if (b && !this.metaData_) {
            this.metaData_ = this.metaData_ || await fetchMetaData(this.rootDir_);
            this.metaData_.vaild_tiles.forEach(key => {
                this.serverTileset_.add(key);
            });
        }
    }

    /**
     * @description request ktx 
     * @param item 
     */
    private loadTexture = async (item: MaterialAsset): Promise<void> => {

        const Load = async (scaler: ScalerAsset): Promise<void> => {
            const key = scaler.texture_uuid;
            if (!key || (key && key.trim().length === 0)) {
                return;
            }
            const uri = `${this.rootDir_}${this.metaData_?.texture_dir}/${key}.ktx2`;
            fetchKTX2AsBc7RGBA(uri, key).then((pack) => {
                if (pack) {
                    this.textureMap_.set(pack.key, pack);
                } else {
                    console.error(`[E][loadTexture] load texture error. requet uri: ${uri}`);
                }
            });
        };

        await Load(item.pbr.base_color);
        await Load(item.pbr.metallic);
        await Load(item.pbr.roughness);
        await Load(item.pbr.emissive);
        await Load(item.pbr.sheen_color);
        await Load(item.pbr.sheen_roughness);
        await Load(item.pbr.clearcoat);
        await Load(item.pbr.clearcoat_roughness);
        await Load(item.pbr.clearcoat_normal);
        await Load(item.pbr.anisotropy);
        await Load(item.pbr.transmission);
        await Load(item.pbr.volume_thickness);

        await Load(item.phong.diffuse);
        await Load(item.phong.specular);
        await Load(item.phong.shiness);
        await Load(item.phong.ambient);
        await Load(item.phong.emissive);
        await Load(item.phong.reflectivity);

        await Load(item.baked.ambient_occlusion);
        await Load(item.baked.light_map);
    }

    /**
     * 以instance为单位，请求资源：
     * - instance
     * - instance desc
     * - mesh
     * - mesh desc
     * - material 
     * - material desc
     * - texture
     * - ktx texture file
     * - hdmf vertex
     * - hdmf meshlet
     * - hdmf indices
     * - hdmf bounds with lod
     */
    private loadInstance = async (instance: InstanceAsset): Promise<void> => {
        // 装配 mesh： 未添加的 mesh 在此装配成 meshDesc
        const mesh_uuid: string = instance.mesh_uuid;
        if (!this.meshMap_.has(mesh_uuid) && !this.rtMesh_.has(mesh_uuid)) {
            this.rtMesh_.add(mesh_uuid);
            // 直接请求 .hdmf 并解析
            // TODO:: request in web workers.
            const uri = `${this.rootDir_}${this.metaData_?.mesh_dir}/${instance.mesh_uuid}.hdmf`;
            const u8arr = await fetchHDMF(uri);
            if (u8arr) {
                const mesh_item = parseHDMFv2(u8arr);
                if (this.meshMap_.has(mesh_item.uuid)) {
                    this.meshMap_.set(mesh_item.uuid, mesh_item);
                    // allow load texture async
                    await this.loadTexture(mesh_item.material);
                } else {
                    console.warn(`[W][enqueue] parseHMDFv2 error, missing pre request.`)
                }
            } else {
                this.rtMesh_.delete(mesh_uuid);
                this.meshMap_.delete(instance.mesh_uuid);
            }
        }

        // 3. 未添加的 instance 在此装配
        // const runtimeMesh = this.meshDescRuntimeMap.get(instance.mesh_id)!;
        // if (runtimeMesh && runtimeMesh.meshletCount !== ERROR_CODE && runtimeMesh.runtimeID !== ERROR_CODE && this.runtimeMeshIDWithIndexedIndirectsMap.has(runtimeMesh.runtimeID) && !this.instanceDescRuntimeMap.has(instance.id)) {
        //     const instanceRuntimeID = this.instanceDescCursor++;
        //     this.instanceDescRuntimeMap.set(instance.id, instanceRuntimeID);
        //     // if (!this.meshDescRuntimeMap.has(instance.mesh_id)) {
        //     //     throw new Error(`[E][appendData] instance 对应的 mesh id 丢失或未载入，请检查资产载入顺序。`);
        //     // }
        //     // const runtimeMesh = this.meshDescRuntimeMap.get(instance.mesh_id)!;
        //     // const runtimeMeshID = runtimeMesh.runtimeID;
        //     const runtimeMeshID = runtimeMesh.runtimeID;
        //     this.instanceDescQueue.push({
        //         model: instance.model,
        //         mesh_id: runtimeMeshID,
        //     });
        //     // if (!this.runtimeMeshIDWithIndexedIndirectsMap.has(runtimeMeshID)) {
        //     //     throw new Error(`[E][appendData] 未找到对应 runtime meshID, 请检查资产载入顺序。`)
        //     // }
        //     // 写入 runtime instance id, runtime meshlet
        //     for (let k = 0; k < runtimeMesh.meshletCount; k++) {
        //         this.meshletMapQueue.push(vec2.create(instanceRuntimeID, k));
        //     }
        //     // drawindexed command buffer.
        //     // [index count] [instance count] [first index] [vertex offset] [first instance]
        //     const diibs: DrawIndexedIndirect[] = this.runtimeMeshIDWithIndexedIndirectsMap.get(runtimeMeshID) as DrawIndexedIndirect[];
        //     diibs.forEach(diib => {
        //         const diibData = new Uint32Array([
        //             diib.index_count,
        //             diib.instance_count,
        //             diib.first_index,
        //             diib.vertex_offset,
        //             instanceRuntimeID
        //         ]);
        //         this.indexedIndirectQueue.push(diibData);
        //         // 一个 meshlet 对应一个 indexed indirect draw command.
        //         // 一个 meshlet 对应一个 draw count.
        //         this.sceneInstanceMeshletCount++;
        //     });
        //     this.instanceOrderQueue.push(new Uint32Array([instanceRuntimeID]));
        // } else {
        //     // retry
        //     this.waitRequestInstanceQueue.push(instance);
        // }
    }

    /**
     * @description
     * @param allocatedMap 
     */
    private tryAllocate = (allocatedMap: Map<string, HardwareDenseMeshFriendlyAllocated>): boolean => {
        if (!allocatedMap.get(this.uuid_)) {
            // stats allocated memory.
            const hdmfAlloc: HardwareDenseMeshFriendlyAllocated = {
                runtime_instance_desc_offset: 0,
                runtime_mesh_desc_offset: 0,
                runtime_meshlet_desc_offset: 0,
                runtime_material_desc_offset: 0
            };
            // TODO:: k must in ordered.
            for (const [_k, v] of allocatedMap) {
                hdmfAlloc.runtime_instance_desc_offset += v.runtime_instance_desc_offset;
                hdmfAlloc.runtime_material_desc_offset += v.runtime_material_desc_offset;
                hdmfAlloc.runtime_mesh_desc_offset += v.runtime_mesh_desc_offset;
                hdmfAlloc.runtime_meshlet_desc_offset += v.runtime_meshlet_desc_offset;
            }
            this.globalAlloc_ = hdmfAlloc;
            allocatedMap.set(this.uuid_, hdmfAlloc);
            return true;
        }
        return true;
    }

    /**
     * @description
     *  - tile
     *  - request meta data.
     *  - for service.
     * @param _args 
     * @param {Map<string, HardwareDenseMeshFriendlyAllocated>} allocatedMap mapping of component uuid and Allocated. 
     */
    public async update(visualRevealTiles: QuadtreeTile[], LIMIT: number, allocatedMap: Map<string, HardwareDenseMeshFriendlyAllocated>): Promise<number> {
        // try allocate memory.
        // return while failed.
        if (!this.tryAllocate(allocatedMap)) {
            console.warn(`[W][update] try allocate memory failed, component update skipped.`);
            return LIMIT;
        }
        // do enqueue, cost compute limit.
        let item = this.waitRequestInstanceQueue_.shift();
        while (LIMIT > 0 && item) {
            await this.loadInstance(item!);
            LIMIT--;
            item = this.waitRequestInstanceQueue_.shift();
        }
        // instance 未处理完，取消处理等待下次调用
        if (this.waitRequestInstanceQueue_.length > 0 || this.loadingStatus_ !== 'done' || !visualRevealTiles || visualRevealTiles.length === 0) {
            return LIMIT;
        }
        // 预处理，过滤已加载/无需加载/服务端不存在的瓦片，避免重复请求
        const validTiles = visualRevealTiles.filter(tile => {
            if (!tile) {
                return false;
            }
            const tileKey = `${tile?.X}_${tile?.Y}_${tile?.Level}.json`;
            return !this.rtTile_.has(tileKey) && this.serverTileset_.has(tileKey);
        });
        // 无需处理
        if (validTiles.length === 0) {
            return LIMIT;
        }
        // TODO:: 优化性能，无需加载的json可终止请求
        this.loadingStatus_ = 'pending';
        for (const tile of validTiles) {
            const tileKey = `${tile?.X}_${tile?.Y}_${tile?.Level}.json`;
            const tileUri = `${this.rootDir_}${this.metaData_?.lod_dir}/${tileKey}`;
            const tileData = await fetchTileAsset(tileUri, tileKey);
            // 如果没有返回数据，直接跳过不阻塞
            if (!tileData) {
                console.warn(`[W][HardwareDenseMeshFriendlyComponent] missing tile data. key ${tileKey}`);
                continue;
            }
            // request tiles by visual reveal tile queue.
            for (const instance of tileData!.instances) {
                if (!this.instanceMap_.has(instance.uuid)) {
                    this.waitRequestInstanceQueue_.push(instance);
                }
            }
            this.rtTile_.add(tileKey);
        }
        this.loadingStatus_ = 'done';
        // remain compute limit.
        return LIMIT;
    }
}

export {
    type HardwareDenseMeshFriendlyAllocated,
    HardwareDenseMeshFriendlyComponent
}