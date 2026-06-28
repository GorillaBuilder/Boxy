import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportSTL(obj: THREE.Object3D, name = 'boxy.stl') {
  download(name, new STLExporter().parse(obj, { binary: false }), 'model/stl');
}
export function exportOBJ(obj: THREE.Object3D, name = 'boxy.obj') {
  download(name, new OBJExporter().parse(obj), 'text/plain');
}
export function exportGLB(obj: THREE.Object3D, name = 'boxy.glb') {
  new GLTFExporter().parse(obj, (res) => download(name, res as ArrayBuffer, 'model/gltf-binary'), (e) => console.error(e), { binary: true });
}
