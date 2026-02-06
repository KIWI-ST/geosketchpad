import type { Vec2 } from "wgpu-matrix";
import { BaseEventBus, type EventCallback } from "./BaseEventBus";

/**
 * @description
 */
type SceneBusEvent =
    | 'panStart'
    | 'paning'
    | 'panEnd'
    | 'zoomIn'
    | 'zoomOut'
    | 'frameStart'
    | 'frameEnd'
    | 'dispatchWorker'
    ;

/**
 * @description
 */
interface SceneBusContext {
    domEvent: TouchEvent | MouseEvent | WheelEvent;
    currentPosition?: Vec2;
    value?: number;
    zoom?: number;
}

/**
 * 
 */
class SceneBus extends BaseEventBus {
    /**
     * 
     */
    constructor() {
        super();
    }

    /**
     * 
     * @param name 
     * @param args 
     */
    public emit = (name: SceneBusEvent, ...args: SceneBusContext[]): void => {
        super.emit(name, ...args);
    }

    /**
     * 
     * @param name 
     * @param listener 
     * @param context 
     */
    public on = <T extends any[] = any[]>(name: SceneBusEvent, listener: EventCallback<T>, context?: object): void => {
        super.on(name, listener, context);
    }
}

const sceneBus = new SceneBus();

export {
    type SceneBusContext,
    type SceneBusEvent,
    sceneBus
}