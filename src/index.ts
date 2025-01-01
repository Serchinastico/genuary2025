import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";

function createCamera() {
  // const camera = new THREE.PerspectiveCamera(
  //   20,
  //   window.innerWidth / window.innerHeight,
  //   1,
  //   10000
  // );
  const camera = new THREE.OrthographicCamera(-10, 10, -10, 10);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  camera.translateX(20);
  camera.translateY(10);
  camera.translateZ(0);

  return camera;
}

function createOrbitControls(camera: THREE.Camera, renderer: THREE.Renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  return controls;
}

function main() {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  /**
   * The rendering components consisting of a scene with a single plane
   * with a texture that is the representation of the computed game of life
   */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000);
  const camera = createCamera();

  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];

  const floors = 20;
  const polygonSides = 6;
  const radius = 2;

  // VERTICES
  let rotation = 0;
  for (let z = 0; z < floors; z += 1) {
    vertices.push(0, 0, z);

    for (let i = 0; i < polygonSides; i++) {
      const angle = rotation + (i * 2 * Math.PI) / polygonSides;
      vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), z);
    }

    rotation += Math.PI / 4.75;
  }

  // prettier-ignore
  const indices = [
    // Base
    2, 1, 0, 
    3, 2, 0, 
    4, 3, 0, 
    5, 4, 0, 
    6, 5, 0,
    1, 6, 0,
    // First floor sides
    8,   1,  2,
    9,   8,  2,
    9,   2,  3,
    10,  9,  3,
    10,  3,  4,
    11, 10,  4,
    11,  4,  5,
    12, 11,  5,
    12,  5,  6,
    13, 12,  6,
    13,  6,  6,
    8,  13,  1,
    13,  6,  1,
  ];

  // FACES
  for (let z = 0; z < floors - 1; z += 1) {
    for (let side = 0; side < polygonSides - 1; side++) {
      indices.push(
        z + (z + 1) * polygonSides + side + 2,
        z + z * polygonSides + side + 1,
        z + z * polygonSides + side + 2
      );
      indices.push(
        z + (z + 1) * polygonSides + side + 3,
        z + (z + 1) * polygonSides + side + 2,
        z + z * polygonSides + side + 2
      );
    }

    indices.push(
      z + (z + 1) * polygonSides + 2,
      z + (z + 2) * polygonSides + 1,
      z + z * polygonSides + 1
    );
    indices.push(
      z + (z + 2) * polygonSides + 1,
      z + (z + 1) * polygonSides,
      z + z * polygonSides + 1
    );
  }

  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.computeVertexNormals();
  const object = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
  scene.add(object);

  const wireframe = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial();
  const line = new THREE.LineSegments(wireframe, lineMaterial);
  line.material.depthTest = false;
  line.material.opacity = 1;
  line.material.transparent = true;
  scene.add(line);

  renderer.render(scene, camera);

  const controls = createOrbitControls(camera, renderer);
  controls.update();

  const svgRenderer = new SVGRenderer();
  svgRenderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(svgRenderer.domElement);
  svgRenderer.render(scene, camera);

  function animate() {
    requestAnimationFrame(animate);

    // required if controls.enableDamping or controls.autoRotate are set to true
    controls.update();

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", main);
