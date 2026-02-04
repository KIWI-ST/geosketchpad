import type {
    Compiler,
    Context,
} from '@pipegpu/core';

import {
    type ViewProjectionSnippet,
    RenderComponent,
} from '@pipegpu/graph'

/**
 * @type DebugCameraSnippets
 */
type DebugCameraSnippets = {
    viewProjectionSnippet: ViewProjectionSnippet;
};

/**
 * @class DebugCameraComponent
 */
class DebugCameraComponent extends RenderComponent {
    /**
     * 
     */
    snippets: DebugCameraSnippets;

    /**
     * 
     * @param context 
     * @param compiler 
     * @param snippets 
     * 
     */
    constructor(
        context: Context,
        compiler: Compiler,
        snippets: DebugCameraSnippets
    ) {
        super(context, compiler);
        this.snippets = snippets;
        Object.entries(this.snippets).forEach(([_k, v]) => {
            this.append(v);
        });
    }

    override build(): string {
        let renderCode = super.build();
        renderCode += `

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
}

@vertex
fn vs_main(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput
{
    var f: VertexOutput;
    let view_projection = ${this.snippets.viewProjectionSnippet.getVariableName()};
    let position_ws = vec4<f32>(position.x, position.y, position.z, 1.0);
    f.position = view_projection.projection * view_projection.view * position_ws;
    f.normal = normal;
    return f;
}

@fragment
fn fs_main(f: VertexOutput) -> @location(0) vec4<f32>
{
    return vec4<f32>(f.normal, 1.0);
}
        
        `;

        return renderCode;
    }

}

export {
    type DebugCameraSnippets,
    DebugCameraComponent
}

