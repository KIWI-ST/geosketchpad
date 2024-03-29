import { llpVertex } from "../../../util/llp";
import { QuadtreeTile } from "../../../core/QuadtreeTile";
import { TileLayerRenderer } from "../TileLayerRenderer";
import { TileLayer, TileLayerDataSchema } from "../TileLayer";

/**
 * 
 */
class TiandituTileLayer extends TileLayer {

    /**
     * 天地图访问需要token
     */
    private token: string = "65ac66b5243f941bc05a75bd61d12246";

    /**
     * 
     * @param token 
     */
    constructor(token: string = null) {
        super();
        this.token = token || this.token;
    }

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
                const uri = `https://map.geoq.cn/arcgis/rest/services/ChinaOnlineCommunity/MapServer/tile/${level}/${y}/${x}`;
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

}

TiandituTileLayer.registerRenderer(TiandituTileLayer.name, TileLayerRenderer);

export { TiandituTileLayer }