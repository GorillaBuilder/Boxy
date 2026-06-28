import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { JointDef } from '../engine/types';

const S = 0.01;

export function useRig(
  joints: JointDef[],
  meshes: Map<string, THREE.Mesh> | null,
  groups: Map<string, { name: string; members: string[] }> | null,
  virtualGroups?: Map<string, THREE.Group> | null,
) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!joints.length) return;
    const held = new Set<string>();
    let shift = false;

    const targets = (j: JointDef): THREE.Object3D[] => {
      // prefer virtual group (a real Object3D that holds members) so chain rotation
      // applies as one rigid body — that's how the kernel registers chains.
      const vg = virtualGroups?.get(j.target);
      if (vg) return [vg];
      const g = groups?.get(j.target);
      if (g) return g.members.map(id => meshes?.get(id)).filter(Boolean) as THREE.Object3D[];
      const single = meshes?.get(j.target);
      return single ? [single] : [];
    };

    const step = (j: JointDef, dir: number) => {
      const next = THREE.MathUtils.clamp(j.value + dir * 2.5, j.min, j.max);
      const delta = next - j.value;
      if (Math.abs(delta) < 1e-4) return false;
      j.value = next;
      const axis = new THREE.Vector3(...j.axis).normalize();
      // Pivot is computed FRESH each tick from the parent's current world position.
      // This is why chains stop drifting: after the shoulder rotates, the elbow's
      // pivot updates automatically because it reads from the moved parent mesh.
      const pivotMM = j.getPivot();
      const pivot = new THREE.Vector3(...pivotMM).multiplyScalar(S);
      for (const m of targets(j)) {
        if (j.kind === 'rotate') {
          const rad = THREE.MathUtils.degToRad(delta);
          m.position.sub(pivot).applyAxisAngle(axis, rad).add(pivot);
          m.rotateOnWorldAxis(axis, rad);
        } else {
          m.position.add(axis.clone().multiplyScalar(delta * S));
        }
        m.updateMatrixWorld(true);
      }
      return true;
    };

    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Shift') { shift = true; return; }
      held.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') { shift = false; return; }
      held.delete(e.key.toLowerCase());
    };

    let raf = 0;
    const loop = () => {
      let moved = false;
      for (const j of joints) {
        if (j.key && held.has(j.key.toLowerCase())) {
          if (step(j, shift ? -1 : +1)) moved = true;
        }
      }
      if (moved) setTick(t => (t + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(raf);
    };
  }, [joints, meshes, groups, virtualGroups]);
}