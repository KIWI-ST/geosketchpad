/**
 * @description
 */
type EntityTYPE =
    | `Entity`
    ;

let globalEntityIndex: number = 0;

/**
 * @description
 * @class BaseEntity
 */
class BaseEntity {
    /**
     * @description
     */
    private uuid_: string;

    /**
     * @description
     */
    protected entityTYPE_: EntityTYPE;

    /**
     * 
     * @param idx 
     */
    constructor(entityTYPE: EntityTYPE) {
        this.entityTYPE_ = entityTYPE;
        this.uuid_ = `_BaseEntity_${globalEntityIndex++}_`;
    }

    /**
     * @description
     */
    get TYPE(): EntityTYPE {
        return this.entityTYPE_;
    }

    /**
     * @description
     */
    get UUID(): string {
        return this.uuid_;
    }
}

export {
    BaseEntity
}