import { vec2, type Vec2 } from "wgpu-matrix";
import { domBus, type DOMBusContext } from "../bus/DomBus";
import { Scene } from "../Scene";
import { getEventContainerPosition, preventDefault, stopPropagation } from "../util/dom";
import { now } from "../util/now";
import { sceneBus, type SceneBusContext } from "../bus/SceneBus";

//参考
const wheelZoomDelta = 4.000244140625;

/**
 * 
 */
declare module "../Scene" {
    interface Scene {
        registerZoomHandlerHook(): void;
        releaseZoomHandlerEvents(): void;
        zoomMousewheelOrTouch(c: DOMBusContext): void;
        processZoomWheel(e: WheelEvent, g: Scene): void;
        _state_handler_zoom_: {
            lastWheelTime: number,
            lastWheelEvent?: WheelEvent,
            onceWheelCount: number,
            delate: number,
            active: boolean,
            zooming: boolean,
            zoomOrigin: Vec2,    //缩放屏幕中心
            trackPadSuspect: number,
            ensureTrackpad: boolean,
        }
    }
}

Scene.prototype.registerZoomHandlerHook = (): void => {
    const g = this as unknown as Scene;
    g._state_handler_zoom_ = {
        lastWheelTime: 0,
        onceWheelCount: 0,
        delate: 0,
        active: false,
        zooming: false,
        trackPadSuspect: 0,
        ensureTrackpad: false,
        zoomOrigin: vec2.create(0, 0),
    };
    domBus.on('zoom', g.zoomMousewheelOrTouch, g);
}

Scene.prototype.releaseZoomHandlerEvents = function (): void {
    const g = this as Scene;
    domBus.off('zoom', g.zoomMousewheelOrTouch, g);
}

Scene.prototype.zoomMousewheelOrTouch = function (c: DOMBusContext): void {
    const g = this as Scene, e = c.domEvent;
    preventDefault(e);
    stopPropagation(e);
    if (e.type === 'wheel' && !g._state_handler_zoom_.zooming) {
        const n = now();
        g._state_handler_zoom_.lastWheelTime = g._state_handler_zoom_.lastWheelTime || n;
        if (n - g._state_handler_zoom_.lastWheelTime < 50) {
            g._state_handler_zoom_.onceWheelCount++;
        }
        else {
            g.processZoomWheel(e as WheelEvent, g);
        }
        // 30ms check interval
        setTimeout(() => {
            if (!g._state_handler_zoom_.zooming)
                g.processZoomWheel(e as WheelEvent, g);
        }, 30)
    }
}

Scene.prototype.processZoomWheel = function (e: WheelEvent, g: Scene): void {
    const currentPosition = getEventContainerPosition(e, g.Canvas);
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition
    };
    if (!g._state_handler_zoom_.zooming) {
        g._state_handler_zoom_.trackPadSuspect = 0;
        g._state_handler_zoom_.ensureTrackpad = false;
    }
    let value = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 60 : e.deltaY;
    if (value % wheelZoomDelta !== 0) {
        if (!g._state_handler_zoom_.ensureTrackpad) {
            g._state_handler_zoom_.trackPadSuspect = Math.abs(value) < 60 ? g._state_handler_zoom_.trackPadSuspect + 1 : 0;
            if (g._state_handler_zoom_.trackPadSuspect >= 2) {
                g._state_handler_zoom_.ensureTrackpad = true;
            }
        }
        if (g._state_handler_zoom_.ensureTrackpad) {
            value *= 14;
        }
    }
    if (e.shiftKey && value) {
        value = value / 4;
    }
    g._state_handler_zoom_.lastWheelEvent = e;
    g._state_handler_zoom_.delate -= value;
    if (!g._state_handler_zoom_.zooming && g._state_handler_zoom_.delate) {
        g._state_handler_zoom_.zoomOrigin = currentPosition;
    }
    ctx.value = value;
    ctx.zoom = g._state_handler_zoom_.onceWheelCount;

    //seamless
    sceneBus.emit('zoomin', ctx);
}

Scene.registerHook(Scene.prototype.registerZoomHandlerHook);