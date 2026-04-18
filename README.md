# Particles Morphing — Three.js Journey

Quick recap of the **Particles Morphing** lesson from [Three.js Journey](https://threejs-journey.com/) by Bruno Simon.

## What this project covers

This project shows how to **morph one particle cloud into another** using a **single `THREE.Points`** mesh, a **custom `ShaderMaterial`**, and **vertex attributes** that carry both the **current** and **target** positions. Instead of animating separate objects, every particle **interpolates in world space** while a **global progress uniform** drives the transition, and **per-particle noise** staggers timing so the morph feels organic rather than a rigid wipe.

- **`ShaderMaterial`** with external **`.glsl`** files (via **Vite** + **`vite-plugin-glsl`**) keeps the vertex and fragment logic readable and versionable.
- The **vertex shader** mixes **source** and **target** positions with a **noise-based delay** so each point starts and finishes its journey on a slightly different schedule, then sets **`gl_PointSize`** using **screen resolution** and a **perspective-correct scale** (`1.0 / -viewPosition.z`).
- The **fragment shader** treats each drawn **sprite** with **`gl_PointCoord`**, shaping **alpha** from distance to the center so points read as soft blobs rather than hard squares.
- **Transparency** uses **`AdditiveBlending`** and **`depthWrite: false`**, which fits glowing particles and avoids harsh depth conflicts when layers overlap.
- **Animation** of **`uProgress`** is handled with **GSAP**; **lil-gui** exposes progress, morph presets, and two **mix colors** for quick iteration.

## What I built

- Loaded **`models.glb`** with **`GLTFLoader`** and **`DRACOLoader`** (decoder under **`./draco/`**) so compressed meshes decode correctly.
- **Collected position attributes** from each mesh child in the GLTF, computed a shared **`maxCount`**, and **padded** shorter shapes by **randomly resampling** existing vertices so every morph target has the **same vertex count**—required for attribute-to-attribute morphing.
- A **`BufferGeometry`** with **`position`** (active shape), **`aPositionTarget`** (destination shape), and **`aSize`** (random per-particle multiplier for point size variation).
- **`THREE.Points`** + **`ShaderMaterial`** with uniforms **`uSize`**, **`uResolution`**, **`uProgress`**, **`uColorA`**, **`uColorB`**; **`frustumCulled`** disabled so the full cloud stays visible while orbiting.
- **`#include`** of a shared **`simplex-noise-3D.glsl`** in the vertex shader for procedural staggering and color variation.
- **Fragment shader** ends with Three’s **`tonemapping_fragment`** and **`colorspace_fragment`** includes so output matches the renderer’s color pipeline.
- **Resize handler** updates **`uResolution`** (width and height × pixel ratio) so point sizing stays consistent when the window or DPR changes.

## What I learned

### 1) One points mesh, many shapes

- Morphing is easier when **all targets share one buffer layout**: same number of vertices, same attribute slots. If models differ in vertex count, you **normalize** by padding with **random picks** from the smaller mesh so “extra” particles still sit on the surface somewhere plausible.

### 2) Staggered morphs with noise and `smoothstep`

- Sampling **Simplex noise** on **`position`** and **`aPositionTarget`**, then mixing by **`uProgress`**, gives a scalar that **varies per particle**.
- Remapping with **`smoothstep(-1.0, 1.0, noise)`** keeps values in a useful range for timing.
- **`delay`** and **`end`** windows per particle (`delay = (1.0 - duration) * noise`, then **`smoothstep(delay, end, uProgress)`**) mean the cloud **does not move in lockstep**; the morph ripples through the volume.

### 3) Point sprites: `gl_PointSize` and `gl_PointCoord`

- **`gl_PointSize`** must account for **resolution** (e.g. multiply by **`uResolution.y`**) and **distance to the camera** so points stay a predictable **screen-space** size.
- In the fragment stage, **`gl_PointCoord`** is the UV over the **impostor quad**; a **radial falloff** (e.g. inverse distance from center) yields soft, **glow-like** particles instead of obvious squares.

### 4) Blending and depth for particles

- **`AdditiveBlending`** stacks light nicely for **neon / energy** looks; pairing it with **`depthWrite: false`** is a common trade-off for **layered** transparent particles at the cost of strict depth ordering.

### 5) Driving uniforms from the CPU

- **GSAP** tweening **`uProgress`** from `0` to `1` is a clean separation: the CPU owns **timing and easing**, the GPU owns **position and look**. Swapping **`position`** / **`aPositionTarget`** attributes when starting a new morph keeps the next transition consistent with the lesson’s pattern.

## Run the project

```bash
npm install
npm run dev
```

## Credits

Part of the **Three.js Journey** course by Bruno Simon.
