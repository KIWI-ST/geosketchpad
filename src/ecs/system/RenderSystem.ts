import { IndexedStorageSnippet, MeshDescSnippet, MeshletDescSnippet, OrderedGraph, SceneDescSnippet, StorageVec2U32Snippet, VertexSnippet, ViewPlaneSnippet, ViewProjectionSnippet, ViewSnippet } from "@pipegpu/graph";
import { IndexedStorageBuffer, StorageBuffer, UniformBuffer, type BufferArrayHandle, type BufferHandle, type BufferHandleDetail } from "@pipegpu/core";
import type { Camera } from "@pipegpu/camera";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import { HDMFCursor, type HDMFQueueGroup, type InstanceDesc, type MaterialDesc, type MeshDesc, type MeshletDesc, type SceneDesc, type TextureDesc } from "../component/HDMFComponent";
import { mat4d, vec3d, vec4d, type Mat4d, type Vec3d, type Vec4d } from "wgpu-matrix";
import { EllipsoidComponent } from "../component/EllipsoidComponent";

/**
 * @description
 */
type RES = {
    'ViewProjectionBuffer'?: {
        snippet: ViewProjectionSnippet,
        viewProjectionBuffer: UniformBuffer,
    };
    'ViewPlaneBuffer'?: {
        snippet: ViewPlaneSnippet,
        viewPlaneBuffer: UniformBuffer,
    };
    'ViewBuffer'?: {
        snippet: ViewSnippet,
        viewBuffer: UniformBuffer,
    },
    'VertexBuffer'?: {
        snippet: VertexSnippet,
        vertexBuffer: StorageBuffer,
    };
    'IndexedStorageBuffer'?: {
        snippet: IndexedStorageSnippet,
        indexedStorageBuffer: IndexedStorageBuffer,
    };
    /**
     * @description
     * 全局加入场景的instance, 对应的mesh下运行时meshlet在全局的索引；
     * 形态如：
     * (0, 1) 全局地0个instance, 他由全局id为1的meshlet组成；
     * (0, 3) 全局地0个instance, 他由全局id为3的meshlet组成；
     * (0, 7) 全局地0个instance, 他由全局id为7的meshlet组成；
     */
    'InstanceMeshletBuffer'?: {
        snippet: StorageVec2U32Snippet,
        instanceMeshletBuffer: StorageBuffer,
    };
    'SceneDescBuffer'?: {
        snippet: SceneDescSnippet,
        sceneDescBuffer: StorageBuffer,
    };
    'MeshDescBuffer'?: {
        snippet: MeshDescSnippet,
        meshDescBuffer: StorageBuffer,
    };
    'MeshletDescBuffer'?: {
        snippet: MeshletDescSnippet,
        meshletDescBuffer: StorageBuffer,
    };
};

/**
 * @description
 * @param viewMat 
 * @returns 
 */
const getViewRTE = (viewMat: Mat4d): Mat4d => {
    const rte = mat4d.clone(viewMat);
    rte[12] = 0;
    rte[13] = 0;
    rte[14] = 0;
    return rte;
};

/**
 * 
 */
const NoBufferArrayUpdateRequired = {
    rewrite: false,
    details: [],
};

/**
 * @class RenderSystem
 * @description
 *  WARNING!!! only support HDMFv2 Spec Rendering.
 * - with render graph.
 * - register render resource.
 */
class RenderSystem extends BaseSystem {
    /**
     * 
     */
    private camera_?: Camera;

    /**
     * 
     */
    private renderGraph_: OrderedGraph;

    /**
     * 
     */
    private res_: RES = {};


    /**
     * @description
     */
    private group_?: HDMFQueueGroup;

    /**
     * @description
     */
    private statsCursor_?: HDMFCursor;

