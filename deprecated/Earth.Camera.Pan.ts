import { PAN_EVENTS, type IClientPoint, type IPanEventParam } from '@pipegpu/camera';
import { quat, vec3, type Quat, type Vec3 } from 'wgpu-matrix';
import { Earth } from '../Earth';

/**
 * 
 */
declare module '../Earth' {
    interface Earth {
        /**
         * 
         */
        registerCameraPan(): void;

        /**
         * 
         */
        releaseCameraPan(): void;

        /**
         * 
         * @param args 
         */
        onPanStart(args: IPanEventParam): void;

        /**
         * 
         * @param args 
         */
        onPaning(args: IPanEventParam): void;

        /**
         * 
         * @param args 
         */
        onPanend(args: IPanEventParam): void;

        /**
         * 
         * @param from 
         * @param to 
         */
        panFromTo(from: Vec3, to: Vec3): void;

        /**
         * 
         */
        _state_pan_: {
            paning: boolean;
            m_lastRotateGlobeFromVector: Vec3;
            m_lastRotateGlobeAxis: Vec3;
            m_lastRotateGlobeAngle: number;
            m_lastPostition: IClientPoint; //记录鼠标的 clientX, clientY
            m_rotateGlobeQuaternion: Quat;
        }
    }
}

/**
 * 
 */
Earth.prototype.registerCameraPan = function (): void {
    const g = this as Earth;
    g._state_pan_ = {
        paning: false,
        m_lastRotateGlobeFromVector: vec3.create(),
        m_lastRotateGlobeAxis: vec3.create(),
        m_lastRotateGlobeAngle: 0,
        m_lastPostition: { clientX: 0, clientY: 0 },
        m_rotateGlobeQuaternion: quat.create(),
    }
    //注册事件
    g.on(PAN_EVENTS.panstart, g.onPanStart, g);
    g.on(PAN_EVENTS.paning, g.onPaning, g);
    g.on(PAN_EVENTS.panend, g.onPanend, g);
}

/**
 * fm, 起始：鼠标与中心连线，与地球表明相交的点的空间坐标Vec3
 * to, 终止：鼠标与中心连线，与地球表明相交的点的空间坐标Vec3
 */
Earth.prototype.panFromTo = function (fm: Vec3, to: Vec3): void {
    //空的起点和终点取消操作
    if (fm == null || to == null) return;
    const g = this as Earth;
    // Assign the new animation start time.
    g._state_pan_.m_lastRotateGlobeFromVector = vec3.clone(fm);
    g._state_pan_.m_lastRotateGlobeAxis = vec3.normalize(vec3.cross(fm, to));
    g._state_pan_.m_lastRotateGlobeAngle = vec3.angle(fm, to);
    //旋转四元数
    g._state_pan_.m_rotateGlobeQuaternion = quat.fromAxisAngle(g._state_pan_.m_lastRotateGlobeAxis, -g._state_pan_.m_lastRotateGlobeAngle);
    const offset = g._state_camera_.camera.Position.clone().sub(g._state_camera_.target);
    offset.applyQuat(g._state_pan_.m_rotateGlobeQuaternion);
    g._state_camera_.camera.Up.applyQuat(g._state_pan_.m_rotateGlobeQuaternion);
    //更新相机位置
    g._state_camera_.camera.Position = offset.add(g._state_camera_.target)
}

/**
 * 
 */
Earth.prototype.onPanStart = function (panParam: IPanEventParam): void {
    const g = this as Earth, cp = panParam.currentPosition;
    g._state_pan_.paning = true;
    g._state_pan_.m_lastPostition = {
        clientX: cp?.clientX || 0,
        clientY: cp?.clientY || 0,
    }
}

/**
 * 
 */
Earth.prototype.onPaning = function (panParam: IPanEventParam): void {
    const g = this as Earth, cp = panParam.currentPosition;
    const tc = {
        clientX: cp?.clientX || 0,
        clientY: cp?.clientY || 0,
    };
    const fm = g.rayTrackOnSphere(g._state_pan_.m_lastPostition);
    const to = g.rayTrackOnSphere(tc);
    g.panFromTo(fm, to);
    g._state_pan_.m_lastPostition = {
        clientX: tc.clientX,
        clientY: tc.clientY,
    }
}

/**
 * 
 */
Earth.prototype.onPanend = function (args: IPanEventParam): void {
    const g = this as Earth;
    g._state_pan_.paning = false;
    g.updateQuadtreeTileByDistanceError();
}

//
Earth.registerHook(Earth.prototype.registerCameraPan);