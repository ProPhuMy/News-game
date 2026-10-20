import * as THREE from 'three';

/** Call only for ready, static architecture. Originals and kit materials remain owned by their producers. */
export function batchStaticOutlines(root: THREE.Group): () => void {
  const byMaterial = new Map<THREE.LineBasicMaterial, THREE.LineSegments[]>();
  root.updateWorldMatrix(true, true);
  root.traverseVisible(object => {
    if (!(object instanceof THREE.LineSegments) || object.name !== 'toon-outline'
      || !(object.material instanceof THREE.LineBasicMaterial) || object.material.transparent
      || object.material.vertexColors || object.morphTargetInfluences || object.renderOrder !== 0
      || object.layers.mask !== 1 || object.castShadow || object.receiveShadow
      || object.geometry.index || object.geometry.drawRange.start !== 0
      || object.geometry.drawRange.count !== Infinity) return;
    const positions = object.geometry.getAttribute('position');
    if (!positions || positions.itemSize !== 3) return;
    const lines = byMaterial.get(object.material) ?? [];
    lines.push(object); byMaterial.set(object.material, lines);
  });
  const inverse = root.matrixWorld.clone().invert();
  const point = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const batches: { batch: THREE.LineSegments; sources: THREE.LineSegments[] }[] = [];
  for (const [material, sources] of byMaterial) {
    if (sources.length < 2) continue;
    const count = sources.reduce((sum, line) => sum + line.geometry.getAttribute('position').count, 0);
    const positions = new Float32Array(count * 3);
    let offset = 0;
    for (const line of sources) {
      matrix.multiplyMatrices(inverse, line.matrixWorld);
      const source = line.geometry.getAttribute('position');
      for (let i = 0; i < source.count; i++) {
        point.fromBufferAttribute(source, i).applyMatrix4(matrix).toArray(positions, offset);
        offset += 3;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const batch = new THREE.LineSegments(geometry, material);
    batch.name = 'static-outline-batch'; root.add(batch);
    for (const line of sources) line.visible = false;
    batches.push({ batch, sources });
  }
  return () => {
    for (const { batch, sources } of batches) {
      batch.removeFromParent(); batch.geometry.dispose();
      for (const line of sources) line.visible = true;
    }
    batches.length = 0;
  };
}
