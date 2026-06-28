import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import type { BoxyOp, JointDef, Vec3, Vec2, EndFace } from './types';

const evaluator = new Evaluator();
const S = 0.01; // mm -> three units

function v(a?: Vec3): THREE.Vector3 { return new THREE.Vector3(...(a || [0,0,0])); }

function roundedBox(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  r = Math.min(r, w/2 - 1e-4, h/2 - 1e-4, d/2 - 1e-4);
  if (r <= 0) return new THREE.BoxGeometry(w, h, d);
  const shape = new THREE.Shape();
  const x = -w/2, y = -h/2;
  shape.moveTo(x+r, y); shape.lineTo(x+w-r, y);
  shape.quadraticCurveTo(x+w, y, x+w, y+r);
  shape.lineTo(x+w, y+h-r);
  shape.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  shape.lineTo(x+r, y+h);
  shape.quadraticCurveTo(x, y+h, x, y+h-r);
  shape.lineTo(x, y+r);
  shape.quadraticCurveTo(x, y, x+r, y);
  const bevel = Math.min(r, d/2 - 1e-4);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - bevel*2, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 16,
  });
  geo.translate(0, 0, -(d - bevel*2)/2 - bevel);
  geo.computeVertexNormals();
  return geo;
}

function shapeFromSketch(points: Vec2[], holes?: Vec2[][]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x,y], i) => i === 0 ? shape.moveTo(x*S, y*S) : shape.lineTo(x*S, y*S));
  shape.closePath();
  if (holes) for (const hole of holes) {
    const h = new THREE.Path();
    hole.forEach(([x,y], i) => i === 0 ? h.moveTo(x*S, y*S) : h.lineTo(x*S, y*S));
    h.closePath();
    shape.holes.push(h);
  }
  return shape;
}

// Returns the world-space point on the named face of a mesh, using its CURRENT transform.
function facePoint(mesh: THREE.Object3D, face: EndFace): THREE.Vector3 {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const c = new THREE.Vector3(); box.getCenter(c);
  if (face === 'center') return c;
  const p = c.clone();
  if (face === '+x') p.x = box.max.x;
  if (face === '-x') p.x = box.min.x;
  if (face === '+y') p.y = box.max.y;
  if (face === '-y') p.y = box.min.y;
  if (face === '+z') p.z = box.max.z;
  if (face === '-z') p.z = box.min.z;
  return p;
}

function axisVec(a: 'x'|'y'|'z'): Vec3 { return a === 'x' ? [1,0,0] : a === 'y' ? [0,1,0] : [0,0,1]; }

function shellMesh(src: THREE.Mesh, thickness: number): THREE.Mesh {
  src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src);
  const size = new THREE.Vector3(); box.getSize(size);
  const avg = (size.x + size.y + size.z) / 3;
  const f = Math.max(0.01, 1 - (2 * thickness * S) / avg);
  const inner = src.clone(); inner.geometry = src.geometry.clone();
  inner.scale.multiplyScalar(f); inner.updateMatrixWorld(true);
  const a = new Brush(src.geometry.clone()); a.matrix.copy(src.matrixWorld); a.matrixAutoUpdate = false; a.updateMatrixWorld();
  const b = new Brush(inner.geometry.clone()); b.matrix.copy(inner.matrixWorld); b.matrixAutoUpdate = false; b.updateMatrixWorld();
  const out = evaluator.evaluate(a, b, SUBTRACTION);
  const m = new THREE.Mesh(out.geometry, src.material as THREE.Material);
  m.name = src.name;
  return m;
}

