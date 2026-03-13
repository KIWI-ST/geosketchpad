import { split } from './split';
import { browser } from './browser';
import { vec2, vec2d, type Vec2, type Vec2d } from 'wgpu-matrix';

const _PREFIX_ = '_geosketchpad_';

const addDOMEvent = function (element: HTMLElement, eventName: string, handler: Function, context: Object): void {
    const eventHandler = function (e: Event): void {
        handler.call(context || element, e);
    }
    split(eventName).forEach((type: string) => {
        const key = `${_PREFIX_}_${type}`;
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
    const Key = `${_PREFIX_}_${type}`;
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
        const key = `${_PREFIX_}_${type}`;
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
}

const stopPropagation = function (e: Event): void {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
}

/**
 * @description https://www.w3cschool.cn/fetch_api/fetch_api-w3zc2v4w.html
 * @param e 
 * @param dom 
 * @returns 
 */
const getContainerPosition = (e: MouseEvent | TouchEvent, dom: HTMLCanvasElement | HTMLDivElement): Vec2 => {
    const targetEvent = e instanceof MouseEvent ? e : e.touches[0];
    const style = window.getComputedStyle(dom);
    const padding = [parseInt(style.paddingLeft), parseInt(style.paddingTop)];
    const rect = dom.getBoundingClientRect();
    const offsetWidth = dom.offsetWidth, offsetHeight = dom.offsetHeight;
    const scaleX = offsetWidth ? rect.width / offsetWidth : 1;
    const scaleY = offsetHeight ? rect.height / offsetHeight : 1;
    const position = [rect.left + padding[0], rect.top + padding[1], scaleX, scaleY];
    return vec2.create(
        (targetEvent.clientX - position[0] - dom.clientLeft) / position[2],
        (targetEvent.clientY - position[1] - dom.clientTop) / position[3]
    );
};

/**
 * 
 * @param e 
 * @param dom 
 * @returns 
 */
const getContainerPositionNDC2 = (clientXInContainer: Vec2d, dom: HTMLCanvasElement | HTMLDivElement): Vec2d => {
    // 3. 计算容器的实际可绘制区域尺寸（排除padding/border）
    const containerWidth = dom.clientWidth; // 内容宽度（不含border，含padding）
    const containerHeight = dom.clientHeight; // 内容高度
    if (containerWidth === 0 || containerHeight === 0) {
        return vec2d.create(0, 0); // 避免除以0
    }
    // 5. 转换为[0,1]范围的归一化坐标（容器内相对比例）
    const xNormalized = clientXInContainer[0] / containerWidth;
    const yNormalized = clientXInContainer[1] / containerHeight;
    // 6. 转换为NDC坐标（核心步骤）
    // - X轴：[0,1] → [-1,1]
    // - Y轴：[0,1] → [1,-1]（翻转Y轴，符合WebGPU/OpenGL规范）
    const ndcX = xNormalized * 2 - 1;
    const ndcY = 1 - yNormalized * 2;
    return vec2d.create(ndcX, ndcY);
}

/**
 * @description
 * @param e 
 * @param dom 
 * @returns 
 */
const getContainerPositionNDC = (e: MouseEvent | TouchEvent, dom: HTMLCanvasElement | HTMLDivElement): Vec2d => {
    // 1. 兼容鼠标/触摸事件，获取目标事件的clientXY
    const targetEvent = e instanceof MouseEvent ? e : e.touches[0];
    if (!targetEvent) {
        return vec2d.create(0, 0); // 异常兜底
    }
    // 2. 获取容器的布局信息（解决padding/边框/缩放问题）
    const style = window.getComputedStyle(dom);
    const paddingLeft = parseInt(style.paddingLeft) || 0;
    const paddingTop = parseInt(style.paddingTop) || 0;
    const borderLeft = parseInt(style.borderLeftWidth) || 0;
    const borderTop = parseInt(style.borderTopWidth) || 0;
    const rect = dom.getBoundingClientRect(); // 容器在视口的绝对位置
    // 3. 计算容器的实际可绘制区域尺寸（排除padding/border）
    const containerWidth = dom.clientWidth; // 内容宽度（不含border，含padding）
    const containerHeight = dom.clientHeight; // 内容高度
    if (containerWidth === 0 || containerHeight === 0) {
        return vec2d.create(0, 0); // 避免除以0
    }
    // 4. 计算鼠标在容器内的相对坐标（原点：容器左上角，Y轴下正）
    const clientXInContainer = targetEvent.clientX - rect.left - paddingLeft - borderLeft;
    const clientYInContainer = targetEvent.clientY - rect.top - paddingTop - borderTop;
    // 5. 转换为[0,1]范围的归一化坐标（容器内相对比例）
    const xNormalized = clientXInContainer / containerWidth;
    const yNormalized = clientYInContainer / containerHeight;
    // 6. 转换为NDC坐标（核心步骤）
    // - X轴：[0,1] → [-1,1]
    // - Y轴：[0,1] → [1,-1]（翻转Y轴，符合WebGPU/OpenGL规范）
    const ndcX = xNormalized * 2 - 1;
    const ndcY = 1 - yNormalized * 2;
    return vec2d.create(ndcX, ndcY);
}

export {
    getContainerPosition,
    getContainerPositionNDC,
    getContainerPositionNDC2,
    addDOMEvent,
    removeDOMEvent,
    preventDefault,
    stopPropagation
}