import * as flatbuffers from 'flatbuffers';
import { mat4d, type Mat4d } from 'wgpu-matrix';

import { spec } from './meshlet/hdmf';
import type { HardwareDenseMeshFriendly } from './meshlet/spec';

type Instance = {
    id: string,
    mesh_id: string,
    model: Mat4d
};

type InstanceDataPack = {
    key: string,
    instances: Instance[],
};

const fetchInstance = async (uri: string, key: string): Promise<InstanceDataPack | undefined> => {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            console.log(`[E][fetchJSON] json load failed, response code: ${response.status}`);
            return undefined;
        }
        const json = await response.json();
        const instanceDataPack: InstanceDataPack = {
            key: key,
            instances: []
        };
        json.instances.forEach((instance: any) => {
            const item: Instance = {
                id: instance.id,
                mesh_id: instance.mesh_id,
                model: mat4d.create(
                    instance.model[0], instance.model[1], instance.model[2], instance.model[3],
                    instance.model[4], instance.model[5], instance.model[6], instance.model[7],
                    instance.model[8], instance.model[9], instance.model[10], instance.model[11],
                    instance.model[12], instance.model[13], instance.model[14], instance.model[15],
                )
            };
            instanceDataPack.instances.push(item);
        });
        return instanceDataPack;
    }
    catch (error) {
        console.error(`[E][fetchJSON] json load failed, error message: ${error}`);
        return undefined;
    }
};


const fetchHDMF = async (uri: string): Promise<HardwareDenseMeshFriendly> => {
    const response = await fetch(uri);
    if (!response.ok) {
        throw new Error(`[E][fetchHDMF ] .hdmf load failed, response code: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const u8arr = new Uint8Array(arrayBuffer);
    const buf = new flatbuffers.ByteBuffer(u8arr);
    const hardwareDenseMeshFriendly: HardwareDenseMeshFriendly = spec.HardwareDenseMeshFriendly.getRootAsHardwareDenseMeshFriendly(buf);
    return hardwareDenseMeshFriendly;
}

export {
    type InstanceDataPack,
    type Instance,
    fetchHDMF,
    fetchInstance
}