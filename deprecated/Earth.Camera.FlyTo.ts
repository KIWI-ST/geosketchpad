import { GeodeticCoordinate } from "@pipegpu/geography";
import { Easing, Tween } from "@pipegpu/camera";
import { Earth } from "../Earth";

/**
 * @class Globe
 */
declare module '../Earth' {
    interface Earth {
        /**
         * 
         * @param coord 
         * @param zoom 
         * @param duration 
         */
        flyTo(coord: GeodeticCoordinate, zoom: number, duration: number): void
    }
}

/**
 * 
 */
Earth.prototype.flyTo = function (coord: GeodeticCoordinate, zoom: number, duration: number): void {
    const g = this as Earth, center = g.Origin.center.toGeodetic(), viewCenter = g._state_camera_.viewCenter;
    //旋转的起点和终点
    const p1 = coord.toGeodetic();
    const camera = g._state_camera_.camera, target = g._state_camera_.camera.Target;
    const total = camera.Position.len() - g.MaximumRadius - g.getMaximumCameraHeightByLevel(zoom);
    g._state_handler_zoom_.zooming = true;
    const cached = { f: g.rayTrackOnSphere(viewCenter), len: 0 };
    //动画
    new Tween({ len: 0, x: center.Longitude, y: center.Latitude })
        .to({ len: total, x: p1.Longitude, y: p1.Latitude })
        .setDuration(duration)
        .easing(Easing.Quadratic.InOut)
        .onUpdate((v) => {
            //zoom
            const eyeDirection = camera.Position.clone().sub(target).normalize();
            const deltaDistance = v.len - cached.len;
            const delta = eyeDirection.scale(deltaDistance);
            camera.Position = camera.Position.clone().sub(delta);
            cached.len = v.len;
            //pan
            const to = new GeodeticCoordinate(v.x, v.y);
            const t = g.geographicToSpaceCoordinate(to).normalize();
            g.panFromTo(t, cached.f);
            cached.f = g.rayTrackOnSphere(viewCenter);
        })
        .onComplete(() => {
            g.updateQuadtreeTileByDistanceError();
            //飞行结束
            g._state_handler_zoom_.zooming = false;
            g._state_handler_zoom_.onceWheelCount = 0;
            g._state_handler_zoom_.lastWheelTime = 0;
        })
        .start();
}