/**
 * @description
 * @class BaseEntity
 */
class BaseEntity {
    /**
     * 
     */
    private static IDX: number = 0;

    /**
     * 
     */
    private uuid_: string;

    /**
     * 
     * @param idx 
     */
    constructor() {
        this.uuid_ = `_BaseEntity_${BaseEntity.IDX++}_`;
    }

    /**
     * 
     */
    get UUID(): string {
        return this.uuid_;
    }
}

export {
    BaseEntity
}