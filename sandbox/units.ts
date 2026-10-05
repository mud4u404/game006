import * as THREE from 'three';
import { Engine } from '@/render/engine';
import { CameraRig } from '@/render/cameraRig';
import { buildBattlefield, createEnvironment } from '@/render/battlefield';
import { createUnitModel } from '@/render/units';
import type { MapData, Quality, UnitAnim, UnitModelSpec } from '@/render/contracts';
import { CLASSES } from '@/data/classes';
import { CHARACTERS } from '@/data/characters';
import { buildModelSpec } from '@/game/unit';

const q = new URLSearchParams(location.search);
const quality = (q.get('q') ?? 'medium') as Quality;
const W = 12;
const H = 9;
const map: MapData = { width: W, height: H, tiles: Array.from({ length: H }, () => Array.from({ length: W }, () => 'plain')), theme: (q.get('theme') ?? 'meadow') as MapData['theme'], seed: 3 };

const engine = new Engine(document.getElementById('app')!, { quality, resolution: 'auto' });
const scene = new THREE.Scene();
engine.setScene(scene);
const env = createEnvironment(engine.renderer, scene, map.theme, { width: W, height: H }, quality);
engine.setMood(env.mood);
const bf = buildBattlefield(map, quality);
scene.add(bf.group);

// 展示：角色 + 职业
const specs: UnitModelSpec[] = [];
const mode = q.get('mode') ?? 'chars';
if (mode === 'chars') {
  for (const c of Object.values(CHARACTERS)) specs.push(buildModelSpec(c.classId, 'player', undefined, c.model));
} else if (mode === 'enemies') {
  for (const id of ['soldier', 'brigand', 'archer', 'cavalier', 'armor_knight', 'dark_mage', 'cult_priest', 'wyvern_rider', 'thief', 'paladin', 'general', 'sorcerer', 'witch', 'high_priest', 'knight_captain', 'myrmidon'])
    specs.push(buildModelSpec(id, 'enemy'));
} else {
  for (const id of ['wolf', 'skeleton', 'golem', 'salamander', 'wraith', 'wild_wyvern', 'ash_dragon']) specs.push(buildModelSpec(id, 'enemy'));
  specs.push(buildModelSpec('dragon_maiden', 'player', { body: 'dragon', scale: 2.2, primary: '#b5242a', secondary: '#e8a040', glow: '#ffd040' }));
}
const models = specs.map((s, i) => {
  const m = createUnitModel(s, quality);
  const cols = mode === 'monsters' ? 4 : 5;
  const x = 1 + (i % cols) * (mode === 'monsters' ? 2.6 : 2);
  const y = 1 + Math.floor(i / cols) * (mode === 'monsters' ? 3 : 2.2);
  m.object.position.set(x + 0.5, bf.heightAt(Math.floor(x), Math.floor(y)), y + 0.5);
  m.faceTowards(0.3, 1, true);
  scene.add(m.object);
  return m;
});
const anim = q.get('anim') as UnitAnim | null;
const animT = Number(q.get('t') ?? 0.4);

const rig = new CameraRig(engine.camera);
rig.setBounds(W, H);
rig.goal.distance = Number(q.get('dist') ?? 12);
rig.goal.pitch = Number(q.get('pitch') ?? 0.75);
rig.lookAt(Number(q.get('cx') ?? 5.2), 0, Number(q.get('cz') ?? 3.6), true);

engine.onUpdate((dt, t) => {
  rig.update(dt);
  bf.update(dt, t);
  env.update(dt, t, engine.camera);
  for (const m of models) m.update(dt, t);
});
if (q.get('manual') === null) engine.start();
const w = window as unknown as { __frame: (n: number) => void; __ready: boolean };
w.__frame = (n: number) => {
  if (anim) for (const m of models) m.play(anim);
  const steps = anim ? Math.max(1, Math.round(animT / (1 / 30))) : n;
  for (let i = 0; i < steps; i++) engine.frame(1 / 30);
};
w.__ready = true;
void CLASSES;
