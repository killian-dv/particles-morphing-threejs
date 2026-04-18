import gsap from "gsap";
import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import particlesFragmentShader from "./shaders/particles/fragment.glsl";
import particlesVertexShader from "./shaders/particles/vertex.glsl";
import "./style.css";

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 });
const debugObject: { clearColor: string } = {
  clearColor: "#160920",
};

// Canvas
const canvas = document.querySelector<HTMLCanvasElement>("canvas.webgl");

if (!canvas) {
  throw new Error("Canvas with class 'webgl' not found.");
}

// Scene
const scene = new THREE.Scene();

// Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./draco/");
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  if (particles) {
    particles.material.uniforms.uResolution.value.set(
      sizes.width * sizes.pixelRatio,
      sizes.height * sizes.pixelRatio,
    );
  }

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.set(0, 0, 8 * 2);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

gui.addColor(debugObject, "clearColor").onChange(() => {
  renderer.setClearColor(debugObject.clearColor);
});
renderer.setClearColor(debugObject.clearColor);

/**
 * Particles
 */
type Particles = {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
  maxCount: number;
  positions: THREE.Float32BufferAttribute[];
  index: number;
  morph: (index: number) => void;
  morph0: () => void;
  morph1: () => void;
  morph2: () => void;
  morph3: () => void;
};

let particles: Particles | null = null;

// load models
gltfLoader.load("./models.glb", (gltf) => {
  particles = {} as Particles;
  particles.index = 0;

  // positions
  const positions = gltf.scene.children.map((child) => {
    if (child instanceof THREE.Mesh) {
      return child.geometry.attributes.position;
    }
  });
  particles.maxCount = 0;
  for (const position of positions) {
    if (position && position.count > particles.maxCount) {
      particles.maxCount = position.count;
    }
  }

  particles.positions = [];
  for (const position of positions) {
    const originalArray = position.array;
    const newArray = new Float32Array(particles.maxCount * 3);
    for (let i = 0; i < particles.maxCount; i++) {
      const i3 = i * 3;
      if (i3 < originalArray.length) {
        newArray[i3] = originalArray[i3];
        newArray[i3 + 1] = originalArray[i3 + 1];
        newArray[i3 + 2] = originalArray[i3 + 2];
      } else {
        const randomIndex = Math.floor(Math.random() * position.count);
        newArray[i3] = position.array[randomIndex * 3];
        newArray[i3 + 1] = position.array[randomIndex * 3 + 1];
        newArray[i3 + 2] = position.array[randomIndex * 3 + 2];
      }
    }
    particles.positions.push(new THREE.Float32BufferAttribute(newArray, 3));
  }
  // Geometry
  particles.geometry = new THREE.BufferGeometry();
  particles.geometry.setAttribute(
    "position",
    particles.positions[particles.index],
  );
  particles.geometry.setAttribute("aPositionTarget", particles.positions[3]);

  // Material
  particles.material = new THREE.ShaderMaterial({
    vertexShader: particlesVertexShader,
    fragmentShader: particlesFragmentShader,
    uniforms: {
      uSize: new THREE.Uniform(0.2),
      uResolution: new THREE.Uniform(
        new THREE.Vector2(
          sizes.width * sizes.pixelRatio,
          sizes.height * sizes.pixelRatio,
        ),
      ),
      uProgress: new THREE.Uniform(0),
    },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Points
  particles.points = new THREE.Points(particles.geometry, particles.material);
  scene.add(particles.points);

  // methods
  particles.morph = (index: number) => {
    if (!particles) return;
    // update attributes
    particles.geometry.attributes.position =
      particles.positions[particles.index];
    particles.geometry.attributes.aPositionTarget = particles.positions[index];

    // animate uProgress
    gsap.fromTo(
      particles.material.uniforms.uProgress,
      {
        value: 0,
      },
      {
        value: 1,
        duration: 3,
        ease: "linear",
      },
    );

    particles.index = index;
  };

  const particleSystem = particles;
  if (!particleSystem) return;

  particleSystem.morph0 = () => {
    particleSystem.morph(0);
  };
  particleSystem.morph1 = () => {
    particleSystem.morph(1);
  };
  particleSystem.morph2 = () => {
    particleSystem.morph(2);
  };
  particleSystem.morph3 = () => {
    particleSystem.morph(3);
  };
  // tweaks
  gui
    .add(particles.material.uniforms.uProgress, "value")
    .min(0)
    .max(1)
    .step(0.001)
    .name("Progress")
    .listen();

  gui.add(particleSystem, "morph0").name("Morph 0");
  gui.add(particleSystem, "morph1").name("Morph 1");
  gui.add(particleSystem, "morph2").name("Morph 2");
  gui.add(particleSystem, "morph3").name("Morph 3");
});

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update();

  // Render normal scene
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
