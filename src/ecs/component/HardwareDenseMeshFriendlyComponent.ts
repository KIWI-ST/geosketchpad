import type { Mat4d, Vec2d, Vec4d } from "wgpu-matrix";
import { GeodeticCoordinate, QuadtreeTile } from "@pipegpu/geography";
import { fetchHDMF, fetchTileData as fetchTileData, fetchMetaData, parseHDMFv2, type InstanceItem, type MaterialItem, type MeshItem, type MetaData, type ScalerItem } from "@pipegpu/spec";
import { BaseComponent } from "../BaseComponent";
import { fetchKTX2AsBc7RGBA, type KTXPackData } from "../../util/ktx";

const ERROR_CODE = -1;

type DrawIndexedIndirect = {
    index_count: number,
    instance_count: number,
    first_index: number,
    vertex_offset: number,
    first_instance: number,
};

type InstanceDesc = {
    model: Mat4d,
    mesh_id: number,
};

type LoadingStatus = 'done' | 'pending';

/**
 * @class MeshComponent
 * @description
 */
class HardwareDenseMeshFriendlyComponent extends BaseComponent {
    /**
     * 
     */
    private metaData?: MetaData;

    /**
     * 
     */
    private loc: GeodeticCoordinate;

    /**
     * 服务端提供的有效tileset索引集
     */
    private serverTileset: Set<string> = new Set();

    /**
     * 场景运行时 TILE 集.
     */
    private runtimeTileset: Set<string> = new Set();

    /**
     * 记录运行时 isntance 的 ID.
     */
    private instanceDescRuntimeMap: Map<string, InstanceItem> = new Map();

    /**
     * 记录运行时mesh(hdmf)庶几乎.
     */
    private meshDescRuntimeMap: Map<string, MeshItem | undefined> = new Map();

    /**
     * 记录运行时加载的ktx2.0
     */
    private textureRuntimeMap: Map<string, KTXPackData> = new Map();

    /**
     * 
     */
    private rootDir: string;

    /**
     * 请求instance队列.
     */
    private waitRequestInstanceQueue: InstanceItem[] = [];

    /**
     * 
     */
    private loadingStatus: LoadingStatus = 'done';

    /**
     * 
     */
    public get MetaData(): MetaData {
        if (this.metaData) {
            return this.metaData;
        }
        else {
            throw new Error('[E][HardwareDenseMeshFriendlyComponent] invalid metadata. please init first first.')
        }
    }

    public get VertexByteLength() {
        if (this.metaData) {
            return this.metaData.vertex_byte_length;
        }
        else {
            throw new Error('[E][HardwareDenseMeshFriendlyComponent] invalid metadata. please init first first.')
        }
    }

    public get IndicesByteLength() {
        if (this.metaData) {
            return this.metaData.indices_byte_length;
        }
        else {
            throw new Error('[E][HardwareDenseMeshFriendlyComponent] invalid metadata. please init first first.')
        }
    }

    public get MeshletIndicesByteLength() {
        if (this.metaData) {
            return this.metaData.meshlet_indices_byte_length;
        }
        else {
            throw new Error('[E][HardwareDenseMeshFriendlyComponent] invalid metadata. please init first first.')
        }
    }

