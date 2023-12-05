import { PipeGL } from "pipegl";

import { SketchpadRenderer } from "../SketchpadRenderer";
import { PerspectiveCamera } from "../../camera/PerspectiveCamera";
import { GeometryDataSchema, GeometryLayer } from "./GeometryLayer";

/**
 * 
 */
class GeometryLayerRenderer extends SketchpadRenderer<GeometryDataSchema>{
    private CACHE: Map<string, GeometryDataSchema> = new Map();

    constructor(layer: GeometryLayer, ctx3d: PipeGL) {
        super(layer, ctx3d);
    }

    public prepare = (geometry: GeometryDataSchema): void => {
        this.CACHE.set('`', geometry);
    }

    public render = (framestamp: number, camera: PerspectiveCamera): void => {
        this.CACHE?.forEach(geometry => {
            geometry.Renderer.render(framestamp, camera);
        });
    }
}

GeometryLayer.registerRenderer(GeometryLayer.name, GeometryLayerRenderer);

export { GeometryLayerRenderer }