import { mat4, vec3, type Vec3 } from 'wgpu-matrix';
import { Ray, type GeodeticCoordinate } from '@pipegpu/geography';
import { type IClientPoint, type IViewContainer, PerspectiveCamera } from '@pipegpu/camera';
import { Earth } from '../Earth';

/**
 * View支持，在Camear下支持
 * -LOD
 * -坐标转换(ndc，大地坐标，空间坐标等)
 */
declare module './../Earth' {
    interface Earth {
        /**
         * 
         * @param coord 
         */
        registerCamera(coord: GeodeticCoordinate): void;

        /**
         * 获取屏幕坐标与空间坐标(0,0,0)连线，与参考椭球体表面相交点坐标
         * @param point 
         */
        rayTrackOnSphere(point: IClientPoint): Vec3;

        /**
         * 屏幕NDC坐标转换成大地坐标（默认在地球表面）
         * @param point 
         */
        normalizedDeviceCoordinate(point: IClientPoint): Vec3;

        /**
         * 地理坐标转换成空间坐标，支持地面高度转换
         * @param coord 
         */
        geographicToSpaceCoordinate(coord: GeodeticCoordinate): Vec3;

        /**
         * 屏幕DNC坐标转换成空间坐标
         * @param pndc 
         */
        normalizedDeviceCoordinateToSpaceCoordinate(pndc: Vec3): Vec3;

        /**
         * 空间坐标转屏幕NDC坐标
         * @param spaceCoord 
         */
        spaceCoordinateToNormaziledDeveiceCoordinate(spaceCoord: Vec3): Vec3;

        /**
         * 空间坐转换成地球大地坐标（投射到地球表面）
         * @param spaceCoord 
         */
        spaceCoordinateToGeographic(spaceCoord: Vec3): GeodeticCoordinate;

        /**
         * 
         */
        _state_camera_: {
            camera: PerspectiveCamera;
            target: Vec3,                //摄像头关注的中心
            viewCenter: IClientPoint;
            viewContainer: IViewContainer;
        }
    }
}

/**
 * 相机注册
 */
Earth.prototype.registerCamera = function (coord: GeodeticCoordinate): void {
    const g = this as Earth;
    //1. 获取element信息
    const box = g.Canvas.getBoundingClientRect(), dom = g.Canvas.ownerDocument.documentElement;
    //2. 获取view信息
    const left = box.left + window.pageXOffset - dom.clientLeft,
        top = box.top + window.pageYOffset - dom.clientTop,
        width = box.width,
        height = box.height;
    //3. 计算
    g._state_camera_ = {
        camera: new PerspectiveCamera(
            60,
            width / height,
            0.1,
            g.Ellipsoid.MaximumRadius * 3,
            false
        ),
        viewContainer: {
            left,
            top,
            width,
            height,
        },
        viewCenter: {
            clientX: width / 2,
            clientY: height / 2
        },
        target: vec3.create()
    };
    //4.更新初始化相机参数
    const p0 = g.geographicToSpaceCoordinate(coord);
    g._state_camera_.camera.Position = p0;
    g._state_camera_.camera.Target = vec3.create(0, 0, 0);
}

/**
 * 获取屏幕坐标与空间坐标(0,0,0)连线，与参考椭球体表面相交点坐标
 */
Earth.prototype.rayTrackOnSphere = function (point: IClientPoint): Vec3 {
    const g = this as Earth;
    const pndc = g.normalizedDeviceCoordinate(point);
    const space = g.normalizedDeviceCoordinateToSpaceCoordinate(pndc);
    const d = vec3.normalize(vec3.sub(space, g._state_camera_.camera.Position));
    const ray = new Ray(g._state_camera_.camera.Position, d);
    return ray.intersectSphere(g.Ellipsoid);
}

/**
 * 通过ClientX,ClientY换算成设备的NDC坐标
 * 输入容器中client坐标
 */
Earth.prototype.normalizedDeviceCoordinate = function (point: IClientPoint): Vec3 {
    const g = this as Earth;
    const x = (point.clientX / g._state_camera_.viewContainer.width) * 2 - 1,
        y = -(point.clientY / g._state_camera_.viewContainer.height) * 2 + 1;
    return vec3.create(x, y, 1);
}

/**
 * ndc坐标换算成空间坐标
 * @description https://github.com/pipegpu/pipegpu.matrix/blob/8f734f948e79df7fce7664d20274d1769719259a/src/matrix/Vec3.ts#L516C1-L524C6
 */
Earth.prototype.normalizedDeviceCoordinateToSpaceCoordinate = function (pndc: Vec3): Vec3 {
    const g = this as Earth;
    const m4 = mat4.invert(mat4.multiply(g._state_camera_.camera.ViewMatrix, g._state_camera_.camera.ProjectionMatrix));
    return vec3.transformMat4(pndc, m4);
}

/**
 * space coordinate 转换成屏幕NDC坐标
 */
Earth.prototype.spaceCoordinateToNormaziledDeveiceCoordinate = function (space: Vec3): Vec3 {
    const g = this as Earth;
    return vec3.transformMat4(space, g._state_camera_.camera.ViewProjectionMatrix);
}

/**
 * 大地坐标转换成空间坐标
 */
Earth.prototype.geographicToSpaceCoordinate = function (coord: GeodeticCoordinate): Vec3 {
    const g = this as Earth;
    return g.Ellipsoid.geographicToSpace(coord);
}

/**
 * 空间坐标转大地坐标（投影到地球表面）
 */
Earth.prototype.spaceCoordinateToGeographic = function (spaceCoord: Vec3): GeodeticCoordinate {
    const g = this as Earth;
    return g.Ellipsoid.spaceToGeographic(spaceCoord);
}