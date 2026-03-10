import { DebugMeshletVisComponent, DebugSnippet, DeferredMaterialDescSnippet, FragmentDescSnippet, InstanceDescSnippet, MeshDescSnippet, MeshletDescSnippet, OrderedGraph, SceneDescSnippet, StorageVec2U32Snippet, VertexSnippet, ViewPlaneSnippet, ViewProjectionSnippet, ViewSnippet } from "@pipegpu/graph";
import { Attributes, BaseHolder, IndexedIndirectBuffer, IndexedStorageBuffer, IndirectBuffer, RenderHolder, RenderProperty, StorageBuffer, UniformBuffer, Uniforms, VertexBuffer, type BufferArrayHandle, type BufferHandle, type BufferHandleDetail, type RenderHolderDesc } from "@pipegpu/core";
import type { Camera } from "@pipegpu/camera";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import { HDMFCursor, type HDMFQueueGroup } from "../component/HDMFComponent";
import { mat4d, vec3d, vec4d, type Mat4d, type Vec3d, type Vec4d } from "wgpu-matrix";

/**
 * @description
 */
type RES = {
    /**
     * @description
     */
    'DebugBuffer'?: {
        debugSnippet: DebugSnippet;
        debugBuffer: StorageBuffer;
    };
    'FragmentDescSnippet'?: {
        fragmentDescSnippet: FragmentDescSnippet;
    },
    'ViewProjectionBuffer'?: {
        viewProjectionSnippet: ViewProjectionSnippet;
        viewProjectionBuffer: UniformBuffer;
    };
    'ViewPlaneBuffer'?: {
        viewPlaneSnippet: ViewPlaneSnippet;
        viewPlaneBuffer: UniformBuffer;
    };
    'ViewBuffer'?: {
        viewSnippet: ViewSnippet;
        viewBuffer: UniformBuffer;
    },
    'VertexBuffer'?: {
        vertexSnippet: VertexSnippet;
        vertexBuffer: StorageBuffer;
    };
    /**
     * @description
     *  存储原始数据对应的索引.
     */
    'FallbackIndicesBuffer'?: {
        fallbackIndicesBuffer: IndexedStorageBuffer;
    };
    /**
     * @description
     *  存储簇对应的索引.
     */
    'MeshletIndicesBuffer'?: {
        meshletIndicesBuffer: IndexedStorageBuffer;
    };
    /**
     * @description
     */
    'InstanceDescBuffer'?: {
        instanceDescSnippet: InstanceDescSnippet,
        instanceDescBuffer: StorageBuffer,
    }
    /**
     * @description
     * 全局加入场景的instance, 对应的mesh下运行时meshlet在全局的索引；
     * 形态如：
     * (0, 1) 全局地0个instance, 他由全局id为1的meshlet组成；
     * (0, 3) 全局地0个instance, 他由全局id为3的meshlet组成；
     * (0, 7) 全局地0个instance, 他由全局id为7的meshlet组成；
     */
    'InstanceMeshletBuffer'?: {
        instanceMeshletSnippet: StorageVec2U32Snippet;
        instanceMeshletBuffer: StorageBuffer;
    };
    /**
     * @description
     */
    'SceneDescBuffer'?: {
        sceneDescSnippet: SceneDescSnippet;
        sceneDescBuffer: StorageBuffer;
    };
    /**
     * @description
     */
    'MeshDescBuffer'?: {
        meshDescSnippet: MeshDescSnippet;
        meshDescBuffer: StorageBuffer;
    };
    /**
     * @description
     */
    'MeshletDescBuffer'?: {
        meshletDescSnippet: MeshletDescSnippet;
        meshletDescBuffer: StorageBuffer;
    };
    /**
     * @description
     */
    'DeferredMaterialDescBuffer'?: {
        deferredMaterialDescSnippet: DeferredMaterialDescSnippet;
        deferredMaterialDescBuffer: StorageBuffer;
    };
    /**
     * @description
     *  默认的场景最大indrect draw count数，根据剔除结果动态变化
     */
    'IndirectMaxDrawCountBuffer'?: {
        indirectMaxDrawCountBuffer: IndirectBuffer;
    };
    /**
     * @description
     */
    'IndexedIndirectBuffer'?: {
        indexedIndirectBuffer: IndexedIndirectBuffer;
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
    private frameGraph_?: OrderedGraph;

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
    }

    /**
     * TODO:: resize buffer, each buffer resize.
     */
    private resizeBuffer = () => {
        throw new Error(`未实现component变化后buffer内存重分配, 当前无法动态设置component.`);
    };

    /**
     * @description
     * @returns
     */
    private refreshFragmentBuffer = (): void => {
        if (this.res_.FragmentDescSnippet) {
            return;
        }
        const { compiler } = this.scene_._state_renderer_;
        this.res_.FragmentDescSnippet = {
            fragmentDescSnippet: new FragmentDescSnippet(compiler),
        };
    }

    /**
     * @description register camera.
     */
    private refreshViewProjectionBuffer = (camera: Camera): void => {
        this.camera_ = camera;
        if (this.res_.ViewProjectionBuffer) {
            return;
        }
        const bLen = 32 * 4;
        const compiler = this.scene_._state_renderer_.compiler;
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
            viewProjectionSnippet: viewProjectionSnippet,
            viewProjectionBuffer: viewProjectionBuffer,
        }
    }

    /**
     * @description register view plane buffer with camera.
     * @param camera 
     * @returns 
     */
    private refreshViewPlaneBuffer = (camera: Camera): void => {
        this.camera_ = camera;
        if (this.res_.ViewPlaneBuffer) {
            return;
        }
        const bLen = 4 * 4 * 6;
        const compiler = this.scene_._state_renderer_.compiler;
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
            viewPlaneSnippet: new ViewPlaneSnippet(compiler),
        };
    }

    /**
     * @description
     */
    private refreshViewBuffer = (camera: Camera): void => {
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
        const compiler = this.scene_._state_renderer_.compiler;
        const viewBuffer = compiler.createUniformBuffer({
            totalByteLength: bLen,
            handler: handler,
        })
        this.res_.ViewBuffer = {
            viewSnippet: new ViewSnippet(compiler),
            viewBuffer: viewBuffer,
        };
    }

    /**
     * @description
     *  foreach mesh components, regroup mesh vertex data.
     */
    private refreshSceneDescBuffer = (): void => {
        if (this.res_.SceneDescBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 80;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.deferredMaterialDescQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let q = this.group_.deferredMaterialDescQueue_.shift();
                while (q) {
                    const buf = new ArrayBuffer(bLen);
                    const views = {
                        head: new Uint32Array(buf, 0, 1),
                        pbr_base_color: new Uint32Array(buf, 4, 1),
                        pbr_metallic: new Uint32Array(buf, 8, 1),
                        pbr_roughness: new Uint32Array(buf, 12, 1),
                        pbr_emissive: new Uint32Array(buf, 16, 1),
                        pbr_sheen_color: new Uint32Array(buf, 20, 1),
                        pbr_sheen_roughness: new Uint32Array(buf, 24, 1),
                        pbr_clearcoat: new Uint32Array(buf, 28, 1),
                        pbr_clearcoat_roughness: new Uint32Array(buf, 32, 1),
                        pbr_clearcoat_normal: new Uint32Array(buf, 36, 1),
                        pbr_anisotropy: new Uint32Array(buf, 40, 1),
                        pbr_transmission: new Uint32Array(buf, 44, 1),
                        pbr_volume_thickness: new Uint32Array(buf, 48, 1),
                        phong_diffuse: new Uint32Array(buf, 52, 1),
                        phong_specular: new Uint32Array(buf, 56, 1),
                        phong_shiness: new Uint32Array(buf, 60, 1),
                        phong_ambient: new Uint32Array(buf, 64, 1),
                        phong_emissive: new Uint32Array(buf, 68, 1),
                        phong_reflectivity: new Uint32Array(buf, 72, 1),
                        baked_ambient_occlusion: new Uint32Array(buf, 76, 1),
                        baked_light_map: new Uint32Array(buf, 80, 1),
                        rt_material_idx: new Uint32Array(buf, 84, 1),
                    };
                    views.head.set([q.head]);
                    views.pbr_base_color.set([q.pbr_base_color]);
                    views.pbr_metallic.set([q.pbr_metallic]);
                    views.pbr_roughness.set([q.pbr_roughness]);
                    views.pbr_emissive.set([q.pbr_emissive]);
                    views.pbr_sheen_color.set([q.pbr_sheen_color]);
                    views.pbr_sheen_roughness.set([q.pbr_sheen_roughness]);
                    views.pbr_clearcoat.set([q.pbr_clearcoat]);
                    views.pbr_clearcoat_roughness.set([q.pbr_clearcoat_roughness]);
                    views.pbr_clearcoat_normal.set([q.pbr_clearcoat_normal]);
                    views.pbr_anisotropy.set([q.pbr_anisotropy]);
                    views.pbr_transmission.set([q.pbr_transmission]);
                    views.pbr_volume_thickness.set([q.pbr_volume_thickness]);
                    views.phong_diffuse.set([q.phong_diffuse]);
                    views.phong_specular.set([q.phong_specular]);
                    views.phong_shiness.set([q.phong_shiness]);
                    views.phong_ambient.set([q.phong_ambient]);
                    views.phong_emissive.set([q.phong_emissive]);
                    views.phong_reflectivity.set([q.phong_reflectivity]);
                    views.baked_ambient_occlusion.set([q.baked_ambient_occlusion]);
                    views.baked_light_map.set([q.baked_light_map]);
                    views.rt_material_idx.set([q.rt_material_idx]);
                    details.push({
                        byteLength: bLen,
                        offset: bLen * q.rt_material_idx,
                        rawData: buf,
                    });
                    q = this.group_.deferredMaterialDescQueue_.shift();
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.DeferredMaterialDescBuffer = {
            deferredMaterialDescSnippet: new DeferredMaterialDescSnippet(compiler),
            deferredMaterialDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.DeferredMaterialDescCursor,
                handler: handler,
            }),
        };
    }

    private refreshInstanceDescBuffer = (): void => {
        if (this.res_.InstanceDescBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 80;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.instanceDescQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let q = this.group_.instanceDescQueue_.shift();
                while (q) {
                    const buf = new ArrayBuffer(bLen);
                    const views = {
                        model: new Float32Array(buf, 0, 16),
                        rt_mesh_idx: new Uint32Array(buf, 64, 1),
                        rt_scene_idx: new Uint32Array(buf, 68, 1),
                        rt_instance_idx: new Uint32Array(buf, 72, 1),
                    };
                    views.model.set(q.model);
                    views.rt_mesh_idx.set([q.rt_mesh_idx]);
                    views.rt_scene_idx.set([q.rt_scene_idx]);
                    views.rt_instance_idx.set([q.rt_instance_idx]);
                    details.push({
                        byteLength: bLen,
                        offset: bLen * q.rt_instance_idx,
                        rawData: buf,
                    });
                    q = this.group_.instanceDescQueue_.shift();
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.InstanceDescBuffer = {
            instanceDescSnippet: new InstanceDescSnippet(compiler),
            instanceDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.InstanceDescCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     */
    private refreshMeshDescBuffer = (): void => {
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.MeshDescBuffer = {
            meshDescSnippet: new MeshDescSnippet(compiler),
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
    private refreshMeshletDescBuffer = (): void => {
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.MeshletDescBuffer = {
            meshletDescSnippet: new MeshletDescSnippet(compiler),
            meshletDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.MeshletDescCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     * strcut:
     *  https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html#x=5d000001004003000000000000003d888b0237284ce7dce121b384fd72bd9a1ff901e6abc5860a8afa8f2d115b2c3db5f68fe6c6c203443b6876d5ef3eb715d57ae78a68be7bbcc0218c79e65f79be3a643e65e66b84c7669aa18e72087a65d4b61d56a74c074c7e444f78ea3a7de08f87710356b321f8cfd078dc37a9ad26595cbf2caaf3eb04887e8fa703157d05b24a90e4001b0ab3d029d7adde7585bd314b8716bd9023c098b4826b9fc3efc1f207767b983cd980db686ebe8d979bf5141cd7d2f8a7f0ed6aefc9675347fe0c0972fcfa69b445fc00766ff789f96a10fd45153850f00fc6e43fde634a2d99688b9a6f1e403e19f1aa85616d0950fbf6e7882a0360e95f9b527dd8438b7a93f015b6a18680675fb2c1826c2d19b1b261ba6a9afdb5f79b18ab651faee6811429294145ae924cf80330efffc43834f6eb10c0842bc38c8012f785611873d6a615633d208a2f90a6311354b2b01ffff51e06f0
     */
    private refreshDeferredMaterialDescBuffer = (): void => {
        if (this.res_.DeferredMaterialDescBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 88;
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.MeshletDescBuffer = {
            meshletDescSnippet: new MeshletDescSnippet(compiler),
            meshletDescBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.MeshletDescCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     */
    private refreshVertexBuffer = (): void => {
        if (this.res_.VertexBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 32;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.vertexQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let desc = this.group_.vertexQueue_.shift();
                while (desc) {
                    details.push({
                        byteLength: bLen,
                        offset: desc.rt_vertex_offset * bLen,
                        rawData: desc.vertex_data,
                    });
                    desc = this.group_.vertexQueue_.shift();
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.VertexBuffer = {
            vertexSnippet: new VertexSnippet(compiler),
            vertexBuffer: compiler.createStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.VertexCursor,
                handler: handler,
            }),
        };
    };

    /**
     * @description
     * @returns 
     */
    private refreshFallbackIndicesBuffer = (): void => {
        if (this.res_.FallbackIndicesBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 4;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.indicesQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let desc = this.group_.indicesQueue_.shift();
                while (desc) {
                    details.push({
                        byteLength: bLen,
                        offset: desc.rt_indices_offset * bLen,
                        rawData: desc.indices_data,
                    });
                    desc = this.group_.indicesQueue_.shift();
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.FallbackIndicesBuffer = {
            fallbackIndicesBuffer: compiler.createIndexedStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.IndicesCursor,
                handler: handler,
            }),
        };
    }

    /**
     * @description
     * @returns 
     */
    private refreshMeshletIndicesBuffer = (): void => {
        if (this.res_.MeshletIndicesBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 4;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.meshletIndicesQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let desc = this.group_.meshletIndicesQueue_.shift();
                while (desc) {
                    details.push({
                        byteLength: bLen,
                        offset: desc.rt_meshlet_indices_offset * bLen,
                        rawData: desc.meshlet_indices_data,
                    });
                    desc = this.group_.meshletIndicesQueue_.shift();
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.MeshletIndicesBuffer = {
            meshletIndicesBuffer: compiler.createIndexedStorageBuffer({
                totalByteLength: bLen * this.statsCursor_.MeshletIndicesCursor,
                handler: handler,
            }),
        };
    }

    private refreshIndirectMaxDrawCountBuffer = (): void => {
        if (this.res_.IndirectMaxDrawCountBuffer || !this.statsCursor_) {
            return;
        }
        // WARNING:: indirect usage buffer must align of 16.
        const bLen = 16;
        const handler: BufferArrayHandle = () => {
            const details: BufferHandleDetail[] = [];
            details.push({
                byteLength: bLen,
                offset: 0,
                rawData: new Uint32Array([this.statsCursor_!.InstanceMeshletMapCursor]),
            });
            return {
                rewrite: true,
                details: details,
            }
        };
        // init scene desc snippet.
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.IndirectMaxDrawCountBuffer = {
            indirectMaxDrawCountBuffer: compiler.createIndirectBuffer({
                totalByteLength: bLen,
                handler: handler
            }),
        };
    }

    /**
     * @description
     * @returns 
     */
    private refreshIndexedIndirectBuffer = (): void => {
        if (this.res_.IndexedIndirectBuffer || !this.statsCursor_) {
            return;
        }
        const bLen = 20;
        const handler: BufferArrayHandle = () => {
            if (this.group_ && this.group_.indexedIndirectQueue_.length > 0) {
                const details: BufferHandleDetail[] = [];
                let desc = this.group_.indexedIndirectQueue_.shift();
                while (desc) {
                    details.push({
                        byteLength: bLen,
                        offset: desc.rt_indexed_idirect_idx * bLen,
                        rawData: desc.indexed_indirect_data,
                    });
                    desc = this.group_.indexedIndirectQueue_.shift();
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
        const compiler = this.scene_._state_renderer_.compiler;
        this.res_.IndirectMaxDrawCountBuffer = {
            indirectMaxDrawCountBuffer: compiler.createIndexedIndirectBuffer({
                totalByteLength: bLen,
                handler: handler
            }),
        };
    }

    /**
     * @description
     * @param camera 
     */
    private refreshBuffer = (camera: Camera) => {
        this.refreshFragmentBuffer();
        this.refreshViewProjectionBuffer(camera);
        this.refreshViewPlaneBuffer(camera);
        this.refreshViewBuffer(camera);
        this.refreshSceneDescBuffer();
        this.refreshInstanceDescBuffer();
        this.refreshMeshDescBuffer();
        this.refreshMeshletDescBuffer();
        this.refreshDeferredMaterialDescBuffer();
        this.refreshVertexBuffer();
        this.refreshFallbackIndicesBuffer();
        this.refreshMeshletIndicesBuffer();
        this.refreshIndirectMaxDrawCountBuffer();       // 最大 indexed indirect draw count 更新
        this.refreshIndexedIndirectBuffer();            // indexed indrect draw 绘制指令
    }

    debugMeshletHolder_?: RenderHolder;

    /**
     * @description
     *  主管线
     */
    private refreshRenderGraph = () => {
        // 使用debug meshlet vis component调试基础效果.
        const { compiler, context, colorAttachment, depthStencilAttachment } = this.scene_._state_renderer_;
        const { vertexSnippet, vertexBuffer } = this.res_.VertexBuffer!;
        const { fragmentDescSnippet } = this.res_.FragmentDescSnippet!;
        const { sceneDescSnippet, sceneDescBuffer } = this.res_.SceneDescBuffer!;
        const { viewProjectionSnippet, viewProjectionBuffer } = this.res_.ViewProjectionBuffer!;
        const { viewSnippet, viewBuffer } = this.res_.ViewBuffer!;
        // const { instanceMeshletSnippet, instanceMeshletBuffer } = this.res_.InstanceMeshletBuffer!;
        const { instanceDescSnippet, instanceDescBuffer } = this.res_.InstanceDescBuffer!;
        const { meshDescSnippet, meshDescBuffer } = this.res_.MeshDescBuffer!;
        const { fallbackIndicesBuffer } = this.res_.FallbackIndicesBuffer!;

        // 
        if (!this.frameGraph_) {
            this.frameGraph_ = new OrderedGraph(context);
        }

        // debug meshlet holder
        if (!this.debugMeshletHolder_) {
            const debugMeshletVisSC = new DebugMeshletVisComponent(
                context,
                compiler,
                {
                    fragmentDescSnippet: fragmentDescSnippet,
                    sceneDescSnippet: sceneDescSnippet,
                    instanceDescSnippet: instanceDescSnippet,
                    meshDescSnippet: meshDescSnippet,
                    vertexSnippet: vertexSnippet,
                    viewProjectionSnippet: viewProjectionSnippet,
                    viewSnippet: viewSnippet,
                }
            );

            const WGSLCode = debugMeshletVisSC.build();
            const dispatch = new RenderProperty(fallbackIndicesBuffer, 1);
            const d: RenderHolderDesc = {
                label: 'debug meshlet vis',
                vertexShader: compiler.createVertexShader({
                    code: WGSLCode,
                    entryPoint: 'vs_main',
                }),
                fragmentShader: compiler.createFragmentShader({
                    code: WGSLCode,
                    entryPoint: 'fs_main',
                }),
                attributes: new Attributes(),
                uniforms: new Uniforms(),
                dispatch: dispatch,
                colorAttachments: [colorAttachment],
                depthStencilAttachment: depthStencilAttachment,
            };
            d.uniforms.assign(sceneDescSnippet.getVariableName(), sceneDescBuffer);
            d.uniforms.assign(instanceDescSnippet.getVariableName(), instanceDescBuffer);
            d.uniforms.assign(meshDescSnippet.getVariableName(), meshDescBuffer);
            d.uniforms.assign(vertexSnippet.getVariableName(), vertexBuffer);
            d.uniforms.assign(viewProjectionSnippet.getVariableName(), viewProjectionBuffer);
            d.uniforms.assign(viewSnippet.getVariableName(), viewBuffer);
            this.debugMeshletHolder_ = compiler.compileRenderHolder(d);
        }

        const holders: BaseHolder[] = [];
        if (this.debugMeshletHolder_) {
            holders.push(this.debugMeshletHolder_);
        }
        this.frameGraph_.append(holders);
        this.frameGraph_.build();
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
            this.resizeBuffer();
        }
        // 更新CPU-side内存分配, render graph资产注册、全局资产更新
        this.refreshBuffer(camera);
        this.refreshRenderGraph();
    }
}

export {
    RenderSystem
}