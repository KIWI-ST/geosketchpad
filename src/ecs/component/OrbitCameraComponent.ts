import { Camera, clamp } from '@pipegpu/camera';
import { CartoPosition, Ray, type Ellipsoid } from '@pipegpu/geography';
import { mat4d, vec2d, vec3d, vec4d, type Mat4d, type Vec2d, type Vec3d, type Vec4d } from 'wgpu-matrix';
import { BaseComponent } from '../BaseComponent';
import { DOMBus, type DOMBusContext } from '../../bus/DOMBus';

/**
 * @description value torlance
 */
const EPSILON7 = 0.0000001;

/**
 * @class OrbitCameraComponent
 * @description https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts
 */
class OrbitCameraComponent extends BaseComponent {
    /**
     * 
     */
    private _state_: {
        autoRotate: boolean,
        autoRotateSpeed: number,
        position: Vec3d;
        positionCRT: Vec3d;                 // position in current.
        target: Vec3d;
        rotateFactor: number;
        zoomFactor: number;
        panFactor: number;
        smooth: number;
        isMouseDown: boolean;
        lastMouseX: number;
        lastMouseY: number;
        lastPositionNdc: Vec2d;
        isPanning: boolean;
        distance2SurfaceTarget: number,
        distance2Surface: number;           // distance to sufrace (ellipsoid).
        theta: number,                      // lng
        phi: number,                        // lat
        sphericalPostion: Vec3d,
    };

    /**
     * 
     */
    private isMainCamera_: boolean = false;

    /**
     * camrea position in world space.
     * e.g 
     * (100, 200, 300);
     * WARNING: other 
     */
    private camera_: Camera;

    /**
     * @description
     */
    private ellipsoid_: Ellipsoid;

    /**
     * 
     */
    constructor(camera: Camera, ellipsoid: Ellipsoid) {
        super('OrbitCameraComponent');
        this.camera_ = camera;
        this.ellipsoid_ = ellipsoid;
        const positionCT: CartoPosition = this.ellipsoid_.positionWS2PositionCT(camera.Position);
        this._state_ = {
            autoRotate: false,
            autoRotateSpeed: 0.1,
            position: vec3d.clone(this.camera_.Position),
            positionCRT: vec3d.clone(this.camera_.Position),
            target: this.camera_.Target,
            // rotateFactor: 0.001,
            zoomFactor: 0.01,                                           // 缩放因子适配椭球尺度（缩小避免缩放过快）
            panFactor: 0.001,                                           // 平移因子适配椭球尺度
            smooth: 5.0,
            isMouseDown: false,
            lastMouseX: 0,
            lastMouseY: 0,
            isPanning: false,
            lastPositionNdc: vec2d.create(0.0, 0.0),
            theta: positionCT.Longitude,
            phi: positionCT.Latitude,
            distance2Surface: positionCT.Altitude,
            distance2SurfaceTarget: positionCT.Altitude,
            // radius: positionCT.Altitude + ellipsoid.MaximumRadius,         // 基于摄像机的位置，计算初始化扰动半径
            // targetRadius: positionCT.Altitude + ellipsoid.MaximumRadius,
            sphericalPostion: vec3d.clone(this.camera_.Position),
        };
    }

