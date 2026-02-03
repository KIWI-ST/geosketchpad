// import { GBuffer, GTexture, IPipeCommand, PipeGL, Props, TAttribute, TProps, TUniform } from "pipegl";

// import { createNormals } from "../../core/normal";
// import { SketchpadRenderer } from "../SketchpadRenderer";
// import { PerspectiveCamera } from "../../camera/PerspectiveCamera";
// import { llpElement, llpTexCoord } from "../../core/llp";
// import { TileLayerDataSchema, TileLayer } from "./TileLayer";

// interface IProps extends TProps {
//     position: GBuffer;
//     normal: GBuffer;
//     texture: GTexture;
//     viewProjection: number[];
// }

// interface Attribute extends TAttribute {
//     position: Props<IProps>;
//     normal: Props<IProps>;
//     texCoord: number[][];
// }

// interface Uniform extends TUniform {
//     viewPorjection: Props<IProps>;
//     texture: Props<IProps>;
// }

// interface ITileCacheSchema {
//     vBuf: GBuffer;       //顶点
//     nBuf: GBuffer;       //法线
//     texture: GTexture;   //纹理
// }

// class TileLayerRenderer extends SketchpadRenderer<TileLayerDataSchema> {

//     private CACHE: Map<string, ITileCacheSchema> = new Map();

//     private batch: Map<string, boolean> = new Map();

//     private draw0: IPipeCommand;

//     private elements: number[][];

//     constructor(qtLayer: TileLayer, ctx3d: PipeGL) {
//         super(qtLayer, ctx3d);
//         this.elements = llpElement();
//         this.draw0 = ctx3d.compile<Attribute, Uniform>({

//             vert: `precision mediump float;

//             attribute vec3 position;
//             attribute vec2 texCoord;
//             attribute vec3 normal;

//             uniform mat4 viewPorjection;

//             varying vec2 vTexCoord;
//             varying vec3 vPosition;
//             varying vec3 vNormal;

//             void main(){
//                 vTexCoord = texCoord;
//                 vPosition = position;
//                 vNormal = normal;
//                 gl_Position = viewPorjection*vec4(position, 1.0);
//             }`,

//             frag: `precision mediump float;

//             uniform sampler2D texture;

//             const vec3 lightPostion = vec3(0.0, 127562074.0, 127562074.0);
//             const vec3 lightColor = vec3(1.0, 1.0, 1.0);

//             varying vec2 vTexCoord;
//             varying vec3 vPosition;
//             varying vec3 vNormal;

//             void main(){
//                 //计算漫反射结果
//                 vec3 lightDir = normalize(lightPostion - vPosition);
//                 float diff = max(dot(vNormal, lightDir), 0.0);
//                 gl_FragColor = vec4(diff * lightColor * vec3(texture2D(texture,vTexCoord)), 1.0);
//             }`,

//             elements: this.elements,

//             attributes: {
//                 position: new Props<IProps>('position'),
//                 normal: new Props<IProps>('normal'),
//                 texCoord: llpTexCoord(),
//             },

//             uniforms: {
//                 viewPorjection: new Props<IProps>('viewProjection'),
//                 texture: new Props<IProps>('texture'),
//             },

//             primitive: 'TRIANGLES',

//             status: {
//                 DEPTH_TEST: true,
//                 CULL_FACE: true
//             }
//         })
//     }

//     public prepare = (tileData: TileLayerDataSchema): void => {
//         const CACHE = this.CACHE;
//         const key = tileData.key;
//         this.batch.set(key, true);
//         if (!this.CACHE.has(key)) {
//             const vBuf = this.ctx3d.buffer(tileData.vertices);
//             const nBuf = this.ctx3d.buffer(createNormals(this.elements, tileData.vertices));
//             const texture = this.ctx3d.texture2D(tileData.textureBuffer, tileData.width, tileData.height, tileData.channel);
//             const schema: ITileCacheSchema = { vBuf, nBuf, texture };
//             CACHE.set(key, schema);
//         }
//     }

//     public render = (framestamp: number, camera: PerspectiveCamera): void => {
//         const props: IProps[] = [];
//         //batch准备
//         this.batch.forEach((v, k) => {
//             const schema = this.CACHE.get(k);
//             if (schema) {
//                 const prop: IProps = {
//                     position: schema.vBuf,
//                     normal: schema.nBuf,
//                     texture: schema.texture,
//                     viewProjection: camera.ViewProjectionMatrix.value
//                 }
//                 props.push(prop);
//             }
//         });
//         //draw
//         this.draw0.batch<IProps>(props);
//     }
// }

// TileLayer.registerRenderer(TileLayer.name, TileLayerRenderer);

// export { TileLayerRenderer }