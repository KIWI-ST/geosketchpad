import { Globe } from '../Globe';

import { clamp } from '../../util/clamp';
import { Tween } from '../../core/Tween';
import { IZoomEventParam, ZOOM_EVENTS } from '../../core/Format';

declare module './../Globe' {
  interface Globe {
    /**
     * 
     */
    registerCameraZoom(): void;

    /**
     * 
     * @param zoomEventParam 
     */
    onWheeling(zoomEventParam: IZoomEventParam): void;

    /**
     * 
     */
    onWheelEnd(): void;
  }
}

/**
 * 
 */
Globe.prototype.registerCameraZoom = function (): void {
  const g = this as Globe;
  g.on(ZOOM_EVENTS.wheel, g.onWheeling);
  g.on(ZOOM_EVENTS.wheelend, g.onWheelEnd);
}

/**
 * 
 */
Globe.prototype.onWheeling = function (zoomEventParam: IZoomEventParam): void {
  const g = this as Globe, e = zoomEventParam.domEvent as WheelEvent, currentPosition = zoomEventParam.currentPosition, value = zoomEventParam.value;
  const fr = g.rayTrackOnSphere(currentPosition);
  if (fr === null) return; //缩放点不在地球上（无焦点）
  const lv = clamp(value > 0 ? g.Zoom - zoomEventParam.zoom : g.Zoom + zoomEventParam.zoom, g.Origin.zoomMin, g.Origin.zoomMax);
  const camera = g._state_camera_.camera, target = g._state_camera_.target;
  //
  const total = camera.Position.len() - g.MaximumRadius - g.getMaximumCameraHeightByLevel(lv);
  g._state_handler_zoom_.zooming = true;
  const cached = { fr: fr, len: 0 };
  //动画
  new Tween().from({ len: 0 }).to({ len: total }).duration(zoomEventParam.zoom * 120)
    .updateHandler((v: { len: number }) => {
      const eyeDirection = camera.Position.clone().sub(target).normalize();
      const deltaDistance = v.len - cached.len;
      const delta = eyeDirection.scale(deltaDistance);
      camera.Position = camera.Position.clone().sub(delta);
      const to = g.rayTrackOnSphere(currentPosition);
      g.panFromTo(cached.fr, to);
      cached.len = v.len;
    })
    .completeHandler(() => {
      g.emit(ZOOM_EVENTS.wheelend);
    })
    .start();
}

/**
 * 
 */
Globe.prototype.onWheelEnd = function (): void {
  const g = this as Globe;
  g.updateQuadtreeTileByDistanceError();
  //缩放结束
  g._state_handler_zoom_.zooming = false;
  g._state_handler_zoom_.onceWheelCount = 0;
  g._state_handler_zoom_.lastWheelTime = 0;
}

//注册缩放事件
Globe.registerHook(Globe.prototype.registerCameraZoom);