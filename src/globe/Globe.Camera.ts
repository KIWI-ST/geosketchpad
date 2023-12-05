import { GLMatrix, Vec3 } from 'kiwi.matrix';

import { Globe } from './Globe';

import { Ray } from '../core/Ray';
import { PerspectiveCamera } from '../camera/PerspectiveCamera';
import { GeodeticCoordinate } from '../core/GeodeticCoordinate';
import { IClientPoint, IViewContainer } from '../core/Format';

/**
 * View支持，在Camear下支持
 * -LOD
 * -坐标转换(ndc，大地坐标，空间坐标等)
 */
declare module './Globe' {
    interface Globe {
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
        spaceCoordinateToGeographic(spaceCoord:Vec3):GeodeticCoordinate;

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
Globe.prototype.registerCamera = function (coord: GeodeticCoordinate): void {
    const g = this as Globe;
    //1. 获取element信息
    const box = g.Canvas.getBoundingClientRect(), dom = g.Canvas.ownerDocument.documentElement;
    //2. 获取view信息
    const left = box.left + window.pageXOffset - dom.clientLeft,
        top = box.top + window.pageYOffset - dom.clientTop,
        width = box.width,
        height = box.height;
    //3. 计算
    g._state_camera_ = {
        camera: new PerspectiveCamera(60, width, height, height/2/Math.tan(GLMatrix.toRadian(60)), g.Ellipsoid.MaximumRadius * 10),
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
        target: new Vec3().set(0, 0, 0)
    };
    //4.更新初始化相机参数
    const p0 = g.geographicToSpaceCoordinate(coord);
    g._state_camera_.camera.Position = p0;
    g._state_camera_.camera.lookAt(new Vec3().set(0, 0, 0));
}

/**
 * 获取屏幕坐标与空间坐标(0,0,0)连线，与参考椭球体表面相交点坐标
 */
Globe.prototype.rayTrackOnSphere = function (point: IClientPoint): Vec3 {
    const g = this as Globe;
    const pndc = g.normalizedDeviceCoordinate(point);
    const space = g.normalizedDeviceCoordinateToSpaceCoordinate(pndc);
    const d = space.sub(g._state_camera_.camera.Position.clone()).normalize();
    const ray = new Ray(g._state_camera_.camera.Position.clone(), d);
    return ray.intersectSphere(g.Ellipsoid);
}

/**
 * 通过ClientX,ClientY换算成设备的NDC坐标
 * 输入容器中client坐标
 */
Globe.prototype.normalizedDeviceCoordinate = function (point: IClientPoint): Vec3 {
    const g = this as Globe;
    const x = (point.clientX / g._state_camera_.viewContainer.width) * 2 - 1,
        y = -(point.clientY / g._state_camera_.viewContainer.height) * 2 + 1;
    return new Vec3().set(x, y, 1);
}

/**
 * ndc坐标换算成空间坐标
 */
Globe.prototype.normalizedDeviceCoordinateToSpaceCoordinate = function (pndc: Vec3): Vec3 {
    const g = this as Globe;
    const m4 = g._state_camera_.camera.CameraMatrix.clone().multiply(g._state_camera_.camera.ProjectionMatrix.clone().invert());
    return pndc.clone().applyMatrix4(m4);
}

/**
 * space coordinate 转换成屏幕NDC坐标
 */
Globe.prototype.spaceCoordinateToNormaziledDeveiceCoordinate = function (space: Vec3): Vec3 {
    const g = this as Globe;
    return space.clone().applyMatrix4(g._state_camera_.camera.ViewProjectionMatrix);
}

/**
 * 大地坐标转换成空间坐标
 */
Globe.prototype.geographicToSpaceCoordinate = function (coord: GeodeticCoordinate): Vec3 {
    const g = this as Globe;
    return g.Ellipsoid.geographicToSpace(coord);
}

/**
 * 空间坐标转大地坐标（投影到地球表面）
 */
Globe.prototype.spaceCoordinateToGeographic = function(spaceCoord:Vec3):GeodeticCoordinate{
    const g = this as Globe;
    return g.Ellipsoid.spaceToGeographic(spaceCoord);
}