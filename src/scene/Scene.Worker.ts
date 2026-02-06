import { InitHDMFV1Worker, InitRGBAWorker, LongtermWorkerPool, WorkerLib, type IMessagebus } from "@pipegpu/worker";
import { Scene } from "./Scene";

/**
 * @description ongtermWorkers regsiter
 * @author axmand
 * 1. LongtermWorker type.
 * 2. Register LongtermWorkers
 */
type LongtermWorkerTYPE = 'HDMFV1Worker' | 'RGBAWorker';

/**
 *
 */
declare module './Scene' {
    interface Scene {
        acquireWorker(workerType: LongtermWorkerTYPE, msg: IMessagebus): Promise<IMessagebus> | null;
        hasIdleWorker(workerType: LongtermWorkerTYPE): boolean;
    }
}

Scene.prototype.hasIdleWorker = function (workerType: LongtermWorkerTYPE): boolean {
    return LongtermWorkerPool.hasIdleWorker(workerType);
}

Scene.prototype.acquireWorker = function (workerType: LongtermWorkerTYPE, msg: IMessagebus): Promise<IMessagebus> | null {
    return LongtermWorkerPool.acquireWorker(workerType, msg);
}

Scene.registerHook(
    async (_scene: Scene) => {
        WorkerLib.Instance.setWorker(`HDMFV1Worker`, InitHDMFV1Worker);
        LongtermWorkerPool.workerInit([`HDMFV1Worker`], 2);
        WorkerLib.Instance.setWorker(`RGBAWorker`, InitRGBAWorker);
        LongtermWorkerPool.workerInit([`RGBAWorker`], 2);
    }
);

export {
    type LongtermWorkerTYPE
}