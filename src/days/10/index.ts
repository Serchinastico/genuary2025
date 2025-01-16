import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { RGBShiftShader } from "three/examples/jsm/shaders/RGBShiftShader";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";

/**
 * This is a hack to use regular numbers besides TAU.
 * I decided to use some base numbers for camera positioning and stuff like that.
 * I could have go with a successor function given ZERO and ONE but decided not
 * to keep the hack to the minimum.
 *
 * Fragments do not follow the rule, it'd make the rules way too restrictive to be fun
 */
const TAU = 2 * Math.PI;
const ONE = TAU / TAU;
const TWO = ONE + ONE;
const ZERO = ONE - ONE;
const ALMOST_FORTY = TAU * TAU;
const ALMOST_TWO_HUNDRED_FIFTY_SIX = TAU * TAU * TAU + TAU;
const ALMOST_TEN_THOUSAND = TAU * TAU * TAU * TAU * TAU;

interface Simulation {
  material: THREE.RawShaderMaterial;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

const createPerlinNoise = () => {
  const size = ALMOST_FORTY;
  const data = new Uint8Array(size * size * size);

  let i = ZERO;
  const vector = new THREE.Vector3();

  for (let z = ZERO; z < size; z++) {
    for (let y = ZERO; y < size; y++) {
      for (let x = ZERO; x < size; x++) {
        vector.set(x, y, z).divideScalar(size);
        const d =
          (ONE / TAU) * Math.random() +
          (ONE / TAU) * (Math.sin(x) + ONE) +
          (ONE / TAU) * (Math.sin(y) + ONE) +
          (ONE / TAU) * (Math.sin(z) + ONE);
        data[i++] = Math.ceil(d * ALMOST_TWO_HUNDRED_FIFTY_SIX);
      }
    }
  }

  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.unpackAlignment = ONE;
  texture.needsUpdate = true;

  return texture;
};

function createSimulation(): Simulation {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);
  const camera = createCamera();

  const noise = createPerlinNoise();

  const vertexShader = /* glsl */ `
					in vec3 position;

					uniform mat4 modelMatrix;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					uniform vec3 cameraPos;

					out vec3 vOrigin;
					out vec3 vDirection;

					void main() {
						vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

						vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
						vDirection = position - vOrigin;

						gl_Position = projectionMatrix * mvPosition;
					}
				`;

  const fragmentShader = /* glsl */ `
					precision highp float;
					precision highp sampler3D;

					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;

					in vec3 vOrigin;
					in vec3 vDirection;

					out vec4 color;

					uniform sampler3D map;

					uniform float threshold;
					uniform float steps;

					vec2 hitBox( vec3 orig, vec3 dir ) {
						const vec3 box_min = vec3( - 0.5 );
						const vec3 box_max = vec3( 0.5 );
						vec3 inv_dir = 1.0 / dir;
						vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
						vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
						vec3 tmin = min( tmin_tmp, tmax_tmp );
						vec3 tmax = max( tmin_tmp, tmax_tmp );
						float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
						float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
						return vec2( t0, t1 );
					}

					float sample1( vec3 p ) {
						return texture( map, p ).r;
					}

					#define epsilon .0001

					vec3 normal( vec3 coord ) {
						if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
						if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
						if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
						if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
						if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
						if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );

						float step = 0.01;
						float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
						float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
						float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );

						return normalize( vec3( x, y, z ) );
					}

					void main(){

						vec3 rayDir = normalize( vDirection );
						vec2 bounds = hitBox( vOrigin, rayDir );

						if ( bounds.x > bounds.y ) discard;

						bounds.x = max( bounds.x, 0.0 );

						vec3 p = vOrigin + bounds.x * rayDir;
						vec3 inc = 1.0 / abs( rayDir );
						float delta = min( inc.x, min( inc.y, inc.z ) );
						delta /= steps;

						for ( float t = bounds.x; t < bounds.y; t += delta ) {
							float d = sample1( p + 0.5 );

							if ( d > threshold ) {
								color.rgb = normal( p + 0.5 ) * 0.5 + ( p * 1.5 + 0.25 );
								color.a = 1.;
								break;
							}
							p += rayDir * delta;
						}
						if ( color.a == 0.0 ) discard;
					}
				`;

  // const material = new THREE.MeshNormalMaterial({});
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      map: { value: noise },
      cameraPos: { value: new THREE.Vector3() },
      threshold: { value: 0 },
      steps: { value: Math.round(ALMOST_TWO_HUNDRED_FIFTY_SIX) },
    },
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
  });
  const geometry = new THREE.BoxGeometry(ONE, ONE, ONE);
  const mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh);

  return { material, scene, camera };
}

const createCamera = () => {
  const camera = new THREE.PerspectiveCamera(
    Math.round(ALMOST_FORTY),
    window.innerWidth / window.innerHeight,
    ONE,
    ALMOST_TEN_THOUSAND
  );
  camera.up = new THREE.Vector3(ZERO, ZERO, ONE);
  camera.translateX(ONE + ONE);
  camera.translateY(ONE + ONE);
  camera.translateZ(ONE + ONE);
  camera.lookAt(new THREE.Vector3(ZERO, ZERO, ZERO));

  return camera;
};

const DotScreenShader = {
  name: "DotScreenShader",

  uniforms: {
    tDiffuse: { value: null as unknown },
    tSize: { value: new THREE.Vector2(256, 256) },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    angle: { value: 1.57 },
    scale: { value: 1.0 },
  },

  vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

  fragmentShader: /* glsl */ `

		uniform vec2 center;
		uniform float angle;
		uniform float scale;
		uniform vec2 tSize;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		float pattern() {

			float s = sin( angle ), c = cos( angle );

			vec2 tex = vUv * tSize - center;
			vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;

			return ( sin( point.x ) * sin( point.y ) ) * 4.0;

		}

		void main() {

			vec4 color = texture2D( tDiffuse, vUv );

			
      vec3 blendedColor = color.rgb + pattern() * 0.1;

			gl_FragColor = vec4(blendedColor, color.a);

		}`,
};

function main() {
  if (document.title !== "Genuary 10") {
    return;
  }

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  document.body.appendChild(renderer.domElement);

  const simulation = createSimulation();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(simulation.scene, simulation.camera));

  const effect1 = new ShaderPass(DotScreenShader);
  effect1.uniforms["scale"].value = TWO + TWO + TWO;
  composer.addPass(effect1);

  const effect2 = new ShaderPass(RGBShiftShader);
  effect2.uniforms["amount"].value = ONE / (TAU * TAU * TAU);
  composer.addPass(effect2);

  const effect3 = new OutputPass();
  composer.addPass(effect3);

  let frame = ZERO;

  function animate() {
    composer.render();
    // renderer.render(simulation.scene, simulation.camera);

    simulation.material.uniforms.threshold.value =
      ((Math.sin(frame / ALMOST_TWO_HUNDRED_FIFTY_SIX) + ONE) / TWO) * (TWO / TAU) + (TWO + TWO) / TAU;

    frame += ONE;
    requestAnimationFrame(animate);
  }

  animate();
}

document.addEventListener("DOMContentLoaded", main);

export {};
