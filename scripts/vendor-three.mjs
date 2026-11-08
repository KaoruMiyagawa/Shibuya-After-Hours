import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(projectRoot, 'node_modules', 'three');
const targetRoot = path.join(projectRoot, 'vendor', 'three');
const packageInfo = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));

if (packageInfo.version !== '0.170.0') {
  throw new Error(`Expected Three.js 0.170.0, found ${packageInfo.version}.`);
}

const files = [
  'build/three.module.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/geometries/RoundedBoxGeometry.js',
  'examples/jsm/objects/Reflector.js',
  'examples/jsm/postprocessing/EffectComposer.js',
  'examples/jsm/postprocessing/MaskPass.js',
  'examples/jsm/postprocessing/OutputPass.js',
  'examples/jsm/postprocessing/Pass.js',
  'examples/jsm/postprocessing/RenderPass.js',
  'examples/jsm/postprocessing/ShaderPass.js',
  'examples/jsm/postprocessing/UnrealBloomPass.js',
  'examples/jsm/shaders/CopyShader.js',
  'examples/jsm/shaders/LuminosityHighPassShader.js',
  'examples/jsm/shaders/OutputShader.js',
  'LICENSE',
];

for (const relativePath of files) {
  const source = path.join(packageRoot, relativePath);
  const destination = path.join(targetRoot, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (relativePath.endsWith('.js')) {
    const contents = await fs.readFile(source, 'utf8');
    await fs.writeFile(destination, contents.replace(/[\t ]+$/gm, ''));
  } else {
    await fs.copyFile(source, destination);
  }
}

console.log(`Vendored ${files.length - 1} Three.js 0.170.0 modules and its MIT notice.`);
