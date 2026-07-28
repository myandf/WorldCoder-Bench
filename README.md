# Scene3D-Bench: Core Dataset

**A Benchmark for Evaluating LLMs on Interactive 3D Web Scene Generation**

This repository contains the **core task dataset** for Scene3D-Bench, a benchmark that evaluates how well large language models (LLMs) can generate interactive 3D web scenes from scratch using Three.js.

> This dataset is submitted as part of a NeurIPS 2026 Evaluations & Datasets Track submission.

---

## Dataset Overview

| Item | Value |
|------|-------|
| Total tasks | **205** |
| Shared 3D assets (GLB) | **74** |
| Frameworks | Three.js r170 |
| Task difficulties | L3 (1%), L4 (19%), L5 (47%), L6 (33%) |
| Dataset size | ~338 MB (including GLB assets) |

### Domain Distribution

| Domain | Count |
|--------|-------|
| Physics | 26 |
| Game | 23 |
| Product | 20 |
| Architecture | 18 |
| Animation | 17 |
| Visualization | 17 |
| Molecular | 14 |
| Post-processing | 13 |
| Shaders | 12 |
| Materials | 12 |
| Chemistry | 11 |
| Soft-body | 9 |
| Creative | 9 |
| Complex System | 3 |
| Graphics | 1 |

---

## Repository Structure

```
WorldCoder-Bench/
├── README.md
├── assets/                   # Shared 3D assets (74 GLB files, CC0/CC-BY)
│   ├── ABeautifulGame.glb
│   ├── AnimatedMorphCube.glb
│   └── ... (74 files total)
└── tasks/                    # Task definitions (205 tasks)
    ├── P1_procedural_gas_law_pv_nrt_interactive_de/
    │   └── task.json
    ├── P2_lewis_structure_3d_bond_builder_with_sav/
    │   └── task.json
    ├── P3_avocado_slicer/
    │   ├── task.json
    │   └── assets/            # Task-specific 3D assets
    │       └── Avocado.glb
    └── ... (205 task directories)
```

### Task Directory Structure

Each task directory contains:
- `task.json` — Task definition and natural language prompt (see schema below)
- `assets/` *(optional)* — Task-specific 3D assets

### `task.json` Schema

```json
{
  "id": "P{num}_{snake_case_name}",
  "title": "Human-readable task title",
  "domain": "physics | game | product | ...",
  "difficulty": "L3 | L4 | L5 | L6",
  "framework": "three.js",
  "prompt": "Full natural language task description for the LLM",
  "assets": ["assets/ModelName.glb", ...],
  "physics_constraints": "Optional: formal physics constraints string"
}
```

---

## Difficulty Levels

| Level | Description |
|-------|-------------|
| L3 | Basic 3D scene with minimal interactivity |
| L4 | Moderate complexity, 1–2 interactive features |
| L5 | High complexity, multi-feature physics or animation |
| L6 | Expert-level, strict physics constraints + multi-system |

---

## 3D Assets

All 3D assets in `assets/` are GLB (GL Transmission Format Binary) files sourced from:

