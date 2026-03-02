import { LoadLIBKTX } from '../../plugin/ktx/libktx_wrapper';

/**
 * ktx2.0 compress format, use BC7_RGBA for pc as default.
 */
type CompressTextureTYPE = 'BC7_RGBA';

/**
 * ktx pack data.
 */
interface KTXPackData {
    /**
     * 
     */
    key: string,

    /**
     * @description raw data. streaming buffer.
     */
    data: Uint8Array,

    /**
     * @description texture pixel width.
     */
    width: number,

    /**
     * @description texture pixel height.
     */
    height: number,

    /**
     * 
     */
    t: CompressTextureTYPE,
}

/**
 *
 * for mobile, use astc compress format:
 * 'texture-compression-astc'
 * 'texture-compression-astc-sliced-3d'
 * 
 * for desktop, use bc compress format:
 * 'texture-compression-bc',
 * 'texture-compression-bc-sliced-3d'
 * 
 * @example
 * const ktxPack: KTXPackData | undefined = await fetchKTX2AsBc7RGBA('/example/asset/container.ktx');
 * 
 * ref:
 * https://github.khronos.org/KTX-Software/ktxjswrappers/libktx_js.html
 * @param uri
 * @param key
 * @returns Promise<KTX2Container>
 *
 */
const fetchKTX2AsBc7RGBA = async (uri: string, key: string = ""): Promise<KTXPackData | undefined> => {
    try {
        const ktx = await LoadLIBKTX();
        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`[E][fetchKTX ] ktx2 load failed, response code: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const ktxdata = new Uint8Array(arrayBuffer);
        const ktexture = new ktx.texture(ktxdata);
        if (ktexture.transcodeBasis(ktx.transcode_fmt.BC7_RGBA, 0) === ktx.error_code.SUCCESS) {
            const bufferView = ktexture.getImage(0, 0, 0);
            const u8arr = new Uint8Array(bufferView);
            return {
                key: key,
                data: u8arr,
                width: ktexture.baseWidth,
                height: ktexture.baseHeight,
                t: 'BC7_RGBA'
            };
        } else {
            throw new Error(`[E][fetchKTX2AsBc7RGBA] ktx2 load failed, transcodeBasis error.`);
        }
    } catch (error) {
        console.log(`[E][fetchKTX2AsBc7RGBA] ktx2 load failed, response code: ${error}`);
        return undefined;
    }
};

export {
    type CompressTextureTYPE as textureType,
    type KTXPackData,
    fetchKTX2AsBc7RGBA
}