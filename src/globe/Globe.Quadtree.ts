import { Vec3 } from 'kiwi.matrix';

import { Globe } from './Globe';

import { QuadtreeTile } from './../core/QuadtreeTile';
import { QuadtreeTileSchema, webMercatorTileSchema } from './../core/QuadtreeTileSchema';

//控制瓦片精细程度，值越高越粗糙
const MAXIMUM_SCREEN_SPACEERROR = 3.0;

/**
 * 瓦片四叉树结构
 * 配合PersepcetiveCamera构建
 */
declare module './Globe' {
    interface Globe {
        /**
         * 四叉树初始化（z序列索引）
         * @param tileSchema 
         */
        registerQuadtree(tileSchema: QuadtreeTileSchema): void;

        /**
         * 获取0级瓦片与给定向量（posiont->target）相交的瓦片
         * @param position 
         */
        pickZeroLevelQuadtreeTiles(position: Vec3): QuadtreeTile[];

        /**
         * 计算给定level最大几何误差
         * @param level 
         */
        computeMaximumGeometricError(level: number): number;

        /**
         * 获取第0层瓦片
         */
        computeZeroLevelTiles(): QuadtreeTile[];

        /**
         * 计算第level级瓦片
         */
        computeLevelTiles(level: number): QuadtreeTile[];

        /**
         * 计算空间误差（用于界定z序索引变换）
         * @param quadtreeTile 
         */
        computeSpaceError(quadtreeTile: QuadtreeTile): number;

        /**
         * 计算指定缩放层级最大摄像机高度
         * @param level 
         */
        getMaximumCameraHeightByLevel(level: number): number;

        /**
         * 
         */
        updateQuadtreeTileByDistanceError(): void;

        /**
         * 
         */
        _state_quadtree_: {
            maximumScreenSpaceError: number,
            level: number;                          //当前globe的缩放层级
            geometricError: number[];               //不同层级几何误差
            maximumCameraHeight: number[];          //相机在不同缩放层级的最大高度
            zeroLevelTiles: QuadtreeTile[];         //初始化层Tileinfo
            visualRevealTiles: QuadtreeTile[];       //视椎区全部瓦片
            quadtreeTileSchema: QuadtreeTileSchema; //瓦片索引规则
        }
    }
}

/**
 * 
 */
Globe.prototype.registerQuadtree = function (tileSchema: QuadtreeTileSchema): void {
    const g = this as Globe, c = g.Origin.center, z = g.Origin.zoom;
    //初始参数构造
    g._state_quadtree_ = {
        maximumScreenSpaceError: MAXIMUM_SCREEN_SPACEERROR,
        level: 0,
        quadtreeTileSchema: tileSchema,
        geometricError: [],
        maximumCameraHeight: [],
        zeroLevelTiles: [],
        visualRevealTiles: []
    }
    //视锥参数
    const sseDenominator = g._state_camera_.camera.SseDenominator, height = g._state_camera_.viewContainer.height;
    for (let i = 0; i < 22; i++) {
        const geometricError = g.computeMaximumGeometricError(i);
        //计算geometric error
        g._state_quadtree_.geometricError[i] = geometricError;
        //计算每个缩放层级摄像头最大高度
        g._state_quadtree_.maximumCameraHeight[i] = geometricError * height / (sseDenominator * MAXIMUM_SCREEN_SPACEERROR);
    }
    //
    g._state_quadtree_.zeroLevelTiles = g.computeZeroLevelTiles();
    //根据缩放层级重新计算camera位置
    c.Altitude = g.getMaximumCameraHeightByLevel(z);
    g._state_camera_.camera.Position = g.geographicToSpaceCoordinate(c);
    //瓦片集更新
    g.updateQuadtreeTileByDistanceError();
}

/**
 * 简化：计算0级瓦片集
 */
Globe.prototype.computeZeroLevelTiles = function (): QuadtreeTile[] {
    const g = this as Globe;
    return g.computeLevelTiles(0);
}

/**
 * 计算指定缩放层级的全部瓦片
 */
Globe.prototype.computeLevelTiles = function (level:number): QuadtreeTile[] {
    const g = this as Globe;
    const quadtreeTileSchema = g._state_quadtree_.quadtreeTileSchema,
        numberOfLevelZeroTilesX = quadtreeTileSchema.getNumberOfXTilesAtLevel(level),
        numberOfLevelZeroTilesY = quadtreeTileSchema.getNumberOfYTilesAtLevel(level),
        zeroLevelTiles = [];
    let seed = 0;
    for (let y = 0; y < numberOfLevelZeroTilesY; ++y)
        for (let x = 0; x < numberOfLevelZeroTilesX; ++x)
            zeroLevelTiles[seed++] = new QuadtreeTile(quadtreeTileSchema, x, y, 0, null);
    return zeroLevelTiles;
}

/**
 * 地球赤道周长/像素
 * 周长：2*PI*r
 * 像素：256 * num
 */
