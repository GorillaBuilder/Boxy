// BoxyDSL types

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

// Where on a part to anchor — end faces of its local bounding box.
export type EndFace = '+x'|'-x'|'+y'|'-y'|'+z'|'-z'|'center';

export type BoxyOp =
  // primitives
  | { op: 'primitive'; id: string; shape: 'box'; size: Vec3; at?: Vec3; }
  | { op: 'primitive'; id: string; shape: 'roundedBox'; size: Vec3; radius?: number; at?: Vec3; }
  | { op: 'primitive'; id: string; shape: 'cylinder'; radius: number; height: number; at?: Vec3; axis?: 'x'|'y'|'z'; }
  | { op: 'primitive'; id: string; shape: 'cone'; radius: number; height: number; at?: Vec3; axis?: 'x'|'y'|'z'; }
  | { op: 'primitive'; id: string; shape: 'sphere'; radius: number; at?: Vec3; }
  | { op: 'primitive'; id: string; shape: 'torus'; radius: number; tube: number; at?: Vec3; axis?: 'x'|'y'|'z'; }
  | { op: 'primitive'; id: string; shape: 'capsule'; radius: number; height: number; at?: Vec3; axis?: 'x'|'y'|'z'; }
  | { op: 'primitive'; id: string; shape: 'lathe'; profile: Vec2[]; segments?: number; at?: Vec3; }
  // sketch + extrude
  | { op: 'sketch'; id: string; points: Vec2[]; closed?: boolean; holes?: Vec2[][]; }
  | { op: 'extrude'; id: string; sketch: string; depth: number; bevel?: number; twist?: number; at?: Vec3; axis?: 'x'|'y'|'z'; }
  // CAD ops
  | { op: 'shell'; id: string; target: string; thickness: number; }
  | { op: 'pattern'; id: string; target: string; kind: 'linear'|'circular';
      count: number; spacing?: Vec3; axis?: Vec3; center?: Vec3; }
  | { op: 'transform'; id: string; translate?: Vec3; rotate?: Vec3; scale?: Vec3; }
  | { op: 'boolean'; id: string; action: 'union'|'subtract'|'intersect'; a: string; b: string; }
  | { op: 'fillet'; id: string; radius: number; edges?: 'all'|'top'|'bottom'|'vertical'; }
  | { op: 'color'; id: string; hex: string; }
  | { op: 'delete'; id: string; }
  | { op: 'group'; id: string; members: string[]; name?: string; }

  // ─── high-level rig ops (the new ones) ─────────────────────────────
  // attach `child` to `parent` with a hinge at `parent.face`, around `axis`.
  // The kernel:
  //   1. positions child so its `childFace` snaps to parent's `parentFace`,
  //   2. registers a joint with pivot derived from parent's current world transform,
  //   3. when the joint rotates, child rotates around the live pivot (no drift).
  | { op: 'hinge'; id: string; parent: string; child: string;
      parentFace: EndFace;            // e.g. "+y" = top of parent
      childFace?: EndFace;            // default "-y" = bottom of child snaps to parent's top
      axis: 'x'|'y'|'z';              // hinge rotates around this local axis
      min: number; max: number;       // degrees
      key: string;                    // keyboard binding
      name?: string;                  // shown in the HUD
    }

  // Slider — same idea but for linear motion.
  | { op: 'slider'; id: string; parent: string; child: string;
      parentFace: EndFace; childFace?: EndFace;
      axis: 'x'|'y'|'z'; min: number; max: number; key: string; name?: string;
    }

  // Chain — convenience for "shoulder → elbow → wrist" style articulated arms.
  // The kernel creates one hinge per consecutive pair of links.
  | { op: 'chain'; id: string; links: string[];
      axis: 'x'|'y'|'z';            // shared hinge axis for all joints
      keys: string[];                // one key per joint (links.length - 1 keys)
      range?: [number, number];      // shared min/max in degrees (default [-90, 90])
    }

  // ─── low-level joint (still supported but discouraged) ─────────────
  | { op: 'joint'; id: string; target: string; kind: 'rotate'|'translate';
      pivot: Vec3; axis: Vec3; min: number; max: number; key: string; };

export interface AgentResponse {
  mode: 'plan'|'build'|'critique';
  say: string;
  plan?: string[];
  ops?: BoxyOp[];
  critique?: { issues: string[]; fixes?: BoxyOp[]; };
}

// A live joint definition. `getPivot()` returns the joint's pivot in world coords
// computed from the parent mesh's CURRENT transform — so chains don't drift.
export interface JointDef {
  id: string;
  target: string;                    // mesh/group id the joint moves
  kind: 'rotate'|'translate';
  axis: Vec3;
  min: number; max: number;
  key: string;
  value: number;
  name?: string;
  getPivot: () => Vec3;              // dynamic — read each tick
}