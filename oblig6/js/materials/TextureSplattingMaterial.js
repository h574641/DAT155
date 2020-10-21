
import { ShaderMaterial, Color, ShaderLib, UniformsLib, UniformsUtils } from '../lib/three.module.js';

import ShaderCustomiser from './ShaderCustomiser.js';

export default class TextureSplattingMaterial extends ShaderMaterial {
    /**
     * Contructor for TextureSplattingMaterial.
     * 
     * @param {Array<Texture>} textures
     * @param {Array<Texture>} splatMaps For blending between the textures. One less than textures.
     */
    constructor({
        color = 0xffffff,
        emissive = 0x000000,
        specular = 0x111111,
        shininess = 30,
        textures = null,
        splatMaps = null,
        map = null
    }) {

        const uniforms = UniformsUtils.merge([
            // pass in the defaults from uniforms lib.
            UniformsLib.common,
            UniformsLib.specularmap,
            UniformsLib.envmap,
            UniformsLib.aomap,
            UniformsLib.lightmap,
            UniformsLib.emissivemap,
            UniformsLib.bumpmap,
            UniformsLib.normalmap,
            UniformsLib.displacementmap,
            UniformsLib.gradientmap,
            UniformsLib.fog,
            UniformsLib.lights,
            {
                diffuse: { value: new Color(color) },
                emissive: { value: new Color(emissive) },
                specular: { value: new Color(specular) },
                shininess: { value: shininess }
            }
        ]);

        const defines = {};

        if (map !== null) {
            uniforms.map = {
                type: "t",
                value: map
            };

            defines.USE_MAP = '';
        }

        if (textures !== null && splatMaps !== null) {

            uniforms.textures = {
                type: "tv",
                value: textures
            };

            uniforms.splatMaps = {
                type: "tv",
                value: splatMaps
            }

            uniforms.textureUvTransforms = {
                type: "Matrix3fv",
                value: textures.map((texture) => {

                    texture.matrix.setUvTransform(
                        texture.offset.x,
                        texture.offset.y,
                        texture.repeat.x,
                        texture.repeat.y,
                        texture.rotation,
                        texture.center.x,
                        texture.center.y
                    );

                    return texture.matrix;
                })
            }

            defines.USE_SPLATMAP = '';

        }

        // antallet teksturer som skal legges på terrenget.
        const length = (textures !== null) ? textures.length : 0;


        /** START Custom shader code: */

        const uv_pars_vertex_custom = `
#if defined( USE_SPLATMAP ) || defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
    out vec2 vUv;
    uniform mat3 uvTransform;
#endif
// custom:
#ifdef USE_SPLATMAP
    uniform mat3 textureUvTransforms[${length}]; // repeat vector for each texture.
    out vec2 textureUVs[${length}]; // pass to fragment shader.
#endif
`;

        const uv_vertex_custom = `
#if defined( USE_SPLATMAP ) || defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
#endif
// custom:
#ifdef USE_SPLATMAP
    for (int i = 0; i < ${length}; i++) {
        textureUVs[i] = (textureUvTransforms[i] * vec3(uv, 1)).xy;
    }
#endif
`;

        const uv_pars_fragment_custom = `// added splatmap as condition to declare vUv
#if defined( USE_SPLATMAP ) || defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
    in vec2 vUv;
#endif

#ifdef USE_SPLATMAP
    uniform sampler2D textures[${length}];
    uniform sampler2D splatMaps[${length - 1}]; // one less splatmap than textures.
    in vec2 textureUVs[${length}]; // computed in vertexshader
#endif
`;

        const splatmap_blending_code = (i, length) => {
            if (i < length) {
                return `mix(texture2D(textures[${i}], textureUVs[${i}]), ${splatmap_blending_code(i + 1, length)}, texture2D(splatMaps[${i}], vUv).r)`
            } else {
                return `texture2D(textures[${i}], textureUVs[${i}])`;
            }
        };

        const splatmap_code = `
#ifdef USE_SPLATMAP
    float splatSum = ${Array(length - 1).fill().map((_, i) => `texture2D(splatMaps[${i}], vUv).r`).join(' + ')};
    vec4 accumulated = ${splatmap_blending_code(0, length - 1)};
    
    diffuseColor *= accumulated;
#endif
`;

        /** END*/

        // generate customised shaders. i. e. replace or append code to an existing shader program.

        const vertexShader = ShaderCustomiser.customise(ShaderLib.phong.vertexShader, {
            uv_pars_vertex: uv_pars_vertex_custom,
            uv_vertex: uv_vertex_custom
        });

        const fragmentShader = ShaderCustomiser.customise(ShaderLib.phong.fragmentShader, {
            uv_pars_fragment: uv_pars_fragment_custom,
            logdepthbuf_fragment: {
                text: splatmap_code,
                prepend: true
            }
        });

        super({
            vertexShader,
            fragmentShader,
            uniforms,
            defines,
            fog: true, // enable fog for this material
            lights: true // enable lights for this material
        });
    }
}