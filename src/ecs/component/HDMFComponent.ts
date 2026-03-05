import { mat4d, type Mat4, type Vec4 } from "wgpu-matrix";
import { CartoPosition, Ellipsoid, QuadtreeTile } from "@pipegpu/geography";
import {
    fetchHDMF,
    fetchTileData,
    fetchMetaData,
    parseHDMFv2,
    type InstanceData,
    type MaterialData,
    type MeshData,
    type MetaData,
    type ScalerData,
    type SamplerData,
    ERROR_CODE
} from "@pipegpu/spec";
import { BaseComponent } from "../BaseComponent";
import { fetchKTX2AsBc7RGBA, type CompressTextureTYPE, type KTXPackData as KTXPackData } from "../../util/ktx";
import { pack4xU8, unpack2xU8 } from "../../util/pack";

/**
 * @description
 * @class HardwareDenseMeshFriendlyCursor
 */
class HDMFCursor {
    /**
     * @description
     *  hdmf descriptor cursor.
     */
    private hdmfDescCursor_: number = 0;
    public get HdmfSceneDescCursor(): number {
        return this.hdmfDescCursor_;
    }
    public set HdmfSceneDescCursor(v) {
        this.hdmfDescCursor_ = v;
    }


    /**
     * @description
     *  indirect draw cursor.
     */
    private indirectCursor_: number = 0;
    public get IndirectCursor(): number {
        return this.indirectCursor_;
    }
    public set IndirectCursor(v) {
        this.indirectCursor_ = v;
    }

    /**
      * @description
      */
    private instanceDescCursor_: number = 0;
    public get InstanceDescCursor(): number {
        return this.instanceDescCursor_;
    }
    public set InstanceDescCursor(v: number) {
        this.instanceDescCursor_ = v;
    }

    /**
     * @description
     */
    private meshDescCursor_: number = 0;
    public get MeshDescCursor(): number {
        return this.meshDescCursor_;
    }
    public set MeshDescCursor(v: number) {
        this.meshDescCursor_ = v;
    }

    /**
     * @description
     */
    private vertexCursor_: number = 0;
    public get VertexCursor(): number {
        return this.vertexCursor_;
    }
    public set VertexCursor(v: number) {
        this.vertexCursor_ = v;
    }

    /**
     * @description 
     *  fallback indices cursor in global position.
     */
    private indicesCursor_: number = 0;
    public get IndicesCursor(): number {
        return this.indicesCursor_;
    }
    public set IndicesCursor(v: number) {
        this.indicesCursor_ = v;
    }

    /**
     * @description
     */
    private meshletDescCursor_: number = 0;
    public get MeshletDescCursor(): number {
        return this.meshletDescCursor_;
    }
    public set MeshletDescCursor(v: number) {
        this.meshletDescCursor_ = v;
    }

    /**
     * @description
     */
    private meshletIndicesCursor_: number = 0;
    public get MeshletIndicesCursor(): number {
        return this.meshletIndicesCursor_;
    }
    public set MeshletIndicesCursor(v: number) {
        this.meshletIndicesCursor_ = v;
    }

    /**
     * @description
     */
    private materialDescCursor_: number = 0;
    public get MaterialDescCursor(): number {
        return this.materialDescCursor_;
    }
    public set MaterialDescCursor(v: number) {
        this.materialDescCursor_ = v;
    }

    /**
     * @description
     */
    private textureCursor_: number = 0;
    public get TextureCursor(): number {
        return this.textureCursor_;
    }
    public set TextureCursor(v: number) {
        this.textureCursor_ = v;
    }

    /**
     * @description
     */
    constructor() { }


    /**
     * @description update HardwareDenseMeshFriendlyCursor values.
     * @param v 
     */
    copy = (v: HDMFCursor) => {
        this.hdmfDescCursor_ = v.hdmfDescCursor_;
        this.indirectCursor_ = v.indirectCursor_;
        this.instanceDescCursor_ = v.instanceDescCursor_;
        this.meshDescCursor_ = v.meshDescCursor_;
        this.vertexCursor_ = v.vertexCursor_;
        this.indicesCursor_ = v.indicesCursor_;
        this.meshletDescCursor_ = v.meshletDescCursor_;
        this.meshletIndicesCursor_ = v.meshletIndicesCursor_;
        this.materialDescCursor_ = v.materialDescCursor_;
        this.textureCursor_ = v.textureCursor_;
    }

