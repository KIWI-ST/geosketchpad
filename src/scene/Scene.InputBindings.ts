import { Scene } from './Scene';
import { addDOMEvent, getContainerPosition, preventDefault } from '../util/dom';
import { DOMBus } from '../bus/DOMBus';
import { vec2, type Vec2 } from 'wgpu-matrix';

/**
 * Interaction Types Supported by Browser Controls
 * Provides:
 * - Browser-supported interaction event registration
 * - Invalid event responses
 */
const DOM_EVENT_TYPES =
    'pointerdown ' +
    'pointerup ' +
    'pointerenter ' +
    'pointermove ' +
    'pointercancel ' +
    'contextmenu ' +
    'wheel ';


const WINDOW_EVENT_TYPES =
    'keydown ' +
    'keyup';

/**
 * mousexx event duplicated with pointer events
 * should remove/block mouse events while listenering pointer events.
 */
// const LOCK_DOM_EVENT_TYPES = 'mousedown ' +
//     'mouseup ' +
//     'mouseover ' +
//     'mouseout ' +
//     'mouseenter ' +
//     'mouseleave ' +
//     'mousemove';

/**
 * @description ref: https://www.tslang.cn/docs/handbook/declaration-merging.html
 */
declare module './Scene' {
    interface Scene {
        handleDOMEvent(e: Event): void;
        _state_input_: {
            isMouseDown: boolean,
            isRightMouseDown: boolean,
            isKeyDown: boolean,
            mouseX: number,
            mouseY: number,
            mouseLastX: number,
            mouseLastY: number,
            mouseOffsetX: number,
            mouseOffsetY: number,
            wheelDelta: number,
            laskClick: {
                t: number,
                x: number,
                y: number,
                button: number
            };
            keyStatus: {
                [key: string]: boolean
            };
            mouseStatus: {
                [key: number]: boolean
            }

        },
    }
}

/**
 * @description
 * register all DOM events
 * - mock 'double click'
 * - touch/click convert to
 */
