import { split } from './split';
import { browser } from './browser';
import type { IClientPoint } from '@pipegpu/camera';

const PREFIX = '_geosketchpad_';

const addDOMEvent = function (element: HTMLElement, eventName: string, handler: Function, context: Object): void {
    const eventHandler = function (e: Event): void {
        e = e || window.event;
        handler.call(context || element, e);
    }
    split(eventName).forEach((type: string) => {
        const key = `${PREFIX}_${type}`;
        (element as any)[key] = (element as any)[key] || [];
        const hit = listenDOMEvent(element, type, handler);
        if (hit >= 0) {
            removeDOMEvent(element, type, handler);
        }
        (element as any)[key].push(eventHandler);
        if (browser.ie) {
            element.addEventListener(type, eventHandler, false);
        }
        else {
            element.addEventListener(type, eventHandler, { capture: false, passive: false });
        }
    });
}

const listenDOMEvent = function (element: HTMLElement, type: string, handler: Function): number {
    const Key = `${PREFIX}_${type}`;
    if (!element || !(element as any)[Key] || !handler) {
        return -1;
    }
    const handlers = (element as any)[Key];
    for (let i = 0, len = handlers.length; i < len; i++) {
        if (handlers[i] === handler) {
            return i;
        }
    }
    return -1;
}

const removeDOMEvent = function (element: HTMLElement, eventName: string, handler: Function): void {
    const remove = function (type: string, fn: EventListener) {
        element.removeEventListener(type, fn, false);
    }
    const types = split(eventName);
    types.forEach((type) => {
        const key = `${PREFIX}_${type}`;
        if (!handler && (element as any)[key]) {
            const handlers = (element as any)[key];
            handlers?.forEach((listener: EventListener) => {
                remove(type, listener);
            });
            delete (element as any)[key];
        }
        const hit = listenDOMEvent(element, type, handler);
        if (hit > 0) {
            remove(type, (element as any)[key] as EventListener);
        }
        (element as any)[key].splice(hit, 1);
    });
}

const preventDefault = function (e: Event): void {
    if (e.preventDefault) {
        e.preventDefault();
    }
    else {
        e.returnValue = false;
    }
}

const stopPropagation = function (e: Event): void {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    else {
        e.cancelBubble = true;
    }
}

const getEventContainerPosition = (e: MouseEvent | TouchEvent, dom: HTMLCanvasElement | HTMLDivElement): IClientPoint => {
    const targetEvent = e instanceof MouseEvent ? e : e.touches[0];
    const style = window.getComputedStyle(dom);
    const padding = [parseInt(style.paddingLeft), parseInt(style.paddingTop)];
    const rect = dom.getBoundingClientRect();
    const offsetWidth = dom.offsetWidth, offsetHeight = dom.offsetHeight;
    const scaleX = offsetWidth ? rect.width / offsetWidth : 1;
    const scaleY = offsetHeight ? rect.height / offsetHeight : 1;
    const position = [rect.left + padding[0], rect.top + padding[1], scaleX, scaleY];

    return {
        clientX: (targetEvent.clientX - position[0] - dom.clientLeft) / position[2],
        clientY: (targetEvent.clientY - position[1] - dom.clientTop) / position[3]
    }
}

export {
    getEventContainerPosition,
    addDOMEvent,
    removeDOMEvent,
    preventDefault,
    stopPropagation
}