    /**
     * @description
     * @param v
     */
    plus = (v: HDMFCursor) => {
        this.hdmfDescCursor_ += v.hdmfDescCursor_;
        this.indirectCursor_ += v.indirectCursor_;
        this.instanceDescCursor_ += v.instanceDescCursor_;
        this.meshDescCursor_ += v.meshDescCursor_;
        this.vertexCursor_ += v.vertexCursor_;
        this.indicesCursor_ += v.indicesCursor_;
        this.meshletDescCursor_ += v.meshletDescCursor_;
        this.meshletIndicesCursor_ += v.meshletIndicesCursor_;
        this.materialDescCursor_ += v.materialDescCursor_;
        this.textureCursor_ += v.textureCursor_;
    }
}

/**
 * @description
 */
type LoadingStatus = 'done' | 'pending';

/**
 * @description
 *  enable rte as default.
 *  update scene desc need camera position.
 *  scene 
 */
type SceneData = {
    /**
     * 
     */
    needSync: boolean;

    /**
     * @description
     */
    model: Mat4;

    /**
     * @description
     */
    rt_hdmf_idx: number;
};

/**
 * @description
 */
type SceneDesc = {
    /**
     * @description
     */
    model: Mat4;

    /**
     * @description
     */
    rt_hdmf_idx: number;
}

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
     * @description
     *  运行时索引
     */
    rt_instance_idx: number;

    /**
     * @description
     *  运行时Mesh的动态索引.
     */
    rt_mesh_idx: number;

    /**
     * @description
     */
    rt_scene_idx: number;
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
    bounding_sphere: Vec4;

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
    rt_mesh_idx: number;

    /**
     * @description
     *  运行时mesh的顶点在全局顶点数组的偏移值，以顶点为单位
     */
    rt_vertex_offset: number;

    /**
     * @description
     *  运行时mesh的meshlet在全局meshlet数组的偏移值，以meshletDesc为单位
     */
    rt_meshlet_offset: number;

    /**
     * @description
     *  运行时材质索引
     */
    rt_material_idx: number;
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
    rt_meshlet_idx: number;

    /**
     * @description
     *  运行时Mesh索引
     */
    rt_mesh_idx: number;

    /**
     * @description
     *  运行时索引在全局的偏移，以uint32_t为单位
     */
    rt_index_offset: number;
};

/**
 * @description
 */
type TextureDesc = {
    /**
     * 
     */
    width: number;

    /**
     * 
     */
    height: number;

    /**
     * 
     */
    t: CompressTextureTYPE;

    /**
     * 
     */
    data: Uint8Array;

    /**
     * 
     */
    rt_texture_idx: number;
};

/**
 * @todo 待补全
 * @description
 * ref:
 * https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html#x=5d00000100c405000000000000003d888b0237284ce7dce121b384fd72bd9a1ff9093e7afbe531f45e6136ce0bb3eb900b77fcd0e422573cdd21f60b11e8f0c3c4e1e4873962b6411180455576555e52dd95d1c41d854e2e2711e3fc0d79fc6b7f8f5318d2f25f05eac55366e9c26d0906208e7c8eed74aadbdcfdd997248e79c6c63d3ab3a6868897b847433c6816ad42f6bdfef8431c194920be2add730c88b4cb7868b6c1077be5b13a49e1f1af311e04def51460100f1c33dba256c14d91e613ac87c12802b22763b09a2c255c3e9d9a8ebeb7c7baef79d95b7b5bd457efd84bd0af7ffc43b9c06af2feeb667bd1c53b3c9c73fc4a3bf13156ead3d3ab12992042c384a9bde673c8f5580d2c44d139bc1ecc76244e466439f688d08eb17f110bfca1ec34f254f0acc8764593fa8b412ffadc1c61f1cf96aa1b6f49ae42a3b4ee1931ad1e9b559aad3179df2766f7e92567ccae5752af7c73c631cca735bef816cb1d75c5ebf69eb1d1810da1959c190fe6affb75130ce64ad1a8da11ec222ee34eb86b8600ff9fbaa54b53ecd98fe41cb19232f8098d9ee690d5c112ed3f7543b1b3cfd3ddd681aac119523c6839d1b50535ee4c9376fe2f26f7a9b459aea7180dc4ebe76f053157d6298ca9c20de643a3ec825f003342d7e32e64ee300094638171385415d48f4c4b0621caf90ad046dc787670fd31767683ad7a135cd9bf35624189cb82d5eeb39bad9ba7e05673ee0e2eb0f917d891e528c28929a6452281b6aab532248af3611586283f3cd3b412b310b1f05fdebbbe647610757dbbc8ed8d049f16c71abae513101d0040bb3fdafff0db7189
 */
