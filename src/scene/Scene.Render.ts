import { Compiler, Context } from "@pipegpu/core";
import { Scene } from './Scene'
import type { IContextOpts } from "@pipegpu/core/src/compile/parseContextDesc";
import { now } from "../util/now";
import { RAF } from "../util/raf";
import { TweenCache } from "../util/Tween";
import { SceneBus } from "../bus/SceneBus";

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
        renderLoop(frameID: number): void;
        render(frameID: number, timeStamp: number): void;
        getContext3D(): Context;
        getCompiler3D(): Compiler;
        _state_renderer_: {
            frameID: number;
            ctx3d: Context;
            cpl3d: Compiler;
            lastTimeStamp: number;
            performance?: number;
        };
    }
}

Scene.prototype.getContext3D = function (): Context {
    return this._state_renderer_.ctx3d;
}

Scene.prototype.getCompiler3D = function (): Compiler {
    return this._state_renderer_.cpl3d;
}

Scene.prototype.renderLoop = function (frameID: number): void {
    const timeStamp = now();
    this._state_renderer_.performance = 1000 / (timeStamp - (this._state_renderer_.lastTimeStamp || 0));
    this._state_renderer_.lastTimeStamp = timeStamp;
    callWokers();
    callAnimation(timeStamp);
    this.render(frameID, timeStamp);
    this._state_renderer_.frameID = RAF.call(
        window,
        (framestamp: number) => {
            this.renderLoop(framestamp)
        }
    );
}

/**
 *
 */
Scene.prototype.render = function (_frameID: number, _timeStamp: number): void {
    // dispath: frame start
    SceneBus.Handler.emit('FRAME_START');

    // system update
    this.systemUpdate(_timeStamp);

    // dispath: frame end
    SceneBus.Handler.emit('FRAME_END');
}

Scene.registerHook(
    async (scene: Scene) => {
        // init context3d opts.
        const opts: IContextOpts = {
            width: scene.Width,
            height: scene.Height,
            devicePixelRatio: scene.DevicePixelRatio,
            selector: scene.Canvas,
            // requestFeatures: ['chromium-experimental-multi-draw-indirect']
        };
        const context3d: Context = new Context(opts);
        const compiler3d: Compiler = new Compiler(context3d);

        // init renderer state.
        scene._state_renderer_ = {
            frameID: 0,
            lastTimeStamp: 0,
            ctx3d: context3d,
            cpl3d: compiler3d,
        };
        await scene._state_renderer_.ctx3d.init();

        // startup main render loop
        scene.renderLoop(scene._state_renderer_.frameID);
    }
);