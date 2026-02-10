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
    | `EarthComponent`
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
     * @function enable
     * @param b 
     * @description component enable/disable.
     */
    abstract enable(b: boolean): void;

    /**
     * @abstract
     * @function update
     * @description update component data.
     */
    abstract update(): void;
}

export {
    type ComponentTYPE,
    BaseComponent
}