import { Scene } from '../Scene';
import { now } from '../util/now';
import { addDOMEvent, preventDefault } from '../util/dom';
import { domBus, type DOMBusContext, type DOMBusEvent } from '../bus/DomBus';

/**
 * 浏览器控件支持的交互类型
 * 提供：
 * -浏览器支持的交互事件注册
 * -无效的事件响应
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
 * 合并申明
 * reference:
 * https://www.tslang.cn/docs/handbook/declaration-merging.html
 */
declare module './../Scene' {
    interface Scene {
        /**
         *
         */
        registerDOMEventsHook(): void;

        /**
         *
         * @param obj
         * @param eventName
         * @param handler
         * @param context
         */
        onDOMEvent(obj: HTMLElement, eventName: string, handler: Function, context: object): void;

        /**
         *
         * @param e
         */
        handleDOMEvent(e: Event): void;

        /**
         * 转换事件对象
         * @param e
         * @param type
         */
        parseEvent(e: Event, type: string): void;

        /**
         *
         * @param e
         */
        getActualEvent(e: Event): Event | Touch;

        /**
         *
         */
        _state_handler_dom_: {
            mouseDownTime?: number;
        }
    }
}

/**
 * register DOMEvent entry
 * @function registerDOMEventsHook
 */
Scene.prototype.registerDOMEventsHook = function () {
    const scene = this as Scene;
    scene._state_handler_dom_ = {
        mouseDownTime: 0
    };
    scene.onDOMEvent(scene.Canvas, DOM_EVENT_TYPES, scene.handleDOMEvent, scene);
}

/**
 * 单个DOM事件过滤
 */
Scene.prototype.onDOMEvent = function (element: HTMLElement, eventName: string, handler: Function, context: object): void {
    addDOMEvent(element, eventName, handler, context);
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

Scene.registerHook(Scene.prototype.registerDOMEventsHook);