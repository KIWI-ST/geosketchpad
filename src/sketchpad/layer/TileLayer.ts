import { rgba } from "../../util/rgba";
import { llpVertex } from "../../util/llp";
import { QuadtreeTile } from "./../../core/QuadtreeTile";
import { Sketchpad, TSketchpadDataSchema } from "../Sektchpad";

/**
 * TileLayer 数据组织规范
 */
interface TileLayerDataSchema extends TSketchpadDataSchema {
    /**
     * 
     */
    key: string;

    /**
     * 
     */
    uri?: string;

    /**
     * 
     */
    width?: number;

    /**
     * 
     */
    height?: number;

    /**
     * 
     */
    channel?: number;

    /**
     * 
     */
    vertices?: number[][];

    /**
     * 
     */
    textureBuffer?: Uint8Array;
}

/**
 * 
 */
class TileLayer extends Sketchpad<TileLayerDataSchema>{
    /**
     * 
     */
    protected CACHE: Map<string, { uri: string, vertices: number[][] }> = new Map();

    /**
     * 
     */
    registerEvents = () => {
        this.g.on('tileupdated', this.prepareData, this);
        this.g.on('worker', this.prepareWorker, this);
    }

    /**
     * 
     */
    protected queue: TileLayerDataSchema[] = [];

    /**
     * 
     * @param tiles 
     */
    protected prepareData = (tiles: QuadtreeTile[]) => {
        this.queue = [];
        const CACHE = this.CACHE;
        //更新
        tiles?.forEach((t: QuadtreeTile) => {
            const { X: x, Y: y, Level: level, Boundary: boundary } = t;
            const key = `${level}-${x}-${y}`;
            if (!CACHE.has(key)) {
                // const uri = `https://mt0.google.cn/maps/vt?lyrs=y&hl=zh-CN&gl=CN&&x=${x}&y=${y}&z=${level}&scale=2`;
                const uri = `http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${level}&TILEROW=${y}&TILECOL=${x}&tk=65ac66b5243f941bc05a75bd61d12246`
                // const uri = `https://server.arcgisonline.com/arcgis/rest/services/NatGeo_World_Map/MapServer/tile/${level}/${y}/${x}`;
                const vertices = llpVertex(boundary);
                const q: TileLayerDataSchema = {
                    key,
                    uri,
                    vertices
                };
                this.queue.unshift(q);
            }
        });
    }

    /**
     * 
     */
    private prepareWorker = () => {
        const CACHE = this.CACHE, QUEUE = this.queue, g = this.Globe;
        if (QUEUE.length > 0 && !CACHE.has(QUEUE[0].key) && g.hasIdleWorker('RGBAWorker')) {
            const q = QUEUE.shift();
            const { uri, vertices, key } = q;
            CACHE.set(key, { uri, vertices });
            g.acquireWorker('RGBAWorker', {workerKey:key, args:[uri, key, 256, 256]})
            .then(mbus=>{
                const mKey = mbus.workerKey;
                const mWidth = mbus.args[0];
                const mHeight = mbus.args[1];
                const mChannel = mbus.args[2];
                const buf = mbus.buffer as Uint8Array;
                const schema: TileLayerDataSchema = {
                    key: mKey,
                    width: mWidth,
                    height: mHeight,
                    channel: mChannel,
                    vertices: vertices,
                    textureBuffer: buf
                };
                this.Renderer.prepare(schema);
            });
        }
    }
}

export {
    type TileLayerDataSchema,
    TileLayer,
}