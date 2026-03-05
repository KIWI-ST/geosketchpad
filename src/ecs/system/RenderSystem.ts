import { IndexedStorageSnippet, OrderedGraph, VertexSnippet, ViewPlaneSnippet, ViewProjectionSnippet } from "@pipegpu/graph";
import { IndexedStorageBuffer, StorageBuffer, UniformBuffer, type BufferHandle } from "@pipegpu/core";
import type { Camera } from "@pipegpu/camera";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import type { InstanceDesc } from "../component/HDMFComponent";
import { mat4d, vec3d, vec4d, type Mat4d, type Vec3d, type Vec4d } from "wgpu-matrix";

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
    'VertexBuffer'?: {
        snippet: VertexSnippet,
        vertexBuffer: StorageBuffer,
    };
    'IndexedStorageBuffer'?: {
        snippet: IndexedStorageSnippet,
        indexedStorageBuffer: IndexedStorageBuffer,
    };
    'MeshletIndicesStorageBuffer'?: {

    }
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
}


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
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
        this.renderGraph_ = new OrderedGraph(scene._state_renderer_.ctx3d);
    }

    /**
     * @description register camera.
     */
    private refreshViewProjectionBuffer(camera: Camera) {
        this.camera_ = camera;
        if (this.res_.ViewProjectionBuffer) {
            return;
        }
        const compiler = this.scene_._state_renderer_.cpl3d;
        const viewProjectionSnippet = new ViewProjectionSnippet(compiler);
        const handler: BufferHandle = () => {
            const buffer = new ArrayBuffer(128);
            const bufferViews = {
                projection: new Float32Array(buffer, 0, 16),
                view: new Float32Array(buffer, 64, 16),
            };
            bufferViews.projection.set(this.camera_!.ProjectionMatrix);
            bufferViews.view.set(this.camera_!.ViewMatrix);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: 32 * 4,
                    rawData: buffer,
                }
            }
        };
        const viewProjectionBuffer = compiler.createUniformBuffer({
            totalByteLength: 32 * 4,
            handler: handler
        });
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
                    byteLength: 4 * 4 * 6,
                    rawData: rawDataf32
                }
            }
        };
        const viewPlaneBuffer = compiler.createUniformBuffer({
            totalByteLength: 4 * 4 * 6,
            handler: handler,
        });
        this.res_.ViewPlaneBuffer = {
            viewPlaneBuffer: viewPlaneBuffer,
            snippet: new ViewPlaneSnippet(compiler),
        };
    }

    /**
     * foreach mesh components, regroup mesh vertex data.
     */
    private refreshInstanceDesc(instanceQueue: InstanceDesc[]) {



    }

    /**
     * @description
     * @returns 
     */
    public async update(
        camera: Camera,
        cw: number,
        ch: number,

    ): Promise<void> {
        this.refreshViewProjectionBuffer(camera);
        this.refreshViewPlaneBuffer(camera);


        // this.initVertex();

        // renderOpaque()
        // renderStataic
        // renderDynmaic
        // this.initIndices();
        // this.initMeshlet();

    }
}

export {
    RenderSystem
}