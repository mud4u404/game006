import type { ContentPack, FactionDef, RoomLife } from '../types';

/**
 * 扬州的势力和地方的活气（docs/huo-shijie.md 3.2、第四节第一片，engine/shijie.ts）。
 * 只写本来的样子：实力、财力、据点、好恶；地方的治安、繁荣、主人、过路钱。眼下的样子在存档里（GameState.w）。
 * 数都不进人物的嘴，玩家只从人的话、地方的痕迹、价钱里感到。
 *
 * 运河渡口：开局归东舵（漕帮管事守着，屠千山在码头上劫船、卸盐，码头还是东舵的）。
 * 「码头空出来以后」的结局换主人（shishi-yangzhou.ts）：西舵收二十文，和「过一回船先交二十文」对上；东舵五文；府衙的税棚十文。
 */

const FACTIONS: FactionDef[] = [
  { id: 'dong', name: '漕帮东舵', kind: '帮', region: 'yz', power: 50, wealth: 55, holds: ['dukou'],
    rel: { xi: -40, hei: -60, guan: 10 }, lawful: true, head: 'guanshi' },
  // 夜里常有没盐引的盐船靠岸：和盐号走得近，官府眼里不干净
  { id: 'xi', name: '漕帮西舵', kind: '帮', region: 'yz', power: 55, wealth: 45,
    rel: { dong: -40, wang: 30, guan: -10 }, lawful: false, head: 'ss_jiaowu' },
  { id: 'guan', name: '扬州府衙', kind: '官', region: 'yz', power: 60, wealth: 60, holds: ['yz_fuya', 'yz_zhaobi'],
    rel: { hei: -80, xi: -10, gai: -10 }, lawful: true, head: 'fuya_zhou' },
  { id: 'wang', name: '汪家盐号', kind: '商', region: 'yz', power: 35, wealth: 80, holds: ['yz_yanhao'],
    rel: { xi: 30, gai: -30, guan: 20 }, lawful: true, head: 'yh_wanglaoye' },
  // 盐号的打手闯过龙王庙的粥棚（shimen-chaishi.ts）
  { id: 'gai', name: '丐帮扬州分舵', kind: '丐', region: 'yz', power: 30, wealth: 10, holds: ['bs2_longwang'],
    rel: { wang: -30 }, lawful: true, head: 'bs2_bao', sect: '丐帮' },
  // 屠千山倒了以后，二当家带着残部占了蜀冈的山头（xuanshang.ts 的剿匪）
  { id: 'hei', name: '黑风寨残部', kind: '绿林', region: 'yz', power: 45, wealth: 30,
    rel: { guan: -80, dong: -60 }, lawful: false, head: 'tu' }
];

/** 扬州十处有事的地方 */
const LIFE: Record<string, RoomLife> = {
  cheng: { order: 65, prosper: 70, tags: ['街市'] },
  dukou: { order: 50, prosper: 60, owner: 'dong', toll: { dong: 5, xi: 20, guan: 10 }, tags: ['码头'] },
  cheng_tavern: { order: 65, prosper: 65, tags: ['酒楼'] },
  yz_fuya: { order: 85, prosper: 40, owner: 'guan', tags: ['衙门'] },
  yz_zhaobi: { order: 75, prosper: 45, owner: 'guan', tags: ['衙门', '告示'] },
  bs2_longwang: { order: 45, prosper: 20, owner: 'gai', tags: ['破庙'] },
  yz_yanhao: { order: 70, prosper: 75, owner: 'wang', tags: ['铺子', '盐'] },
  yz_guandao: { order: 50, prosper: 35, tags: ['官道'] },
  daming: { order: 80, prosper: 40, tags: ['寺观'] },
  yz_chuanwu: { order: 35, prosper: 15, tags: ['码头', '荒地'] }
};

const pack: ContentPack = { factions: FACTIONS, roomLife: LIFE };
export default pack;
