/**
 * @description
 */
type ComponentTYPE =
    | `HardwareDenseMeshFriendlyComponent`
    | `OrbitCameraComponent`
    | `MaterialComponent`
    | `LightComponent`
    | `ShadowComponet`
    | `ParticleComponent`
    | `EllipsoidComponent`
    | `CartoTransformComponent`
    | `TransformComponent`
    ;

/**
 * @description
 */
let globalComponentIndex: number = 0;

/**
 * @class BaseComponent
 */
abstract class BaseComponent {
    /**
     * @description
     */
    protected readonly componentTYPE_: ComponentTYPE;

    /**
     * @description 
     */
    protected enabled_: boolean = false;

    /**
     * @description 
     * uuid of component, assign in runtime.
     */
    protected uuid_: string;

    /**
     * @description
     *  bindings entity unique id.
     */
    protected entityUUID_?: string;

    /**
     * @description
     */
    constructor(componentTYPE: ComponentTYPE) {
        this.componentTYPE_ = componentTYPE;
        this.uuid_ = `_${this.componentTYPE_}_${globalComponentIndex++}_`;
    }

    set EntityUUID(v: string) {
        this.entityUUID_ = v;
    }

    get EntityUUID(): string | undefined {
        return this.entityUUID_;
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
     * @description uuid of component.
     */
    get UUID() {
        return this.uuid_;
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
    // abstract update(...args: any[]): Promise<void>;
}

export {
    type ComponentTYPE,
    BaseComponent
}