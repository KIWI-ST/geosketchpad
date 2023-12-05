import { Rectangle } from "./../core/Rectangle";
import { PSEUDOMERCATOR } from "../core/Ellipsoid";
import { GeodeticCoordinate } from "./../core/GeodeticCoordinate";

//默认打断结点数
const VERTEXCOUNT = 8;

/**
 * 顶点坐标
 * @param boundary 
 * @param lerp 
 * @returns 
 */
const llpVertex = (boundary: Rectangle, lerp: number = VERTEXCOUNT): number[][] => {
    const vertex: number[][] = [];
    const factor = 1 / lerp, rangeX = boundary.Width, rangeY = boundary.Height, start = boundary.Southwest;
    for (let x = 0; x <= lerp; x++)
        for (let y = 0; y <= lerp; y++) {
            const c0 = start.Longitude + x * factor * rangeX;
            const c1 = start.Latitude + y * factor * rangeY;
            //!bug 不能直接使用线性加减得到方框顶点
            const g1 = new GeodeticCoordinate(c0, c1, 0);
            const spaceCoord = PSEUDOMERCATOR.geographicToSpace(g1);
            vertex.push(spaceCoord.value);
        }
    return vertex;
};

/**
 * 纹理坐标（uv)
 * @param lerp 
 * @returns 
 */
const llpTexCoord = (lerp: number = VERTEXCOUNT): number[][] => {
    const texCoord: number[][] = [];
    const factor = 1 / lerp;
    for (let x = 0; x <= lerp; x++)
        for (let y = 0; y <= lerp; y++)
            texCoord.push([x * factor, 1 - y * factor]);
    return texCoord;
};

/**
 * f+1    s+1
 * |--------|
 * |        | 
 * |--------|
 * f        s
 * @param lerp 
 * @returns 
 */
const llpElement = (lerp: number = VERTEXCOUNT): number[][] => {
    const elements: number[][] = [];
    const stride = lerp + 1;
    for (let x = 0; x < lerp; x++)
        for (let y = 0; y < lerp; y++) {
            const first = x * stride + y;
            const second = first + stride;
            elements.push([first, second, first + 1]);
            elements.push([first + 1, second, second + 1]);
        }
    return elements;
};

export {
    llpVertex,
    llpElement,
    llpTexCoord
}