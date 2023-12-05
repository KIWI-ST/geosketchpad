import { Vec2 } from "kiwi.matrix";

/**
 * 屏幕坐标
 */
interface IClientPoint {
    clientX: number;
    clientY: number;
}

/**
 * 地图容器区域信息
 */
interface IViewContainer {
    left: number,
    top: number,
    width: number,
    height: number,
    // cx: number, // container center x
    // cy: number  // container center y
}

/**
 * 
 */
interface IDOMEventParam {
    domEvent: TouchEvent | MouseEvent,
    coordinate?: any,
    viewPoint?: any,
    point2d?: any
}

/**
 * pan event arguments
 */
interface IPanEventParam {
    domEvent: TouchEvent | MouseEvent;
    currentPosition?: IClientPoint;
}

interface IZoomEventParam {
    domEvent: TouchEvent | MouseEvent;
    currentPosition?: IClientPoint;
    value?: number;
    zoom?: number;
}

const ZOOM_EVENTS = {
    wheel: 'wheel',
    wheelend: 'wheelend'
}

const START_EVENTS = 'touchstart mousedown';

const MOVE_EVENTS = {
    mousedown: 'mousemove',
    touchstart: 'touchmove',
    pointerdown: 'touchmove',
    MSPointerDown: 'touchmove'
};

const END_EVENTS = {
    mousedown: 'mouseup',
    touchstart: 'touchend',
    pointerdown: 'touchend',
    MSPointerDown: 'touchend'
};

const PAN_EVENTS = {
    panstart: 'panstart',
    paning: 'paning',
    panend: 'panend'
}

export {
    START_EVENTS,
    MOVE_EVENTS,
    ZOOM_EVENTS,
    PAN_EVENTS,
    END_EVENTS,
    IZoomEventParam,
    IViewContainer,
    IClientPoint,
    IDOMEventParam,
    IPanEventParam,
}