import { Globe } from "../Globe";

import { now } from "../../util/now";

import { IClientPoint, IDOMEventParam, IZoomEventParam, ZOOM_EVENTS } from "../../core/Format";
import { getEventContainerPosition, preventDefault, stopPropagation } from "../../util/dom";

//参考
const wheelZoomDelta = 4.000244140625;

/**
 * 
 */
declare module './../Globe' {
    interface Globe {
        /**
         * 注册到hook, 初始执行
         */
        registerZoomHandlerHook(): void;

        /**
         * 移除moveevents, endevents
         */
        releaseZoomHandlerEvents(): void;

        /**
         * 
         * @param e 
         */
        zoomMousewheelOrTouch(e: IDOMEventParam): void;

        /**
         * 
         * @param e 
         * @param g 
         */
        processZoomWheel(e: WheelEvent, g: Globe): void;

        /**
         * zoom状态
         */
        _state_handler_zoom_: {
            lastWheelTime: number,
            lastWheelEvent: WheelEvent,
            onceWheelCount: number,
            delate: number,
            active: boolean,
            zooming: boolean,
            zoomOrigin: IClientPoint,    //缩放屏幕中心
            trackPadSuspect: number,
            ensureTrackpad: boolean,
        }
    }
}

/**
 * 
 */
Globe.prototype.registerZoomHandlerHook = function (): void {
    const g = this as Globe;
    g._state_handler_zoom_ = {
        lastWheelTime: 0,
        lastWheelEvent: null,
        onceWheelCount: 0,
        delate: 0,
        active: false,
        zooming: false,
        trackPadSuspect: 0,
        ensureTrackpad: false,
        zoomOrigin: { clientX: 0, clientY: 0 },
    };
    g.on('zoom', g.zoomMousewheelOrTouch);
}

/**
 * 
 */
Globe.prototype.releaseZoomHandlerEvents = function (): void {
    const g = this as Globe;
    g.off('zoom', g.zoomMousewheelOrTouch);
}

/**
 * 
 */
Globe.prototype.zoomMousewheelOrTouch = function (args: IDOMEventParam): void {
    const g = this as Globe, e = args.domEvent;
    preventDefault(e);
    stopPropagation(e);
    if (e.type === 'wheel' && !g._state_handler_zoom_.zooming) {
        const n = now();
        g._state_handler_zoom_.lastWheelTime = g._state_handler_zoom_.lastWheelTime || n;
        if (n - g._state_handler_zoom_.lastWheelTime < 50)
            g._state_handler_zoom_.onceWheelCount++;
        else
            g.processZoomWheel(e as WheelEvent, g);
        //30ms检测一次，用户操作会有轻微延迟感
        setTimeout(() => {
            if (!g._state_handler_zoom_.zooming)
                g.processZoomWheel(e as WheelEvent, g);
        }, 30)
    }
}

/**
 * 
 */
Globe.prototype.processZoomWheel = function (e: WheelEvent, g: Globe): void {
    const currentPosition = getEventContainerPosition(e, g.Canvas);
    const zoomEventParam: IZoomEventParam = {
        domEvent: e,
        currentPosition
    };
    if (!g._state_handler_zoom_.zooming) {
        g._state_handler_zoom_.trackPadSuspect = 0;
        g._state_handler_zoom_.ensureTrackpad = false;
    }
    //evet事件
    let value = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 60 : e.deltaY;
    if (value % wheelZoomDelta !== 0) {
        if (!g._state_handler_zoom_.ensureTrackpad) {
            g._state_handler_zoom_.trackPadSuspect = Math.abs(value) < 60 ? g._state_handler_zoom_.trackPadSuspect + 1 : 0;
            if (g._state_handler_zoom_.trackPadSuspect >= 2)
                g._state_handler_zoom_.ensureTrackpad = true;
        }
        if (g._state_handler_zoom_.ensureTrackpad)
            value *= 14;
    }
    //键盘
    if (e.shiftKey && value)
        value = value / 4;
    g._state_handler_zoom_.lastWheelEvent = e;
    g._state_handler_zoom_.delate -= value;
    if (!g._state_handler_zoom_.zooming && g._state_handler_zoom_.delate)
        g._state_handler_zoom_.zoomOrigin = currentPosition;
    //传递处理后的value
    zoomEventParam.value = value;
    zoomEventParam.zoom = g._state_handler_zoom_.onceWheelCount;
    //seamless
    g.emit(ZOOM_EVENTS.wheel, zoomEventParam);
}

Globe.registerHook(Globe.prototype.registerZoomHandlerHook);