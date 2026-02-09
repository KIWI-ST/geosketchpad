import { Context } from "@pipegpu/core";
import { Scene } from './Scene'
import type { IContextOpts } from "@pipegpu/core/src/compile/parseContextDesc";
import { now } from "../util/now";
import { RAF } from "../util/raf";
import { TweenCache } from "../util/Tween";

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
        _state_renderer_: {
            frameID: number;
            ctx3d: Context;
            lastTimeStamp: number;
            performance?: number;
        }
    }
}

Scene.prototype.getContext3D = function (): Context {
    const scene = this as Scene;
    return scene._state_renderer_.ctx3d;
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
    // const scene = this as unknown as Scene;
    // sceneBus.emit('frameStart');
    // ecs system update
    // sceneBus.emit('frameEnd');
    // const camera = scene._state_camera_.camera, state = g._state_renderer_;
    // const ctx3d: Context = g.getContext3D();
    // ctx3d.clear({ color: [0.0, 0.0, 0.0, 1.0] });
    //发起渲染事件
    // g.emit('framestart', state.performance);
    //发起辅助工具渲染调度
    // g.callAuxtool(framestamp);
    //渲染skpds
    // const skpds = g.Sketchpads;
    // skpds?.forEach(skpd => {
    //     const r = skpd.Renderer;
    //     r?.render(framestamp, camera)
    // });
    //渲染结束
    // g.emit('frameend', state.performance);
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
        // init renderer state.
        scene._state_renderer_ = {
            frameID: 0,
            lastTimeStamp: 0,
            ctx3d: new Context(opts)
        };
        await scene._state_renderer_.ctx3d.init();
        // startup main render loop
        scene.renderLoop(scene._state_renderer_.frameID);
    }
);