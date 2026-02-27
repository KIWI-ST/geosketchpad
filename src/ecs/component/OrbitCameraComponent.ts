import { Camera } from '@pipegpu/camera';
import { mat4d, vec3d, type Mat4d, type Vec3d } from 'wgpu-matrix';

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
        positionCRT: Vec3d;              // position in current.
        target: Vec3d;
        rotateFactor: number;
        zoomFactor: number;
        panFactor: number;
        smooth: number;
        minDistance: number;
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
     * 
     */
    private isMainCamera_: boolean = false;

    /**
     * 
     */
    private enableRTE_: boolean = false;

    /**
     * camrea position in world space.
     * e.g 
     * (100, 200, 300);
     * WARNING: other 
     */
    private camera_: Camera;

    /**
     * 
     */
    constructor(camera: Camera) {
        super('OrbitCameraComponent');
        this.camera_ = camera;
        this._state_ = {
            autoRotate: false,
            autoRotateSpeed: 0.1,
            position: vec3d.clone(this.camera_.Position),
            positionCRT: vec3d.clone(this.camera_.Position),
            target: this.camera_.Target,
            rotateFactor: 0,
            zoomFactor: 0,
            panFactor: 0,
            smooth: 5.0,
            minDistance: 0,
            isMouseDown: false,
            lastMouseX: 0,
            lastMouseY: 0,
            isPanning: false,
            theta: 0,
            phi: 0,
            radius: 0,
            sphericalPostion: vec3d.clone(this.camera_.Position),
        };
    }

    /**
     * 
     * @param b 
     */
    public enableRTE(b: boolean): void {
        this.enableRTE_ = b;
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
    public override async update(): Promise<void> {
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
        }
        // auto rotate
        else if (!this._state_.isMouseDown && this._state_.autoRotate) {
            this._state_.theta -= this._state_.autoRotateSpeed * Math.PI / 180;
            this.RefreshCamera();
        }
        // learp camrea postion
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
        //
        this.camera_.Position = this._state_.positionCRT;
        this.camera_.Target = this._state_.target;
    }

    /**
     * 
     */
    private RefreshCamera() {
        /**
         * 
         * @param {number} phi  latitude
         * @param {number} theta longitude 
         * @param radius 
         * @returns 
         */
        const PostionInSphere = (phi: number, theta: number, radius: number): Vec3d => {
            const sinPhiRadius = Math.sin(phi) * radius;
            const x = sinPhiRadius * Math.sin(theta);
            const y = Math.cos(phi) * radius;
            const z = sinPhiRadius * Math.cos(theta);
            return vec3d.create(x, y, z);
        };
        let postion_ws = PostionInSphere(this._state_.phi, this._state_.theta, this._state_.radius);
        this._state_.position = vec3d.create(
            postion_ws[0] + this._state_.target[0],
            postion_ws[1] + this._state_.target[1],
            postion_ws[2] + this._state_.target[2]
        );
    }

    /**
     * @description refresh
     *  https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts#L209
     * @param c 
     */
    private onZoom(c: DOMBusContext) {
        // c.delta = clamp(c.delta, -this.ellipsoid_.MaximumRadius, this.ellipsoid_.MaximumRadius);
        // this._state_.radius += c.delta * this._state_.zoomFactor;
        // this._state_.radius = clamp(this._state_.radius, -this.ellipsoid_.MaximumRadius, this.ellipsoid_.MaximumRadius);
        this.RefreshCamera();
    }

    private onPointerDown(c: DOMBusContext) {
        this._state_.isMouseDown = c.isMouseDown;
        this._state_.lastMouseX = c.lastPoint[0];
        this._state_.lastMouseY = c.lastPoint[1];
        if (c.mouseStatus[2]) {
            this._state_.isPanning = true;
        }
    }

    private onPointerUp(c: DOMBusContext) {
        this._state_.isMouseDown = c.isMouseDown;
        if (c.mouseStatus[2]) {
            this._state_.isPanning = false;
        }
    }

    /**
     * https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts
     * @param c 
     * @returns 
     */
    private onPointerMove(c: DOMBusContext) {
        //
        if (!this._state_.isMouseDown || !this.enabled_) {
            return;
        }

        let mousex = c.point[0];
        let mousey = c.point[1];

        // rotate
        // left mouse down, rotate scene.
        if (c.mouseStatus[0] && this._state_.lastMouseX > 0 && this._state_.lastMouseY > 0) {
            const ra = -(mousex - this._state_.lastMouseX) * this._state_.rotateFactor;
            const rb = (mousey - this._state_.lastMouseY) * this._state_.rotateFactor;
            console.log(`${ra} - ${rb}`);
            this._state_.theta += ra * Math.PI / 180;
            this._state_.phi -= rb * Math.PI / 180;
            this.RefreshCamera();
        }
        // pan
        // right mouse down, pan scene.
        else if (c.mouseStatus[2]) {

        }

        //
        this._state_.lastMouseX = mousex;
        this._state_.lastMouseY = mousey;
    }

    /**
     * 
     */
    private registerEventListener() {
        DOMBus.Handler.on('POINTER_ZOOM', this.onZoom, this);
        DOMBus.Handler.on('POINTER_DOWN', this.onPointerDown, this);
        DOMBus.Handler.on('POINTER_MOVE', this.onPointerMove, this);
        DOMBus.Handler.on('POINTER_UP', this.onPointerUp, this);
    }

    /**
     * 
     */
    private removeEventListener() {
        DOMBus.Handler.off('POINTER_ZOOM', this.onZoom, this);
        DOMBus.Handler.off('POINTER_DOWN', this.onPointerDown, this);
        DOMBus.Handler.off('POINTER_MOVE', this.onPointerMove, this);
        DOMBus.Handler.off('POINTER_UP', this.onPointerUp, this);
    }

    get Position() {
        return this.camera_.Position;
    }

    get ProjectionMatrix(): Mat4d {
        return this.camera_.ProjectionMatrix;
    }

    get ViewMatrix(): Mat4d {
        const matrix: Mat4d = mat4d.clone(this.camera_.ViewMatrix);
        if (this.enableRTE_) {
            matrix[12] = 0;
            matrix[13] = 0;
            matrix[14] = 0;
            return matrix;
        } else {
            return this.camera_.ViewMatrix;
        }
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