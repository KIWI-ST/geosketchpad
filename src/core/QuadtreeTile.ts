import { Rectangle } from "./Rectangle";
import { QuadtreeTileSchema } from "./QuadtreeTileSchema";

/**
 * 四叉树形式的Tile组织，用于快速检索瓦片信息
 * @class
 */
class QuadtreeTile {
    /**
     * 
     */
    private parent: QuadtreeTile;

    /**
     * 
     */
    private level: number;
    /**
     * 
     */
    private y: number;

    /**
     * 
     */
    private x: number;

    /**
     * 
     */
    private quadtreeTileSchema: QuadtreeTileSchema;

    /**
     * 
     */
    private southwestChild: QuadtreeTile;

    /**
     * 
     */
    private southeastChild: QuadtreeTile;

    /**
     * 
     */
    private northwestChild: QuadtreeTile;

    /**
     * 
     */
    private northeastChild: QuadtreeTile;

    /**
     * 该瓦片地理范围
     */
    private boundary: Rectangle;

    /**
     * 
     * @param quadtreeTileSchema 瓦片投影计算模式，一般采用Web墨卡托Schema
     * @param x 
     * @param y 
     * @param level 
     * @param parent 
     */
    constructor(quadtreeTileSchema: QuadtreeTileSchema, x: number, y: number, level: number, parent: QuadtreeTile) {
        this.quadtreeTileSchema = quadtreeTileSchema;
        this.x = x;
        this.y = y;
        this.level = level;
        this.parent = parent;
        this.boundary = this.quadtreeTileSchema.tileXYToRectangle(x, y, level);
    }

    get X(): number {
        return this.x;
    }

    get Y(): number {
        return this.y;
    }

    /**
     * 
     */
    get Boundary(): Rectangle {
        const tileSchema = this.quadtreeTileSchema,
            x = this.x,
            y = this.y,
            l = this.level;
        return tileSchema.tileXYToRectangle(x, y, l);
    }

    /**
     * 
     */
    get Level(): number {
        return this.level;
    }

    /**
     * foreach quard tree
     */
    get Children(): QuadtreeTile[] {
        return [this.NorthwestChild, this.NortheastChild, this.SouthwestChild, this.SoutheastChild];
    }

    /**
     * Gets the southwest child tile.
     */
    get SouthwestChild(): QuadtreeTile {
        this.southwestChild = this.southwestChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2,
            this.y * 2 + 1,
            this.level + 1,
            this);
        return this.southwestChild;
    }

    /**
     * Gets the southeast child tile.
     */
    get SoutheastChild(): QuadtreeTile {
        this.southeastChild = this.southeastChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2 + 1,
            this.y * 2 + 1,
            this.level + 1,
            this);
        return this.southeastChild;
    }

    /**
     * Gets the northwest child tile.
     */
    get NorthwestChild(): QuadtreeTile {
        this.northwestChild = this.northwestChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2,
            this.y * 2,
            this.level + 1,
            this);
        return this.northwestChild;
    }

    /**
     * Gets the northeast child tile.
     */
    get NortheastChild(): QuadtreeTile {
        this.northeastChild = this.northeastChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2 + 1,
            this.y * 2,
            this.level + 1,
            this);
        return this.northeastChild;
    }
}

export { QuadtreeTile }