    /**
     * 
     * @param b 
     */
    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
        if (b) {
            this.registerEventListener();
        } else {
            this.removeEventListener();
        }
    }

    /**
     * 
     */
    public async update(): Promise<void> {
        let changed: boolean = false;
        let step = this._state_.isPanning ? 1.0 : this._state_.smooth;
        // 修复1：检测相机外部修改（相机位置/目标被外部改变时，同步更新state）
        const cameraPosChanged = !vec3d.equals(this.camera_.Position, this._state_.positionCRT);
        const cameraTargetChanged = !vec3d.equals(this.camera_.Target, this._state_.target);
        if (cameraPosChanged) {
            // 外部修改了相机位置，同步更新目标位置
            this._state_.position = vec3d.clone(this.camera_.Position);
            changed = true;
            step = 1; // 立即生效，跳过平滑
        }
        if (cameraTargetChanged) {
            // 外部修改了相机目标，同步更新state.target
            this._state_.target = vec3d.clone(this.camera_.Target);
            changed = true;
            step = 1;
        }

        // if (changed) {
        //     this._state_.sphericalPostion = vec3d.sub(this._state_.position, this._state_.target);
        //     this._state_.radius = vec3d.dist(this._state_.position, this._state_.target);
        //     this.refreshSphericalAngles(); // 重新计算球面角
        // } else if (!this._state_.isMouseDown && this._state_.autoRotate) {
        //     this._state_.theta -= this._state_.autoRotateSpeed * Math.PI / 180;
        //     this.refreshCamera();
        // }

        // 平滑过渡相机位置
        {
            const x: number = (this._state_.position[0] - this._state_.positionCRT[0]) / step;
            const y: number = (this._state_.position[1] - this._state_.positionCRT[1]) / step;
            const z: number = (this._state_.position[2] - this._state_.positionCRT[2]) / step;

            if (Math.abs(x) > EPSILON7) {
                this._state_.positionCRT[0] += x;
            } else {
                this._state_.positionCRT[0] = this._state_.position[0];
            }
            if (Math.abs(y) > EPSILON7) {
                this._state_.positionCRT[1] += y;
            } else {
                this._state_.positionCRT[1] = this._state_.position[1];
            }
            if (Math.abs(z) > EPSILON7) {
                this._state_.positionCRT[2] += z;
            } else {
                this._state_.positionCRT[2] = this._state_.position[2];
            }
            if (Math.abs(this._state_.distance2Surface - this._state_.distance2SurfaceTarget) > EPSILON7) {
                this._state_.distance2Surface += (this._state_.distance2SurfaceTarget - this._state_.distance2Surface) / step;
                if (Math.abs(this._state_.distance2Surface - this._state_.distance2SurfaceTarget) < EPSILON7) {
                    this._state_.distance2Surface = this._state_.distance2SurfaceTarget;
                }
            }
        }

        // 更新相机状态
        this.refreshCamera();
        this.camera_.Position = this._state_.positionCRT;
        this.camera_.Target = this._state_.target;
    }

    /**
     * 
     */
    private refreshCamera() {
        // 计算相机在椭球空间的位置
        let position_ws = this.ellipsoid_.positionCT2postionWS(new CartoPosition(this._state_.theta, this._state_.phi, this._state_.distance2Surface));
        // 叠加目标点（椭球中心/焦点）
        this._state_.position = vec3d.add(position_ws, this._state_.target);
        // 确保相机位置在椭球外部
        // const positionWS = vec3d.clone(this._state_.position);
        // const positionCT = this.ellipsoid_.positionWS2PositionCT(positionWS);
        // if (positionCT) {
        //     const surfacePositionWS = this.ellipsoid_.positionCT2postionWS(positionCT);
        //     const surfaceDistance = vec3d.distance(positionWS, surfacePositionWS);
        //     if (surfaceDistance < this._state_.minDistance * 0.1) {
        //         this._state_.radius = this._state_.minDistance;
        //         position_ws = PositionInSphere(this._state_.phi, this._state_.theta, this._state_.radius);
        //         this._state_.position = vec3d.add(position_ws, this._state_.target);
        //     }
        // }
    }

    // /**
    //  * @description
    //  * @param deltaX 
    //  * @param deltaY 
    //  */
    // private pan = (deltaX: number, deltaY: number): void => {
    //     // 将目标点转换为Cesium笛卡尔坐标
    //     const targetCartesian = vec3d.clone(this._state_.target);
    //     // 计算目标点的局部坐标系（北东地坐标系）
    //     const enuMatrix = this.ellipsoid_.eastNorthUpToFixedFrame(targetCartesian);
    //     // 计算平移增量（适配椭球尺度）
    //     const translateX = -deltaX * this._state_.panFactor * this._state_.radius;
    //     const translateY = deltaY * this._state_.panFactor * this._state_.radius;
    //     // 构建平移向量（东/北方向）
    //     const translation = vec3d.create(translateX, translateY, 0);
    //     // 转换到世界坐标系
    //     const translated = vec3d.transformMat4(translation, enuMatrix);
    //     const newTarget = vec3d.add(targetCartesian, translated);
    //     this._state_.target = vec3d.clone(newTarget);
    //     // 同步更新相机位置（保持相对距离）
    //     const cameraCartesian = vec3d.clone(this._state_.position);
    //     const newCameraPosition = vec3d.add(cameraCartesian, translated);
    //     this._state_.position = vec3d.clone(newCameraPosition);
    //     this.refreshCamera();
    // }

    /**
     * @description refresh
     *  https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts#L209
     * @param c 
     */
    private onZoom(c: DOMBusContext) {
        const delta = Math.sign(c.delta) * Math.min(Math.abs(c.delta) / 100, 1);
        const speed = this._state_.distance2Surface * 0.5 * delta;
        this._state_.distance2SurfaceTarget = this._state_.distance2Surface - speed;
        this.refreshCamera();
        // const delta = clamp(c.delta, -this.ellipsoid_.MaximumRadius * this._state_.zoomFactor, this.ellipsoid_.MaximumRadius * this._state_.zoomFactor);
        // this._state_.radius += delta * this._state_.zoomFactor;
    }

    /**
     * @description
     * @param c 
     */
    private onPointerDown(c: DOMBusContext) {
        this._state_.isMouseDown = c.isMouseDown = true;
        this._state_.lastMouseX = c.lastPoint[0];
        this._state_.lastMouseY = c.lastPoint[1];
        this._state_.lastPositionNdc = c.pointNDC;
        if (c.mouseStatus[2]) {
            this._state_.isPanning = true;
        }
    }

    /**
     * @description
     * @param c 
     */
    private onPointerUp(c: DOMBusContext) {
        this._state_.isMouseDown = c.isMouseDown = false;
        if (c.mouseStatus[2]) {
            this._state_.isPanning = false;
        }
    }

    /**
     * 参考：
     *  https://github.com/KIWI-ST/geosketchpad/blob/5c1d0e6f1ea24f90fc3a500bdf863b4cd6f651bd/src/globe/Globe.Camera.ts#L107
     * @description
     * 获取屏幕空间坐标与空间中心（0，0，0）连线，计算连线和椭球表面相交点空间坐标
     * point: client x,y
     */
    public rayTrackOnSphere(pNdc: Vec4d): Vec3d | undefined {
        // 屏幕clientxy转换成ndc向量
        // const pNdc = vec3d.create(point[0] / cw * 2.0 - 1.0, -point[1] / ch * 2.0 + 1, 1.0);
        // ndc向量转换成世界空间坐标
        const viewWS = vec4d.transformMat4(pNdc, mat4d.invert(this.camera_.ProjectionMatrix));
        if (viewWS[3] !== 0) {
            viewWS[0] /= viewWS[3];
            viewWS[1] /= viewWS[3];
            viewWS[2] /= viewWS[3];
            viewWS[3] = 1.0;
        }
        const ws = vec4d.transformMat4(viewWS, mat4d.invert(this.camera_.ViewMatrix));
        const d = vec3d.normalize(vec3d.sub(ws, this.camera_.Position));
        const ray = new Ray(this.camera_.Position, d);
        const interval = ray.interscetEllipsoid(this.ellipsoid_);
        if (!interval) {
            return;
        }
        return ray.at(interval.Start);
    }

    /**
     * @description
     *  https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts
     * @param c 
     * @returns 
     */
    private onPointerMove(c: DOMBusContext) {
        if (!this._state_.isMouseDown || !this.enabled_) {
            return;
        }
        let mousex = c.point[0];
        let mousey = c.point[1];
        // const deltaX = mousex - this._state_.lastMouseX;
        // const deltaY = mousey - this._state_.lastMouseY;
        // rotate
        // left mouse down, rotate scene.
        // 左键：旋转（基于椭球球面角）
        if (c.mouseStatus[0]) {
            const positionWS = this.rayTrackOnSphere(
                vec4d.create(
                    c.pointNDC[0],
                    c.pointNDC[1],
                    1.0,
                    1.0)
            );
            if (!positionWS) {
                return;
            }
            const positionCT = this.ellipsoid_.positionWS2PositionCT(positionWS);
            const lastPositionWS = this.rayTrackOnSphere(
                vec4d.create(
                    this._state_.lastPositionNdc[0],
                    this._state_.lastPositionNdc[1],
                    1.0,
                    1.0)
            );
            if (!lastPositionWS) {
                return;
            }
            const lastPositionCT = this.ellipsoid_.positionWS2PositionCT(lastPositionWS);
            const dTheta = positionCT.Longitude - lastPositionCT.Longitude;
            const dPhi = positionCT.Latitude - lastPositionCT.Latitude;
            this._state_.theta -= dTheta;
            this._state_.phi -= dPhi;
            this.refreshCamera();
        }
        // 右键：平移（适配椭球表面）
        else if (c.mouseStatus[2]) {
            // this.pan(deltaX, deltaY);
        }
        // 更新最后鼠标位置
        this._state_.lastMouseX = mousex;
        this._state_.lastMouseY = mousey;
        this._state_.lastPositionNdc = c.pointNDC;
    }

    /**
     * @description
     */
    private registerEventListener() {
        DOMBus.Handler.on('POINTER_ZOOM', this.onZoom, this);
        DOMBus.Handler.on('POINTER_DOWN', this.onPointerDown, this);
        DOMBus.Handler.on('POINTER_MOVE', this.onPointerMove, this);
        DOMBus.Handler.on('POINTER_UP', this.onPointerUp, this);
    }

    /**
     * @description
     */
    private removeEventListener() {
        DOMBus.Handler.off('POINTER_ZOOM', this.onZoom, this);
        DOMBus.Handler.off('POINTER_DOWN', this.onPointerDown, this);
        DOMBus.Handler.off('POINTER_MOVE', this.onPointerMove, this);
        DOMBus.Handler.off('POINTER_UP', this.onPointerUp, this);
    }

    /**
     * @description
     */
    get Position() {
        return this.camera_.Position;
    }

    /**
     * @description
     */
    get ProjectionMatrix(): Mat4d {
        return this.camera_.ProjectionMatrix;
    }

    /**
     * @description
     */
    get ViewMatrix(): Mat4d {
        return this.camera_.ViewMatrix;
    }

    /**
     * @description
     */
    get ViewProjectionMatrix(): Mat4d {
        return this.camera_.ViewProjectionMatrix;
    }

    /**
     * @description
     */
    set IsMainCamera(v: boolean) {
        this.isMainCamera_ = v;
    }

    /**
     * @description
     */
    get IsMainCamera(): boolean {
        return this.isMainCamera_;
    }

    /**
     * @description
     */
    get Camrea(): Camera {
        return this.camera_;
    }
}

export {
    OrbitCameraComponent
}