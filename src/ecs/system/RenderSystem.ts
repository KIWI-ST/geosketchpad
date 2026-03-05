import { IndexedStorageSnippet, OrderedGraph, VertexSnippet, ViewPlaneSnippet, ViewProjectionSnippet } from "@pipegpu/graph";
import { IndexedStorageBuffer, StorageBuffer, UniformBuffer, type BufferHandle } from "@pipegpu/core";
import type { Camera } from "@pipegpu/camera";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";

/**
 * @description
 */
type GraphResource = {
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
    private graphResource_: GraphResource = {};

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
    private registerCamera(camera: Camera) {
        if (this.graphResource_.ViewProjectionBuffer) {
            return;
        }
        this.camera_ = camera;
        if (!this.camera_) {
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
        this.graphResource_.ViewProjectionBuffer = {
            snippet: viewProjectionSnippet,
            viewProjectionBuffer: viewProjectionBuffer,
        }
    }

    /**
     * foreach mesh components, regroup mesh vertex data.
     */
    private initVertex() {
        // const compiler = this.scene_._state_renderer_.cpl3d;
        // if (!this.resource_.VertexBuffer) {
        //     const vertexSnippet = new VertexSnippet(compiler);
        //     this.resource_.VertexBuffer = {
        //         snippet: vertexSnippet,
        //         vertexBuffer:
        //     }
        // }
    }

    /**
     * @description
     * @returns 
     */
    public async update(camera: Camera, cw: number, ch: number): Promise<void> {
        // check render graph resource.
        this.registerCamera(camera);


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