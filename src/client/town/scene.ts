import * as THREE from 'three';

export interface TownScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.AmbientLight;
  sunLight: THREE.DirectionalLight;
  render(camera: THREE.Camera): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface TownSceneOptions {
  renderer?: THREE.WebGLRenderer;
}

export function createTownScene(
  canvas: HTMLCanvasElement,
  options: TownSceneOptions = {},
): TownScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdde8ef);

  const ambientLight = new THREE.AmbientLight(0xf0f4f8, 0.75);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
  sunLight.position.set(30, 45, 25);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);

  let renderer: THREE.WebGLRenderer;
  if (options.renderer) {
    renderer = options.renderer;
  } else {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'default',
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  }


  return {
    scene,
    renderer,
    ambientLight,
    sunLight,

    render(camera: THREE.Camera): void {
      renderer.render(scene, camera);
    },

    resize(width: number, height: number): void {
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    },

    dispose(): void {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else if (object.material) {
            object.material.dispose();
          }
        }
      });

      while (scene.children.length > 0) {
        const child = scene.children[0];
        if (child) {
          scene.remove(child);
        } else {
          break;
        }
      }

      renderer.dispose();
    },
  };
}