type MaterialDesc = {
    /**
     * u32
     * pack4xU8, 打包4个I8实现head信息存储
     * ref: https://github.com/KIWI-ST/toolbox/blob/main/tool/hdmf.fbs
     * [shading_mode, two_sided, opacity, blend_func]
     */
    head: number;

    /**
     * u32
     * @description 
     *  pbr, [use texture, texture index, sampler index, value]
     * [use texture] - U8
     * [texture index] - U8, high
     * [texture index] - U8, low
     * [sampler index] - U8
     */
    pbr_base_color: number;
    pbr_metallic: number;
    pbr_roughness: number;
    pbr_emissive: number;
    pbr_sheen_color: number;
    pbr_sheen_roughness: number;
    pbr_clearcoat: number;
    pbr_clearcoat_roughness: number;
    pbr_clearcoat_normal: number;
    pbr_anisotropy: number;
    pbr_transmission: number;
    pbr_volume_thickness: number;

    /**
     * @description
     *  phong, [use texture, texture index, sampler index, value]
     */
    phong_diffuse: number;
    phong_specular: number;
    phong_shiness: number;
    phong_ambient: number;
    phong_emissive: number;
    phong_reflectivity: number;

    /**
     * @description
     *  baked, [use texture, texture index, sampler index, value]
     */
    baked_ambient_occlusion: number;
    baked_light_map: number;

    /**
    * u32
    * 运行时材质索引
    */
    rt_matrial_idx: number;
};

/**
 * @description
 */
type SamplerDesc = {
    /**
     * 
     */
    blend: number;

    /**
     * 
     */
    uvindex: number;

    /**
     * 
     */
    mapping: number;

    /**
     * 
     */
    map_mode: number;

    /**
     * 
     */
    op: number;

    /**
     * 
     */
    rt_sampler_idx: number;
};

/**
 * @class HDMFComponent
 * @description
 * HDMF 数据结构中，真正需要被异步加载的资产只有两种：
 * - 网格体包。其中网格体包存储了簇、顶点、索引、材质等信息；材质如果包含纹理信息，则以ID形式存储。
 * - 纹理，以固定压缩方式（默认BC7）压缩后存放的二进制文件。
 * - queue:
 *  -- instanceDescQueue_
 *  -- meshDescQueue_
 *  -- meshletDescQueue_
 *  -- materialDescQueue_ 
 *  -- textureQueue_ 
 *  -- vertexQueue_
 *  -- meshletIndicesQueue_  
 *  -- indicesQueue_ 
 *  -- samplerQueue_ 
 */
class HDMFComponent extends BaseComponent {
    /**
    * 
    */
    private loadingStatus_: LoadingStatus = 'done';

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
    private waitRequestInstanceQueue_: InstanceData[] = [];

    /**
     * 服务端提供的有效tileset索引集
     */
    private serverTileset_: Set<string> = new Set();

    /**
     * @description
     *  记录实时请求的tile，防止重复请求。
     */
    private rtTile_: Set<string> = new Set();

    /**
     * @description
     *  记录实时请求的hdmf，防止重复请求。
     */
    private rtMesh_: Set<string> = new Set();

    /**
     * @description
     *  记录实时请求的texture，防止重复请求。
     */
    private rtTexture_: Set<string> = new Set();

    /**
     * @description
     */
    private sceneData_: SceneData;
    public get HDMFSceneData(): SceneData {
        return this.sceneData_;
    }

    /**
     * @description
     */
    private sceneDescQueue_: SceneDesc[] = [];
    public get HDMFSceneDescQueue(): SceneDesc[] {
        return this.sceneDescQueue_;
    }

    /**
     * 
     */
    private instanceDescQueue_: InstanceDesc[] = [];
    public get InstanceDescQueue(): InstanceDesc[] {
        return this.instanceDescQueue_;
    }

    /**
     * 
     */
    private meshDescQueue_: MeshDesc[] = [];
    public get MeshDescQueue(): MeshDesc[] {
        return this.meshDescQueue_;
    }

