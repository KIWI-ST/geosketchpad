/**
 * @class BaseEntity
 */
class BaseEntity {
    /**
     * 
     */
    private uuid_: string;

    /**
     * 
     * @param idx 
     */
    constructor(uuid: string) {
        this.uuid_ = uuid;
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