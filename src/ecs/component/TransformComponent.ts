import { BaseComponent } from "../BaseComponent";

/**
 * @description 
 * @class TransformComponent
 */
class TransformComponent extends BaseComponent {
    /**
     * 
     */
    constructor() {
        super('TransformComponent');
    }

    /**
     * 
     * @param b 
     */
    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
    }
}

export {
    TransformComponent
}