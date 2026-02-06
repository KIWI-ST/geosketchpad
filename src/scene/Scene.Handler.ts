import { Scene } from './Scene';
import { now } from '../util/now';
import { addDOMEvent, preventDefault } from '../util/dom';
import { domBus, type DOMBusContext, type DOMBusEvent } from '../bus/DOMBus';


/**
 * Interaction Types Supported by Browser Controls
 * Provides:
 * - Browser-supported interaction event registration
 * - Invalid event responses
 */
const DOM_EVENT_TYPES =
    'wheel ' +
    'mousedown ' +
    'mouseup ' +
    'mouseover ' +
    'mouseout ' +
    'mouseenter ' +
    'mouseleave ' +
    'mousemove ' +
    'click ' +
    'dblclick ' +
    'contextmenu ' +
    'keypress ' +
    'touchstart ' +
    'touchmove ' +
    'touchend ';

/**
 * @description ref: https://www.tslang.cn/docs/handbook/declaration-merging.html
 */
declare module './Scene' {
    interface Scene {
        handleDOMEvent(e: Event): void;
        parseEvent(e: Event, type: string): DOMBusContext;
        getActualEvent(e: Event): Event | Touch;
        _state_handler_dom_: {
            mouseDownTime?: number;
        }
    }
}

/**
 * 统一预处理DOM
 * 1. 处理输入延迟
 * 2. 模拟doble click
 * 3. 统一处理touch，clcik
 */
Scene.prototype.handleDOMEvent = function (e: Event): void {
    const g = this as Scene;
    let type = e.type;
    //prevent default context menu
    if (type === 'contextmenu') {
        preventDefault(e);
    }
    //ignore click lasted for more than 300ms
    if (type === 'mousedown' || (type === 'touchstart' && (e instanceof TouchEvent && (!e.touches || e.touches.length === 1)))) {
        g._state_handler_dom_.mouseDownTime = now();
    }
    else if (type === 'click' || type === 'touchend' || type === 'contextmenu') {
        //mousedown | touchstart propogation is stopped
        //ignore the click/touchend/contextmenu
        if (!this._state_handler_dom_.mouseDownTime) {
            return;
        }
        else {
            const downTime = g._state_handler_dom_.mouseDownTime;
            delete g._state_handler_dom_.mouseDownTime;
            const time = now();
            if ((time - (downTime || 0) > 300) && (type === 'click' || type === 'contextmenu')) {
                return;
            }
            else if (type === 'touchend' || type === 'click') {
                //小于300ms认为是双击
                type = 'dbclick';
            }

        }
    } else if (type === 'wheel' || (e instanceof TouchEvent && (e.touches && e.touches.length === 2))) {
        type = 'zoom';
    }
    domBus.emit(type as DOMBusEvent, g.parseEvent(e, type));
}

/**
 *
 */
Scene.prototype.parseEvent = function (e: TouchEvent | MouseEvent, type: string): DOMBusContext {
    const DOMEventParam: DOMBusContext = {
        type: e.type,
        domEvent: e
    };
    if (!e) {
        return DOMEventParam;
    }
    // @todo support keypress for 3d view change.
    const ctx = this as Scene;
    if (type !== 'keypress' && ctx.getActualEvent(e)) {
        // const containerPoint = getEventContainerPoint(actual, this._containerDOM);
        // DOMEventParam = extend(DOMEventParam, {
        //     'coordinate': this.containerPointToCoord(containerPoint),
        //     'containerPoint': containerPoint,
        //     'viewPoint': this.containerPointToViewPoint(containerPoint),
        //     'point2d': this._containerPointToPoint(containerPoint),
        // });
    }
    return DOMEventParam;
}

/**
 *
 */
Scene.prototype.getActualEvent = function (e: Event): Event | Touch {
    if (e instanceof TouchEvent && e.touches && e.touches.length > 0) {
        return e.touches[0];
    }
    if (e instanceof TouchEvent && e.changedTouches && e.changedTouches.length > 0) {
        return e.changedTouches[0];
    }
    return e;
}

/**
 * register DOMEvent entry
 * @function registerDOMEventsHook
 */
Scene.registerHook(
    async (scene: Scene) => {
        // init scene state.
        scene._state_handler_dom_ = {
            mouseDownTime: 0
        };
        // register document event.
        addDOMEvent(scene.Canvas, DOM_EVENT_TYPES, scene.handleDOMEvent, scene);
    }
);