export function runProgram(ops: BoxyOp[]) {
  const meshes = new Map<string, THREE.Mesh>();
  const sketches = new Map<string, THREE.Shape>();
  const groups = new Map<string, { name: string; members: string[] }>();
  const joints: JointDef[] = [];

  const mat = (hex = '#c9c4b3') =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.08, roughness: 0.62 });

  // resolve an id to a movable Object3D — either a single mesh or a "virtual group"
  // we model as a THREE.Group containing the member meshes.
  const virtualGroups = new Map<string, THREE.Group>();
  const resolveTarget = (id: string): THREE.Object3D | null => {
    if (virtualGroups.has(id)) return virtualGroups.get(id)!;
    if (meshes.has(id)) return meshes.get(id)!;
    const g = groups.get(id);
    if (g) {
      const node = new THREE.Group(); node.name = id;
      for (const m of g.members) {
        const child = meshes.get(m);
        if (child) node.add(child); // reparent so transforms apply to all members
      }
      virtualGroups.set(id, node);
      return node;
    }
    return null;
  };

  for (const op of ops) {
    try {
      switch (op.op) {
        case 'primitive': {
          let geo: THREE.BufferGeometry;
          if (op.shape === 'box') geo = new THREE.BoxGeometry(op.size[0]*S, op.size[1]*S, op.size[2]*S);
          else if (op.shape === 'roundedBox') geo = roundedBox(op.size[0]*S, op.size[1]*S, op.size[2]*S, (op.radius ?? 2)*S);
          else if (op.shape === 'cylinder') {
            geo = new THREE.CylinderGeometry(op.radius*S, op.radius*S, op.height*S, 64);
            if (op.axis === 'x') geo.rotateZ(Math.PI/2);
            if (op.axis === 'z') geo.rotateX(Math.PI/2);
          } else if (op.shape === 'cone') {
            geo = new THREE.ConeGeometry(op.radius*S, op.height*S, 64);
            if (op.axis === 'x') geo.rotateZ(Math.PI/2);
            if (op.axis === 'z') geo.rotateX(Math.PI/2);
          } else if (op.shape === 'torus') {
            geo = new THREE.TorusGeometry(op.radius*S, op.tube*S, 24, 80);
            if (op.axis === 'y') geo.rotateX(Math.PI/2);
            if (op.axis === 'x') geo.rotateY(Math.PI/2);
          } else if (op.shape === 'capsule') {
            geo = new THREE.CapsuleGeometry(op.radius*S, op.height*S, 12, 32);
            if (op.axis === 'x') geo.rotateZ(Math.PI/2);
            if (op.axis === 'z') geo.rotateX(Math.PI/2);
          } else if (op.shape === 'lathe') {
            const pts = op.profile.map(([x,y]) => new THREE.Vector2(Math.max(x,0)*S, y*S));
            geo = new THREE.LatheGeometry(pts, op.segments ?? 64);
          } else geo = new THREE.SphereGeometry(op.radius*S, 48, 32);
          const m = new THREE.Mesh(geo, mat());
          if (op.at) m.position.copy(v(op.at).multiplyScalar(S));
          m.name = op.id; meshes.set(op.id, m);
          break;
        }
        case 'sketch': { sketches.set(op.id, shapeFromSketch(op.points, op.holes)); break; }
        case 'extrude': {
          const shape = sketches.get(op.sketch); if (!shape) break;
          const bevel = (op.bevel ?? 0) * S;
          const geo = new THREE.ExtrudeGeometry(shape, {
            depth: op.depth * S, bevelEnabled: bevel > 0,
            bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24,
          });
          if (op.axis === 'x') geo.rotateY(Math.PI/2);
          else if (op.axis === 'y') geo.rotateX(-Math.PI/2);
          geo.computeVertexNormals();
          const m = new THREE.Mesh(geo, mat());
          if (op.at) m.position.copy(v(op.at).multiplyScalar(S));
          m.name = op.id; meshes.set(op.id, m);
          break;
        }
        case 'shell': {
          const src = meshes.get(op.target); if (!src) break;
          meshes.set(op.id, shellMesh(src, op.thickness));
          break;
        }
        case 'pattern': {
          const src = meshes.get(op.target); if (!src) break;
          const wrapper = new THREE.Mesh(); wrapper.name = op.id; (wrapper as any).isPatternGroup = true;
          if (op.kind === 'linear') {
            const sp = v(op.spacing).multiplyScalar(S);
            for (let i = 0; i < op.count; i++) {
              const c = src.clone(); c.geometry = src.geometry.clone();
              c.position.copy(src.position).add(sp.clone().multiplyScalar(i));
              wrapper.add(c);
            }
          } else {
            const center = v(op.center).multiplyScalar(S);
            const axis = v(op.axis || [0,1,0]).normalize();
            for (let i = 0; i < op.count; i++) {
              const angle = (Math.PI*2 * i) / op.count;
              const c = src.clone(); c.geometry = src.geometry.clone();
              c.position.copy(src.position).sub(center).applyAxisAngle(axis, angle).add(center);
              c.rotateOnWorldAxis(axis, angle);
              wrapper.add(c);
            }
          }
          meshes.set(op.id, wrapper as any);
          break;
        }
        case 'transform': {
          const m = resolveTarget(op.id) as THREE.Object3D | null; if (!m) break;
          if (op.translate) m.position.add(v(op.translate).multiplyScalar(S));
          if (op.rotate) m.rotation.set(
            THREE.MathUtils.degToRad(op.rotate[0]),
            THREE.MathUtils.degToRad(op.rotate[1]),
            THREE.MathUtils.degToRad(op.rotate[2]),
          );
          if (op.scale) m.scale.set(op.scale[0], op.scale[1], op.scale[2]);
          break;
        }
        case 'boolean': {
          const a = meshes.get(op.a); const b = meshes.get(op.b);
          if (!a || !b) break;
          a.updateMatrixWorld(true); b.updateMatrixWorld(true);
          const ba = new Brush(a.geometry.clone()); ba.matrix.copy(a.matrixWorld); ba.matrixAutoUpdate = false; ba.updateMatrixWorld();
          const bb = new Brush(b.geometry.clone()); bb.matrix.copy(b.matrixWorld); bb.matrixAutoUpdate = false; bb.updateMatrixWorld();
          const action = op.action === 'subtract' ? SUBTRACTION : op.action === 'intersect' ? INTERSECTION : ADDITION;
          const result = evaluator.evaluate(ba, bb, action);
          const mesh = new THREE.Mesh(result.geometry, a.material);
          mesh.name = op.id;
          meshes.delete(op.a); meshes.delete(op.b);
          meshes.set(op.id, mesh);
          break;
        }
        case 'fillet':
        case 'color': {
          const m = meshes.get(op.id); if (!m) break;
          if (op.op === 'color') m.material = mat(op.hex);
          break;
        }
        case 'delete': { meshes.delete(op.id); break; }
        case 'group': { groups.set(op.id, { name: op.name || op.id, members: op.members }); break; }

        // ── NEW: hinge ────────────────────────────────────────────────
        case 'hinge': {
          const parent = resolveTarget(op.parent);
          const child = resolveTarget(op.child);
          if (!parent || !child) { console.warn('hinge: missing parent/child', op); break; }

          // Snap child's `childFace` onto parent's `parentFace`.
          const childFace = op.childFace ?? oppositeFace(op.parentFace);
          const target = facePoint(parent, op.parentFace);
          const cur    = facePoint(child,  childFace);
          const delta  = target.clone().sub(cur);
          child.position.add(delta);
          child.updateMatrixWorld(true);

          // Joint: pivot is computed FRESH each tick from parent's face — no drift.
          joints.push({
            id: op.id, target: op.child, kind: 'rotate',
            axis: axisVec(op.axis), min: op.min, max: op.max, key: op.key, value: 0,
            name: op.name || op.id,
            getPivot: () => {
              const p = facePoint(parent, op.parentFace);
              return [p.x / S, p.y / S, p.z / S];
            },
          });
          break;
        }

        // ── NEW: slider ───────────────────────────────────────────────
        case 'slider': {
          const parent = resolveTarget(op.parent);
          const child  = resolveTarget(op.child);
          if (!parent || !child) break;
          const childFace = op.childFace ?? oppositeFace(op.parentFace);
          const target = facePoint(parent, op.parentFace);
          const cur    = facePoint(child,  childFace);
          child.position.add(target.clone().sub(cur));
          child.updateMatrixWorld(true);
          joints.push({
            id: op.id, target: op.child, kind: 'translate',
            axis: axisVec(op.axis), min: op.min, max: op.max, key: op.key, value: 0,
            name: op.name || op.id,
            getPivot: () => [0,0,0], // unused for translate
          });
          break;
        }

        // ── NEW: chain ────────────────────────────────────────────────
        // Articulated chain: each consecutive pair links via a hinge along `axis`.
        // The child's "-face on axis" snaps to the parent's "+face on axis".
        case 'chain': {
          const axis = op.axis;
          const parentFace = `+${axis}` as EndFace;
          const childFace  = `-${axis}` as EndFace;
          const [minA, maxA] = op.range ?? [-90, 90];
          for (let i = 0; i < op.links.length - 1; i++) {
            const parentId = op.links[i];
            const childId  = op.links[i+1];
            const parent = resolveTarget(parentId);
            const child  = resolveTarget(childId);
            if (!parent || !child) { console.warn('chain: missing link', parentId, childId); continue; }
            const target = facePoint(parent, parentFace);
            const cur    = facePoint(child,  childFace);
            child.position.add(target.clone().sub(cur));
            child.updateMatrixWorld(true);
            joints.push({
              id: `${op.id}_${i}`, target: childId, kind: 'rotate',
              axis: axisVec(axis), min: minA, max: maxA,
              key: op.keys[i] || '', value: 0,
              name: `${childId}`,
              getPivot: () => {
                const p = facePoint(parent, parentFace);
                return [p.x / S, p.y / S, p.z / S];
              },
            });
          }
          break;
        }

        // ── Legacy low-level joint (still supported) ──────────────────
        case 'joint': {
          const t = resolveTarget(op.target); if (!t) break;
          const pivotMM: Vec3 = op.pivot;
          joints.push({
            id: op.id, target: op.target, kind: op.kind,
            axis: op.axis, min: op.min, max: op.max, key: op.key, value: 0,
            getPivot: () => pivotMM, // static, classic behavior
          });
          break;
        }
      }
    } catch (e) { console.warn('op failed', op, e); }
  }

  const root = new THREE.Group();
  for (const m of meshes.values()) { m.castShadow = true; m.receiveShadow = true; root.add(m); }
  for (const g of virtualGroups.values()) root.add(g);
  return { root, meshes, groups, virtualGroups, joints };
}

function oppositeFace(f: EndFace): EndFace {
  if (f === '+x') return '-x'; if (f === '-x') return '+x';
  if (f === '+y') return '-y'; if (f === '-y') return '+y';
  if (f === '+z') return '-z'; if (f === '-z') return '+z';
  return 'center';
}

export function boundingBox(root: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  return {
    size:   [+(size.x/S).toFixed(1), +(size.y/S).toFixed(1), +(size.z/S).toFixed(1)],
    center: [+(center.x/S).toFixed(1), +(center.y/S).toFixed(1), +(center.z/S).toFixed(1)],
  };
}

export function partsList(meshes: Map<string, THREE.Mesh>) {
  return Array.from(meshes.keys());
}