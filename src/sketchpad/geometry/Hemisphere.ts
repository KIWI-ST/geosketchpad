import { Vec3, Mat4, GLMatrix } from "kiwi.matrix";

import { GeodeticCoordinate } from "../../core/GeodeticCoordinate";
import { Sketchpad, TSketchpadDataSchema } from "../Sektchpad";

/**
 * 半球对象数据模型
 */
interface HemisphereDataSchema extends TSketchpadDataSchema {
    vertices: number[][];
    normals: number[][];
    uvs: number[][];
    indices: number[];
    modelMatrix: number[];
}

/**
 * 半球几何体绘制
 */
class Hemisphere extends Sketchpad<HemisphereDataSchema> {

    private coordinate: GeodeticCoordinate;

    /**
     * 半径
     */
    private radius: number;

    private wCount: number = 24;

    private hCount: number = 16;

    private phiStart: number = 0;

    private phiLength: number = Math.PI;

    private thetaStart: number = 0;

    private thetaLength: number = Math.PI;

    constructor(coordinate: GeodeticCoordinate, radius: number) {
        super();
        this.radius = radius;
        this.coordinate = coordinate;
    }

    protected registerData = (): void => {
        const { phiStart, phiLength, thetaStart, thetaLength, wCount, hCount, radius, Globe, coordinate, Renderer } = this;
        const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
        const vertices: number[][] = [], normals: number[][] = [], uvs: number[][] = [], indices: number[] = [];
        const grid: number[][] = [];
        let index: number = 0;
        for (let iy = 0; iy <= hCount; iy++) {
            const row = [];
            const v = iy / hCount;
            let uOffset = 0;
            //指定poles
            if (iy === 0 && thetaStart === 0)
                uOffset = 0.5 / wCount;
            else if (iy === hCount && thetaEnd === Math.PI)
                uOffset = -0.5 / wCount;
            //
            for (let ix = 0; ix <= wCount; ix++) {
                const u = ix / wCount;
                //vertex
                const x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                const y = radius * Math.cos(thetaStart + v * thetaLength);
                const z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                vertices.push([x, y, z]);
                //normal
                const normal = new Vec3().set(x, y, z).normalize();
                normals.push(normal.value);
                //uv
                uvs.push([u + uOffset, 1 - v]);
                row.push(index++);
            }
            grid.push(row);
        }
        //indices
        for (let iiy = 0; iiy < hCount; iiy++) {
            for (let iix = 0; iix < wCount; iix++) {
                const a = grid[iiy][iix + 1];
                const b = grid[iiy][iix];
                const c = grid[iiy + 1][iix];
                const d = grid[iiy + 1][iix + 1];
                if (iiy !== 0 || thetaStart > 0) indices.push(a, b, d);
                if (iiy !== hCount - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
            }
        }
        //模型矩阵，移到地球表面
        const modelMatrix = new Mat4().identity();
        const position = Globe.geographicToSpaceCoordinate(coordinate);
        modelMatrix.translate(position);
        //与地表垂直
        modelMatrix.rotateZ(GLMatrix.toRadian(this.coordinate.Longitude - 90));
        modelMatrix.rotateX(GLMatrix.toRadian(this.coordinate.Latitude - 90));
        //推送数据给renderer渲染
        Renderer.prepare({ vertices, normals, uvs, indices, modelMatrix: modelMatrix.value })
    }

}

export {
    HemisphereDataSchema,
    Hemisphere
}