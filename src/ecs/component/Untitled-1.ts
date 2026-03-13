import { Camera } from '@pipegpu/camera';
import { vec3d, type Mat4d, type Vec3d } from 'wgpu-matrix';
import { Ellipsoid, Cartesian3, Matrix4, Transforms, Math as CesiumMath } from 'cesium';

import { BaseComponent } from '../BaseComponent';
import { DOMBus, type DOMBusContext } from '../../bus/DOMBus';

/**
 * @description value tolerance
 */
const EPSILON7 = 0.0000001;

/**
 * @class OrbitCameraComponent
 * @description 适配 Cesium Ellipsoid 的轨道相机控制器
 * 参考: https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts
 */
class OrbitCameraComponent extends BaseComponent {
    /**
     * 相机状态管理
     */
    private _state_: {
        autoRotate: boolean,
        autoRotateSpeed: number,
        position: Vec3d;
        positionCRT: Vec3d;              // 当前平滑过渡中的位置
        target: Vec3d;
        rotateFactor: number;
        zoomFactor: number;
        panFactor: number;
        smooth: number;
        minDistance: number;
        maxDistance: number; // 新增：椭球最大可视距离
        isMouseDown: boolean;
        lastMouseX: number;
        lastMouseY: number;
        isPanning: boolean;
        theta: number,
        phi: number,
        radius: number,
        sphericalPostion: Vec3d,
    };

    /**
     * 是否为主相机
     */
    private isMainCamera_: boolean = false;

    /**
     * 底层相机实例
     */
    private camera_: Camera;

    /**
     * Cesium 椭球实例（默认 WGS84 椭球）
     */
    private ellipsoid_: Ellipsoid;

    /**
     * 构造函数
     * @param camera 相机实例
     * @param ellipsoid Cesium 椭球实例（可选，默认 WGS84）
     */
    constructor(camera: Camera, ellipsoid: Ellipsoid = Ellipsoid.WGS84) {
        super('OrbitCameraComponent');
        this.camera_ = camera;
        this.ellipsoid_ = ellipsoid;

        // 从椭球获取基础约束
        const maxRadius = this.ellipsoid_.maximumRadius * 5; // 最大可视距离设为椭球最大半径的5倍
        const minRadius = this.ellipsoid_.minimumRadius * 1.1; // 最小距离避免穿透椭球

        this._state_ = {
            autoRotate: false,
            autoRotateSpeed: 0.1,
            position: vec3d.clone(this.camera_.Position),
            positionCRT: vec3d.clone(this.camera_.Position),
            target: this.camera_.Target,
            rotateFactor: 1.0,
            zoomFactor: 0.01, // 缩放因子适配椭球尺度（缩小避免缩放过快）
            panFactor: 0.001, // 平移因子适配椭球尺度
            smooth: 5.0,
            minDistance: minRadius,
            maxDistance: maxRadius, // 新增：椭球最大距离约束
            isMouseDown: false,
            lastMouseX: 0,
            lastMouseY: 0,
            isPanning: false,
            theta: 0,
            phi: 0,
            radius: this.calculateRadiusFromEllipsoid(), // 基于椭球计算初始半径
            sphericalPostion: vec3d.clone(this.camera_.Position),
        };

        // 初始化theta/phi（从相机位置和目标计算球面角）
        this.initSphericalAngles();
    }

    /**
     * 启用/禁用控制器
     * @param b 是否启用
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
     * 帧更新逻辑
     */
    public async update(): Promise<void> {
        let changed: boolean = false;
        let step = this._state_.isPanning ? 1.0 : this._state_.smooth;

        if (!vec3d.equals(this._state_.positionCRT, this._state_.position)) {
            this._state_.position = this.camera_.Position;
            step = 1;
            changed = true;
        }

        if (!vec3d.equals(this.camera_.Target, this._state_.target)) {
            this._state_.target = this.camera_.Target;
            step = 1;
            changed = true;
        }

        if (changed) {
            this._state_.sphericalPostion = vec3d.sub(this._state_.position, this._state_.target);
            this._state_.radius = this.calculateRadiusFromEllipsoid(); // 重新计算半径
            this.initSphericalAngles(); // 重新计算球面角
        }
        // 自动旋转
        else if (!this._state_.isMouseDown && this._state_.autoRotate) {
            this._state_.theta -= this._state_.autoRotateSpeed * Math.PI / 180;
            this.RefreshCamera();
        }

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
        }

