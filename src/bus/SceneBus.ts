import { BaseEventBus, type EventCallback } from "./BaseEventBus";

/**
 * @description warpper document event and aux information.
 * @param type 
 */
type SceneBusContext = {

};

/**
 * 
 */
type SceneBusEventTYPE =
    | 'FRAME_START'
    | 'FRAME_END'
    | 'REVEAL_TILE'
    ;

/**
 * receive all original (raw) document event
 * broadcast to other instance.
 */
class SceneBus extends BaseEventBus {
    /**
     * 
     */
    private static hander_: SceneBus = new SceneBus();

    /**
     * 
     */
    static get Handler() {
        return SceneBus.hander_;
    }

    constructor() {
        super();
    }

    public emit = (name: SceneBusEventTYPE, ...args: SceneBusContext[]): void => {
        super.emit(name, ...args);
    }

    public on = <T extends any[] = any[]>(name: SceneBusEventTYPE, listener: EventCallback<T>, context?: object): void => {
        super.on(name, listener, context);
    }

    public off = <T extends any[] = any[]>(name: SceneBusEventTYPE, listener: EventCallback<T>, context?: object): void => {
        super.off(name, listener, context);
    }
}

export {
    type SceneBusContext,
    type SceneBusEventTYPE,
    SceneBus
}