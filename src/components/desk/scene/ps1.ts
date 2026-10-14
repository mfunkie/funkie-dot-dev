import {
  GLSL3,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three'
import type {
  Camera,
  Material,
  MeshBasicMaterialParameters,
  MeshLambertMaterialParameters,
  WebGLRenderer,
} from 'three'

/**
 * PlayStation-era rendering:
 * - the scene renders at a low resolution and is upscaled with hard pixels
 * - vertices snap to that pixel grid, so geometry wobbles as the camera moves
 * - color is quantised to 15 bits with a 4x4 ordered dither
 */

/** Shared by every patched material; updated on resize. */
export const snapUniform = { value: new Vector2(160, 120) }

function patch<T extends Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = snapUniform
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform vec2 uSnap;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec2 snapped = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap;
        gl_Position.xy = snapped * gl_Position.w;`,
      )
  }
  material.customProgramCacheKey = () => 'ps1-snap'
  return material
}

export function lambert(params: MeshLambertMaterialParameters) {
  return patch(new MeshLambertMaterial(params))
}

export function unlit(params: MeshBasicMaterialParameters) {
  return patch(new MeshBasicMaterial(params))
}

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform float uExposure;
  uniform float uFade;
  in vec2 vUv;
  out vec4 outColor;

  const float bayer[16] = float[16](
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
  );

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec3 color = texture(tScene, vUv).rgb * uExposure;
    color = aces(color);
    color = pow(color, vec3(1.0 / 2.2));
    vec2 v = vUv - 0.5;
    color *= 1.0 - dot(v, v) * 0.55;
    color *= uFade;

    ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
    float threshold = bayer[p.y * 4 + p.x] / 16.0;
    color = floor(color * 31.0 + threshold) / 31.0;
    outColor = vec4(color, 1.0);
  }
`

const vertexShader = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export class Ps1Pipeline {
  private target: WebGLRenderTarget
  private quadScene = new Scene()
  private quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private material: ShaderMaterial

  constructor(private renderer: WebGLRenderer) {
    this.target = new WebGLRenderTarget(2, 2, { type: HalfFloatType })
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        tScene: { value: this.target.texture },
        uExposure: { value: 1.0 },
        uFade: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
    })
    this.quadScene.add(new Mesh(new PlaneGeometry(2, 2), this.material))
  }

  get exposure() {
    return this.material.uniforms.uExposure.value as number
  }

  set exposure(value: number) {
    this.material.uniforms.uExposure.value = value
  }

  set fade(value: number) {
    this.material.uniforms.uFade.value = value
  }

  setSize(width: number, height: number) {
    this.target.setSize(width, height)
    // Snap to half-pixels: a little more wobble than strictly accurate,
    // which is how people remember it.
    snapUniform.value.set(width / 3, height / 3)
  }

  render(scene: Scene, camera: Camera) {
    this.renderer.setRenderTarget(this.target)
    this.renderer.render(scene, camera)
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.quadScene, this.quadCamera)
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
  }
}
