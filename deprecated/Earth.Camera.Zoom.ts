// import { clamp, Tween, ZOOM_EVENTS, type IZoomEventParam } from '@pipegpu/camera';
// import { Earth } from '../Earth';

// /**
//  *
//  */
// declare module '../Earth' {
//   interface Earth {
//     /**
//      *
//      */
//     registerCameraZoom(): void;

//     /**
//      * @param zoomEventParam
//      */
//     onWheeling(zoomEventParam: IZoomEventParam): void;

//     /**
//      *
//      */
//     onWheelEnd(): void;
//   }
// }

// /**
//  *
//  */
// Earth.prototype.registerCameraZoom = function (): void {
//   const g = this as Earth;
//   g.on(ZOOM_EVENTS.wheel, g.onWheeling, g);
//   g.on(ZOOM_EVENTS.wheelend, g.onWheelEnd, g);
// }

// /**
//  *
//  */
// Earth.prototype.onWheeling = function (zoomEventParam: IZoomEventParam): void {
//   const g = this as Earth,
//     e = zoomEventParam.domEvent as WheelEvent,
//     currentPosition = zoomEventParam.currentPosition,
//     value = zoomEventParam.value || 0;
//   const fr = g.rayTrackOnSphere(currentPosition);
//   if (fr === null) return; //缩放点不在地球上（无焦点）
//   const lv = clamp(value > 0 ? (g.Zoom - (zoomEventParam.zoom || 0)) : g.Zoom + (zoomEventParam.zoom || 0), g.Origin.zoomMin, g.Origin.zoomMax);
//   const camera = g._state_camera_.camera, target = g._state_camera_.target;
//   //
//   const total = camera.Position.len() - g.MaximumRadius - g.getMaximumCameraHeightByLevel(lv);
//   g._state_handler_zoom_.zooming = true;
//   const cached = { fr: fr, len: 0 };
//   //动画
//   new Tween({ len: 0 })
//     .to({ len: total })
//     .setDuration((zoomEventParam.zoom || 0) * 120)
//     .onUpdate((v) => {
//       const eyeDirection = camera.Position.clone().sub(target).normalize();
//       const deltaDistance = v.len - cached.len;
//       const delta = eyeDirection.scale(deltaDistance);
//       camera.Position = camera.Position.clone().sub(delta);
//       const to = g.rayTrackOnSphere(currentPosition);
//       g.panFromTo(cached.fr, to);
//       cached.len = v.len;
//     })
//     .onComplete(() => {
//       g.emit(ZOOM_EVENTS.wheelend);
//     })
//     .start();
// }

// /**
//  *
//  */
// Earth.prototype.onWheelEnd = function (): void {
//   const g = this as Earth;
//   g.updateQuadtreeTileByDistanceError();
//   //缩放结束
//   g._state_handler_zoom_.zooming = false;
//   g._state_handler_zoom_.onceWheelCount = 0;
//   g._state_handler_zoom_.lastWheelTime = 0;
// }

// //注册缩放事件
// Earth.registerHook(Earth.prototype.registerCameraZoom);