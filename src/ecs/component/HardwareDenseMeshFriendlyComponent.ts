import type { Vec4 } from "wgpu-matrix";

import { BaseComponent } from "../BaseComponent";

/**
 * @description
 */
type MeshDesc = {
    /**
     * @description uuid of mesh.
     */
    uuid: string;

    /**
     * @description bounding sphere of mesh, [center x, center y, center z, radius]
     */
    bounding_sphere: Vec4;

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

type MeshletDesc = {
    refined_bounding_sphere: Vec4,
    self_bounding_sphere: Vec4,
    simplified_bounding_sphere: Vec4,
    refined_error: number,
    self_error: number,
    simplified_error: number,
    cluster_id: number,
    mesh_id: number,
    index_count: number,
    index_offset: number,
};

/**
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
    meshlet_count: number;
    projection: string;
    raw_triangle_count: number;
    scene_version: string;
    mesh_dir: string;
    lod_dir: string;
    texture_dir: string;
    meshlet_indices_count: number;
};

/**
 * @class MeshComponent
 * @description
 */
class HardwareDenseMeshFriendlyComponent extends BaseComponent {
    /**
     * 
     */
    // private hdmf_: HardwareDenseMeshFriendly;

    private rootUri_: string;

    private hardwareDenseMeshFriendlyDesc_?: HardwareDenseMeshFriendlyDesc;

    /**
     * @description hdmf service.
     * @param {string} rootUri, the root dir of hdmf service. e.g http://127.0.0.1/service/DamagedHelmet/
     */
    constructor(rootUri: string) {
        super('HardwareDenseMeshFriendlyComponent');
        this.rootUri_ = rootUri;
    }

    private async initRoot(): Promise<void> {
        try {
            const uri: string = `${this.rootUri_}scene.json`;
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

    public override async update(): Promise<void> {
        if (this.IsEnable && !this.hardwareDenseMeshFriendlyDesc_) {
            await this.initRoot();
        }
    }
}

export {
    HardwareDenseMeshFriendlyComponent
}