// import { IPipeCommand, PipeGL, Props, TAttribute, TProps, TUniform } from "pipegl";

// import { PerspectiveCamera } from "../../camera/PerspectiveCamera";
// import { Hemisphere, HemisphereDataSchema } from "./Hemisphere";
// import { SketchpadRenderer } from '../SketchpadRenderer';

// interface IProps extends TProps {
//     viewProjection: number[];
//     ratio: number;
//     alpha: number;
// }

// interface Attribute extends TAttribute {
//     position: number[][];
//     normal: number[][];
// }

// interface Uniform extends TUniform {
//     viewProjection: Props<IProps>;
//     ratio: Props<IProps>;
//     alpha: Props<IProps>;
//     modelMatrix: number[];
// }

// /**
//  * 
//  */
// class HemisphereRenderer extends SketchpadRenderer<HemisphereDataSchema> {

//     private d0: IPipeCommand;

//     constructor(geometry: Hemisphere, ctx3d: PipeGL) {
//         super(geometry, ctx3d);
//     }

//     /**
//      * 解析数据，构造command
//      * @param data 
//      */
//     prepare = (data: HemisphereDataSchema): void => {
//         const { ctx3d } = this;
//         this.d0 = ctx3d.compile<Attribute, Uniform>({

//             vert: `precision mediump float;
            
//             attribute vec3 position;
//             attribute vec3 normal;

//             uniform float ratio;
//             uniform mat4 viewProjection, modelMatrix;

//             varying vec3 vNormal;
//             varying vec3 vPosition;

//             void main(){
//                 vec3 vNormal = mat3(modelMatrix)*normal;
//                 vec3 vPosition = ratio * position;
//                 gl_Position = viewProjection * modelMatrix * vec4(vPosition, 1.0);
//             }`,

//             frag: `precision mediump float;

//             const vec3 lightPosition = vec3(0.0, 12756274.0, 12756274.0);
//             const vec3 lightColor = vec3(1.0, 1.0, 1.0);

//             uniform float alpha;

//             varying vec3 vNormal;
//             varying vec3 vPosition;

//             void main(){
//                 vec3 lightDir = normalize(lightPosition-vPosition);
//                 float diff = max(dot(vNormal, lightDir), 0.0);
//                 gl_FragColor = vec4(0.8, 0.1, 0.0, 0.8*(1.0-alpha));
//                 // gl_FragColor = vec4(diff/255.0, diff/255.0, diff/255.0, 0.5);
//             }`,

//             attributes: {
//                 position: data.vertices,
//                 normal: data.normals,
//             },

//             uniforms: {
//                 viewProjection: new Props<IProps>('viewProjection'),
//                 modelMatrix: data.modelMatrix,
//                 ratio: new Props<IProps>('ratio'),
//                 alpha: new Props<IProps>('alpha'),
//             },

//             elements: data.indices,

//             status: {
//                 DEPTH_TEST: false,
//                 BLEND: true,
//                 blendFunc: [0x0302, 0x0303]
//             }
//         });
//     }

//     render = (framestamp: number, camera: PerspectiveCamera): void => {
//         const d0 = this.d0;
//         const batch: IProps[] = [];
//         const r = Math.tan(framestamp * 0.0008);
//         const ratio = r > 1 ? 1 : r < 0 ? 1 : r;
//         batch.push({ viewProjection: camera.ViewProjectionMatrix.value, ratio, alpha: ratio });
//         d0.batch<IProps>(batch);
//     }

// }

// Hemisphere.registerRenderer(Hemisphere.name, HemisphereRenderer);

// export { HemisphereRenderer }