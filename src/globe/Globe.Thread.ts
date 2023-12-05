/**
 * 
 * @description webworker注册机制构建
 * @author axmand
 * 
 * 1. 实现具体worker
 * 2. 打包成txt，写入WorkerLib
 * 3. 定义key-string结构
 * 4. 调用workerInit(keys)初始化worker
 * 
 */

import { IMessagebus, LongtermWorkerPool, WorkerLib } from 'kiwi.worker';
import { Globe } from './Globe';

import LICENSE from './../../dist/worker/RGBAWorker.txt?raw';

/**
 * 常驻任务枚举
 */
const CLongtermWorker = {
    RGBAWorker: LICENSE
}

/**
 * 
 */
type SLongtermWorker = keyof {
    [key in keyof typeof CLongtermWorker]: string
}

/**
 * 
 */
declare module './Globe' {
    interface Globe {
        /**
         * 
         */
        registerGlobeWorker(): void;

        /**
         * 给线程分配任务
         * @param workerType 
         * @param msg 
         */
        acquireWorker(workerType: SLongtermWorker, msg: IMessagebus): Promise<IMessagebus> | null;

        /**
         * 判断是否存在空闲线程
         * @param workerType 
         */
        hasIdleWorker(workerType: SLongtermWorker): boolean;
    }
}

Globe.prototype.registerGlobeWorker = function () {
    const g = this as Globe;
    WorkerLib.Instance.setWorker("RGBAWorker", CLongtermWorker.RGBAWorker);
    const longtermKeys = Object.keys(CLongtermWorker);
    LongtermWorkerPool.workerInit(longtermKeys);
}

Globe.prototype.hasIdleWorker = function (workerType: SLongtermWorker): boolean {
    return LongtermWorkerPool.hasIdleWorker(workerType);
}

Globe.prototype.acquireWorker = function (workerType: SLongtermWorker, msg: IMessagebus): Promise<IMessagebus> | null {
    return LongtermWorkerPool.acquireWorker(workerType, msg);
}

Globe.registerHook(Globe.prototype.registerGlobeWorker);