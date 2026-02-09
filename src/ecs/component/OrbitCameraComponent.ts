import { Camera, PerspectiveCamera } from '@pipegpu/camera';
import { BaseComponent } from '../BaseComponent';
import { type Mat4, type Vec3 } from 'wgpu-matrix';
import { DOMBus, type DOMBusContext } from '../../bus/DOMBus';
import type { Ellipsoid } from '@pipegpu/geography';

/**
 * @class OrbitCameraComponent
 * @description https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts
 */
class OrbitCameraComponent extends BaseComponent {
    /**
     * 
     */
    private _state_: {
        rotateFactor: number;
        zoomFactor: number;
        panFactor: number;
        smooth: number;
        minDistance: number;
        isMouseDown: boolean;
        lastMouseX: number;
        lastMouseY: number;
        isPanning: boolean;
    }

    /**
     * 
     */
    private enable_: boolean = false;

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
     * 
     */
    private ellipsoid_: Ellipsoid;

    /**
     * 
     */
    constructor(camera: Camera, ellipsoid: Ellipsoid) {
        super('OrbitCameraComponent');
        this.camera_ = camera;
        this.ellipsoid_ = ellipsoid;
    }

    private onZoom(c: DOMBusContext) {
        console.log(c);
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
        console.log(c);
    }

    /**
     * https://github.com/Orillusion/orillusion/blob/8887427f0a2e426a1cc75ef022c8649bcdd785b0/src/components/controller/OrbitController.ts
     * @param c 
     * @returns 
     */
    private onPointerMove(c: DOMBusContext) {
        if (!this._state_.isMouseDown || !this.enable_) {
            return;
        }
        let mousex = c.point[0];
        let mousey = c.point[1];

        // rotate
        // left mouse down, rotate scene.
        if (c.mouseStatus[0] && this._state_.lastMouseX > 0 && this._state_.lastMouseY > 0) {
            const ra = -(mousex - this._lastMouseX) * this.rotateFactor;
            const rb = (mousey - this._lastMouseY) * this.rotateFactor;
            this._spherical.theta += ra * Math.PI / 180;
            this._spherical.phi -= rb * Math.PI / 180;
            this._spherical.phi = clamp(this._spherical.phi, this.minPolarAngle, this.maxPolarAngle);
            this.updateCamera();
        }
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

    /**
     * 
     * @param b 
     */
    public enable(b: boolean): void {
        this.enable_ = b;
        if (b) {
            this.registerEventListener();
        } else {
            this.removeEventListener();
        }
    }

    get Position() {
        return this.camera_.Position;
    }

    get ProjectionMatrix(): Mat4 {
        return this.camera_.ProjectionMatrix;
    }

    get ViewMatrix(): Mat4 {
        return this.camera_.ViewMatrix;
    }

    get ViewProjectionMatrix(): Mat4 {
        return this.camera_.ViewProjectionMatrix;
    }

    set IsMainCamera(v: boolean) {
        this.isMainCamera_ = v;
    }

    get IsMainCamera(): boolean {
        return this.isMainCamera_;
    }
}

export {
    OrbitCameraComponent
}