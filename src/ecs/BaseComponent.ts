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
    | `CartoTransformComponent`
    | `TransformComponent`
    ;

/**
 * @class BaseComponent
 */
abstract class BaseComponent {
    /**
     * @description
     */
    private static IDX: number = 0;

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

    protected entityUUID_?: string;

    /**
     * @description
     */
    constructor(componentTYPE: ComponentTYPE) {
        this.componentTYPE_ = componentTYPE;
        this.uuid_ = `${this.componentTYPE_}${BaseComponent.IDX++}`;
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