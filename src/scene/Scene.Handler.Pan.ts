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

Scene.prototype.panMousedownOrTouchstart = (c: DOMBusContext): void => {
    const e = c.domEvent;
    const g = this as unknown as Scene;
    if ((e instanceof MouseEvent && e.button === 2) || (e instanceof TouchEvent && e.touches && e.touches.length > 1)) {
        return;
    }
    const cp = getEventContainerPosition(e, g.Canvas);
    g._state_handler_pan_.startPosition = cp;
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition: cp,
    };
    sceneBus.emit('panStart', ctx);
    domBus.on(DOMBusMoveEventMapping[e.type] as DOMBusEvent, g.panMousemoveOrTouchmove, g);
    domBus.on(DOMBusEndEventMapping[e.type] as DOMBusEvent, g.panMouseupOrTouchend, g);
}

Scene.prototype.panMousemoveOrTouchmove = (c: DOMBusContext): void => {
    const e = c.domEvent;
    const g = this as unknown as Scene;
    if (e instanceof TouchEvent && e.touches && e.touches.length > 1) {
        if (g._state_handler_pan_.moved) {
            g._state_handler_pan_.interupted = true;
            g.panMouseupOrTouchend(c);
        }
        return;
    }
    const cp = getEventContainerPosition(e, g.Canvas);
    const currentPosition = cp;
    const offset = vec2.sub(currentPosition, g._state_handler_pan_.startPosition);
    if (!offset[0] && !offset[1]) {
        return;
    }
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition: cp,
    };
    sceneBus.emit('paning', ctx);
    g._state_handler_pan_.startPosition = currentPosition;
}

Scene.prototype.panMouseupOrTouchend = (c: DOMBusContext): void => {
    const e = c.domEvent;
    const g = this as unknown as Scene
    g.releasePanHandlerEvents(c.type);
    const cp = getEventContainerPosition(e, g.Canvas);
    const ctx: SceneBusContext = {
        domEvent: e,
        currentPosition: cp,
    };
    sceneBus.emit('panEnd', ctx);
}

Scene.prototype.releasePanHandlerEvents = (t: string): void => {
    const g = this as unknown as Scene;
    domBus.off(DOMBusMoveEventMapping[t] as DOMBusEvent, g.panMousemoveOrTouchmove, g);
    domBus.off(DOMBusEndEventMapping[t] as DOMBusEvent, g.panMouseupOrTouchend, g);
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