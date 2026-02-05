type EventCallback<T extends any[] = any[]> = (...args: T) => void;

/**
 * @description
 * @example
 * const map = new Globe();
 * map.on('update', ()=>{}, map);
 */
class BaseEventBus {
    /**
     * 
     */
    private maxListener = 8;

    /**
     * 
     */
    private listeners: Map<string | symbol, Map<object | undefined, EventCallback[]>> = new Map();

    /**
     * @param name 
     * @returns 
     */
    private getListenerCount = (name: string | symbol): number => {
        const contextMap = this.listeners.get(name);
        if (!contextMap) {
            return 0;
        }
        let total = 0;
        contextMap.forEach(callbackArr => {
            total += callbackArr.length;
        });
        return total;
    }

    /**
     * @param name 
     * @param listener 
     */
    private checkMaxListener = (name: string | symbol): void => {
        const totalCount = this.getListenerCount(name);
        if (totalCount >= this.maxListener) {
            throw new Error(`[E][EventEmitter][on] regist event oversize the max listener limit, max:${this.maxListener}, current:${totalCount + 1}`);
        }
    }

    /**
     * @param name 
     * @param listener 
     * @param context 
     */
    protected on<T extends any[] = any[]>(name: string | symbol, listener: EventCallback<T>, context?: object): void {
        const targetContext = context || this;
        const listeners = this.listeners;
        this.checkMaxListener(name);
        if (!listeners.has(name)) {
            listeners.set(name, new Map());
        }
        const contextMap = listeners.get(name)!;
        if (!contextMap.has(targetContext)) {
            contextMap.set(targetContext, []);
        }
        const callbackArr = contextMap.get(targetContext)!;
        if (callbackArr.indexOf(listener) === -1) {
            callbackArr.push(listener);
        }
    }

    /**
     * @param name 
     * @param args 
     * @returns 
     */
    protected emit<T extends any[] = any[]>(name: string | symbol, ...args: T): void {
        const contextMap = this.listeners.get(name);
        if (!contextMap) {
            return;
        }
        contextMap.forEach((callbackArr, ctx) => {
            [...callbackArr].forEach(cb => {
                cb.call(ctx, ...args);
            });
        });
    }

    /**
     * 
     * @param name 
     * @param listener 
     * @param context 
     */
    protected off<T extends any[] = any[]>(name: string | symbol, listener: EventCallback<T>, context?: object): void {
        const targetContext = context || this;
        const contextMap = this.listeners.get(name);
        if (!contextMap) {
            return;
        }
        const callbackArr = contextMap.get(targetContext);
        if (!callbackArr) {
            return;
        }
        const index = callbackArr.indexOf(listener);
        if (index >= 0) {
            callbackArr.splice(index, 1);
        }

        if (callbackArr.length === 0) {
            contextMap.delete(targetContext);
        }
        if (contextMap.size === 0) {
            this.listeners.delete(name);
        }
    }

    /** 
     * @param name 
     */
    protected removeAllListener(name: string | symbol): void {
        this.listeners.delete(name);
    }

    /**
     * 
     */
    protected removeAllListeners(): void {
        this.listeners.clear();
    }

    /**
     * @param name 
     * @param listener 
     * @param context 
     */
    protected once<T extends any[] = any[]>(name: string | symbol, listener: EventCallback<T>, context?: object): void {
        const targetContext = context || this;
        const onceCallback: EventCallback<T> = (...args) => {
            listener.apply(targetContext, args);
            this.off(name, onceCallback, targetContext);
        };
        (listener as any)._onceWrapper = onceCallback;
        this.on(name, onceCallback, targetContext);
    }
}

export {
    type EventCallback,
    BaseEventBus
}