        // 更新相机状态
        this.camera_.Position = this._state_.positionCRT;
        this.camera_.Target = this._state_.target;
    }

    /**
     * 刷新相机位置（适配椭球）
     */
    private RefreshCamera() {
        // 约束phi角度（避免相机翻转/穿透椭球）
        this._state_.phi = CesiumMath.clamp(this._state_.phi, 0.1, Math.PI - 0.1);
        // 约束半径（基于椭球的最小/最大距离）
        this._state_.radius = CesiumMath.clamp(
            this._state_.radius,
            this._state_.minDistance,
            this._state_.maxDistance
        );

        /**
         * 球面坐标转笛卡尔坐标（适配椭球）
         * @param phi 纬度（弧度）
         * @param theta 经度（弧度）
         * @param radius 半径
         * @returns 笛卡尔坐标
         */
        const PositionInSphere = (phi: number, theta: number, radius: number): Vec3d => {
            const sinPhiRadius = Math.sin(phi) * radius;
            const x = sinPhiRadius * Math.sin(theta);
            const y = Math.cos(phi) * radius;
            const z = sinPhiRadius * Math.cos(theta);
            return vec3d.create(x, y, z);
        };

        // 计算相机在椭球空间的位置
        let position_ws = PositionInSphere(this._state_.phi, this._state_.theta, this._state_.radius);
        // 叠加目标点（椭球中心/焦点）
        this._state_.position = vec3d.add(position_ws, this._state_.target);

        // 确保相机位置在椭球外部
        const cartesian = new Cartesian3(
            this._state_.position[0],
            this._state_.position[1],
            this._state_.position[2]
        );
        const cartographic = this.ellipsoid_.cartesianToCartographic(cartesian);
        if (cartographic) {
            const surfacePosition = this.ellipsoid_.cartographicToCartesian(cartographic);
            const surfaceDistance = Cartesian3.distance(cartesian, surfacePosition);
            if (surfaceDistance < this._state_.minDistance * 0.1) {
                this._state_.radius = this._state_.minDistance;
                position_ws = PositionInSphere(this._state_.phi, this._state_.theta, this._state_.radius);
                this._state_.position = vec3d.add(position_ws, this._state_.target);
            }
        }
    }

    /**
     * 缩放逻辑（适配椭球）
     * @param c DOM事件上下文
     */
    private onZoom(c: DOMBusContext) {
        // 约束缩放增量，避免缩放过快
        const delta = CesiumMath.clamp(
            c.delta,
            -this._state_.maxDistance * 0.1,
            this._state_.maxDistance * 0.1
        );
        // 基于缩放因子更新半径
        this._state_.radius += delta * this._state_.zoomFactor;
        // 约束半径在椭球允许范围内
        this._state_.radius = CesiumMath.clamp(
            this._state_.radius,
            this._state_.minDistance,
            this._state_.maxDistance
        );
        this.RefreshCamera();
    }

    /**
     * 鼠标按下事件
     * @param c DOM事件上下文
     */
    private onPointerDown(c: DOMBusContext) {
        this._state_.isMouseDown = c.isMouseDown;
        this._state_.lastMouseX = c.lastPoint[0];
        this._state_.lastMouseY = c.lastPoint[1];
        this._state_.isPanning = c.mouseStatus[2]; // 右键触发平移
    }

    /**
     * 鼠标抬起事件
     * @param c DOM事件上下文
     */
    private onPointerUp(c: DOMBusContext) {
        this._state_.isMouseDown = c.isMouseDown;
        this._state_.isPanning = false;
    }

    /**
     * 鼠标移动事件（旋转/平移）
     * @param c DOM事件上下文
     */
    private onPointerMove(c: DOMBusContext) {
        if (!this._state_.isMouseDown || !this.enabled_) {
            return;
        }

        const mousex = c.point[0];
        const mousey = c.point[1];
        const deltaX = mousex - this._state_.lastMouseX;
        const deltaY = mousey - this._state_.lastMouseY;

        // 左键：旋转（基于椭球球面角）
        if (c.mouseStatus[0]) {
            const ra = -deltaX * this._state_.rotateFactor;
            const rb = deltaY * this._state_.rotateFactor;
            // 更新球面角（弧度）
            this._state_.theta += ra * Math.PI / 180;
            this._state_.phi -= rb * Math.PI / 180;
            this.RefreshCamera();
        }
        // 右键：平移（适配椭球表面）
        else if (c.mouseStatus[2]) {
            this.pan(deltaX, deltaY);
        }

        // 更新最后鼠标位置
        this._state_.lastMouseX = mousex;
        this._state_.lastMouseY = mousey;
    }

    /**
     * 椭球表面平移逻辑
     * @param deltaX 鼠标X轴偏移
     * @param deltaY 鼠标Y轴偏移
     */
    private pan(deltaX: number, deltaY: number) {
        // 将目标点转换为Cesium笛卡尔坐标
        const targetCartesian = new Cartesian3(
            this._state_.target[0],
            this._state_.target[1],
            this._state_.target[2]
        );

        // 计算目标点的局部坐标系（北东地坐标系）
        const enuMatrix = Transforms.eastNorthUpToFixedFrame(targetCartesian, this.ellipsoid_);
        const enuInverse = Matrix4.inverse(enuMatrix, new Matrix4());

        // 计算平移增量（适配椭球尺度）
        const translateX = -deltaX * this._state_.panFactor * this._state_.radius;
        const translateY = deltaY * this._state_.panFactor * this._state_.radius;

        // 构建平移向量（东/北方向）
        const translation = new Cartesian3(translateX, translateY, 0);
        // 转换到世界坐标系
        const translated = Matrix4.multiplyByPoint(enuMatrix, translation, new Cartesian3());

        // 更新目标点和相机位置
        const newTarget = Cartesian3.add(targetCartesian, translated, new Cartesian3());
        this._state_.target = vec3d.create(newTarget.x, newTarget.y, newTarget.z);

        // 同步更新相机位置（保持相对距离）
        const cameraCartesian = new Cartesian3(
            this._state_.position[0],
            this._state_.position[1],
            this._state_.position[2]
        );
        const newCameraPosition = Cartesian3.add(cameraCartesian, translated, new Cartesian3());
        this._state_.position = vec3d.create(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z);

        this.RefreshCamera();
    }

    /**
     * 基于椭球计算相机到目标的初始半径
     * @returns 半径值
     */
    private calculateRadiusFromEllipsoid(): number {
        const position = new Cartesian3(
            this.camera_.Position[0],
            this.camera_.Position[1],
            this.camera_.Position[2]
        );
        const target = new Cartesian3(
            this.camera_.Target[0],
            this.camera_.Target[1],
            this.camera_.Target[2]
        );
        return Cartesian3.distance(position, target);
    }

    /**
     * 初始化球面角（theta/phi）
     */
    private initSphericalAngles() {
        const direction = vec3d.sub(this._state_.position, this._state_.target);
        // 计算theta（方位角）
        this._state_.theta = Math.atan2(direction[0], direction[2]);
        // 计算phi（极角）
        const length = vec3d.len(direction);
        this._state_.phi = Math.acos(CesiumMath.clamp(direction[1] / length, -1, 1));
    }

    /**
     * 注册事件监听
     */
    private registerEventListener() {
        DOMBus.Handler.on('POINTER_ZOOM', this.onZoom, this);
        DOMBus.Handler.on('POINTER_DOWN', this.onPointerDown, this);
        DOMBus.Handler.on('POINTER_MOVE', this.onPointerMove, this);
        DOMBus.Handler.on('POINTER_UP', this.onPointerUp, this);
    }

    /**
     * 移除事件监听
     */
    private removeEventListener() {
        DOMBus.Handler.off('POINTER_ZOOM', this.onZoom, this);
        DOMBus.Handler.off('POINTER_DOWN', this.onPointerDown, this);
        DOMBus.Handler.off('POINTER_MOVE', this.onPointerMove, this);
        DOMBus.Handler.off('POINTER_UP', this.onPointerUp, this);
    }

    // ------------- 公共属性 -------------
    get Position() {
        return this.camera_.Position;
    }

    get ProjectionMatrix(): Mat4d {
        return this.camera_.ProjectionMatrix;
    }

    get ViewMatrix(): Mat4d {
        return this.camera_.ViewMatrix;
    }

    get ViewProjectionMatrix(): Mat4d {
        return this.camera_.ViewProjectionMatrix;
    }

    set IsMainCamera(v: boolean) {
        this.isMainCamera_ = v;
    }

    get IsMainCamera(): boolean {
        return this.isMainCamera_;
    }

    get Camera(): Camera { // 修正拼写错误：Camrea -> Camera
        return this.camera_;
    }

    // 新增：椭球实例访问器
    get Ellipsoid(): Ellipsoid {
        return this.ellipsoid_;
    }

    // 新增：更新椭球实例
    set Ellipsoid(ellipsoid: Ellipsoid) {
        this.ellipsoid_ = ellipsoid;
        this._state_.minDistance = ellipsoid.minimumRadius * 1.1;
        this._state_.maxDistance = ellipsoid.maximumRadius * 5;
        this._state_.radius = CesiumMath.clamp(this._state_.radius, this._state_.minDistance, this._state_.maxDistance);
    }
}

export { OrbitCameraComponent };