Globe.prototype.computeMaximumGeometricError = function (level: number): number {
    const g = this as Globe;
    const CRITICAL_VALUE = 128;
    const maximumGeometricError = g.Ellipsoid.MaximumRadius * Math.PI / (CRITICAL_VALUE * g._state_quadtree_.quadtreeTileSchema.getNumberOfXTilesAtLevel(level));
    return maximumGeometricError;
}

/**
 * 
 */
Globe.prototype.pickZeroLevelQuadtreeTiles = function (position: Vec3): Array<QuadtreeTile> {
    const g = this as Globe;
    //修复issue2 问题
    if(g._state_quadtree_.quadtreeTileSchema === webMercatorTileSchema) 
        return g._state_quadtree_.zeroLevelTiles;
    //计算0层tile
    const zeroLevelQuadtreeTiles = g._state_quadtree_.zeroLevelTiles;
    const pickedZeroLevelQuadtreeTiles:QuadtreeTile[] = [];
    //1.转换camera位置与原点连线到地球表明
    const geodeticCoordinate = g.Ellipsoid.spaceToGeographic(position);
    //2.计算tile rangele与geocoord相交
    zeroLevelQuadtreeTiles.forEach((quadtreeTile) => {
        quadtreeTile.Boundary.Contain(geodeticCoordinate) ? pickedZeroLevelQuadtreeTiles.push(quadtreeTile) : null;
    });
    return pickedZeroLevelQuadtreeTiles;
}

/**
 * 根据摄像机的位置计算地球上的瓦片对应的spaceError
 */
Globe.prototype.computeSpaceError = function (quadtreeTile: QuadtreeTile): number {
    const g = this as Globe;
    //摄像机位置与瓦片中心的距离,距离由两部分构成
    //1.相机在椭球体上的投影点
    const level = quadtreeTile.Level,
        maxGeometricError = g._state_quadtree_.geometricError[level],
        sseDenominator = g._state_camera_.camera.SseDenominator,
        height = g._state_camera_.viewContainer.height,
        cameraSpacePosition = g._state_camera_.camera.Position.clone(),
        bounds = quadtreeTile.Boundary.Bounds,
        center = quadtreeTile.Boundary.Center;
    //2.投影点与目标tile的球面距离+相机距离球面距离 bug
    //2019/2/10 修正，改为与四角的距离取最大error
    // let err = 0;
    // for (let i = 0, len = bounds.length; i < len; i++) {
    //     const spacePostion = g.Ellipsoid.geographicToSpace(bounds[i]);
    //     const distance = cameraSpacePosition.clone().sub(spacePostion).len();
    //     const error = (maxGeometricError * height) / (distance * sseDenominator);
    //     err = error > err ? error : err;
    // }
    // return err;
    const spacePosition = g.Ellipsoid.geographicToSpace(center);
    const distance = cameraSpacePosition.clone().sub(spacePosition).len();
    //3.计算error
    const err = (maxGeometricError * height)/(distance*sseDenominator);
    return err;
}

/**
 * 对应缩放层级支持的摄像机最大高程
 */
Globe.prototype.getMaximumCameraHeightByLevel = function(level:number):number {
    const g = this as Globe;
    return g._state_quadtree_.maximumCameraHeight[level];
}

Globe.prototype.updateQuadtreeTileByDistanceError = function (): void {
    const g = this as Globe;
    const position = g._state_camera_.camera.Position.clone();
    let level = 0;
    const rootTiles = g.pickZeroLevelQuadtreeTiles(position);
    //wait rendering
    const rawQuadtreeTiles:QuadtreeTile[] = [];
    const renderingQuadtreeTiles:QuadtreeTile[] = [];
    //liter func, to calcute new tile in distance error
    const liter = (quadtreeTile: QuadtreeTile) => {
        const error = g.computeSpaceError(quadtreeTile);
        if (error > MAXIMUM_SCREEN_SPACEERROR)
            for (let i = 0; i < 4; i++)
                liter(quadtreeTile.Children[i]);
        else {
            const litLevel = quadtreeTile.Level;
            level = litLevel > level ? litLevel : level;
            rawQuadtreeTiles.push(quadtreeTile);
        }
    };
    //calcute from root tile
    for (let i = 0, len = rootTiles.length; i < len; i++) {
        const tile = rootTiles[i];
        liter(tile);
    }
    //filter level of tile
    for (let i = 0, len = rawQuadtreeTiles.length; i < len; i++) {
        const quadtreeTile = rawQuadtreeTiles[i];
        if(quadtreeTile.Level === level)
            renderingQuadtreeTiles.push(quadtreeTile)
    }
    //set current level
    g._state_quadtree_.level = level;
    g._state_quadtree_.visualRevealTiles = renderingQuadtreeTiles;
    //
    g.emit('tileupdated', g._state_quadtree_.visualRevealTiles);
}

//注册web墨卡托瓦片规则
Globe.registerHook(Globe.prototype.registerQuadtree, webMercatorTileSchema);