

import { BaseEventBus, type EventCallback } from "./BaseEventBus";

/**
 * @description warpper document event and aux information.
 * @param type 
 */
interface DOMBusContext {
    type: string,
    domEvent: TouchEvent | MouseEvent,
    coordinate?: any,
    viewPoint?: any,
    point2d?: any,
}

type DOMBusEvent =
    'contextmenu'
    | 'mousedown'
    | 'touchstart'
    | 'click'
    | 'touchend'
    | 'dbclick'
    | 'mousemove'
    | 'touchmove'
    | 'mouseup'
    | 'zoom'
    ;

const DOMBusMoveEventMapping: {
    [key: string]: string;
} = {
    mousedown: 'mousemove',
    touchstart: 'touchmove',
    pointerdown: 'touchmove',
    MSPointerDown: 'touchmove'
};

const DOMBusEndEventMapping: {
    [key: string]: string;
} = {
    mousedown: 'mouseup',
    touchstart: 'touchend',
    pointerdown: 'touchend',
    MSPointerDown: 'touchend'
};

const DOMBusZoomEventMapping: {
    [key: string]: string;
} = {
    wheel: 'wheel',
    wheelend: 'wheelend'
};


const DOMBusStartEvents = 'touchstart mousedown';

/**
 * receive all original (raw) document event
 * broadcast to other instance.
 */
class DOMBus extends BaseEventBus {

    constructor() {
        super();
    }

    public emit = (name: DOMBusEvent, ...args: DOMBusContext[]): void => {
        super.emit(name, ...args);
    }

    public on = <T extends any[] = any[]>(name: DOMBusEvent, listener: EventCallback<T>, context?: object): void => {
        super.on(name, listener, context);
    }

    public off = <T extends any[] = any[]>(name: DOMBusEvent, listener: EventCallback<T>, context?: object): void => {
        super.off(name, listener, context);
    }
}

const domBus = new DOMBus();

export {
    type DOMBusContext,
    type DOMBusEvent,
    DOMBusZoomEventMapping,
    DOMBusMoveEventMapping,
    DOMBusEndEventMapping,
    DOMBusStartEvents,
    domBus
}