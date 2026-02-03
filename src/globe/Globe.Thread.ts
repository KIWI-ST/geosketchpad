import { InitHDMFV1Worker, InitRGBAWorker, LongtermWorkerPool, WorkerLib, type IMessagebus } from "@pipegpu/worker";

import { Globe } from "./Globe";

/**
 * @description webworker注册机制构建
 * @author axmand
 * 1. 实现具体worker
 * 2. 打包成txt，写入WorkerLib
 * 3. 定义key-string结构
 * 4. 调用workerInit(keys)初始化worker
 */
type LongtermWorkerTYPE = 'HDMFV1Worker' | 'RGBAWorker';

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
        acquireWorker(workerType: LongtermWorkerTYPE, msg: IMessagebus): Promise<IMessagebus> | null;

        /**
         * 判断是否存在空闲线程
         * @param workerType
         */
        hasIdleWorker(workerType: LongtermWorkerTYPE): boolean;
    }
}

Globe.prototype.registerGlobeWorker = function () {
    WorkerLib.Instance.setWorker(`HDMFV1Worker`, InitHDMFV1Worker);
    LongtermWorkerPool.workerInit([`HDMFV1Worker`], 2);
    WorkerLib.Instance.setWorker(`RGBAWorker`, InitRGBAWorker);
    LongtermWorkerPool.workerInit([`RGBAWorker`], 2);
}

Globe.prototype.hasIdleWorker = function (workerType: LongtermWorkerTYPE): boolean {
    return LongtermWorkerPool.hasIdleWorker(workerType);
}

Globe.prototype.acquireWorker = function (workerType: LongtermWorkerTYPE, msg: IMessagebus): Promise<IMessagebus> | null {
    return LongtermWorkerPool.acquireWorker(workerType, msg);
}

Globe.registerHook(Globe.prototype.registerGlobeWorker);

export {
    type LongtermWorkerTYPE
}