import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.fs";

interface Simulation {
  material: THREE.ShaderMaterial;
  uvPlane: THREE.Mesh;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

function createSimulation(): Simulation {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);
  const camera = createCamera();

  // Light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  // UV plane
  const geometry = new THREE.PlaneGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_eps: { value: 0.001 },
      u_maxDis: { value: 1000 },
      u_maxSteps: { value: 100 },

      u_clearColor: { value: new THREE.Color(0x1d2d1d) },

      u_camPos: { value: camera.position },
      u_camToWorldMat: { value: camera.matrixWorld },
      u_camInvProjMat: { value: camera.projectionMatrixInverse },

      u_lightDir: { value: light.position },
      u_lightColor: { value: light.color },

      u_diffIntensity: { value: 0.5 },
      u_specIntensity: { value: 3 },
      u_ambientIntensity: { value: 0.15 },
      u_shininess: { value: 16 },

      u_time: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
  const uvPlane = new THREE.Mesh(geometry, material);

  const nearPlaneWidth = camera.near * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 2;
  const nearPlaneHeight = nearPlaneWidth / camera.aspect;
  uvPlane.scale.set(nearPlaneWidth, nearPlaneHeight, 1);

  scene.add(uvPlane);

  return { material, uvPlane, scene, camera };
}

const createCamera = () => {
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.z = 5;
  return camera;
};

function main() {
  if (document.title !== "Genuary 11") {
    return;
  }

  const simulation = createSimulation();

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const backgroundColor = new THREE.Color(0x3399ee);
  renderer.setClearColor(backgroundColor, 1);

  const controls = new OrbitControls(simulation.camera, renderer.domElement);
  controls.maxDistance = 10;
  controls.minDistance = 2;
  controls.enableDamping = true;

  let frame = 0;
  let cameraForwardPos = new THREE.Vector3(0, 0, -1);
  const VECTOR3ZERO = new THREE.Vector3(0, 0, 0);

  function animate() {
    cameraForwardPos = simulation.camera.position
      .clone()
      .add(simulation.camera.getWorldDirection(VECTOR3ZERO).multiplyScalar(simulation.camera.near));
    simulation.uvPlane.position.copy(cameraForwardPos);
    simulation.uvPlane.rotation.copy(simulation.camera.rotation);

    renderer.render(simulation.scene, simulation.camera);

    simulation.material.uniforms.u_time.value = frame / 1000;
    controls.update();

    frame += 1;
    requestAnimationFrame(animate);
  }

  animate();
}

document.addEventListener("DOMContentLoaded", main);

export {};
