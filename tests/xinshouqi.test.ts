/**
 * 新手期修为不卡时间（Issue #547）：
 * 10-10 试玩「第一次闭关七日升到略有小成，很爽；第二次就撞上『现实一个钟头添一日』，
 * 半小时内想靠修炼赢屠千山走不通」「起手只有三十文，客栈一百文一宿，闭关当场变成露宿、
 * 打坐打折，事先不知道」。
 *
 * 三条：开局前十日额度不限现实时辰；起手二百五十文；闭关前说得清住哪。
 */
import { describe, expect, it } from 'vitest';
import { S, newGame, setState } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { LODGING, XINSHOU_DAYS, allowance, inXinshou } from '../src/engine/shiguang';
import { zhuHint } from '../src/ui/views/wugong';

setNowMs(() => 1_700_000_000_000);

/** 推进 n 个江湖日（日期变了，现实时钟一点没动） */
const 过几天 = (n: number): void => {
  S.day += n;
  while (S.day > 30) { S.day -= 30; S.month++; if (S.month > 12) { S.month -= 12; S.year++; } }
};

describe('新手期：前十日修为长得快', () => {
  it('新档第一到第十日，额度不看现实时辰', () => {
    setState(newGame());
    expect(inXinshou(S), '开局当天该在新手期').toBe(true);
    const 满 = LODGING.inn * 0 + allowance(S);
    for (let d = 0; d < XINSHOU_DAYS - 1; d++) {
      过几天(1);
      expect(inXinshou(S), `第 ${d + 2} 日还在新手期`).toBe(true);
      // 额度始终是满的，不随现实小时数掉
      expect(allowance(S), `第 ${d + 2} 日额度只剩 ${allowance(S)}`).toBe(满);
    }
  });

  it('新档连着闭关两次，两次都长得出修为', () => {
    setState(newGame());
    const a1 = allowance(S);
    expect(a1, '第一次闭关的额度').toBeGreaterThan(0);
    过几天(1);
    const a2 = allowance(S);
    expect(a2, '第二次闭关的额度').toBeGreaterThan(0);
    // 现实时钟没动过，日期却走了两天——这正是「半小时内想修炼赢屠千山」的情形
    expect(a1).toBe(a2);
  });

  it('第十一日起照旧受额度限', () => {
    setState(newGame());
    过几天(XINSHOU_DAYS);
    expect(inXinshou(S), `第 ${XINSHOU_DAYS + 1} 日该出新手期了`).toBe(false);
    // 现实一个钟头都没过：额度只剩 slack 减去已经长掉的
    expect(allowance(S)).toBeLessThan(LODGING.inn * 0 + 26);
  });
});

describe('起手钱', () => {
  it('新档二百五十文，够两晚客栈加一副金疮药', () => {
    setState(newGame());
    expect(S.silver).toBe(250);
    expect(S.silver).toBeGreaterThanOrEqual(LODGING.inn * 2);
    expect(S.silver).toBeGreaterThanOrEqual(LODGING.inn * 2 + 20);
  });
});

describe('闭关前把后果说清', () => {
  it('钱不够住客栈就直接说出来，别等点完才发现变露宿', () => {
    setState(newGame());
    S.zhu = 'inn';
    S.silver = LODGING.inn - 1;
    const t = zhuHint(S);
    expect(t, `钱不够却说「${t}」`).toContain('钱不够');
    expect(t).toContain('露宿');
    expect(t).toContain('八折');
  });

  it('露宿就写「打坐参悟打八折」', () => {
    setState(newGame());
    S.zhu = 'lusu';
    expect(zhuHint(S)).toContain('八折');
  });

  it('钱够住客栈就说明白，说的是全额的长', () => {
    setState(newGame());
    S.zhu = 'inn';
    S.silver = LODGING.inn * 3;
    const t = zhuHint(S);
    expect(t).toContain('客栈');
    expect(t).not.toContain('钱不够');
  });
});