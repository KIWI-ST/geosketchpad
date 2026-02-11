/**
 * 
 */
type ComponentTYPE =
    `HardwareDenseMeshFriendlyComponent`
    | `OrbitCameraComponent`
    | `MaterialComponent`
    | `LightComponent`
    | `ShadowComponet`
    | `ParticleComponent`
    | `EllipsoidComponent`
    ;

/**
 * @class BaseComponent
 */
abstract class BaseComponent {
    /**
     * 
     */
    protected readonly componentTYPE_: ComponentTYPE;

    /**
     * default 
     */
    protected enabled_: boolean = false;

    /**
     * 
     */
    constructor(componentTYPE: ComponentTYPE) {
        this.componentTYPE_ = componentTYPE;
    }

    /**
     * @description component type
     */
    get TYPE() {
        return this.componentTYPE_;
    }

    /**
     * @description is component enable.
     */
    get IsEnable() {
        return this.enabled_;
    }

    /**
     * @function enable
     * @param b 
     * @description component enable/disable.
     */
    abstract enable(b: boolean): Promise<void>;

    /**
     * @abstract
     * @function update
     * @description update component data.
     * support any args if need.
     */
    abstract update(...args: any[]): Promise<void>;
}

export {
    type ComponentTYPE,
    BaseComponent
}