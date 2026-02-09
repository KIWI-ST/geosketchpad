/**
 * 
 */
type ComponentTYPE =
    `MeshComponent`
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

    abstract enable(b: boolean): void;
}

export {
    type ComponentTYPE,
    BaseComponent
}