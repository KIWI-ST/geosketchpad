import { now } from "../util/now";
import { RAF } from "../util/raf";
import { TweenCache } from "../util/Tween";
import { Scene } from "./Scene";

/**
 * 
 */
const callWokers = () => {
    // sceneBus.emit('dispatchWorker');
};

/**
 * @param timeStamp 
 */
const callAnimation = (timeStamp: number) => {
    const tweenArray: Function[] = [];
    TweenCache.forEach(fn => {
        tweenArray.push(fn)
    });
    TweenCache.clear();
    let fn = tweenArray.shift();
    while (fn) {
        fn(timeStamp);
        fn = tweenArray.shift();
    }
};

/**
 * @class Globe
 * @description globe renderer, system 'tick' in each frame.
 * - render, render once.
 * - renderFrame, main RAF entry.
 * - renderLoop, main RAF render loop.
 * 
 * - frameID, stats of runtime frame index. from 0.
 */
declare module './Scene' {
    interface Scene {
        tick(tickCount?: number): void;
        _state_tick_: {
            count: number;
        }
    }
};

Scene.prototype.tick = function (tickCount?: number): void {
    const timeStamp = now();
    callWokers();
    callAnimation(timeStamp);
    this.render(tickCount || 0, timeStamp);
    RAF.call(
        window,
        () => {
            this.tick(this._state_tick_.count++);
        }
    );
}

/**
 * @description startup main render loop
 */
Scene.registerHook(
    async (scene: Scene) => {
        scene._state_tick_ = {
            count: 0
        };
        scene.tick(scene._state_tick_.count);
    }
);

