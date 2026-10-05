import * as THREE from 'three';
import { Engine } from '@/render/engine';
import { CameraRig } from '@/render/cameraRig';
import { buildBattlefield, createEnvironment } from '@/render/battlefield';
import { TERRAIN_CHARS, type MapData, type Quality, type ThemeId } from '@/render/contracts';

const q = new URLSearchParams(location.search);
const theme = (q.get('theme') ?? 'forest') as ThemeId;
const quality = (q.get('q') ?? 'high') as Quality;

const MAPS: Record<string, string[]> = {
  default: [
    'TTT..nn....~~~..MMMA',
    'TT....n...~~~...nMMA',
    'T..V.....-~~~=====MM',
    '....=====B~~......nM',
    '.h..=.....~~..TT...n',
    '.hh.=..T..-~..TTT...',
    '....=..TT..~~..T..ss',
    '..F.=......~~~....ss',
    '....=====..B~~~~.sss',
    '..rr....=..~~~~~~sss',
    '..r.....=...~~~..sss',
    '.....T..=....~~...ss',
    '....TTT.=.....~...s.',
    '...TTTT.=.....--..s.',
  ],
  castle: [
    '#####G######',
    '#__________#',
    '#_I__K___I_#',
    '#__________#',
    '#_I______I_#',
    '#____SS____#',
    '###__==__###',
    '..#__==__#..',
    '..##=GG=##..',
    '.....==.....',
    '.h...==...h.',
    '.....==.....',
  ],
  volcano: [
    'aaaaLLLaaaMMa',
    'aaa.LLL..aMMA',
    'aa..rLLr.aaMA',
    'a..._BB_..aaa',
    '..___KK___..a',
    'a.I______I.LL',
    'aa___rr___LLL',
    'aaa.......LLa',
    'MMaa..aa..aaa',
  ],
};

const mapKey = q.get('map') ?? (theme === 'castle' || theme === 'temple' ? 'castle' : theme === 'volcano' || theme === 'eclipse' ? 'volcano' : 'default');
const rows = MAPS[mapKey];
const map: MapData = {
  width: rows[0].length,
  height: rows.length,
  tiles: rows.map((r) => [...r].map((c) => TERRAIN_CHARS[c])),
  theme,
  chests: [{ x: 3, y: 4, opened: false }],
  seed: 7,
};

const engine = new Engine(document.getElementById('app')!, { quality, resolution: (q.get('res') ?? 'auto') as 'auto' });
const scene = new THREE.Scene();
engine.setScene(scene);
const env = createEnvironment(engine.renderer, scene, theme, { width: map.width, height: map.height }, quality);
engine.setMood(env.mood);
const bf = buildBattlefield(map, quality);
scene.add(bf.group);

// 测试用：几个胶囊代替单位
const capMat = new THREE.MeshStandardMaterial({ color: '#3a7ad8', roughness: 0.4 });
for (const [x, y] of [[5, 5], [6, 3], [9, 3], [11, 8], [2, 2]]) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.4, 6, 12), capMat);
  m.position.copy(bf.tileToWorld(x, y)).add(new THREE.Vector3(0, 0.38, 0));
  m.castShadow = true;
  scene.add(m);
}

const rig = new CameraRig(engine.camera);
rig.setBounds(map.width, map.height);
rig.goal.distance = Number(q.get('dist') ?? 19);
rig.goal.yaw = Number(q.get('yaw') ?? 0);
rig.goal.pitch = Number(q.get('pitch') ?? 0.92);
rig.lookAt(map.width / 2, 0, map.height / 2, true);

engine.onUpdate((dt, t) => {
  rig.update(dt);
  bf.update(dt, t);
  env.update(dt, t, engine.camera);
});
if (q.get('manual') === null) engine.start();
(window as unknown as { __frame: (n: number) => void }).__frame = (n: number) => {
  for (let i = 0; i < n; i++) engine.frame(1 / 30);
};
(window as unknown as { __ready: boolean }).__ready = true;
