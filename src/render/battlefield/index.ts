/**
 * 战场模块入口：地形、水面、植被、建筑与环境
 */
import * as THREE from 'three';
import type { Battlefield, BuildBattlefield, MapData, Quality, TerrainId } from '../contracts';
import { TerrainField } from './field';
import { buildTerrain, type TerrainMeshes } from './terrainMesh';
import { buildWater, type WaterMeshes } from './water';
import { buildProps, type PropMeshes } from './props';
import { buildStructures, type StructureMeshes } from './structures';
import { THEMES } from './themes';

export { createEnvironment } from './environment';
export { THEMES } from './themes';

export const buildBattlefield: BuildBattlefield = (map: MapData, quality: Quality): Battlefield => {
  const th = THEMES[map.theme];
  const tiles = map.tiles.map((r) => [...r]);
  const chests = (map.chests ?? []).map((c) => ({ ...c }));
  const group = new THREE.Group();
  group.name = 'battlefield';

  let field!: TerrainField;
  let terrain!: TerrainMeshes;
  let water!: WaterMeshes;
  let props!: PropMeshes;
  let structures!: StructureMeshes;
  let groundUniforms: { uTime: { value: number } } | undefined;

  const build = () => {
    field = new TerrainField({ ...map, tiles }, th, 10);
    terrain = buildTerrain(field, th, quality);
    water = buildWater(field, th, quality);
    props = buildProps(field, th, quality);
    structures = buildStructures(field, th, quality, chests);
    group.add(terrain.ground, props.group, structures.group);
    if (water.water) group.add(water.water);
    if (water.lava) group.add(water.lava);
    groundUniforms = (terrain.ground.material as THREE.Material).userData.uniforms;
  };
  const teardown = () => {
    group.clear();
    terrain.dispose();
    water.dispose();
    props.dispose();
    structures.dispose();
  };
  build();

  const bf: Battlefield = {
    group,
    heightAt: (x, y) => field.stand(x, y),
    heightAtWorld: (wx, wz) => field.walk(wx, wz),
    tileToWorld(x, y, out = new THREE.Vector3()) {
      return out.set(x + 0.5, field.stand(x, y), y + 0.5);
    },
    get overlayGeometry() {
      return terrain.overlay;
    },
    update(dt, time) {
      water.update(time);
      props.update(time);
      structures.update(dt, time);
      if (groundUniforms) groundUniforms.uTime.value = time;
    },
    setTile(x: number, y: number, t: TerrainId) {
      tiles[y][x] = t;
      const opened = new Set([...structures.chests].filter(([, c]) => c.open).map(([k]) => k));
      for (const c of chests) if (opened.has(`${c.x},${c.y}`)) c.opened = true;
      teardown();
      build();
    },
    openChest(x: number, y: number) {
      const c = chests.find((c) => c.x === x && c.y === y);
      if (c) c.opened = true;
      structures.openChest(x, y);
    },
    dispose() {
      teardown();
    },
  };
  return bf;
};
