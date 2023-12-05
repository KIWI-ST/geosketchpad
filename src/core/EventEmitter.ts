type fn = (...args: any[]) => void;

/**
 * @description 上下文事件绑定
 * @example
 * const map = new Globe();
 * map.on('update', ()=>{}, map);
 */
class EventEmitter {
    /**
     * 设置单一对象运行绑定事件数量上限
     */
    private maxListener = 8;

    /**
     * 记录所有绑定事件
     */
    private listeners: Map<string | symbol, Map<EventEmitter, fn[]>> = new Map();

    /**
     * 注册自定义事件
     * @param name 
     * @param listener 
     * @param context 
     */
    public on = (name: string, listener: fn, context: EventEmitter = undefined): void => {
        const ctx = context || this, listeners = this.listeners;
        if (listeners.get(name) && Array.from(listeners.get(name).values()).length >= this.maxListener)
            throw new Error(`EventEmitter 错误: 对象注册时间超过最大限制 ${this.maxListener}`);
        if (listeners.get(name) instanceof Map) {
            if (listeners.get(name).get(ctx) && (listeners.get(name).get(ctx).indexOf(listener) === -1))
                listeners.get(name).get(ctx).push(listener);
            else if (!listeners.get(name).get(ctx))
                listeners.get(name).set(ctx, [listener]);
        }
        else listeners.set(name, new Map().set(ctx, [listener]));
    }

    /**
     * 事件广播
     * @param name 
     * @param args 
     */
    public emit = (name: string, ...args: any[]): void => {
        const listeners = this.listeners, arr = listeners.get(name);
        arr?.forEach((v: fn[], ctx: EventEmitter) => {
            v?.forEach(cb => cb.call(ctx, ...args));
        });
    }

    /**
     * 
     * @param name 
     * @param listener 
     * @param context 
     */
    public off = (name: string, listener: fn, context: EventEmitter = undefined): void => {
        const ctx = context || this, listeners = this.listeners;
        const arr = listeners.has(name) && listeners.get(name).has(ctx) ? listeners.get(name).get(ctx) : [];
        const i = arr.indexOf(listener);
        if (i >= 0)
            arr.splice(i, 1);
    }

    /**
     * 
     * @param name 
     */
    public removeAllListener = (name: string): void => {
        this.listeners.delete(name);
    }

    /**
     * 
     * @param name 
     * @param listener 
     * @param context 
     */
    public once = (name: string, listener: fn, context: EventEmitter = undefined): void => {
        const fn = (...args: any[]) => {
            listener.apply(this, args);
            this.off(name, fn, context);
        }
        this.on(name, fn, context);
    }
}

export { EventEmitter }