    /**
     * @description hdmf service.
     * @param {string} rootDir, the root dir of hdmf service. e.g http://127.0.0.1/service/DamagedHelmet/
     */
    constructor(rootDir: string, loc: GeodeticCoordinate = new GeodeticCoordinate(0.0, 0.0)) {
        super('HardwareDenseMeshFriendlyComponent');
        this.rootDir = rootDir;
        this.loc = loc;
    }

    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
        if (b && !this.metaData) {
            this.metaData = this.metaData || await fetchMetaData(this.rootDir);
            this.metaData.vaild_tiles.forEach(key => {
                this.serverTileset.add(key);
            });
        }
    }

    /**
     * @description request ktx 
     * @param item 
     */
    private loadTexture = async (item: MaterialItem): Promise<void> => {
        const Load = async (scaler: ScalerItem): Promise<void> => {
            const key = scaler.texture_uuid;
            if (!key || (key && key.trim().length === 0)) {
                return;
            }
            const uri = `${this.rootDir}${this.metaData?.texture_dir}/${key}.ktx2`;
            fetchKTX2AsBc7RGBA(uri, key).then((pack) => {
                if (pack) {
                    this.textureRuntimeMap.set(pack.key, pack);
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
    private loadInstance = async (instance: InstanceItem): Promise<void> => {
        // 装配 mesh： 未添加的 mesh 在此装配成 meshDesc
        const mesh_uuid: string = instance.mesh_uuid;
        if (!this.meshDescRuntimeMap.has(mesh_uuid)) {
            // fill runtime mesh map with undefined.
            this.meshDescRuntimeMap.set(mesh_uuid, undefined);
            // 直接请求 .hdmf 并解析
            // TODO:: request in web workers.
            const uri = `${this.rootDir}${this.metaData?.mesh_dir}/${instance.mesh_uuid}.hdmf`;
            const u8arr = await fetchHDMF(uri);
            if (u8arr) {
                const mesh_item = parseHDMFv2(u8arr);
                if (this.meshDescRuntimeMap.has(mesh_item.uuid)) {
                    this.meshDescRuntimeMap.set(mesh_item.uuid, mesh_item);
                    // allow load texture async
                    await this.loadTexture(mesh_item.material);
                } else {
                    console.warn(`[W][enqueue] parseHMDFv2 error, missing pre request.`)
                }
            } else {
                this.meshDescRuntimeMap.delete(instance.mesh_uuid);
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
     *  - tile
     *  - request meta data.
     *  - for service.
     * @param _args 
     */
    public async update(visualRevealTiles: QuadtreeTile[], LIMIT: number): Promise<number> {
        // do enqueue, cost compute limit.
        let item = this.waitRequestInstanceQueue.shift();
        while (LIMIT > 0 && item) {
            await this.loadInstance(item!);
            LIMIT--;
            item = this.waitRequestInstanceQueue.shift();
        }
        // instance 未处理完，取消处理等待下次调用
        if (this.waitRequestInstanceQueue.length > 0 || this.loadingStatus !== 'done' || !visualRevealTiles || visualRevealTiles.length === 0) {
            return LIMIT;
        }
        // 预处理，过滤已加载/无需加载/服务端不存在的瓦片，避免重复请求
        const validTiles = visualRevealTiles.filter(tile => {
            if (!tile) {
                return false;
            }
            const tileKey = `${tile?.X}_${tile?.Y}_${tile?.Level}.json`;
            return !this.runtimeTileset.has(tileKey) && this.serverTileset.has(tileKey);
        });
        // 无需处理
        if (validTiles.length === 0) {
            return LIMIT;
        }
        // TODO:: 优化性能，无需加载的json可终止请求
        this.loadingStatus = 'pending';
        for (const tile of validTiles) {
            const tileKey = `${tile?.X}_${tile?.Y}_${tile?.Level}.json`;
            const tileUri = `${this.rootDir}${this.metaData?.lod_dir}/${tileKey}`;
            const tileData = await fetchTileData(tileUri, tileKey);
            // 如果没有返回数据，直接跳过不阻塞
            if (!tileData) {
                console.warn(`[W][HardwareDenseMeshFriendlyComponent] missing tile data. key ${tileKey}`);
                continue;
            }
            // request tiles by visual reveal tile queue.
            for (const instance of tileData!.instances) {
                if (!this.instanceDescRuntimeMap.has(instance.uuid)) {
                    this.waitRequestInstanceQueue.push(instance);
                }
            }
            this.runtimeTileset.add(tileKey);
        }
        this.loadingStatus = 'done';
        // remain compute limit.
        return LIMIT;
    }
}

export {
    HardwareDenseMeshFriendlyComponent
}