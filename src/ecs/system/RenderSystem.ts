import { IndexedStorageSnippet, OrderedGraph, VertexSnippet, ViewPlaneSnippet, ViewProjectionSnippet } from "@pipegpu/graph";
import type { Scene } from "../../scene/Scene";
import { BaseSystem } from "../BaseSystem";
import { IndexedStorageBuffer, StorageBuffer, UniformBuffer, type BufferHandle } from "@pipegpu/core";

/**
 * 
 */
type RESOURCE = {
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
 */
class RenderSystem extends BaseSystem {
    /**
     * 
     */
    private renderGraph_: OrderedGraph;

    /**
     * 
     */
    private resource_: RESOURCE = {};

    /**
     * 
     * @param scene 
     */
    constructor(scene: Scene) {
        super(scene);
        this.renderGraph_ = new OrderedGraph(scene._state_renderer_.ctx3d);
    }

    /**
     * 
     */
    private initCamera() {
        const compiler = this.scene_._state_renderer_.cpl3d;
        if (!this.resource_.ViewProjectionBuffer) {
            const cameraSystem = this.scene_._state_system_.cameraSystem;
            const viewProjectionSnippet = new ViewProjectionSnippet(compiler);
            const handler: BufferHandle = () => {
                const buffer = new ArrayBuffer(128);
                const bufferViews = {
                    projection: new Float32Array(buffer, 0, 16),
                    view: new Float32Array(buffer, 64, 16),
                };
                bufferViews.projection.set(cameraSystem.ProjectionMatrix!);
                bufferViews.view.set(cameraSystem.ViewMatrix!);
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
            this.resource_.ViewProjectionBuffer = {
                snippet: viewProjectionSnippet,
                viewProjectionBuffer: viewProjectionBuffer,
            }
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
    public override async Update(): Promise<void> {
        // main camera.
        if (!this.scene_._state_system_.cameraSystem.hasMainCamera()) {
            console.warn(`[W][RenderSystem][Update] render system skip frame, due to missing main camera.`);
            return;
        }

        // check render graph resource.
        this.initCamera();


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