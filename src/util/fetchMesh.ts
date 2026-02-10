import * as flatbuffers from 'flatbuffers';
import type { HardwareDenseMeshFriendly } from './meshlet/spec';
import { spec } from './meshlet/hdmf';

const fetchMesh = async (uri: string): Promise<HardwareDenseMeshFriendly> => {
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
    fetchMesh
}