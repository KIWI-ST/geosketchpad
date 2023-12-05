import { PipeGL } from 'pipegl';

import { Globe } from './Globe';

import { RAF } from '../util/raf';
import { TweenCache } from '../core/Tween';

/**
 * Globe 全局渲染调度
 * 逐帧发起渲染，调度穿插其中
 */
declare module './Globe' {
    interface Globe {
        /**
         * 注册全局渲染
         */
        registerGlobeRenderer(): void;

        /**
         * 执行一次渲染
         */
        render(): void;

        /**
         * 帧渲染
         * @param framestamp 
         */
        renderFrame(framestamp: number): void;

        /**
         * 帧率渲染循环体
         * @param framestamp 
         */
        renderLoop(framestamp: number): void;

        /**
         * 发起worker调度
         * @param framestamp 
         */
        callWorker(framestamp: number): void;

        /**
         * 发起动画调度
         * @param framestamp 
         */
        callAnimate(framestamp: number): void;

        /**
         * 发起辅助工具调度
         * @param framestamp 
         */
        callAuxtool(framestamp: number): void;

        /**
         * 3D渲染上下文
         */
        getContext3D(): PipeGL;

        /**
         * 
         */
        _state_globerender_: {
            frameID?: number;                    //帧ID，可用于cancel
            ctx2d?: CanvasRenderingContext2D;    //
            ctx3d?: PipeGL;                      //
            canvas3d?: HTMLCanvasElement;        //
            lastframestamp?: number;             //上次帧渲染时间戳
            performance?: number;                //帧率
        }
    }
}

/**
 * 
 */
Globe.prototype.registerGlobeRenderer = function (): void {
    const g = this as Globe;
    g._state_globerender_ = {};
    //1.实际canvas使用ctx2d绘制
    //-支持每秒不超过50000次draw call调用
    //-支持贴图叠加
    //2.构造新的canvas对象，用于离屏渲染/共享传递3d上下文
    g._state_globerender_.ctx3d = new PipeGL({
        canvas: g.Canvas,
        extensions: ['ANGLE_instanced_arrays', 'OES_vertex_array_object']
    });
    //3.}{渲染结果出图
    //4.启动render
    g.render();
}

/**
 * 3D渲染上下文
 */
Globe.prototype.getContext3D = function (): PipeGL {
    const g = this as Globe;
    return g._state_globerender_.ctx3d;
}

/**
 * 
 */
Globe.prototype.render = function (): void {
    const g = this as Globe;
    g.renderLoop(0);
}

/**
 * 动画任务调起
 */
Globe.prototype.callAnimate = function (framestamp: number): void {
    const arr: Function[] = [];
    TweenCache.forEach(fn => arr.push(fn));
    TweenCache.clear();
    let fn = arr.shift();
    while (fn) {
        fn(framestamp);
        fn = arr.shift();
    }
}

/**
 * 发起辅助工具更新
 */
Globe.prototype.callAuxtool = function (framestamp: number): void {
    const g = this as Globe;
    g.emit('auxtool', framestamp);
}

/**
 * 发起多线程任务
 */
Globe.prototype.callWorker = function (framestamp: number): void {
    const g = this as Globe;
    g.emit('worker', framestamp);
}

/**
 * 
 */
Globe.prototype.renderLoop = function (framestamp: number): void {
    const g = this as Globe;
    //帧率
    g._state_globerender_.performance = 1000 / (framestamp - g._state_globerender_.lastframestamp);
    //worker
    g.callWorker(framestamp);
    //动画
    g.callAnimate(framestamp);
    //渲染
    g.renderFrame(framestamp);
    //更新信息
    g._state_globerender_.frameID = RAF.call(window, (framestamp: number) => g.renderLoop(framestamp));
    g._state_globerender_.lastframestamp = framestamp;
}

/**
 * 
 */
Globe.prototype.renderFrame = function (framestamp: number): void {
    //逐帧渲染
    const g = this as Globe, camera = g._state_camera_.camera, state = g._state_globerender_;
    const ctx3d = g.getContext3D();
    ctx3d.clear({ color: [0.0, 0.0, 0.0, 1.0] });
    //发起渲染事件
    g.emit('framestart', state.performance);
    //发起辅助工具渲染调度
    g.callAuxtool(framestamp);
    //渲染skpds
    const skpds = g.Sketchpads;
    skpds?.forEach(skpd => {
        const r = skpd.Renderer;
        r.render(framestamp, camera)
    });
    //渲染结束
    g.emit('frameend', state.performance);
}

Globe.registerHook(Globe.prototype.registerGlobeRenderer);