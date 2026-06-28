import { useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { runProgram, boundingBox } from '../engine/kernel';
import type { BoxyOp, JointDef } from '../engine/types';
import { useRig } from '../hooks/useRig';

export interface ViewerHandle {
  snapshot: () => string;
  bbox: () => any;
  root: () => THREE.Object3D | null;
  joints: () => JointDef[];
}

function Model({ ops, onBuilt }: { ops: BoxyOp[]; onBuilt: (b: any) => void }) {
  const { meshes, groups, virtualGroups, joints, root } = useMemo(() => runProgram(ops), [ops]);
  useRig(joints, meshes, groups, virtualGroups);
  useEffect(() => { onBuilt({ root, joints, meshes, groups, virtualGroups, bbox: boundingBox(root) }); }, [root]);
  return <primitive object={root} />;
}

function Capturer({ apiRef, data }: any) {
  const { gl, scene, camera } = useThree();
  useImperativeHandle(apiRef, () => ({
    snapshot: () => { gl.render(scene, camera); return gl.domElement.toDataURL('image/jpeg', 0.7); },
    bbox: () => data.current.bbox,
    root: () => data.current.root,
    joints: () => data.current.joints || [],
  }));
  return null;
}

function RigHud({ joints }: { joints: JointDef[] }) {
  const [, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { setT(t => (t + 1) % 1e6); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!joints.length) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
      <div className="rounded-xl border border-paper-300 bg-paper-50/95 px-3 py-2 shadow-card backdrop-blur">
        <div className="mb-1.5 flex items-center gap-2 text-2xs uppercase tracking-wider text-paper-500">
          <span className="h-1.5 w-1.5 rounded-full bg-olive/80" />
          rig · {joints.length} joint{joints.length > 1 ? 's' : ''}
          <span className="text-paper-400">· hold key · Shift+key reverses</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {joints.map(j => {
            const unit = j.kind === 'rotate' ? '°' : 'mm';
            const display = j.kind === 'rotate' ? j.value.toFixed(0) : (j.value * 0.1).toFixed(1);
            return (
              <div key={j.id} className="flex items-center gap-1.5 rounded-md border border-paper-300 bg-paper-100 px-2 py-1 font-mono text-2xs text-paper-900">
                <kbd className="rounded bg-paper-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper-900">{j.key || '—'}</kbd>
                <span className="text-paper-500">{j.name || j.target}</span>
                <span className="tabular-nums text-paper-900">{display}{unit}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Viewer = forwardRef<ViewerHandle, { ops: BoxyOp[] }>(({ ops }, ref) => {
  const data = useRef<any>({ bbox: null, root: null, joints: [] });
  const [, force] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    el.tabIndex = 0;
    const onPointer = () => el.focus();
    el.addEventListener('pointerdown', onPointer);
    setTimeout(() => el.focus(), 200);
    return () => el.removeEventListener('pointerdown', onPointer);
  }, []);

  const joints: JointDef[] = data.current.joints || [];

  return (
    <div ref={wrapRef} className="relative h-full w-full outline-none focus-visible:ring-1 focus-visible:ring-blue/40">
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [3, 2.4, 3.6], fov: 38 }}>
        <color attach="background" args={['#fdfcf7']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 8, 5]} intensity={1.0} castShadow shadow-mapSize={[2048, 2048]} />
        <Environment preset="studio" />
        {ops.length > 0 && <Model ops={ops} onBuilt={(b) => { data.current = b; force(n => n + 1); }} />}
        <Grid args={[40, 40]} cellSize={0.25} cellThickness={0.4} sectionSize={1}
          sectionThickness={0.7} infiniteGrid fadeDistance={28}
          cellColor="#d8d2bf" sectionColor="#b9b3a1" position={[0, -0.001, 0]} />
        <ContactShadows position={[0, 0, 0]} opacity={0.22} blur={2.4} far={6} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        <Capturer apiRef={ref} data={data} />
      </Canvas>
      <RigHud joints={joints} />
    </div>
  );
});
export default Viewer;