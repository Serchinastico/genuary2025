import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.fs";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { HAND_CONNECTIONS, Hands, Landmark, Results } from "@mediapipe/hands";
import { clamp } from "@/common/math";

const CONFIG = {
  WIDTH: 768,
  HEIGHT: 768,
};

const DISTANCE_FACTOR = 0.5;

const THUMB = 4;
const INDEX = 8;
const MIDDLE = 12;
const RING = 16;
const PINKY = 20;

const ROTATION_FRICTION = 0.9;
const ROTATION_WINDOW_SIZE = 5;
const ROTATION_OPENNESS_THRESHOLD = 0.45;

const SMOOTHING_WINDOW_SIZE = 5;
const MAX_DISTANCE = 0.15;
const lhRotations: number[] = [0];
let lhCurrentRotation = 0;
let lhRotationSpeed = 0;
const rhRotations: number[] = [0];
let rhCurrentRotation = 0;
let rhRotationSpeed = 0;
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

      u_clearColor: { value: new THREE.Color(0xff0000) },

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
      u_rightHandRotation: { value: 0 },
      u_leftHandRotation: { value: 0 },
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

    results.multiHandedness.forEach((hand, index) => {
      const thumbLandmark = results.multiHandWorldLandmarks[index][THUMB];
      const indexLandmark = results.multiHandWorldLandmarks[index][INDEX];
      const middleLandmark = results.multiHandWorldLandmarks[index][MIDDLE];
      const ringLandmark = results.multiHandWorldLandmarks[index][RING];
      const pinkyLandmark = results.multiHandWorldLandmarks[index][PINKY];

      if (hand.label === "Right") {
        const newThumbToIndexDistance = distance(thumbLandmark, indexLandmark);

        thumbToIndexDistances.push(newThumbToIndexDistance);
        if (thumbToIndexDistances.length > SMOOTHING_WINDOW_SIZE) {
          thumbToIndexDistances.shift();
        }

        // Rotation
        const vector = { x: thumbLandmark.x - middleLandmark.x, y: thumbLandmark.y - middleLandmark.y };
        const newAngle = Math.atan2(vector.y, vector.x) * (180 / Math.PI) - 90;
        let deltaAngle = newAngle - rhRotations[0];
        if (deltaAngle > 180) deltaAngle -= 360;
        if (deltaAngle < -180) deltaAngle += 360;

        rhRotationSpeed += 0.05 * deltaAngle;
        rhRotationSpeed *= ROTATION_FRICTION;
        rhCurrentRotation += rhRotationSpeed;

        rhRotations.unshift(newAngle);
        if (rhRotations.length > ROTATION_WINDOW_SIZE) {
          rhRotations.pop();
        }

        simulation.material.uniforms.u_thumbToIndexDistance.value =
          DISTANCE_FACTOR * distanceAverage(thumbToIndexDistances);
        simulation.material.uniforms.u_rightHandRotation.value = DISTANCE_FACTOR * rhCurrentRotation;
      } else {
        const allFingersToThumbDistance =
          distance(thumbLandmark, indexLandmark) +
          distance(thumbLandmark, middleLandmark) +
          distance(thumbLandmark, ringLandmark) +
          distance(thumbLandmark, pinkyLandmark);

        const newThumbToMiddleDistance = distance(thumbLandmark, indexLandmark);
        thumbToMiddleDistances.push(newThumbToMiddleDistance);
        if (thumbToMiddleDistances.length > SMOOTHING_WINDOW_SIZE) {
          thumbToMiddleDistances.shift();
        }

        const vector = { x: thumbLandmark.x - middleLandmark.x, y: thumbLandmark.y - middleLandmark.y };
        const newAngle = Math.atan2(vector.y, vector.x) * (180 / Math.PI) - 90;
        let deltaAngle = newAngle - lhRotations[0];
        if (deltaAngle > 180) deltaAngle -= 360;
        if (deltaAngle < -180) deltaAngle += 360;

        lhRotationSpeed += 0.05 * deltaAngle;
        lhRotationSpeed *= ROTATION_FRICTION;
        lhCurrentRotation += lhRotationSpeed;

        lhRotations.unshift(newAngle);
        if (lhRotations.length > ROTATION_WINDOW_SIZE) {
          lhRotations.pop();
        }

        simulation.material.uniforms.u_leftHandRotation.value = DISTANCE_FACTOR * lhCurrentRotation;
        simulation.material.uniforms.u_thumbToMiddleDistance.value =
          DISTANCE_FACTOR * distanceAverage(thumbToMiddleDistances);
      }
    });

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
      width: 512,
      height: 320,
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

  const backgroundColor = new THREE.Color(0x000000);
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
