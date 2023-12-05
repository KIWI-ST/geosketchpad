import { Vec2 } from 'kiwi.matrix';

import { Globe } from './../Globe';

import { split } from '../../util/split';
import { getEventContainerPosition } from '../../util/dom';
import { END_EVENTS, IDOMEventParam, IPanEventParam, MOVE_EVENTS, PAN_EVENTS, START_EVENTS } from '../../core/Format';

/**
 * 参考
 * https://github.com/maptalks/maptalks.js/blob/1d98540a0af728e80cbac133278143fc1c6a4c51/src/handler/Drag.js
 * 提供Global的Pan事件发布
 */
declare module './../Globe' {
    interface Globe {
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
Globe.prototype.registerPanHandlerHood = function (): void {
    const g = this as Globe;
    g._state_handler_pan_ = {
        startPosition: new Vec2(),
        moved: false,
        interupted: false,
    };
    split(START_EVENTS).forEach((type) => {
        g.on(type, g.panMousedownOrTouchstart);
    });
}

/**
 * mousedown 或 touchstart 事件开始
 */
Globe.prototype.panMousedownOrTouchstart = function (args: IDOMEventParam): void {
    const g = this as Globe, e = args.domEvent;
    //右键或多点触控，不分发事件
    if (e['button'] === 2 || (e['touches'] && e['touches'].length > 1)) return;
    //https://www.w3cschool.cn/fetch_api/fetch_api-w3zc2v4w.html
    const cp = getEventContainerPosition(e, g.Canvas);
    g._state_handler_pan_.startPosition = new Vec2().set(cp.clientX, cp.clientY);
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
    g.on(MOVE_EVENTS[e.type], g.panMousemoveOrTouchmove);
    g.on(END_EVENTS[e.type], g.panMouseupOrTouchend);
}

/**
 * 平移中
 */
Globe.prototype.panMousemoveOrTouchmove = function (args: IDOMEventParam): void {
    const g = this as Globe, e = args.domEvent;
    //使用touch平移地图时，如果出现多触电，则认为平移结束
    if (e['touches'] && e['touches'].length > 1) {
        if (g._state_handler_pan_.moved) {
            g._state_handler_pan_.interupted = true;
            g.panMouseupOrTouchend(args);
        }
        return;
    }
    //新的位置
    const cp = getEventContainerPosition(e, g.Canvas);
    const currentPosition = new Vec2().set(cp.clientX, cp.clientY);
    //如果移动offset为0，取消执行
    const offset = currentPosition.clone().sub(g._state_handler_pan_.startPosition);
    if(!offset.x && !offset.y) return;
    //构造pan参数
    const panEventParam:IPanEventParam= {
        domEvent:e,
        currentPosition:{
            clientX:cp.clientX,
            clientY:cp.clientY
        }
    };
    g.emit(PAN_EVENTS.paning, panEventParam);
    g._state_handler_pan_.startPosition = currentPosition;
}

/**
 * 平移结束
 */
Globe.prototype.panMouseupOrTouchend = function (args: IDOMEventParam): void {
    const g = this as Globe, e = args.domEvent;
    g.releasePanHandlerEvents();
    const cp = getEventContainerPosition(e, g.Canvas);
    const panEventParam :IPanEventParam={
        domEvent:e,
        currentPosition:{
            clientX:cp.clientX,
            clientY:cp.clientY
        }
    }
    g.emit(PAN_EVENTS.panend, panEventParam);
}

/**
 * 清除所有pan操作
 */
Globe.prototype.releasePanHandlerEvents = function (): void {
    const g = this as Globe;
    for (const key in MOVE_EVENTS) {
        const moveEventName = MOVE_EVENTS[key];
        const endEventName = END_EVENTS[key];
        g.off(moveEventName, g.panMousemoveOrTouchmove);
        g.off(endEventName, g.panMouseupOrTouchend);
    }
}

//注册Pan插件
Globe.registerHook(Globe.prototype.registerPanHandlerHood);