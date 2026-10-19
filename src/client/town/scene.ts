import * as THREE from 'three';
import { APPROVED_PALETTE, getPalette, type PresentationPalette } from '../visuals/palette.ts';

export interface TownScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  render(camera: THREE.Camera): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface TownSceneOptions {
  renderer?: THREE.WebGLRenderer;
  palette?: PresentationPalette;
}

export function createTownScene(
  canvas: HTMLCanvasElement,
  options: TownSceneOptions = {},
): TownScene {
  const palette = options.palette ?? getPalette(APPROVED_PALETTE);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.town.sky);

  const ambientLight = new THREE.HemisphereLight(palette.town.sky, palette.town.ground, 1.1);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
  sunLight.position.set(30, 45, 25);
  sunLight.target.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 160 });
  sunLight.shadow.normalBias = 0.025; sunLight.shadow.bias = -0.0001;
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

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  scene.fog = new THREE.Fog(palette.town.fog, 100, 230);
  let disposed = false;

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
      if (disposed) return;
      disposed = true;
      sunLight.shadow.dispose();

      while (scene.children.length > 0) {
        const child = scene.children[0];
        if (child) {
          scene.remove(child);
        } else {
          break;
        }
      }

      if (!options.renderer) renderer.dispose();
    },
  };
}
