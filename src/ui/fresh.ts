/**
 * 战报选句：一场里用过的句子先不再抽，抽完了再从头来（老玩家：三十几合里同一句出现四五回）。
 * used 记在一场战斗里（ui/fight.ts 的 Fight.used）；id 区分不同的句池，同一个池子里各句按序号记。
 */
export function pickFresh<T>(used: Set<string>, id: string, pool: readonly T[], rnd: () => number = Math.random): T {
  let left = pool.map((_, i) => i).filter(i => !used.has(`${id}:${i}`));
  if (!left.length) {
    pool.forEach((_, i) => used.delete(`${id}:${i}`));
    left = pool.map((_, i) => i);
  }
  const i = left[Math.floor(rnd() * left.length)];
  used.add(`${id}:${i}`);
  return pool[i];
}