    /**
     * 
     */
    private meshletDescQueue_: MeshletDesc[] = [];
    public get meshletDescQueue(): MeshletDesc[] {
        return this.meshletDescQueue_;
    }

    /**
     * 
     */
    private materialDescQueue_: MaterialDesc[] = [];
    public get MaterialDescQueue(): MaterialDesc[] {
        return this.materialDescQueue_;
    }

    /**
     * 
     */
    private textureQueue_: TextureDesc[] = [];
    public get TextureQueue(): TextureDesc[] {
        return this.textureQueue_;
    }

    /**
     * 
     */
    private vertexQueue_: Float32Array[] = [];
    public get VertexQueue(): Float32Array[] {
        return this.vertexQueue_;
    }

    /**
     * 
     */
    private meshletIndicesQueue_: Uint32Array[] = [];
    public get MeshletIndicesQueue(): Uint32Array[] {
        return this.meshletIndicesQueue_;
    }

    /**
     * 
     */
    private indicesQueue_: Uint32Array[] = [];
    public get IndicesQueue(): Uint32Array[] {
        return this.indicesQueue_;
    }

    /**
     * 
     */
    private samplerQueue_: SamplerDesc[] = [];
    public get SamplerQueue(): SamplerDesc[] {
        return this.samplerQueue_;
    }

    /**
     * @description
     *  mapping of instance uuid and instance data.
     * - related mesh uuid.
     * - model matrix.
     */
    private instanceDataMap_: Map<string, InstanceData> = new Map();

    /**
     * @description
     *  mapping of mesh uuid and mesh data.
     * - 
     */
    private meshDataMap_: Map<string, MeshData> = new Map();

    /**
     * @description
     */
    private materialDataMap_: Map<string, MaterialData> = new Map();

    /**
    * 记录运行时加载的ktx2.0
    */
    private textureDataMap_: Map<string, KTXPackData> = new Map();

    /**
     * @description
     * sampler 信息与其他信息不一样，sampler 属于可共享在所有
     */
    public static SharedSamplerDataMap: Map<string, SamplerData> = new Map();

