import type { Mat4d, Vec2d, Vec4d } from "wgpu-matrix";

import { BaseComponent } from "../BaseComponent";
import { GeodeticCoordinate, QuadtreeTile } from "@pipegpu/geography";
import type { Instance } from "../../util/fetchHDMF";
import type { KTXPackData } from "../../util/fetchKTX";

/**
 * @description Mesh（网格体）描述信息
 */
type MeshDesc = {
    /**
     * @description uuid of mesh.
     */
    uuid: string;

    /**
     * @description bounding sphere of mesh, [center x, center y, center z, radius]
     */
    bounding_sphere: Vec4d;

    /**
     * 
     */
    meshlet_count: number;

    /**
     * @description runtime mesh index, assigned in CPU scene.
     * 运行时物件索引
     */
    runtime_mesh_idx: number;

    /**
     * @description runtime material index, assigned in CPU scene.
     * 运行时材质索引
     */
    runtime_material_idx: number;

    /**
     * @description runtime mesh vertex offset, assigned in CPU scene at MeshSystem stage.
     * 运行时 mesh 的顶点在全局顶点数组的偏移值，以顶点为单位
     */
    runtime_vertex_offset: number,

    /**
     * @description runtime meshlet offset, assigned in CPU scene at MeshSystem stage.
     * 运行时 mesh 的 meshlet 在全局 meshlet 数组的偏移值，以 meshletDesc 为单位
     */
    runtime_meshlet_offset: number,
};

/**
 * @description 簇描述信息
 */
type MeshletDesc = {
    /**
     * meshlet 细化簇外包球
     */
    refined_bounding_sphere: Vec4d;

    /**
     * mehslet 自身簇外包球
     */
    self_bounding_sphere: Vec4d;

    /**
     * meshlet 父级簇外包球
     */
    simplified_bounding_sphere: Vec4d;

    /**
     * 细化簇 error
     */
    refined_error: number;

    /**
     * 自身 error
     */
    self_error: number;

    /**
     * 父级 error
     */
    simplified_error: number;

    /**
     * meshlet 索引buffer长度
     */
    index_count: number;

    /**
     * 所属cluster索引，运行时
     */
    cluster_id: number;

    /**
     * 所属mesh索引，运行时
     */
    mesh_id: number;

    /**
     * meshlet 索引偏移，运行时
     */
    index_offset: number;
};

/**
 * @description 从服务端读取的服务元信息
 * pack data into unit by Mesh view.
 */
type HardwareDenseMeshFriendlyDesc = {
    /**
     * @description prevent invalid tile request origin data.
     */
    vaild_tiles: string[];

    /**
     * 
     */
    instance_spread_meshlet_count: number;

    /**
     * 
     */
    vaild_instance_spread_meshlet_count: number;

    /**
     * 
     */
    instance_count: number;

    /**
     * 
     */
    mesh_count: number;

    /**
     * 
     */
    texture_count: number;

    /**
     * 
     */
    vertex_count: number;

    /**
     * 
     */
    meshlet_count: number;

    /**
     * 
     */
    projection: string;

    /**
     * 
     */
    raw_triangle_count: number;

    /**
     * 
     */
    scene_version: string;

    /**
     * 
     */
    mesh_dir: string;

    /**
     * 
     */
    lod_dir: string;

    /**
     * 
     */
    texture_dir: string;

    /**
     * 
     */
    meshlet_indices_count: number;
};

type Scaler = {
    scaler: Vec4d;
    texture_uuid: string;
    sampler_uuid: string;
};

type PhongDesc = {
    diffuse: Scaler;
    specular: Scaler;
    shiness: Scaler;
    ambient: Scaler;
    emissive: Scaler;
    reflectivity: Scaler;
};

/**
 * 
 */
type PBRDesc = {
    base_color: Scaler;
    metallic: Scaler;
    roughness: Scaler;
    emissive: Scaler;
    sheen_color: Scaler;
    sheen_roughness: Scaler;
    clearcoat: Scaler;
    clearcoat_roughness: Scaler;
    clearcoat_normal: Scaler;
    anisotropy: Scaler;
    transmission: Scaler;
    volume_thickness: Scaler;
};

type BakedDesc = {
    ambient_occlusion: Scaler;
    light_map: Scaler;
};

/**
 * 
 */
type MaterialDesc = {
    uuid: string;
    shading_mode: number;
    two_sided: number;
    enable_wireframe: number;
    blend_func: number;
    opacity: number;
    render_mode: number;
    pbr: PBRDesc;
    phong: PhongDesc;
    baked: BakedDesc;
};

type RuntimeMeshTYPE = {
    runtimeID: number,
    meshletCount: number
};

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
/**
 * @class MeshComponent
 * @description
 */
class HardwareDenseMeshFriendlyComponent extends BaseComponent {
    /**
     * 
     */
    private hardwareDenseMeshFriendlyDesc_?: HardwareDenseMeshFriendlyDesc;

    /**
     * 
     */
    private loc_: GeodeticCoordinate;

