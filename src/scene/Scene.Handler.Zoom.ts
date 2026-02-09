import { vec2, type Vec2 } from "wgpu-matrix";
import { Scene } from "./Scene";
import { getEventContainerPosition, preventDefault, stopPropagation } from "../util/dom";
import { now } from "../util/now";
import { sceneBus, type SceneBusContext } from "../bus/SceneBus";
import { domBus, type DOMBusContext } from "../bus/DOMBus";

//参考
const wheelZoomDelta = 4.000244140625;

/**
 * 
 */
declare module './Scene' {
    interface Scene {
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

Scene.prototype.releaseZoomHandlerEvents = function (): void {
    domBus.off('zoom', this.zoomMousewheelOrTouch, this);
}

Scene.prototype.zoomMousewheelOrTouch = function (c: DOMBusContext): void {
    const e = c.domEvent;
    preventDefault(e);
    stopPropagation(e);
    if (e.type === 'wheel' && !this._state_handler_zoom_.zooming) {
        const n = now();
        this._state_handler_zoom_.lastWheelTime = this._state_handler_zoom_.lastWheelTime || n;
        if (n - this._state_handler_zoom_.lastWheelTime < 50) {
            this._state_handler_zoom_.onceWheelCount++;
        }
        else {
            this.processZoomWheel(e as WheelEvent, this);
        }
        // 30ms check interval
        setTimeout(() => {
            if (!this._state_handler_zoom_.zooming)
                this.processZoomWheel(e as WheelEvent, this);
        }, 30)
    }
}

Scene.prototype.processZoomWheel = function (e: WheelEvent): void {
    const currentPosition = getEventContainerPosition(e, this.Canvas);
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition
    };
    if (!this._state_handler_zoom_.zooming) {
        this._state_handler_zoom_.trackPadSuspect = 0;
        this._state_handler_zoom_.ensureTrackpad = false;
    }
    let value = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 60 : e.deltaY;
    if (value % wheelZoomDelta !== 0) {
        if (!this._state_handler_zoom_.ensureTrackpad) {
            this._state_handler_zoom_.trackPadSuspect = Math.abs(value) < 60 ? this._state_handler_zoom_.trackPadSuspect + 1 : 0;
            if (this._state_handler_zoom_.trackPadSuspect >= 2) {
                this._state_handler_zoom_.ensureTrackpad = true;
            }
        }
        if (this._state_handler_zoom_.ensureTrackpad) {
            value *= 14;
        }
    }
    if (e.shiftKey && value) {
        value = value / 4;
    }
    this._state_handler_zoom_.lastWheelEvent = e;
    this._state_handler_zoom_.delate -= value;
    if (!this._state_handler_zoom_.zooming && this._state_handler_zoom_.delate) {
        this._state_handler_zoom_.zoomOrigin = currentPosition;
    }
    ctx.value = value;
    ctx.zoom = this._state_handler_zoom_.onceWheelCount;
    //seamless
    sceneBus.emit('zoomIn', ctx);
}

Scene.registerHook(
    async (scene: Scene) => {
        // scene zoom state.
        scene._state_handler_zoom_ = {
            lastWheelTime: 0,
            onceWheelCount: 0,
            delate: 0,
            active: false,
            zooming: false,
            trackPadSuspect: 0,
            ensureTrackpad: false,
            zoomOrigin: vec2.create(0, 0),
        };

        // register zoom related events.
        domBus.on('zoom', scene.zoomMousewheelOrTouch, scene);
    }
);