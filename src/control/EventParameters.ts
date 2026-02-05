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
 * @description pan event arguments
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

/**
 * @description move events
 */
const MOVE_EVENTS: {
    [key: string]: string;
    mousedown: string;
    touchstart: string;
    pointerdown: string;
    MSPointerDown: string;
} = {
    mousedown: 'mousemove',
    touchstart: 'touchmove',
    pointerdown: 'touchmove',
    MSPointerDown: 'touchmove'
};

/**
 * @description stopping event flags
 */
const END_EVENTS: {
    [key: string]: string;
    mousedown: string;
    touchstart: string;
    pointerdown: string;
    MSPointerDown: string;
} = {
    mousedown: 'mouseup',
    touchstart: 'touchend',
    pointerdown: 'touchend',
    MSPointerDown: 'touchend'
};

/**
 * @description
 */
const PAN_EVENTS: {
    [key: string]: string;
    panstart: string;
    paning: string;
    panend: string;
} = {
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
    type IZoomEventParam,
    type IViewContainer,
    type IClientPoint,
    type IDOMEventParam,
    type IPanEventParam,
}