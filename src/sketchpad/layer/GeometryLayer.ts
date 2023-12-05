import { Renderable } from "../../render/Renderable";
import { Sketchpad, TSketchpadDataSchema } from "../Sektchpad";

/**
 * 
 */
type GeometryDataSchema = Sketchpad<TSketchpadDataSchema>;

/**
 * 容纳geometry绘制的图层
 */
class GeometryLayer extends Sketchpad<GeometryDataSchema>{

    private geometrys: Renderable[] = [];

    constructor() {
        super();
    }

    /**
     * 添加mesh
     * @param geometry 
     */
    public add = <T extends TSketchpadDataSchema>(geometry: Sketchpad<T>): void => {
        geometry.attach(this.g);
        this.Renderer.prepare(geometry);
    }
}

export {
    GeometryDataSchema,
    GeometryLayer,
}