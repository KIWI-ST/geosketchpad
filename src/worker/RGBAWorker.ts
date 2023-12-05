import { IMessagebus, WorkerStatus } from "kiwi.worker"

//准备一个较大分辨率的OC绘制不同场景
const OC = new OffscreenCanvas(512, 512);
const CTX = OC.getContext('2d');

//
self.onmessage = (e: MessageEvent<IMessagebus>) => {
    const d = e.data.args, uri = d[0], key = d[1], w:number = d[2], h:number = d[3],c:number=4;
    //获取uri对应资源
    fetch(uri)
        .then((res0: Response) => res0.blob()).then((blob: Blob) => createImageBitmap(blob))
        .then((bitmap: ImageBitmap) => {
            CTX.drawImage(bitmap, 0, 0);
            const uc8arr = CTX.getImageData(0, 0, w, h).data;
            const buf = new Uint8Array(uc8arr);
            const messageBus: IMessagebus = {
                workerKey: key,
                status: WorkerStatus.OK,
                args: [w, h, c],               //RGBA固定通道为4
                buffer: buf,
            };
            (self as unknown as ServiceWorker).postMessage(messageBus, [buf.buffer])
        })
        .catch(reason => {
            const messageBus: IMessagebus = {
                workerKey: key,
                msg: reason,
                status: WorkerStatus.FAIL,
            };
            (self as unknown as ServiceWorker).postMessage(messageBus)
        });
}