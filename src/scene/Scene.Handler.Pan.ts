import { vec2, type Vec2 } from 'wgpu-matrix';
import { Scene } from './Scene';
import { split } from '../util/split';
import { getEventContainerPosition } from '../util/dom';
import { sceneBus, type SceneBusContext } from '../bus/SceneBus';
import { domBus, DOMBusEndEventMapping, DOMBusMoveEventMapping, DOMBusStartEvents, type DOMBusContext, type DOMBusEvent } from '../bus/DOMBus';

/**
 * @description register all pan related event
 */
declare module './Scene' {
    interface Scene {
        releasePanHandlerEvents(t: string): void;
        panMousedownOrTouchstart(c: DOMBusContext): void;
        panMousemoveOrTouchmove(c: DOMBusContext): void;
        panMouseupOrTouchend(c: DOMBusContext): void;
        _state_handler_pan_: {
            startPosition: Vec2;
            moved: boolean;
            interupted: boolean;
        }
    }
}

Scene.prototype.panMousedownOrTouchstart = function (c: DOMBusContext): void {
    const e = c.domEvent;
    if ((e instanceof MouseEvent && e.button === 2) || (e instanceof TouchEvent && e.touches && e.touches.length > 1)) {
        return;
    }
    const cp = getEventContainerPosition(e, this.Canvas);
    this._state_handler_pan_.startPosition = cp;
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition: cp,
    };
    sceneBus.emit('panStart', ctx);
    domBus.on(DOMBusMoveEventMapping[e.type] as DOMBusEvent, this.panMousemoveOrTouchmove, this);
    domBus.on(DOMBusEndEventMapping[e.type] as DOMBusEvent, this.panMouseupOrTouchend, this);
}

Scene.prototype.panMousemoveOrTouchmove = function (c: DOMBusContext): void {
    const e = c.domEvent;
    if (e instanceof TouchEvent && e.touches && e.touches.length > 1) {
        if (this._state_handler_pan_.moved) {
            this._state_handler_pan_.interupted = true;
            this.panMouseupOrTouchend(c);
        }
        return;
    }
    const position = getEventContainerPosition(e, this.Canvas);
    const currentPosition = position;
    const offset = vec2.sub(currentPosition, this._state_handler_pan_.startPosition);
    if (!offset[0] && !offset[1]) {
        return;
    }
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition: position,
    };

    console.log(`${ctx}`);

    sceneBus.emit('paning', ctx);
    this._state_handler_pan_.startPosition = currentPosition;
}

Scene.prototype.panMouseupOrTouchend = function (c: DOMBusContext): void {
    const e = c.domEvent;
    this.releasePanHandlerEvents(c.type);
    const cp = getEventContainerPosition(e, this.Canvas);
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition: cp,
    };
    sceneBus.emit('panEnd', ctx);
}

Scene.prototype.releasePanHandlerEvents = function (t: string): void {
    domBus.off(DOMBusMoveEventMapping[t] as DOMBusEvent, this.panMousemoveOrTouchmove, this);
    domBus.off(DOMBusEndEventMapping[t] as DOMBusEvent, this.panMouseupOrTouchend, this);
}

Scene.registerHook(
    async (scene: Scene) => {
        // init scene pan state.
        scene._state_handler_pan_ = {
            startPosition: vec2.create(),
            moved: false,
            interupted: false,
        };
        // register pan related events.
        split(DOMBusStartEvents).forEach((type) => {
            domBus.on(type as DOMBusEvent, scene.panMousedownOrTouchstart, scene);
        });
    }
);