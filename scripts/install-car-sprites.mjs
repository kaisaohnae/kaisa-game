import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const defaultSrc =
  'C:\\Users\\kaisa\\Desktop\\Topdown_vehicle_sprites_pack_Unluckystudio\\Topdown_vehicle_sprites_pack';
const src = process.argv[2] ?? defaultSrc;
const dest = path.join(root, 'public', 'car-run', 'vehicles');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from, to);
}

function copyDir(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) return;
  fs.mkdirSync(toDir, {recursive: true});
  for (const name of fs.readdirSync(fromDir)) {
    const from = path.join(fromDir, name);
    const to = path.join(toDir, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else if (/\.png$/i.test(name)) copyFile(from, to);
  }
}

if (!fs.existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}

if (fs.existsSync(dest)) fs.rmSync(dest, {recursive: true, force: true});
fs.mkdirSync(dest, {recursive: true});

for (const name of fs.readdirSync(src)) {
  const from = path.join(src, name);
  if (fs.statSync(from).isDirectory()) {
    copyDir(from, path.join(dest, name));
  } else if (/\.png$/i.test(name)) {
    copyFile(from, path.join(dest, name));
  }
}

console.log(`Copied vehicle sprites to ${dest}`);
