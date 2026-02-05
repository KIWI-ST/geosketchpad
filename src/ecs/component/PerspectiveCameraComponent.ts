import { PerspectiveCamera } from '@pipegpu/camera';
import { BaseComponent } from '../BaseComponent';
import { vec3, type Mat4, type Vec3 } from 'wgpu-matrix';

/**
 * @class CameraComponent
 */
class CameraComponent extends BaseComponent {
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
    private camera_: PerspectiveCamera;

    /**
     * 
     */
    constructor(
        opts: {
            position: Vec3,
            aspect: number,
            near: number,
            far: number,
            fov: number,
            reversedZ: boolean
        }
    ) {
        super('PerspectiveCameraComponent');
        this.camera_ = new PerspectiveCamera(opts.fov, opts.aspect, opts.near, opts.far, opts.reversedZ);
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
    CameraComponent
}