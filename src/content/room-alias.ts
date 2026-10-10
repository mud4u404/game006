/**
 * 被并掉的场景：旧 id → 现在的 id（负责人 10-10「同一个地点里堆了太多场景」，docs/changjing-1010.md）。
 * 两处太像、其中一处没有自己的事，就并成一处：保留一个 id，另一个的人和事挪过去，旧 id 记在这里。
 * 读旧档时 core/save.ts 的 repair 按这张表把玩家所在、差事的交差处、世界状态里指着旧 id 的地方改过来；
 * 不升存档版本，旧 id 一直留在表里，不要删。
 * 并之前先 grep 旧 id：人物的 at、世事的 where、差事的 at、出口都要改到新 id（tests/changjing.test.ts 会查）。
 */
export const ROOM_MERGED: Record<string, string> = {};

/** 旧 id 换成现在的 id；本来就是现在的 id，原样返回。表里不会成链，多走几步也是稳妥的 */
export function mergedRoom(id: string): string {
  let cur = id;
  for (let i = 0; i < 8 && ROOM_MERGED[cur] !== undefined; i++) cur = ROOM_MERGED[cur];
  return cur;
}
