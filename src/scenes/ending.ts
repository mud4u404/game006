/**
 * 结局：职员表滚动 + 队伍回顾
 */
import { audio } from '@/audio';
import { CHARACTERS } from '@/data/characters';
import { getClass } from '@/data/classes';
import { dragonScales } from '@/game/state';
import { h, sleep, waitForConfirm } from '@/ui/dom';
import { portraitHtml } from '@/ui/portraits';
import type { App } from './app';
import { fmtTime } from './title';

export async function runEnding(app: App): Promise<void> {
  const s = app.state;
  const trueEnd = !!s.flags.true_ending;
  audio.playMusic('ending');
  app.engine.setFade(1);
  const roll = h('div.credits-roll');
  const add = (...els: HTMLElement[]) => roll.append(...els);
  add(h('div.cr-title.title-serif', null, '烬龙誓约'), h('div.cr-sub', null, trueEnd ? '—— 真结局 · 并肩的誓约 ——' : '—— 结局 · 赤龙的长眠 ——'));
  add(h('div.cr-head', null, '同行的伙伴'));
  for (const p of s.party) {
    const c = CHARACTERS[p.id];
    add(
      h(
        'div.cr-member',
        null,
        h('div.cr-portrait', { html: portraitHtml(p.id, c?.name ?? p.id, p.fallen ? 'sad' : 'smile') }),
        h('div.cr-info', null, h('div.cr-name', null, c?.name ?? p.id), h('div.muted', null, `${getClass(p.classId).name} Lv${p.level} · 击破 ${p.kills} · 出击 ${p.battles}`), h('div.cr-epi', null, epilogue(p.id, trueEnd))),
      ),
    );
  }
  add(
    h('div.cr-head', null, '冒险记录'),
    h('div.cr-line', null, `游戏时间 ${fmtTime(s.playtime)}`),
    h('div.cr-line', null, `战斗 ${s.record.battles} 场 · 击破 ${s.record.kills} · 回合 ${s.record.turns}`),
    h('div.cr-line', null, `龙鳞残片 ${dragonScales(s)} / 6`),
    h('div.cr-head', null, '制作'),
    h('div.cr-line', null, '剧本 · 系统 · 美术 · 音乐 —— 全部由程序生成'),
    h('div.cr-line', null, '感谢游玩'),
    h('div.cr-end.title-serif', null, 'FIN'),
  );
  const wrap = h('div.screen.credits.interactive', null, roll);
  app.ui.appendChild(wrap);
  await sleep(300);
  roll.classList.add('run');
  await Promise.race([sleep(70000), waitForConfirm(wrap)]);
  wrap.remove();
}

function epilogue(id: string, trueEnd: boolean): string {
  const E: Record<string, [string, string]> = {
    rein: ['重建赤鳞骑士团，每年都会独自登上烬火山，在石碑前坐上一整天。', '重建赤鳞骑士团。据说他的身边总跟着一位红发少女，两人常为甜点争吵。'],
    alicia: ['回到重建的要塞礼拜堂。她的祈祷里，总有一句是献给赤龙的。', '以最后的巫女之名解除了血脉的束缚，在王都开设了孤儿院与医院。'],
    loy: ['如愿成为大陆闻名的骑士，却始终说「第一的位置留给雷恩」。', '成为大陆闻名的骑士，并且终于在一次比武中赢了雷恩——虽然只有一次。'],
    gren: ['又回到了佣兵的生活。只是从那以后，他再也不接欺负弱者的委托。', '用攒下的金币在港城开了一家酒馆，墙上挂着一面赤鳞旗。'],
    fina: ['回到林边的村子，成为远近闻名的猎手与护林人。', '回到林边的村子。她教孩子们射箭时，总会讲起那条会喷火的龙。'],
    lucas: ['接任魔导学院的教职，把恩师的研究中所有可怕的部分亲手烧掉了。', '接任魔导学院的教职，开设了「龙与人」的新学科，学生多得挤不下。'],
    kia: ['用分到的赏金买下了孤儿们的房子，自己依旧在港城的屋顶上奔跑。', '与哥哥一起把孤儿院扩建成了学校，自己当上了「全大陆最凶的校长」。'],
    raven: ['留在了白鸥港，再也没有离开妹妹身边。', '留在了白鸥港，在学校里教孩子们剑术，被琪雅嫌弃太严格。'],
    sera: ['回到雪原，重建诺斯加德的天马骑士团。', '重建诺斯加德的天马骑士团，第一批新骑士里，有不少是平原来的孩子。'],
    hagen: ['回到霜脊山口，继续守着那座桥。桥头多了一块刻着巴尔德名字的石碑。', '回到霜脊山口。桥头的石碑旁，每年都会多出一束不知道是谁放的花。'],
    sieg: ['以赤鳞骑士的身份留在了洛斯坦，在父亲的墓前立下了自己的誓言。', '辞去了一切头衔，在父亲的墓旁搭了间小屋。偶尔会有一条红龙来蹭饭。'],
    igna: ['以生命重新封印了黑龙，在烬火山的心脏中再度长眠。', '不再需要沉睡。她说想看看三百年来人类做出的所有甜点。'],
    balder: ['长眠于霜脊之桥。', '长眠于霜脊之桥。'],
  };
  return E[id]?.[trueEnd ? 1 : 0] ?? '继续着自己的旅程。';
}
