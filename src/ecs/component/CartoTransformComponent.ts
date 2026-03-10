import { type Ellipsoid, CartoPosition as CartoPosition } from "@pipegpu/geography";
import type { Vec3d } from "wgpu-matrix";
import { BaseComponent } from "../BaseComponent";

/**
 * @class CartoTransformComponent
 * @description
 */
class CartoTransformComponent extends BaseComponent {
    /**
     * @description
     */
    private ellipsoid_: Ellipsoid;

    /**
     * 
     */
    private positionCarto_: CartoPosition = new CartoPosition(0.0, 0.0, 0.0);

    /**
     * 
     * @param ellipsoid 
     */
    constructor(ellipsoid: Ellipsoid) {
        super('CartoTransformComponent');
        this.ellipsoid_ = ellipsoid;
    }

    /**
     * @description
     */
    public set PositionCarto(v: CartoPosition) {
        this.positionCarto_ = v;
    }

    /**
     * @description
     *  carto coordinate position.
     * @example
     *  (114.33°, 20.3°, 1000m)
     */
    public get PositionCarto() {
        return this.positionCarto_;
    }

    /**
     * @description
     *  get carto position in world space.
     * @example
     *  (1114m, 2123m, 566m)
     */
    public get PositionWS(): Vec3d {
        return this.ellipsoid_.cartoPosition2wsPostion(this.positionCarto_);
    }

    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
    }
}

export {
    CartoTransformComponent
}