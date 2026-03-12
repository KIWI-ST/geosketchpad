import { ColorAttachment, Compiler, Context, DepthStencilAttachment, type IContextOpts } from "@pipegpu/core";
import { Scene } from './Scene'
import { SceneBus } from "../bus/SceneBus";
import { CameraSystem } from "../ecs/system/CameraSystem";
import { HDMFSystem } from "../ecs/system/HDMFSystem";
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
            context: Context;
            compiler: Compiler;
            colorAttachment: ColorAttachment;
            depthStencilAttachment: DepthStencilAttachment;
            maxMipmapCount: number,
            lastTimeStamp: number;
            performance?: number;
        };
        _state_system_: {
            cameraSystem: CameraSystem,
            ellipsoidSystem: EllipsoidSystem,
            hdmfSystem: HDMFSystem,
            renderSystem: RenderSystem,
        };
    }
}

Scene.prototype.getContext3D = function (): Context {
    return this._state_renderer_.context;
}

Scene.prototype.getCompiler3D = function (): Compiler {
    return this._state_renderer_.compiler;
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
    // camera update.
    // pick main Camera, skip update if missing mainCamera.
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

    // render system update
    const renderSys = this._state_system_.renderSystem;
    await renderSys.update(camera, hdmfSys.Group, hdmfSys.StatsCursor, cw, ch);
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
            requestFeatures: [
                'chromium-experimental-multi-draw-indirect',
                'timestamp-query',
                'indirect-first-instance',
                'texture-compression-bc'
                // 'chromium-experimental-multi-draw-indirect'
            ]
        };
        const context: Context = new Context(opts);
        await context.init();

        const compiler: Compiler = new Compiler(context);
        // init renderer state.
        // compiler, context, max mipmap count for depth texture. color attachment, depth stencil attachment.
        {
            const surfaceTexture = compiler.createSurfaceTexture2D();
            const surfaceColorAttachment = compiler.createColorAttachment({
                texture: surfaceTexture,
                blendFormat: 'opaque',
                colorLoadStoreFormat: 'clearStore',   //clearStore
                clearColor: [0.0, 0.0, 0.0, 0.0]
            });
            const depthTexture = compiler.createTexture2D({
                width: context.getViewportWidth(),
                height: context.getViewportHeight(),
                textureFormat: context.getPreferredDepthTexuteFormat(),
            });
            const depthStencilAttachment = compiler.createDepthStencilAttachment({
                texture: depthTexture,
                depthCompareFunction: 'less-equal',   //    LESS
                depthLoadStoreFormat: 'clearStore',   //    clearStore
                depthReadOnly: false,
                depthClearValue: 1.0,
                // depthBiasSlopeScale: 100.0,
            });
            scene._state_renderer_ = {
                lastTimeStamp: 0,
                context: context,
                compiler: compiler,
                colorAttachment: surfaceColorAttachment,
                depthStencilAttachment: depthStencilAttachment,
                maxMipmapCount: depthStencilAttachment.getTexture().MaxMipmapCount,
            };
        }

        // state system.
        scene._state_system_ = {
            cameraSystem: new CameraSystem(scene),
            ellipsoidSystem: new EllipsoidSystem(scene),
            hdmfSystem: new HDMFSystem(scene),
            renderSystem: new RenderSystem(scene),
        };

        // tick.
        {
            scene._state_tick_ = {
                count: 0
            };
            await scene.tick(scene._state_tick_.count++);
        }
    }
);