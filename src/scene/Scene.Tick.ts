import { Compiler, Context, type IContextOpts } from "@pipegpu/core";
import { Scene } from './Scene'
import { SceneBus } from "../bus/SceneBus";
import { CameraSystem } from "../ecs/system/CameraSystem";
import { HardwareDenseMeshFriendlySystem } from "../ecs/system/HardwareDenseMeshFriendlySystem";
import { RenderSystem } from "../ecs/system/RenderSystem";
import { EllipsoidSystem } from "../ecs/system/EllipsoidSystem";
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
 * - frameID, stats of runtime frame index. from 0.
 */
declare module './Scene' {
    interface Scene {
        tick(tickCount?: number): Promise<void>;
        render(frameID: number, timeStamp: number): Promise<void>;
        systemUpdate(timeStamp: number): Promise<void>;
        getContext3D(): Context;
        getCompiler3D(): Compiler;
        _state_tick_: {
            count: number;
        };
        _state_renderer_: {
            ctx3d: Context;
            cpl3d: Compiler;
            lastTimeStamp: number;
            performance?: number;
        };
        _state_system_: {
            cameraSystem: CameraSystem,
            ellipsoidSystem: EllipsoidSystem,
            hdmfSystem: HardwareDenseMeshFriendlySystem,
            renderSystem: RenderSystem,
        };
    }
}

Scene.prototype.getContext3D = function (): Context {
    return this._state_renderer_.ctx3d;
}

Scene.prototype.getCompiler3D = function (): Compiler {
    return this._state_renderer_.cpl3d;
}

Scene.prototype.tick = async function (tickCount?: number): Promise<void> {
    const timeStamp = now();
    callWokers();
    callAnimation(timeStamp);
    await this.render(tickCount || 0, timeStamp);
    RAF.call(
        window,
        async () => {
            await this.tick(this._state_tick_.count++);
        }
    );
}

/**
 * @description systemUpdate, core pipeline.
 * - camera update.
 * - mesh data update.
 * - render meshes, opts.
 *  - TODO:: ops support for.
 *  - meshlet or fallback rendering.
 */
Scene.prototype.systemUpdate = async function (_timeStamp: number): Promise<void> {
    // 1. camera update.
    const cameraSys = this._state_system_.cameraSystem;
    await cameraSys.update();
    if (!cameraSys.hasMainCamera() && !cameraSys.MainCamera) {
        return;
    }
    const camera = cameraSys.MainCamera!;
    const cw = this.Canvas.clientWidth;
    const ch = this.Canvas.clientHeight;

    // ellipsoid update.
    const ellipsoidSys = this._state_system_.ellipsoidSystem;
    await ellipsoidSys.update(camera, cw, ch);

    // hdmf update.
    const hdmfSys = this._state_system_.hdmfSystem;
    await hdmfSys.update(ellipsoidSys.VisualRevealTilesMap);
}

/**
 *
 */
Scene.prototype.render = async function (_frameID: number, timeStamp: number): Promise<void> {
    // render performance stats.
    // dispath: frame start
    this._state_renderer_.performance = 1000 / (timeStamp - (this._state_renderer_.lastTimeStamp || 0));
    SceneBus.Handler.emit('FRAME_START');

    // system update
    await this.systemUpdate(timeStamp);

    // dispath: frame end
    SceneBus.Handler.emit('FRAME_END');
    this._state_renderer_.lastTimeStamp = timeStamp;
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
        {
            scene._state_renderer_ = {
                lastTimeStamp: 0,
                ctx3d: context3d,
                cpl3d: compiler3d,
            };
        }

        // state system.
        {
            scene._state_system_ = {
                cameraSystem: new CameraSystem(scene),
                ellipsoidSystem: new EllipsoidSystem(scene),
                hdmfSystem: new HardwareDenseMeshFriendlySystem(scene),
                renderSystem: new RenderSystem(scene),
            };
            await scene._state_renderer_.ctx3d.init();
        }

        // tick.
        {
            scene._state_tick_ = {
                count: 0
            };
            await scene.tick(scene._state_tick_.count++);
        }
    }
);