    /**
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
        this.renderGraph_ = new OrderedGraph(scene._state_renderer_.ctx3d);
    }

    private refreshBuffer = () => {

    };

    /**
     * @description register camera.
     */
    private refreshViewProjectionBuffer(camera: Camera) {
        this.camera_ = camera;
        if (this.res_.ViewProjectionBuffer) {
            return;
        }
        const bLen = 32 * 4;
        const compiler = this.scene_._state_renderer_.cpl3d;
        const viewProjectionSnippet = new ViewProjectionSnippet(compiler);
        const handler: BufferHandle = () => {
            const buffer = new ArrayBuffer(128);
            const bufferViews = {
                projection: new Float32Array(buffer, 0, 16),
                view: new Float32Array(buffer, 64, 16),
            };
            // TODO:: float64 convert to float32 array.
            const viewRTE = getViewRTE(this.camera_!.ViewMatrix);
            bufferViews.view.set(new Float32Array(viewRTE));
            bufferViews.projection.set(new Float32Array(this.camera_!.ProjectionMatrix));
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: bLen,
                    rawData: buffer,
                }
            }
        };
        const viewProjectionBuffer = compiler.createUniformBuffer({
            totalByteLength: bLen,
            handler: handler
        });
        // register to graph resoruce.
        this.res_.ViewProjectionBuffer = {
            snippet: viewProjectionSnippet,
            viewProjectionBuffer: viewProjectionBuffer,
        }
    }

    /**
     * @description register view plane buffer with camera.
     * @param camera 
     * @returns 
     */
    private refreshViewPlaneBuffer = (camera: Camera) => {
        this.camera_ = camera;
        if (this.res_.ViewPlaneBuffer) {
            return;
        }
        const bLen = 4 * 4 * 6;
        const compiler = this.scene_._state_renderer_.cpl3d;
        const handler: BufferHandle = () => {
            const viewRTE = getViewRTE(this.camera_!.ViewMatrix);
            const m = mat4d.mul(this.camera_!.ProjectionMatrix, viewRTE);
            let mat = m;
            const planes: number[] = [];
            // 组织plane六个面
            const v3: Vec3d = vec3d.create();
            // left
            {
                v3[0] = -(mat[3] + mat[0]);
                v3[1] = -(mat[7] + mat[4]);
                v3[2] = -(mat[11] + mat[8]);
                const l: Vec4d = vec4d.create();
                l.set([
                    v3[0] / vec3d.len(v3),
                    v3[1] / vec3d.len(v3),
                    v3[2] / vec3d.len(v3),
                    -(mat[15] + mat[12]) / vec3d.len(v3),
                ]);
                planes.push(...l);
            }
            // right
            {
                v3[0] = mat[0] - mat[3];
                v3[1] = mat[4] - mat[7];
                v3[2] = mat[8] - mat[11];
                const r: Vec4d = vec4d.create();
                r.set([
                    v3[0] / vec3d.len(v3),
                    v3[1] / vec3d.len(v3),
                    v3[2] / vec3d.len(v3),
                    (mat[12] - mat[15]) / vec3d.len(v3),
                ]);
                planes.push(...r);
            }
            // top
            {
                v3[0] = -(mat[3] + mat[1]);
                v3[1] = -(mat[7] + mat[5]);
                v3[2] = -(mat[11] + mat[9]);
                const t: Vec4d = vec4d.create();
                t.set([
                    v3[0] / vec3d.len(v3),
                    v3[1] / vec3d.len(v3),
                    v3[2] / vec3d.len(v3),
                    -(mat[15] + mat[13]) / vec3d.len(v3),
                ]);
                planes.push(...t);
            }
            // bottom
            {
                v3[0] = mat[1] - mat[3];
                v3[1] = mat[5] - mat[7];
                v3[2] = mat[9] - mat[11];
                const b: Vec4d = vec4d.create();
                b.set([
                    v3[0] / vec3d.len(v3),
                    v3[1] / vec3d.len(v3),
                    v3[2] / vec3d.len(v3),
                    (mat[13] - mat[15]) / vec3d.len(v3),
                ]);
                planes.push(...b);
            }
            // near
            {
                v3[0] = -(mat[2] + mat[3]);
                v3[1] = -(mat[6] + mat[7]);
                v3[2] = -(mat[10] + mat[11]);
                const n: Vec4d = vec4d.create();
                n.set([
                    v3[0] / vec3d.len(v3),
                    v3[1] / vec3d.len(v3),
                    v3[2] / vec3d.len(v3),
                    -(mat[14] + mat[15]) / vec3d.len(v3),
                ]);
                planes.push(...n);
            }
            // far
            {
                v3[0] = mat[2] - mat[3];
                v3[1] = mat[6] - mat[7];
                v3[2] = mat[10] - mat[11];
                const f: Vec4d = vec4d.create();
                f.set([
                    v3[0] / vec3d.len(v3),
                    v3[1] / vec3d.len(v3),
                    v3[2] / vec3d.len(v3),
                    (mat[14] - mat[15]) / vec3d.len(v3),
                ]);
                planes.push(...f);
            }
            const rawDataf32 = new Float32Array(planes);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: bLen,
                    rawData: rawDataf32
                }
            }
        };
        const viewPlaneBuffer = compiler.createUniformBuffer({
            totalByteLength: bLen,
            handler: handler,
        });
        this.res_.ViewPlaneBuffer = {
            viewPlaneBuffer: viewPlaneBuffer,
            snippet: new ViewPlaneSnippet(compiler),
        };
    }

    /**
     * @description
     */
    private refreshViewBuffer = (camera: Camera) => {
        this.camera_ = camera;
        if (this.res_.ViewBuffer) {
            return;
        }
        const bLen = 64;
        const scene = this.scene_;
        const handler: BufferHandle = () => {
            const c = this.camera_!;
            const rawDataF32 = new Float32Array([
                c.Position[0],
                c.Position[1],
                c.Position[2],
                c.fetchVerticalScalingFactor(),
                scene.Width,
                scene.Height,
                c.fetchNear(),
                c.fetchFar(),
                0.1,                            // TODO, pixel threshold.
                1.0,                            // TODO, software reasteriazer threshold.
                c.fetchFarDepthFromNearPlusOne(),
                c.fetchOneOverLog2FarDepthFromNearPlusOne()
            ]);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: bLen,
                    rawData: rawDataF32,
                }
            }
        };
        const compiler = this.scene_._state_renderer_.cpl3d;
        const viewBuffer = compiler.createUniformBuffer({
            totalByteLength: bLen,
            handler: handler,
        })
        this.res_.ViewBuffer = {
            snippet: new ViewSnippet(compiler),
            viewBuffer: viewBuffer,
        };
    }

    /**
     * @description
     *  foreach mesh components, regroup mesh vertex data.
     */
    private refreshSceneDescBuffer = () => {
        if (this.res_.SceneDescBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 80;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.sceneDescQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let sceneDesc = this.group_.sceneDescQueue_.shift();
                while (sceneDesc) {
                    const buffer = new ArrayBuffer(bLen);
                    const views = {
                        model: new Float32Array(buffer, 0, 16),
                        rt_scene_idx: new Uint32Array(buffer, 64, 1),
                    };
                    views.model.set(sceneDesc.model);
                    views.rt_scene_idx.set([sceneDesc.rt_hdmf_idx]);
                    details.push({
                        byteLength: bLen,
                        offset: bLen * sceneDesc.rt_hdmf_idx,
                        rawData: buffer,
                    });
                    sceneDesc = this.group_.sceneDescQueue_.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            } else {
                return NoBufferArrayUpdateRequired;
            }
        };
        // init scene desc snippet.
        const compiler = this.scene_._state_renderer_.cpl3d;
        this.res_.SceneDescBuffer = {
            snippet: new SceneDescSnippet(compiler),
            sceneDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.HdmfSceneDescCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     */
    private refreshMeshDescBuffer = () => {
        if (this.res_.MeshDescBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 48;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.meshDescQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let desc = this.group_.meshDescQueue_.shift();
                while (desc) {
                    const buffer = new ArrayBuffer(bLen);
                    const views = {
                        bounding_sphere: new Float32Array(buffer, 0, 4),
                        meshlet_count: new Uint32Array(buffer, 16, 1),
                        rt_vertex_offset: new Uint32Array(buffer, 20, 1),
                        rt_meshlet_offset: new Uint32Array(buffer, 24, 1),
                        rt_mesh_idx: new Uint32Array(buffer, 28, 1),
                        rt_material_idx: new Uint32Array(buffer, 32, 1),
                    };
                    views.bounding_sphere.set(desc.bounding_sphere);
                    views.meshlet_count.set([desc.meshlet_count]);
                    views.rt_vertex_offset.set([desc.rt_vertex_offset]);
                    views.rt_meshlet_offset.set([desc.rt_meshlet_offset]);
                    views.rt_mesh_idx.set([desc.rt_mesh_idx]);
                    views.rt_material_idx.set([desc.rt_material_idx]);
                    details.push({
                        byteLength: bLen,
                        offset: bLen * desc.rt_mesh_idx,
                        rawData: buffer,
                    });
                    desc = this.group_.meshDescQueue_.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            } else {
                return NoBufferArrayUpdateRequired;
            }
        };
        // init scene desc snippet.
        const compiler = this.scene_._state_renderer_.cpl3d;
        this.res_.MeshDescBuffer = {
            snippet: new MeshDescSnippet(compiler),
            meshDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.MeshDescCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     * @returns 
     */
    private refreshMeshletDescBuffer = () => {
        if (this.res_.MeshletDescBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 80;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.meshletDescQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let desc = this.group_.meshletDescQueue_.shift();
                while (desc) {
                    const buffer = new ArrayBuffer(bLen);
                    const views = {
                        refined_bounding_sphere: new Float32Array(buffer, 0, 4),
                        self_bounding_sphere: new Float32Array(buffer, 16, 4),
                        simplified_bounding_sphere: new Float32Array(buffer, 32, 4),
                        refined_error: new Float32Array(buffer, 48, 1),
                        self_error: new Float32Array(buffer, 52, 1),
                        simplified_error: new Float32Array(buffer, 56, 1),
                        index_count: new Uint32Array(buffer, 60, 1),
                        rt_index_offset: new Uint32Array(buffer, 64, 1),
                        rt_meshlet_idx: new Uint32Array(buffer, 68, 1),
                        rt_mesh_idx: new Uint32Array(buffer, 72, 1),
                    };
                    views.refined_bounding_sphere.set(desc.refined_bounding_sphere);
                    views.self_bounding_sphere.set(desc.self_bounding_sphere);
                    views.simplified_bounding_sphere.set(desc.simplified_bounding_sphere);
                    views.refined_error.set([desc.refined_error]);
                    views.self_error.set([desc.self_error]);
                    views.simplified_error.set([desc.simplified_error]);
                    views.index_count.set([desc.index_count]);
                    views.rt_index_offset.set([desc.rt_index_offset]);
                    views.rt_meshlet_idx.set([desc.rt_meshlet_idx]);
                    views.rt_mesh_idx.set([desc.rt_mesh_idx]);
                    details.push({
                        byteLength: bLen,
                        offset: bLen * desc.rt_meshlet_idx,
                        rawData: buffer,
                    });
                    desc = this.group_.meshletDescQueue_.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            } else {
                return NoBufferArrayUpdateRequired;
            }
        };
        // init scene desc snippet.
        const compiler = this.scene_._state_renderer_.cpl3d;
        this.res_.MeshletDescBuffer = {
            snippet: new MeshletDescSnippet(compiler),
            meshletDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.MeshletDescCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     * @returns 
     */
    public async update(camera: Camera, group: HDMFQueueGroup, statsCursor: HDMFCursor, cw: number, ch: number): Promise<void> {
        // reference HDMF queue group.
        if (!this.group_) {
            this.group_ = group;
        }

        // check cursor, update/resize buffers.
        // TODO:: resize buffer.
        if (!this.statsCursor_) {
            this.statsCursor_ = new HDMFCursor();
            this.statsCursor_.copy(statsCursor);
        } else {
            // TOOD:: resize buffer.
            this.refreshBuffer();
        }

        //
        this.refreshViewProjectionBuffer(camera);
        this.refreshViewPlaneBuffer(camera);
        this.refreshViewBuffer(camera);
        this.refreshSceneDescBuffer();
        this.refreshMeshDescBuffer();
        this.refreshMeshletDescBuffer();
        // this.refreshMaterialDescBuffer();
        // this.refreshIndexedStorageBuffer();
        // this.refreshIndexedIndirectBuffer();                 // indexed indrect draw 绘制指令
        // this.refreshMaxIndirectCountBuffer();                // 最大 indexed indirect draw count 更新
        // this.refreshHardwareRasterizationIndirectBuffer();   //硬件光栅化
        // 
    }
}

export {
    RenderSystem
}