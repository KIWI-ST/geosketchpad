import { Vec3 } from "kiwi.matrix";

import { Globe } from './../Globe';

import { GeodeticCoordinate } from "./../../core/GeodeticCoordinate";
import { getEventContainerPosition } from "../../util/dom";
import { IClientPoint, IDOMEventParam } from "../../core/Format";
import { IPerformance, IPipeCommand, Props, TAttribute, TProps, TUniform } from "pipegl";

interface IProps extends TProps {
    position: number[];
}

interface Uniform extends TUniform {
    position: Props<IProps>;
    viewProjection: { (performance: IPerformance, batchId: number): number[] };
}

declare module './../Globe' {
    interface Globe {
        /**
         * 辅助工具-鼠标寻址位置启动
         */
        EnableCursorAuxTool():void;

        /**
         * 辅助工具-鼠标寻址位置关闭
         */
        DistableCursorAuxTool():void;

        CursorToolEventHandler(param:IDOMEventParam):void;

        CursorToolRenderHandler(framestamp:number):void;

        _state_aux_cursor_:{
            d0?:IPipeCommand,
            surfacePoint?:Vec3,
        }
    }
}

Globe.prototype.EnableCursorAuxTool = function(){
    const g = this as Globe;
    g._state_aux_cursor_ = g._state_aux_cursor_ || {};
    if(!g._state_aux_cursor_.d0){
        const ctx3d = g.getContext3D();
        const camera = g._state_camera_.camera;
        g._state_aux_cursor_.d0 = ctx3d.compile<TAttribute, Uniform>({

            vert:`precision mediump float;

            uniform vec3 position;
            uniform mat4 viewProjection;

            void main(){
                gl_PointSize = 10.0;
                gl_Position = viewProjection*vec4(position, 1.0);
            }`,

            frag:`precision mediump float;

            void main(){
                gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
            }`,

            attributes:{

            },

            uniforms:{
                position:new Props<IProps>('position'),
                viewProjection:(performance:IPerformance, batchId:number):number[]=>camera.ViewProjectionMatrix.value,
            },

            primitive:'POINTS',

            count:1,

            status:{
                DEPTH_TEST:true,
            }
        });
        g.on('mousemove', g.CursorToolEventHandler, g);
        g.on('auxtool', g.CursorToolRenderHandler,g);
    }
}

Globe.prototype.CursorToolEventHandler = function(param:IDOMEventParam):void{
    const g = this as Globe;
    const currentPosition:IClientPoint = getEventContainerPosition(param.domEvent, g.Canvas);
    const surfacePoint:Vec3 = g.rayTrackOnSphere(currentPosition);
    if(surfacePoint){
        g._state_aux_cursor_.surfacePoint = surfacePoint;
        const lnglat:GeodeticCoordinate = g.spaceCoordinateToGeographic(surfacePoint);
        g.emit('coordinate', lnglat);
    }
}

Globe.prototype.CursorToolRenderHandler = function(framestramp:number):void{
    const g = this as Globe;
    const p0 = g._state_aux_cursor_.surfacePoint;
    if(p0){
        const d0 = g._state_aux_cursor_.d0;
        d0.batch([{position:p0.value}]);
    }
}