Scene.prototype.handleDOMEvent = function (e: MouseEvent | PointerEvent | WheelEvent | KeyboardEvent): void {
    const scene = this;
    const state = scene._state_input_;

    // prevent right mouse click default action.
    if (e.type === 'contextmenu') {
        preventDefault(e);
        return;
    }

    if (e instanceof PointerEvent) {
        const xy: Vec2 = getContainerPosition(e, scene.canvas_);
        if (e.type === 'pointerdown') {
            state.laskClick = {
                t: performance.now(),
                x: e.clientX,
                y: e.clientY,
                button: e.button
            };
            scene.canvas_.setPointerCapture(e.pointerId);
            switch (e.button) {
                case 0:
                    {
                        state.isMouseDown = true;
                        state.mouseLastX = state.mouseX;
                        state.mouseLastY = state.mouseY;
                        state.mouseX = xy[0];
                        state.mouseY = xy[1];
                        state.mouseOffsetX = state.mouseX - state.mouseLastX;
                        state.mouseOffsetY = state.mouseY - state.mouseLastY;
                        state.mouseStatus[e.button] = true;
                        // TODO::
                        DOMBus.Handler.emit('POINTER_DOWN', {
                            isMouseDown: state.isMouseDown,
                            isRightMouseDown: state.isRightMouseDown,
                            point: xy,
                            lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                            offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                            delta: state.wheelDelta,
                            keyStatus: state.keyStatus,
                            isKeyDown: state.isKeyDown,
                            mouseStatus: state.mouseStatus
                        });
                    }
                    break;
                case 1:
                    {
                        state.mouseStatus[e.button] = true;
                        DOMBus.Handler.emit('POINTER_MIDDLE_DOWN', {
                            isMouseDown: state.isMouseDown,
                            isRightMouseDown: state.isRightMouseDown,
                            point: xy,
                            lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                            offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                            delta: state.wheelDelta,
                            keyStatus: state.keyStatus,
                            isKeyDown: state.isKeyDown,
                            mouseStatus: state.mouseStatus
                        });
                    }
                    break;
                case 2:
                    {
                        state.mouseStatus[e.button] = true;
                        state.isRightMouseDown = true;
                        state.mouseLastX = state.mouseX;
                        state.mouseLastY = state.mouseY;
                        state.mouseX = xy[0];
                        state.mouseY = xy[1];
                        state.mouseOffsetX = state.mouseX - state.mouseLastX;
                        state.mouseOffsetY = state.mouseY - state.mouseLastY;
                        DOMBus.Handler.emit('POINTER_DOWN', {
                            isMouseDown: state.isMouseDown,
                            isRightMouseDown: state.isRightMouseDown,
                            point: xy,
                            lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                            offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                            delta: state.wheelDelta,
                            keyStatus: state.keyStatus,
                            isKeyDown: state.isKeyDown,
                            mouseStatus: state.mouseStatus
                        });
                    }
                    break;
                default:
                    throw new Error(`[E][Scene][handleDOMEvent] unsupport document event type.`);
            }
        }
        else if (e.type === 'pointerup') {
            scene.canvas_.releasePointerCapture(e.pointerId);
            switch (e.button) {
                case 0:
                    {
                        state.isMouseDown = false;
                        state.mouseStatus[e.button] = false;
                        const { t, x, y, button } = state.laskClick;
                        // mock double click
                        // TODO:: is that need mock double click event?
                        if (button === e.button && performance.now() - t < 300 && Math.abs(x - e.clientX) < 20.0 && Math.abs(y - e.clientY) < 20.0) {
                            DOMBus.Handler.emit(
                                'POINTER_DOUBLE_TAP',
                                {
                                    isMouseDown: state.isMouseDown,
                                    isRightMouseDown: state.isRightMouseDown,
                                    point: xy,
                                    lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                                    offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                                    delta: state.wheelDelta,
                                    keyStatus: state.keyStatus,
                                    isKeyDown: state.isKeyDown,
                                    mouseStatus: state.mouseStatus
                                }
                            );
                        } else {
                            DOMBus.Handler.emit(
                                'POINTER_UP',
                                {
                                    isMouseDown: state.isMouseDown,
                                    isRightMouseDown: state.isRightMouseDown,
                                    point: xy,
                                    lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                                    offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                                    delta: state.wheelDelta,
                                    keyStatus: state.keyStatus,
                                    isKeyDown: state.isKeyDown,
                                    mouseStatus: state.mouseStatus
                                }
                            );
                        }
                    }
                    break;
                case 1:
                    {
                        state.mouseStatus[e.button] = false;
                        DOMBus.Handler.emit(
                            'POINTER_MIDDLE_UP',
                            {
                                isMouseDown: state.isMouseDown,
                                isRightMouseDown: state.isRightMouseDown,
                                point: xy,
                                lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                                offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                                delta: state.wheelDelta,
                                keyStatus: state.keyStatus,
                                isKeyDown: state.isKeyDown,
                                mouseStatus: state.mouseStatus
                            }
                        );
                    }
                    break;
                case 2:
                    {
                        state.mouseStatus[e.button] = false;
                        state.isRightMouseDown = false;
                        DOMBus.Handler.emit(
                            'POINTER_UP',
                            {
                                isMouseDown: state.isMouseDown,
                                isRightMouseDown: state.isRightMouseDown,
                                point: xy,
                                lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                                offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                                delta: state.wheelDelta,
                                keyStatus: state.keyStatus,
                                isKeyDown: state.isKeyDown,
                                mouseStatus: state.mouseStatus
                            }
                        );
                    }
                    break;
                default:
                    throw new Error(`[E][Scene][handleDOMEvent] unsupport document event type.`);
            }
        }
        else if (e.type === 'pointermove') {
            state.mouseLastX = state.mouseX;
            state.mouseLastY = state.mouseY;
            state.mouseX = xy[0];
            state.mouseY = xy[1];
            state.mouseOffsetX = state.mouseX - state.mouseLastX;
            state.mouseOffsetY = state.mouseY - state.mouseLastY;
            DOMBus.Handler.emit(
                'POINTER_MOVE',
                {
                    isMouseDown: state.isMouseDown,
                    isRightMouseDown: state.isRightMouseDown,
                    point: xy,
                    lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                    offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                    delta: state.wheelDelta,
                    keyStatus: state.keyStatus,
                    isKeyDown: state.isKeyDown,
                    mouseStatus: state.mouseStatus
                }
            );
        }
        else if (e.type === 'pointerenter') {
            state.isMouseDown = false;
            state.mouseLastX = state.mouseX;
            state.mouseLastY = state.mouseY;
            state.mouseX = xy[0];
            state.mouseY = xy[1];
            state.mouseOffsetX = state.mouseX - state.mouseLastX;
            state.mouseOffsetY = state.mouseY - state.mouseLastY;
            DOMBus.Handler.emit(
                'POINTER_MOVE',
                {
                    isMouseDown: state.isMouseDown,
                    isRightMouseDown: state.isRightMouseDown,
                    point: xy,
                    lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                    offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                    delta: state.wheelDelta,
                    keyStatus: state.keyStatus,
                    isKeyDown: state.isKeyDown,
                    mouseStatus: state.mouseStatus
                }
            );
        }
        else if (e.type === 'pointercancel') {
            this.canvas_.releasePointerCapture(e.pointerId);
            switch (e.button) {
                case 1:
                    {
                        state.mouseStatus[e.button] = false;
                        DOMBus.Handler.emit(
                            'POINTER_MIDDLE_UP',
                            {
                                isMouseDown: state.isMouseDown,
                                isRightMouseDown: state.isRightMouseDown,
                                point: xy,
                                lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                                offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                                delta: state.wheelDelta,
                                keyStatus: state.keyStatus,
                                isKeyDown: state.isKeyDown,
                                mouseStatus: state.mouseStatus
                            }
                        );
                        break;
                    }
                default:
                    {
                        state.isMouseDown = false;
                        state.isRightMouseDown = false;
                        state.mouseStatus[e.button] = false;
                        DOMBus.Handler.emit(
                            'POINTER_UP',
                            {
                                isMouseDown: state.isMouseDown,
                                isRightMouseDown: state.isRightMouseDown,
                                point: xy,
                                lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                                offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                                delta: state.wheelDelta,
                                keyStatus: state.keyStatus,
                                isKeyDown: state.isKeyDown,
                                mouseStatus: state.mouseStatus
                            }
                        );
                    }
                    break;
            }
        }
    }
    else if (e instanceof WheelEvent) {
        preventDefault(e);
        const xy: Vec2 = getContainerPosition(e, this.canvas_);
        state.mouseLastX = state.mouseX;
        state.mouseLastY = state.mouseY;
        state.mouseX = xy[0];
        state.mouseY = xy[1];
        state.mouseOffsetX = state.mouseX - state.mouseLastX;
        state.mouseOffsetY = state.mouseY - state.mouseLastY;
        if ('wheelDelta' in e) {
            state.wheelDelta = e.wheelDelta as number;
        }
        else if ('deltaY' in e) {
            state.wheelDelta = -e.deltaY;
        }
        DOMBus.Handler.emit(
            'POINTER_ZOOM',
            {
                isMouseDown: state.isMouseDown,
                isRightMouseDown: state.isRightMouseDown,
                point: xy,
                lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                delta: state.wheelDelta,
                keyStatus: state.keyStatus,
                isKeyDown: state.isKeyDown,
                mouseStatus: state.mouseStatus
            }
        );
    }
    else if (e instanceof KeyboardEvent) {
        const keyCode = e.key;
        if (e.type === 'keydown' && !state.keyStatus[keyCode]) {
            state.keyStatus[keyCode] = true;
            state.isKeyDown = true;
            DOMBus.Handler.emit(
                'KEY_DOWN',
                {
                    isMouseDown: state.isMouseDown,
                    isRightMouseDown: state.isRightMouseDown,
                    point: vec2.create(state.mouseX, state.mouseY),
                    lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                    offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                    delta: state.wheelDelta,
                    keyStatus: state.keyStatus,
                    isKeyDown: state.isKeyDown,
                    mouseStatus: state.mouseStatus
                }
            );
        }
        else if (e.type === 'keyup') {
            state.keyStatus[keyCode] = false;
            let isKeyDown = false;
            for (const key in state.keyStatus) {
                if (Object.prototype.hasOwnProperty.call(state.keyStatus, key)) {
                    isKeyDown ||= state.keyStatus[key];
                }
            }
            DOMBus.Handler.emit(
                'KEY_UP',
                {
                    isMouseDown: state.isMouseDown,
                    isRightMouseDown: state.isRightMouseDown,
                    point: vec2.create(state.mouseX, state.mouseY),
                    lastPoint: vec2.create(state.mouseLastX, state.mouseLastY),
                    offsetPoint: vec2.create(state.mouseOffsetX, state.mouseOffsetY),
                    delta: state.wheelDelta,
                    keyStatus: state.keyStatus,
                    isKeyDown: state.isKeyDown,
                    mouseStatus: state.mouseStatus
                }
            );
        }
    }
}

/**
 * register DOMEvent entry
 * @function registerDOMEventsHook
 */
Scene.registerHook(
    async (scene: Scene) => {
        // init scene state.
        scene._state_input_ = {
            isMouseDown: false,
            isRightMouseDown: false,
            isKeyDown: false,
            mouseX: 0,
            mouseY: 0,
            mouseLastX: 0,
            mouseLastY: 0,
            mouseOffsetX: 0,
            mouseOffsetY: 0,
            wheelDelta: 0,
            laskClick: {
                t: 0,
                x: 0,
                y: 0,
                button: 0
            },
            keyStatus: {},
            mouseStatus: {},
        };
        // register document and window event.
        addDOMEvent(scene.Canvas, DOM_EVENT_TYPES, scene.handleDOMEvent, scene);
        addDOMEvent(scene.Canvas, WINDOW_EVENT_TYPES, scene.handleDOMEvent, scene);
    }
);