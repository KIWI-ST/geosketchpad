import type { Vec2 } from "wgpu-matrix";
import { BaseEventBus, type EventCallback } from "./BaseEventBus";

/**
 * @description warpper document event and aux information.
 * @param type 
 */
type DOMBusContext = {
    isMouseDown: boolean;
    isRightMouseDown: boolean;
    isKeyDown: boolean;
    keyStatus: { [key: string]: boolean };
    mouseStatus: { [key: number]: boolean };
    point: Vec2;
    lastPoint: Vec2;
    offsetPoint: Vec2;
    delta: number,
};

type DOMBusEventTYPE =
    | 'POINTER_DOWN'
    | 'POINTER_MIDDLE_DOWN'
    | 'POINTER_MOVE'
    | 'POINTER_UP'
    | 'POINTER_MIDDLE_UP'
    | 'POINTER_ZOOM'
    | 'POINTER_DOUBLE_TAP'
    | 'KEY_DOWN'
    | 'KEY_UP'
    ;

/**
 * receive all original (raw) document event
 * broadcast to other instance.
 */
class DOMBus extends BaseEventBus {
    /**
     * 
     */
    private static hander_: DOMBus = new DOMBus();

    /**
     * 
     */
    static get Handler() {
        return DOMBus.hander_;
    }

    constructor() {
        super();
    }

    public emit = (name: DOMBusEventTYPE, ...args: DOMBusContext[]): void => {
        super.emit(name, ...args);
    }

    public on = <T extends any[] = any[]>(name: DOMBusEventTYPE, listener: EventCallback<T>, context?: object): void => {
        super.on(name, listener, context);
    }

    public off = <T extends any[] = any[]>(name: DOMBusEventTYPE, listener: EventCallback<T>, context?: object): void => {
        super.off(name, listener, context);
    }
}

export {
    type DOMBusContext,
    type DOMBusEventTYPE,
    DOMBus
}