- [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) — CC0 / CC-BY 4.0
- [Sketchfab](https://sketchfab.com) — various open licenses (CC0 / CC-BY)
- [Mixamo](https://www.mixamo.com) — Adobe Standard License (non-commercial research use)

Each asset retains its original license. See individual asset attribution in the table below.

### Asset Attribution

| Asset File | Source | License |
|-----------|--------|---------|
| ABeautifulGame.glb | Khronos glTF Sample Assets | CC0 1.0 |
| AnimatedMorphCube.glb | Khronos glTF Sample Assets | CC0 1.0 |
| AnisotropyBarnLamp.glb | Khronos glTF Sample Assets | CC0 1.0 |
| AntiqueCamera.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Avocado.glb | Khronos glTF Sample Assets | CC0 1.0 |
| BarramundiFish.glb | Khronos glTF Sample Assets | CC0 1.0 |
| BoomBox.glb | Khronos glTF Sample Assets | CC0 1.0 |
| BoxAnimated.glb | Khronos glTF Sample Assets | CC0 1.0 |
| BrainStem.glb | Khronos glTF Sample Assets | CC0 1.0 |
| CarConcept.glb | Khronos glTF Sample Assets | CC0 1.0 |
| CarbonFibre.glb | Khronos glTF Sample Assets | CC0 1.0 |
| CesiumMan.glb | Khronos glTF Sample Assets | CC0 1.0 |
| CesiumMilkTruck.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ChairDamaskPurplegold.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ClearCoatCarPaint.glb | Khronos glTF Sample Assets | CC0 1.0 |
| CommercialRefrigerator.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Corset.glb | Khronos glTF Sample Assets | CC0 1.0 |
| DamagedHelmet.glb | Khronos glTF Sample Assets | CC0 1.0 |
| DiffuseTransmissionPlant.glb | Khronos glTF Sample Assets | CC0 1.0 |
| DiffuseTransmissionTeacup.glb | Khronos glTF Sample Assets | CC0 1.0 |
| DispersionTest.glb | Khronos glTF Sample Assets | CC0 1.0 |
| DragonDispersion.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Duck.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Fox.glb | Khronos glTF Sample Assets | CC0 1.0 |
| GlamVelvetSofa.glb | Khronos glTF Sample Assets | CC0 1.0 |
| GlassBrokenWindow.glb | Khronos glTF Sample Assets | CC0 1.0 |
| GlassVaseFlowers.glb | Khronos glTF Sample Assets | CC0 1.0 |
| InterpolationTest.glb | Khronos glTF Sample Assets | CC0 1.0 |
| IridescenceAbalone.glb | Khronos glTF Sample Assets | CC0 1.0 |
| IridescenceLamp.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Lantern.glb | Khronos glTF Sample Assets | CC0 1.0 |
| LittlestTokyo.glb | Sketchfab (La Flamme) | CC-BY 4.0 |
| MaterialsVariantsShoe.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Michelle.glb | Mixamo (Adobe) | Adobe Standard License |
| MosquitoInAmber.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Nefertiti.glb | Sketchfab | CC0 1.0 |
| Parrot.glb | Sketchfab | CC-BY 4.0 |
| PotOfCoals.glb | Khronos glTF Sample Assets | CC0 1.0 |
| PrimaryIonDrive.glb | Khronos glTF Sample Assets | CC0 1.0 |
| RiggedFigure.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ScatteringSkull.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ShaderBall.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ShaderBall2.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ShadowmappableMesh.glb | Khronos glTF Sample Assets | CC0 1.0 |
| SheenChair.glb | Khronos glTF Sample Assets | CC0 1.0 |
| SheenWoodLeatherSofa.glb | Khronos glTF Sample Assets | CC0 1.0 |
| SpecularSilkPouf.glb | Khronos glTF Sample Assets | CC0 1.0 |
| SunglassesKhronos.glb | Khronos glTF Sample Assets | CC0 1.0 |
| ToyCar.glb | Khronos glTF Sample Assets | CC0 1.0 |
| VirtualCity.glb | Sketchfab | CC-BY 4.0 |
| WaterBottle.glb | Khronos glTF Sample Assets | CC0 1.0 |
| Xbot.glb | Mixamo (Adobe) | Adobe Standard License |
| bath_day.glb | Sketchfab | CC-BY 4.0 |
| coffeeMug.glb | Sketchfab | CC0 1.0 |
| coffeemat.glb | Sketchfab | CC-BY 4.0 |
| dungeon_warkarma.glb | Sketchfab | CC-BY 4.0 |
| facecap.glb | Sketchfab | CC0 1.0 |
| ferrari.glb | Sketchfab | CC-BY 4.0 |
| flamingo.glb | Sketchfab | CC0 1.0 |
| gears.glb | Sketchfab | CC0 1.0 |
| godrays_demo.glb | Sketchfab | CC-BY 4.0 |
| horse.glb | Sketchfab | CC0 1.0 |
| kira.glb | Mixamo (Adobe) | Adobe Standard License |
| minimalistic_modern_bedroom.glb | Sketchfab | CC-BY 4.0 |
| nemetona.glb | Sketchfab | CC-BY 4.0 |
| pool.glb | Sketchfab | CC-BY 4.0 |
| readyplayer.me.glb | Ready Player Me | Research use only |
| robot.glb | Sketchfab | CC-BY 4.0 |
| rolex.glb | Sketchfab | CC-BY 4.0 |
| soldier.glb | Mixamo (Adobe) | Adobe Standard License |
| space_ship_hallway.glb | Sketchfab | CC-BY 4.0 |
| steampunk_camera.glb | Sketchfab | CC-BY 4.0 |
| stork.glb | Sketchfab | CC0 1.0 |
| venice_mask.glb | Sketchfab | CC-BY 4.0 |

---

## Usage

### Loading a Task

```python
import json, os

task_dir = "tasks/P96_multi_asset_animation_001"
with open(os.path.join(task_dir, "task.json")) as f:
    task = json.load(f)

print(task["title"])      # "Dance Choreography Timeline Editor"
print(task["domain"])     # "animation"
print(task["difficulty"]) # "L5"
print(task["assets"])     # ["assets/Michelle.glb", "assets/SunglassesKhronos.glb"]
# task["prompt"] contains the full natural language instruction for the LLM
```

### Iterating All Tasks

```python
import json, os

tasks_dir = "tasks"
for task_name in sorted(os.listdir(tasks_dir)):
    task_path = os.path.join(tasks_dir, task_name, "task.json")
    if os.path.exists(task_path):
        with open(task_path) as f:
            task = json.load(f)
        print(f"{task['id']:50s} [{task['difficulty']}] {task['domain']}")
```

### Generating LLM Code (with evaluation framework)

The full evaluation framework (code generation, Playwright-based evaluation, metrics computation) is available in the companion repository.

---

## Benchmark Design

Scene3D-Bench introduces two key innovations:

1. **Probe-First Evaluation**: Instead of screenshot-based or DOM-only evaluation, Scene3D-Bench reads the physics/scene engine's internal state via `window.__3D_STATE__` — a JavaScript global exposed by correctly-implemented LLM outputs. This provides precise, numerical ground-truth comparison.

2. **Checker Calibration (Mutation Testing)**: To validate the evaluator itself, we inject 6 types of mutations (M1–M6) into known-correct solutions and verify that the checker reliably detects each fault, producing a calibrated V-Cov metric.

### Evaluation Metrics

| Metric | Description |
|--------|-------------|
| **V-Cov** | Flat verification coverage — percentage of ICG checks passed |
| **wV-Cov** | Weighted verification coverage — L0×0.2 + L1×0.3 + L2×0.5 |
| **BT Score** | Bradley-Terry pairwise ranking parameter |
| **Crash%** | Rate of runtime crashes in generated code |
| **P-Miss%** | Rate of missing `window.__3D_STATE__` probe |

---

## License

- **Task definitions** (`tasks/*/task.json`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **3D assets** (`assets/*.glb`): Individual original licenses (CC0 / CC-BY 4.0 / Adobe Standard License) — see attribution table above

---

## Citation

Citation information will be provided upon publication.

---

## Contact

For questions about the dataset, please contact via the submission system.
