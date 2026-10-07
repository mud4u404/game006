import { S } from '../../core/state';
import { ITEMS } from '../../content';

export function viewXingnang(): string {
  const rows: string[] = [
    `<div class="item"><div class="ii"><b>青锋剑</b><p>寻常青钢长剑，剑脊上刻着一个「沈」字。</p></div><span class="cnt">兵器 · 装备中</span></div>`
  ];
  for (const it of ITEMS) {
    const n = S.items[it.id] || 0;
    if (!n || it.hidden) continue;
    const useBtn = it.usable ? `<button class="use" data-act="use:${it.id}"${S.hp >= S.hpMax ? ' disabled' : ''}>服用</button>` : '';
    rows.push(`<div class="item"><div class="ii"><b>${it.name}</b><p>${it.desc}</p></div><span class="cnt">×${n}</span>${useBtn}</div>`);
  }
  return `<section class="card"><div class="rows">${rows.join('')}</div></section>
    <section class="card"><div class="kv"><div><span>银两</span><b>${S.silver} 文</b></div><div><span>负重</span><b>轻便</b></div></div></section>`;
}