    /**
     * @description
     *  hdmf meta data. 
     */
    public get MetaData(): MetaData | undefined {
        return this.metaData_;
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
        this.sceneData_ = { needSync: true, model: mat4d.identity(), rt_hdmf_idx: ERROR_CODE };
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
     * @description
     * @param samplers 
     */
    private loadSamplers = (samplers: SamplerData[]) => {
        samplers.forEach(sampler => {
            const uuid = sampler.uuid;
            if (!HDMFComponent.SharedSamplerDataMap.has(uuid)) {
                HDMFComponent.SharedSamplerDataMap.set(uuid, sampler);
            } else {
                console.warn(`[W][loadSamplers] sampler has added, uuid: ${uuid}`);
            }
        });
    }

    /**
     * @description
     *  load material.
     * - material data.
     * - ktx texture data.
     * @param item 
     */
    private loadMaterial = async (item: MaterialData): Promise<void> => {
        if (this.materialDataMap_.has(item.uuid)) {
            return;
        }
        // assing material map.
        this.materialDataMap_.set(item.uuid, item);

        const Load = async (scaler: ScalerData): Promise<void> => {
            const key = scaler.texture_uuid;
            if (!key || (key && (key.trim().length === 0 || this.textureDataMap_.has(key) || this.rtTexture_.has(key)))) {
                return;
            }
            this.rtTexture_.add(key);
            const uri = `${this.rootDir_}${this.metaData_?.texture_dir}/${key}.ktx2`;
            const ktxAsset = await fetchKTX2AsBc7RGBA(uri, key);
            if (ktxAsset) {
                // assign texture map.
                this.textureDataMap_.set(ktxAsset.uuid, ktxAsset);
            }
            else {
                console.error(`[E][loadTexture] load texture error. requet uri: ${uri}`);
                this.rtTexture_.delete(key);
            }
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
    private loadInstance = async (instance: InstanceData): Promise<void> => {
        // 装配 mesh： 未添加的 mesh 在此装配成 meshDesc
        const mesh_uuid: string = instance.mesh_uuid;
        if (!this.meshDataMap_.has(mesh_uuid) && !this.rtMesh_.has(mesh_uuid)) {
            this.rtMesh_.add(mesh_uuid);
            // 直接请求 .hdmf 并解析
            // TODO:: request in web workers.
            const uri = `${this.rootDir_}${this.metaData_?.mesh_dir}/${instance.mesh_uuid}.hdmf`;
            const u8arr = await fetchHDMF(uri);
            if (u8arr) {
                const meshAsset = parseHDMFv2(u8arr);
                if (this.meshDataMap_.has(meshAsset.uuid)) {
                    // assign mesh map.
                    this.meshDataMap_.set(meshAsset.uuid, meshAsset);
                    // assign texture map.
                    await this.loadMaterial(meshAsset.material);
                    // assign sampler map.
                    this.loadSamplers(meshAsset.samplers);
                } else {
                    console.warn(`[W][enqueue] parseHMDFv2 error, missing pre request.`)
                }
            } else {
                this.rtMesh_.delete(mesh_uuid);
                this.meshDataMap_.delete(instance.mesh_uuid);
            }
        }
    }

    /**
     * @description
     * @param scaler 
     * @returns 
     */
    private packScaler = (scaler: ScalerData): number => {
        if (scaler.texture_uuid && !this.textureDataMap_.has(scaler.texture_uuid)) {
            return -1;
        }
        if (scaler.sampler_uuid && !HDMFComponent.SharedSamplerDataMap.has(scaler.sampler_uuid)) {
            return -1;
        }
        if (scaler.texture_uuid && scaler.sampler_uuid) {
            const rt_texture_idx = this.textureDataMap_.get(scaler.texture_uuid)!.rt_texture_idx;
            const [b, c] = unpack2xU8(rt_texture_idx);
            const d = HDMFComponent.SharedSamplerDataMap.get(scaler.sampler_uuid)!.rt_sampler_idx;
            return pack4xU8(1, b, c, d);
        } else if (scaler.texture_uuid) {
            const rt_texture_idx = this.textureDataMap_.get(scaler.texture_uuid)!.rt_texture_idx;
            const [b, c] = unpack2xU8(rt_texture_idx);
            return pack4xU8(1, b, c, 0);
        } else {
            return pack4xU8(0, 0, 0, 0);
        }
    }

    /**
     * 如果pack成果，返回materialDesc, 失败返回undefined
     * @param v 
     */
    private packMaterialData2Desc = (v: MaterialData): MaterialDesc | undefined => {
        const q: MaterialDesc = {
            head: pack4xU8(v.shading_mode, v.two_sided, (v.opacity * 255), v.blend_func),
            pbr_base_color: this.packScaler(v.pbr.base_color),
            pbr_metallic: this.packScaler(v.pbr.metallic),
            pbr_roughness: this.packScaler(v.pbr.roughness),
            pbr_emissive: this.packScaler(v.pbr.emissive),
            pbr_sheen_color: this.packScaler(v.pbr.sheen_color),
            pbr_sheen_roughness: this.packScaler(v.pbr.sheen_roughness),
            pbr_clearcoat: this.packScaler(v.pbr.clearcoat),
            pbr_clearcoat_roughness: this.packScaler(v.pbr.clearcoat_roughness),
            pbr_clearcoat_normal: this.packScaler(v.pbr.clearcoat_normal),
            pbr_anisotropy: this.packScaler(v.pbr.anisotropy),
            pbr_transmission: this.packScaler(v.pbr.transmission),
            pbr_volume_thickness: this.packScaler(v.pbr.volume_thickness),
            phong_diffuse: this.packScaler(v.phong.diffuse),
            phong_specular: this.packScaler(v.phong.specular),
            phong_shiness: this.packScaler(v.phong.shiness),
            phong_ambient: this.packScaler(v.phong.ambient),
            phong_emissive: this.packScaler(v.phong.emissive),
            phong_reflectivity: this.packScaler(v.phong.reflectivity),
            baked_ambient_occlusion: this.packScaler(v.baked.ambient_occlusion),
            baked_light_map: this.packScaler(v.baked.light_map),
            rt_matrial_idx: v.rt_material_idx
        };
        const valid =
            q.pbr_base_color !== -1 &&
            q.pbr_metallic !== -1 &&
            q.pbr_roughness !== -1 &&
            q.pbr_emissive !== -1 &&
            q.pbr_sheen_color !== -1 &&
            q.pbr_sheen_roughness !== -1 &&
            q.pbr_clearcoat !== -1 &&
            q.pbr_clearcoat_roughness !== -1 &&
            q.pbr_clearcoat_normal !== -1 &&
            q.pbr_anisotropy !== -1 &&
            q.pbr_transmission !== -1 &&
            q.pbr_volume_thickness !== -1 &&
            q.phong_diffuse !== -1 &&
            q.phong_specular !== -1 &&
            q.phong_shiness !== -1 &&
            q.phong_ambient !== -1 &&
            q.phong_emissive !== -1 &&
            q.phong_reflectivity !== -1 &&
            q.baked_ambient_occlusion !== -1 &&
            q.baked_light_map !== -1
            ;
        if (valid) {
            return q;
        }
        return undefined;
    }

    /**
     * @description
     *  enqueue GPU-Friendly data.
     * - instance
     */
    private enqueue = () => {
        // scene data enqueue.
        if (this.sceneData_.needSync) {
            const q: SceneDesc = {
                model: this.sceneData_.model,
                rt_hdmf_idx: this.sceneData_.rt_hdmf_idx
            };
            this.sceneDescQueue_.push(q);
            this.sceneData_.needSync = false;
        }

        // instance desc enqueue.
        for (const [_k, v] of this.instanceDataMap_) {
            if (!v.needSync || !this.meshDataMap_.has(v.mesh_uuid)) {
                continue;
            }
            const rt_mesh_idx = this.meshDataMap_.get(v.mesh_uuid)!.rt_mesh_idx;
            const q: InstanceDesc = {
                model: v.model,
                rt_instance_idx: v.rt_instance_idx,
                rt_mesh_idx: rt_mesh_idx,
                rt_scene_idx: this.sceneData_.rt_hdmf_idx,
            };
            this.instanceDescQueue_.push(q);
            v.needSync = false;
        }
        // sampler desc enqueue.
        for (const [_k, v] of HDMFComponent.SharedSamplerDataMap) {
            if (!v.needSync) {
                continue;
            }
            const q: SamplerDesc = {
                blend: v.blend,
                uvindex: v.uvindex,
                mapping: v.mapping,
                map_mode: v.map_mode,
                op: v.op,
                rt_sampler_idx: v.rt_sampler_idx
            };
            this.samplerQueue_.push(q);
            v.needSync = false;
        }
        // texture enqueue
        for (const [_k, v] of this.textureDataMap_) {
            if (!v.needSync) {
                continue;
            }
            const q: TextureDesc = {
                width: v.width,
                height: v.height,
                t: v.t,
                data: v.data,
                rt_texture_idx: v.rt_texture_idx
            };
            this.textureQueue_.push(q);
            v.needSync = false;
        }
        // material desc enqueue
        for (const [_k, v] of this.materialDataMap_) {
            // due to material deps texture, need check texture load status first.
            if (v.needSync) {
                const q = this.packMaterialData2Desc(v);
                if (q) {
                    this.materialDescQueue_.push(q);
                    v.needSync = false;
                } else {
                    console.warn(`[W] materialData convert to queue failed. materialData uuid: ${v.uuid}.`);
                }
            }
        }
        // mesh-based enqueue
        for (const [_k, v] of this.meshDataMap_) {
            // dep material runtime idx.
            if (!v.needSync) {
                continue;
            }
            // TODO::
            // all material set as opaque.
            // has material, but material wait load.
            const hasMaterial = v.material && v.material.uuid && v.material.uuid.trim().length > 0;
            if (hasMaterial && !this.materialDataMap_.has(v.material.uuid)) {
                continue;
            }
            const rt_material_idx: number = hasMaterial ? this.materialDataMap_.get(v.material.uuid)!.rt_material_idx : ERROR_CODE;
            const q: MeshDesc = {
                bounding_sphere: v.bounding_sphere,
                meshlet_count: v.meshlet_count,
                rt_mesh_idx: v.rt_mesh_idx,
                rt_vertex_offset: v.rt_vertex_offset,
                rt_meshlet_offset: v.rt_meshlet_offset,
                rt_material_idx: rt_material_idx
            };
            this.meshDescQueue_.push(q);
            // meshlet desc enqueue.
            v.meshlets.forEach(meshlet => {
                const q: MeshletDesc = {
                    refined_bounding_sphere: meshlet.refined_bounding_sphere,
                    self_bounding_sphere: meshlet.self_bounding_sphere,
                    simplified_bounding_sphere: meshlet.simplified_bounding_sphere,
                    refined_error: meshlet.refined_error,
                    self_error: meshlet.self_error,
                    simplified_error: meshlet.simplified_error,
                    index_count: meshlet.index_count,
                    rt_meshlet_idx: meshlet.rt_meshlet_idx,
                    rt_mesh_idx: meshlet.rt_mesh_idx,               // check mesh uuid and runtime index.
                    rt_index_offset: meshlet.rt_index_offset,
                };
                // meshlet desc enqueue.
                this.meshletDescQueue_.push(q);
                // meshlet indices enqueue.
                this.meshletIndicesQueue_.push(meshlet.indices);
            });
            // vertex enqueue.
            this.vertexQueue_.push(v.vertex);
            // indices enqueue.
            this.indicesQueue_.push(v.indices);
            v.needSync = false;
        }
    }

    /**
     * @description
     * - 以mesh为单位组织vertex\indices\material\meshlet数据
     * - 另组织instance数据
     */
    private refreshMemory = (cursor: HDMFCursor): void => {
        // instance runtime index.
        let instanceDescCursor = cursor.InstanceDescCursor;
        for (const [_k, v] of this.instanceDataMap_) {
            v.rt_instance_idx = instanceDescCursor++;
        }
        // texture runtime index.
        let textureCursor = cursor.TextureCursor;
        for (const [_k, v] of this.textureDataMap_) {
            v.rt_texture_idx = textureCursor++;
        }
        // materials runtime index.
        let materialDescCursor = cursor.MaterialDescCursor;
        for (const [_k, v] of this.materialDataMap_) {
            v.rt_material_idx = materialDescCursor++;
        }
        // mesh\vertex\meshlet\meshlet indices\ runtime index
        let meshCursor = cursor.MeshDescCursor;
        let vertexCursor = cursor.InstanceDescCursor;
        let meshletCursor = cursor.MeshletDescCursor;
        let meshletIndicesCursor = cursor.MeshletIndicesCursor;
        for (const [_key, v] of this.meshDataMap_) {
            // assign mesh index.
            v.rt_mesh_idx = meshCursor++;
            // assign mesh vertex global offset.
            vertexCursor += v.vertex_count;
            v.rt_vertex_offset = vertexCursor;
            // assign meshlet global offset
            v.meshlets.forEach(meshlet => {
                meshletIndicesCursor += meshlet.index_count;
                meshlet.rt_index_offset = meshletIndicesCursor;
                meshlet.rt_mesh_idx = v.rt_mesh_idx;
                meshlet.rt_meshlet_idx = meshletCursor++;
            });
        }
        // enqueue GPU-Friendly data.
        this.enqueue();
    }

    /**
     * @description
     *  - tile
     *  - request meta data.
     *  - for service.
     * @param _args 
     * @param {Map<string, HDMFCursor>} allocatedMap mapping of component uuid and Allocated. 
     */
    public async update(visualRevealTiles: QuadtreeTile[], LIMIT: number, allocatedMap: Map<string, HDMFCursor>): Promise<number> {
        // try allocate memory.
        // return while failed.
        if (!allocatedMap.has(this.UUID)) {
            console.warn(`[W][update] allocate memory failed, component update skipped.`);
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
            const tileData = await fetchTileData(tileUri, tileKey);
            // 如果没有返回数据，直接跳过不阻塞
            if (!tileData) {
                console.warn(`[W][HardwareDenseMeshFriendlyComponent] missing tile data. key ${tileKey}`);
                continue;
            }
            // request tiles by visual reveal tile queue.
            for (const instance of tileData.instanceArr) {
                if (!this.instanceDataMap_.has(instance.uuid)) {
                    this.instanceDataMap_.set(instance.uuid, instance);
                    this.waitRequestInstanceQueue_.push(instance);
                }
            }
            this.rtTile_.add(tileKey);
        }
        this.loadingStatus_ = 'done';

        // remain compute limit.
        this.refreshMemory(allocatedMap.get(this.UUID)!);
        return LIMIT;
    }
}

export {
    type SceneDesc,
    type InstanceDesc,
    type MeshDesc,
    type MeshletDesc,
    type MaterialDesc,
    type TextureDesc,
    type SamplerDesc,
    HDMFCursor,
    HDMFComponent,
}