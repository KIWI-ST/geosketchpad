import { vec2, type Vec2 } from 'wgpu-matrix';
import { END_EVENTS, MOVE_EVENTS, PAN_EVENTS, START_EVENTS, type IDOMEventParam, type IPanEventParam } from '@pipegpu/camera';
import { Earth } from '../Earth';
import { split } from '../util/split';
import { getEventContainerPosition } from '../util/dom';

/**
 * 参考
 * 提供Global的Pan事件发布
 */
declare module '../Earth' {
    interface Earth {
        /**
         * 注册到hook的初始化执行钩子
         */
        registerPanHandlerHood(): void;

        /**
         * 移除 moveevents, endevents
         */
        releasePanHandlerEvents(): void;

        /**
         * 
         * @param evt 
         */
        panMousedownOrTouchstart(evt: IDOMEventParam): void;

        /**
         * 
         * @param evt 
         */
        panMousemoveOrTouchmove(evt: IDOMEventParam): void;

        /**
         * 
         * @param evt 
         */
        panMouseupOrTouchend(evt: IDOMEventParam): void;

        /**
         * 
         */
        _state_handler_pan_: {
            startPosition: Vec2;
            moved: boolean;
            interupted: boolean;    //指示pan是否被中断
        }

    }
}

/**
 * 
 */
Earth.prototype.registerPanHandlerHood = function (): void {
    const g = this as Earth;
    g._state_handler_pan_ = {
        startPosition: vec2.create(),
        moved: false,
        interupted: false,
    };
    split(START_EVENTS).forEach((type) => {
        g.on(type, g.panMousedownOrTouchstart, g);
    });
}

/**
 * mousedown 或 touchstart 事件开始
 */
Earth.prototype.panMousedownOrTouchstart = function (args: IDOMEventParam): void {
    const g = this as Earth, e = args.domEvent;
    //右键或多点触控，不分发事件
    if ((e instanceof MouseEvent && e.button === 2) || (e instanceof TouchEvent && e.touches && e.touches.length > 1)) {
        return;
    }
    //https://www.w3cschool.cn/fetch_api/fetch_api-w3zc2v4w.html
    const cp = getEventContainerPosition(e, g.Canvas);
    g._state_handler_pan_.startPosition = vec2.create(cp.clientX, cp.clientY);
    const panEventParam: IPanEventParam = {
        domEvent: e,
        currentPosition: {
            clientX: cp.clientX,
            clientY: cp.clientY
        }
    }
    //发送事件
    g.emit(PAN_EVENTS.panstart, panEventParam);
    //注册事件
    g.on(MOVE_EVENTS[e.type], g.panMousemoveOrTouchmove, g);
    g.on(END_EVENTS[e.type], g.panMouseupOrTouchend, g);
}

/**
 * 平移中
 */
Earth.prototype.panMousemoveOrTouchmove = function (args: IDOMEventParam): void {
    const g = this as Earth, e = args.domEvent;
    if (e instanceof TouchEvent && e.touches && e.touches.length > 1) {
        if (g._state_handler_pan_.moved) {
            g._state_handler_pan_.interupted = true;
            g.panMouseupOrTouchend(args);
        }
        return;
    }
    const cp = getEventContainerPosition(e, g.Canvas);
    const currentPosition = vec2.create(cp.clientX, cp.clientY);
    const offset = vec2.sub(currentPosition, g._state_handler_pan_.startPosition);
    if (!offset[0] && !offset[1]) {
        return;
    }
    const panEventParam: IPanEventParam = {
        domEvent: e,
        currentPosition: {
            clientX: cp.clientX,
            clientY: cp.clientY
        }
    };
    g.emit(PAN_EVENTS.paning, panEventParam);
    g._state_handler_pan_.startPosition = currentPosition;
}

/**
 * 平移结束
 */
Earth.prototype.panMouseupOrTouchend = function (args: IDOMEventParam): void {
    const g = this as Earth, e = args.domEvent;
    g.releasePanHandlerEvents();
    const cp = getEventContainerPosition(e, g.Canvas);
    const panEventParam: IPanEventParam = {
        domEvent: e,
        currentPosition: {
            clientX: cp.clientX,
            clientY: cp.clientY
        }
    }
    g.emit(PAN_EVENTS.panend, panEventParam);
}

/**
 * 清除所有pan操作
 */
Earth.prototype.releasePanHandlerEvents = function (): void {
    const g = this as Earth;
    for (const key in MOVE_EVENTS) {
        const moveEventName = MOVE_EVENTS[key];
        const endEventName = END_EVENTS[key];
        g.off(moveEventName, g.panMousemoveOrTouchmove, g);
        g.off(endEventName, g.panMouseupOrTouchend, g);
    }
}

//注册Pan插件
Earth.registerHook(Earth.prototype.registerPanHandlerHood);