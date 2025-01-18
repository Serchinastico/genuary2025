import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.fs";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { HAND_CONNECTIONS, Hands, Landmark, Results } from "@mediapipe/hands";
import { clamp } from "@/common/math";

const CONFIG = {
  WIDTH: 512,
  HEIGHT: 512,
};

const RIGHT_HAND = 0;
const LEFT_HAND = 1;
const THUMB = 4;
const INDEX = 8;
const MIDDLE = 12;

const SMOOTHING_WINDOW_SIZE = 5;
const MAX_DISTANCE = 0.15;
const rotations: number[] = [0];
const thumbToIndexDistances: number[] = [1];
const thumbToMiddleDistances: number[] = [1];

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

      u_thumbToIndexDistance: { value: 0 },
      u_thumbToMiddleDistance: { value: 0 },
      u_handRotation: { value: 0 },
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
  const camera = new THREE.PerspectiveCamera(40, CONFIG.WIDTH / CONFIG.HEIGHT, 0.1, 10000);
  camera.position.z = 5;
  return camera;
};

const distance = (landmark1: Landmark, landmark2: Landmark) => {
  const vector = {
    x: landmark1.x - landmark2.x,
    y: landmark1.y - landmark2.y,
    z: landmark1.z - landmark2.z,
  };

  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
};

const distanceAverage = (distances: number[]) => {
  const average = distances.reduce((a, b) => a + b) / distances.length;

  return clamp(average, 0, MAX_DISTANCE) / MAX_DISTANCE;
};

const handGestureHandler = async (simulation: Simulation) => {
  function onResults(results: Results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandWorldLandmarks && results.multiHandWorldLandmarks[LEFT_HAND]) {
      const leftThumbLandmark = results.multiHandWorldLandmarks[LEFT_HAND][THUMB];
      const leftMiddleLandmark = results.multiHandWorldLandmarks[LEFT_HAND][MIDDLE];

      const vector = { x: leftThumbLandmark.x - leftMiddleLandmark.x, y: leftThumbLandmark.y - leftMiddleLandmark.y };

      const newAngle = Math.atan2(vector.y, vector.x) * (180 / Math.PI);
      rotations.push(newAngle);
      if (rotations.length > SMOOTHING_WINDOW_SIZE) {
        rotations.shift();
      }
      const angle = rotations.reduce((a, b) => a + b) / rotations.length;
      simulation.material.uniforms.u_handRotation.value = angle;
    }

    if (results.multiHandWorldLandmarks && results.multiHandWorldLandmarks[RIGHT_HAND]) {
      const rightThumbLandmark = results.multiHandWorldLandmarks[RIGHT_HAND][THUMB];
      const rightIndexLandmark = results.multiHandWorldLandmarks[RIGHT_HAND][INDEX];
      const rightMiddleLandmark = results.multiHandWorldLandmarks[RIGHT_HAND][MIDDLE];

      const newThumbToIndexDistance = distance(rightThumbLandmark, rightIndexLandmark);
      const newThumbToMiddleDistance = distance(rightThumbLandmark, rightMiddleLandmark);

      thumbToIndexDistances.push(newThumbToIndexDistance);
      if (thumbToIndexDistances.length > SMOOTHING_WINDOW_SIZE) {
        thumbToIndexDistances.shift();
      }

      thumbToMiddleDistances.push(newThumbToMiddleDistance);
      if (thumbToMiddleDistances.length > SMOOTHING_WINDOW_SIZE) {
        thumbToMiddleDistances.shift();
      }

      simulation.material.uniforms.u_thumbToIndexDistance.value = distanceAverage(thumbToIndexDistances);
      simulation.material.uniforms.u_thumbToMiddleDistance.value = distanceAverage(thumbToMiddleDistances);
    }

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#2DA04A", lineWidth: 1 });
        drawLandmarks(canvasCtx, landmarks, { color: "#A32D50", radius: 2 });
      }
    }
    canvasCtx.restore();
  }

  const button = document.getElementById("webcam-button") as HTMLButtonElement;
  const video = document.getElementById("webcam") as HTMLVideoElement;
  const canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
  const canvasCtx = canvasElement.getContext("2d");

  button.addEventListener("click", () => {
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onResults);

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 256,
      height: 144,
    });
    camera.start();
  });
};

async function main() {
  if (document.title !== "Genuary 11") {
    return;
  }

  const simulation = createSimulation();

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(CONFIG.WIDTH, CONFIG.HEIGHT);
  document.body.appendChild(renderer.domElement);

  const backgroundColor = new THREE.Color(0x3399ee);
  renderer.setClearColor(backgroundColor, 1);

  const controls = new OrbitControls(simulation.camera, renderer.domElement);
  controls.enableDamping = true;

  let frame = 0;
  let cameraForwardPos = new THREE.Vector3(0, 0, -1);
  const VECTOR3ZERO = new THREE.Vector3(0, 0, 0);

  await handGestureHandler(simulation);

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
