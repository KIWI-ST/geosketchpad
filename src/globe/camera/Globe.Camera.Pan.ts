import { Quat, Vec2, Vec3 } from 'kiwi.matrix';

import { Globe } from '../Globe';

import { IClientPoint, IPanEventParam, PAN_EVENTS } from '../../core/Format';

/**
 * 
 */
declare module './../Globe' {
    interface Globe {
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
Globe.prototype.registerCameraPan = function ():void {
    const g = this as Globe;
    g._state_pan_ = {
        paning:false,
        m_lastRotateGlobeFromVector:new Vec3(),
        m_lastRotateGlobeAxis:new Vec3(),
        m_lastRotateGlobeAngle:0,
        m_lastPostition:{clientX:0, clientY:0},
        m_rotateGlobeQuaternion:new Quat(),
    }
    //注册事件
    g.on(PAN_EVENTS.panstart, g.onPanStart);
    g.on(PAN_EVENTS.paning, g.onPaning);
    g.on(PAN_EVENTS.panend, g.onPanend);
}

/**
 * fm, 起始：鼠标与中心连线，与地球表明相交的点的空间坐标Vec3
 * to, 终止：鼠标与中心连线，与地球表明相交的点的空间坐标Vec3
 */
Globe.prototype.panFromTo = function (fm: Vec3, to: Vec3): void {
    //空的起点和终点取消操作
    if(fm==null||to==null) return;
    const g = this as Globe;
    // Assign the new animation start time.
    g._state_pan_.m_lastRotateGlobeFromVector = fm.clone();
    g._state_pan_.m_lastRotateGlobeAxis = fm.clone().cross(to).normalize();
    g._state_pan_.m_lastRotateGlobeAngle = fm.angle(to);
    //旋转四元数
    g._state_pan_.m_rotateGlobeQuaternion = new Quat().setAxisAngle(g._state_pan_.m_lastRotateGlobeAxis, -g._state_pan_.m_lastRotateGlobeAngle);
    const offset = g._state_camera_.camera.Position.clone().sub(g._state_camera_.target);
    offset.applyQuat(g._state_pan_.m_rotateGlobeQuaternion);
    g._state_camera_.camera.Up.applyQuat(g._state_pan_.m_rotateGlobeQuaternion);
    //更新相机位置
    g._state_camera_.camera.Position = offset.add(g._state_camera_.target)

}

/**
 * 
 */
Globe.prototype.onPanStart = function (panParam: IPanEventParam): void {
    const g = this as Globe, cp = panParam.currentPosition;
    g._state_pan_.paning = true;
    g._state_pan_.m_lastPostition = {
        clientX:cp.clientX,
        clientY:cp.clientY,
    }
}

/**
 * 
 */
Globe.prototype.onPaning = function (panParam: IPanEventParam): void {
    const g = this as Globe, cp = panParam.currentPosition;
    const tc = {
        clientX: cp.clientX,
        clientY: cp.clientY,
    };
    const fm = g.rayTrackOnSphere(g._state_pan_.m_lastPostition);
    const to = g.rayTrackOnSphere(tc);
    g.panFromTo(fm, to);
    g._state_pan_.m_lastPostition={
        clientX:tc.clientX,
        clientY:tc.clientY,
    }
}

/**
 * 
 */
Globe.prototype.onPanend = function (args: IPanEventParam): void {
    const g = this as Globe;
    g._state_pan_.paning = false;
    g.updateQuadtreeTileByDistanceError();
}

//
Globe.registerHook(Globe.prototype.registerCameraPan);