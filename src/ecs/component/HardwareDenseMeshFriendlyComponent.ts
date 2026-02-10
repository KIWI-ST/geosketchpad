import type { HardwareDenseMeshFriendly } from "../../util/meshlet/spec";
import { BaseComponent } from "../BaseComponent";

/**
 * @class MeshComponent
 * @description
 */
class HardwareDenseMeshFriendlyComponent extends BaseComponent {
    /**
     * 
     */
    private hdmf_: HardwareDenseMeshFriendly;

    /**
     * 
     * @param uri 
     */
    constructor(hdmf: HardwareDenseMeshFriendly) {
        super('HardwareDenseMeshFriendlyComponent');
        this.hdmf_ = hdmf;
    }

    public override enable(b: boolean): void {
        throw new Error("Method not implemented.");
    }

    public get VertexLength() {
        return this.hdmf_.verticesLength();
    }

    public override update(): void {

    }
}

export {
    HardwareDenseMeshFriendlyComponent
}