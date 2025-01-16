import * as THREE from "three";
import vertexShader from "./shaders/vertex.glsl";
import gameOfLifeShader from "./shaders/gameOfLife.fs";
import colorsShader from "./shaders/colors.fs";

// b61/s64
const BORN_OVERRIDE: number | null = 113;
const SURVIVE_OVERRIDE: number | null = 85;

interface Simulation {
  renderTargetA: THREE.WebGLRenderTarget<THREE.Texture>;
  renderTargetB: THREE.WebGLRenderTarget<THREE.Texture>;
  simMaterial: THREE.ShaderMaterial;
  renderMaterial: THREE.ShaderMaterial;
  simMesh: THREE.Mesh;
  renderMesh: THREE.Mesh;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

interface SimulationProps {
  width: number;
  height: number;
  worldTexture: THREE.DataTexture;
  weightsTexture: THREE.DataTexture;
}

function createWeightTexture() {
  const rows = 5,
    columns = 5,
    diagonalWeights = 5 + 4 + 3 + 2 + 1;

  const size = rows * columns;
  const data = new Uint8Array(4 * size);

  /**
   * We want to add weights to the corners, and we want the weights to add 1
   * We count by diagonals, for a 5x5 square, we want to count 5 diagonals
   * with weights 5, 4, 3, 2, 1. To get the weight of a single coordinate, we
   * first get its weight and then divide it by the number of squares in
   * the same diagonal.
   */

  for (let i = 0; i < size; i++) {
    const stride = i * 4;
    const column = i % columns,
      row = Math.floor(i / columns);

    /**
     * Bottom-left corner if we are counting from the bottom-left
     */
    let redWeight: number;
    if (column + row === 0) {
      redWeight = 5 / diagonalWeights;
    } else if (column + row === 1) {
      redWeight = 4 / diagonalWeights / 2;
    } else if (column + row === 2) {
      redWeight = 3 / diagonalWeights / 3;
    } else if (column + row === 3) {
      redWeight = 2 / diagonalWeights / 4;
    } else if (column + row === 4) {
      redWeight = 1 / diagonalWeights / 5;
    }

    data[stride] = redWeight * 255;
    data[stride + 1] = redWeight * 255;
    data[stride + 2] = redWeight * 255;
    data[stride + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, columns, rows, THREE.RGBAFormat);
  texture.needsUpdate = true;

  return texture;
}

function createSimulation({ width, height, worldTexture, weightsTexture }: SimulationProps): Simulation {
  const scene = new THREE.Scene();
  const camera = createCamera(width, height);
  const renderTargetA = createRenderTarget(width, height);
  const renderTargetB = createRenderTarget(width, height);

  const worldTextureScale = new THREE.Vector2(width, height);

  const steps = [Math.random(), Math.random(), Math.random(), Math.random()];
  steps.sort();

  /**
   * We use born as a mask for survive because if a bit is already set for born
   * then we won't count it for survive (as the born predicate comes before the
   * survival one).
   *
   * The operation ~A & B is a reverse mask. It basically sets to 0 every bit
   * where A is 1 and sets it to whatever there is in B when A is 0
   */
  const born = Math.round(Math.random() * 256);
  const survive = ~born & Math.round(Math.random() * 256);

  const simMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: gameOfLifeShader,
    uniforms: {
      uState: { value: worldTexture },
      uScale: { value: worldTextureScale },
      uSteps: {
        value: new THREE.Vector4(steps[0], steps[1], steps[2], steps[3]),
      },
      uSeed: { value: Math.random() },
      uBornRnd: { value: BORN_OVERRIDE ?? born },
      uSurviveRnd: { value: SURVIVE_OVERRIDE ?? survive },
      uWeights: { value: weightsTexture },
    },
  });

  const renderMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: colorsShader,
    uniforms: {
      uState: { value: worldTexture },
      uScale: { value: worldTextureScale },
      uSteps: {
        value: new THREE.Vector4(steps[0], steps[1], steps[2], steps[3]),
      },
      uSeed: { value: Math.random() },
      uBornRnd: { value: BORN_OVERRIDE ?? born },
      uSurviveRnd: { value: SURVIVE_OVERRIDE ?? survive },
      uWeights: { value: weightsTexture },
      uFrame: { value: 0 },
    },
  });

  const simGeometry = createPlaneGeometry(width, height);
  const renderGeometry = createPlaneGeometry(width, height);

  const simPlane = new THREE.Mesh(simGeometry, simMaterial);
  const renderPlane = new THREE.Mesh(renderGeometry, renderMaterial);

  scene.add(simPlane);
  scene.add(renderPlane);

  return {
    renderTargetA,
    renderTargetB,
    simMaterial,
    renderMaterial,
    simMesh: simPlane,
    renderMesh: renderPlane,
    scene,
    camera,
  };
}

function createCamera(width: number, height: number) {
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000);
  camera.position.z = 1;
  return camera;
}

function createWorldTexture(width: number, height: number) {
  const size = width * height;
  const data = new Uint8Array(4 * size);

  for (let i = 0; i < size; i++) {
    const stride = i * 4;
    const rgb = Math.random() < 0.5 ? 255 : 0;

    data[stride] = rgb;
    data[stride + 1] = rgb;
    data[stride + 2] = rgb;
    data[stride + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  return texture;
}

function createPlaneGeometry(width: number, height: number) {
  return new THREE.PlaneGeometry(width, height);
}

function createRenderTarget(width: number, height: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    stencilBuffer: false,
    depthBuffer: false,
  });
}

function main() {
  if (document.title !== "Genuary 08") {
    return;
  }
  
  const width = 1000,
    height = 1000;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  const worldTexture = createWorldTexture(width, height);
  const weightsTexture = createWeightTexture();
  const simulation = createSimulation({ width, height, worldTexture, weightsTexture });

  function animate() {
    // Update game of life by (ab)using WebGL
    simulation.simMesh.visible = true;
    simulation.renderMesh.visible = false;
    renderer.setRenderTarget(simulation.renderTargetA);
    renderer.render(simulation.scene, simulation.camera);

    // Render the game of life on screen
    simulation.simMesh.visible = false;
    simulation.renderMesh.visible = true;
    renderer.setRenderTarget(null);
    renderer.render(simulation.scene, simulation.camera);

    // Ping pong frame buffers
    [simulation.renderTargetA, simulation.renderTargetB] = [simulation.renderTargetB, simulation.renderTargetA];

    simulation.simMaterial.uniforms.uState.value = simulation.renderTargetB.texture;
    simulation.renderMaterial.uniforms.uState.value = simulation.renderTargetB.texture;
    simulation.renderMaterial.uniforms.uFrame.value += 1;

    setTimeout(() => requestAnimationFrame(animate), 0);
  }

  animate();
}

document.addEventListener("DOMContentLoaded", main);

export {};
