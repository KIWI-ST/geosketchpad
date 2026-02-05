/**
 * 
 */
type ComponentTYPE =
    `MeshComponent`
    | `PerspectiveCameraComponent`
    | `MaterialComponent`
    | `LightComponent`
    | `ShadowComponet`
    | `ParticleComponent`
    | `EarthComponent`
    ;

/**
 * @class BaseComponent
 */
class BaseComponent {
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
}

export {
    type ComponentTYPE,
    BaseComponent
}