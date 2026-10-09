import { S } from '../core/state';

/** 各门派输了以后「问道」去找谁；没写名字的派，回师门问师长（师承的人物在各自的内容包里，没合进来的不点名） */
const WENDAO: Record<string, string> = {
  少林: '回山门，向寂照长老请教这一战输在哪里。',
  武当: '回观里，向清和道长请教：输赢先放一边，招式里哪一处不对。',
  峨眉: '回庵里，向听潮师太请教这一战的得失。',
  华山: '回华山，向柏舟先生请教：剑路对不对，他一眼就看得出。'
};

/** 结算页的「变强之道」：按人、按师门写，不再人人都叫去找了尘 */
export function growthHTML(): string {
  const row = (tag: string, text: string): string => `<div><span class="tag accent">${tag}</span><span>${text}</span></div>`;
  const rows = [
    row('历练', '输了也有收获，这一战已记进历练。闭关时，历练会化成功夫。'),
    row('知彼', '打不过的人，先去打听他的底细：常在他身边的人，往往知道他的软肋。'),
    row('帮手', '一个人打不过，就去找肯帮你的人。你在江湖上做过的事，别人都记着。')
  ];
  const school = S.sect?.school;
  if (school) rows.push(row('问道', WENDAO[school] ?? `回${school}，向师长请教这一战输在哪里。`));
  else if (!S.rel.liaochen) rows.push(row('问道', '大明寺的了尘大师见多识广，不妨去请教。'));
  else rows.push(row('复盘', '回头想想这一战是哪几招吃了亏，下回换个打法。'));
  if (S.wounds.hand + S.wounds.foot + S.wounds.inner > 0) rows.push(row('养伤', '身上带着伤，先找郎中看伤，或者歇上一日，再接着打。'));
  return `<div class="r-sub">变强之道</div><div class="news">${rows.join('')}</div>`;
}