    /**
     * 记录场景内最大的 instance 数量
     */
    private sceneInstanceCount: number = 0;

    /**
     * 基于instance 展开统计场景总 Meshlet 数量, 间接绘制命令执行最大数量
     */
    private sceneInstanceMeshletCount: number = 0;

    /**
     * 记录单个Mesh中最大的meshlet数量
     */
    private sceneMaxMeshletCountOfMesh: number = 0;

    /**
     * 服务端提供的有效 tileset 索引集
     */
    private serverTileset: Set<string> = new Set();

    /**
     * 场景运行时 TILE 集.
     */
    private tileRuntimeMap: Map<string, number> = new Map();

    /**
     * 记录运行时 isntance 的 ID.
     */
    private instanceDescRuntimeMap: Map<string, number> = new Map();

    /**
     * 记录运行时 mesh 的 ID.
     */
    private meshDescRuntimeMap: Map<string, RuntimeMeshTYPE> = new Map();

    /**
     * 记录运行时 texture 对应的 ID.
     */
    private textureRuntimeMap: Map<string, number> = new Map();

    /**
     * 记录运行时 indexedIndrect 命令.
     */
    private runtimeMeshIDWithIndexedIndirectsMap: Map<number, DrawIndexedIndirect[]> = new Map();

    /**
     * 
     */
    private tileCursor: number = 0;

    /**
     * 
     */
    private instanceDescCursor: number = 0;

    /**
     * 
     */
    private meshDescCursor: number = 0;

    /**
     * 
     */
    private meshletDescCursor: number = 0;

    /**
     * 材质运行时 ID.
     */
    private materialDescCrusor: number = 0;

    /**
     * 纹理运行时 ID.
     */
    private textureCursor: number = 0;

    /**
     * 
     */
    private rootUri: string;

    /**
     * 请求 instance 队列.
     */
    private waitRequestInstanceQueue: Instance[] = [];

    /**
     * 实例队列
     */
    private instanceDescQueue: InstanceDesc[] = [];

    /**
     * mesh 队列
     */
    private meshDescQueue: MeshDesc[] = [];

    /**
     * meshlet 队列
     */
    private meshletDescQueue: MeshletDesc[] = [];

    /**
     * 顶点-位置 + 法线 + uv 队列
     */
    private vertexQueue: Float32Array[] = [];

    /**
     * instance - meshlet index
     */
    private meshletMapQueue: Vec2d[] = [];

    /**
     * 
     */
    private indexedQueue: Uint32Array[] = [];

    /**
     * 
     */
    private instanceOrderQueue: Uint32Array[] = [];

    /**
     * 
     */
    private indexedIndirectQueue: Uint32Array[] = [];

    /**
     * material 材质队列
     */
    private materialDescQueue: MaterialDesc[] = [];

    /**
     * ktx texture 队列
     */
    private textureQueue: KTXPackData[] = [];


    /**
     * @description hdmf service.
     * @param {string} rootUri, the root dir of hdmf service. e.g http://127.0.0.1/service/DamagedHelmet/
     */
    constructor(rootUri: string, loc: GeodeticCoordinate = new GeodeticCoordinate(0.0, 0.0)) {
        super('HardwareDenseMeshFriendlyComponent');
        this.rootUri = rootUri;
        this.loc_ = loc;
    }

    private async initRoot(): Promise<void> {
        try {
            const uri: string = `${this.rootUri}scene.json`;
            const response = await fetch(uri);
            const json = await response.json();
            this.hardwareDenseMeshFriendlyDesc_ = {
                vaild_tiles: json['vaild_tiles'],
                instance_spread_meshlet_count: json['instance_spread_meshlet_count'],
                vaild_instance_spread_meshlet_count: json['vaild_instance_spread_meshlet_count'],
                instance_count: json['instance_count'],
                mesh_count: json['mesh_count'],
                texture_count: json['texture_count'],
                projection: json['projection'],
                scene_version: json['scene_version'],
                vertex_count: json['vertex_count'],
                meshlet_count: json['meshlet_count'],
                raw_triangle_count: json['raw_triangle_count'] || 0,
                texture_dir: json['texture_dir'],
                lod_dir: json['lod_dir'],
                mesh_dir: json['mesh_dir'],
                meshlet_indices_count: json['meshlet_indices_count'],
            };
        }
        catch (err) {
            console.error(`[E][HardwareDenseMeshFriendlyComponent][initRoot] fetch scene.json error, ${err}.`);
        }
    }

    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
        if (b && !this.hardwareDenseMeshFriendlyDesc_) {
            await this.initRoot();
        }
    }

    public override async update(..._args: any[]): Promise<void> {
        if (this.IsEnable && !this.hardwareDenseMeshFriendlyDesc_) {
            await this.initRoot();
        }

        const visualRevealTiles = _args[0] as QuadtreeTile[];
        // request tiles by visual reveal tile queue.
        if (visualRevealTiles) {
            const l = _args[1] as number;
        }
        else {

        }



    }
}

export {
    HardwareDenseMeshFriendlyComponent
}