import { S } from '../../core/state';
import { ITEMS } from '../../content';

export function viewXingnang(): string {
  const rows: string[] = [];
  for (const it of ITEMS) {
    const n = S.items[it.id] || 0;
    if (!n || it.hidden) continue;
    if (it.equip) {
      const on = S.gear.weapon === it.id;
      rows.push(`<div class="item"><div class="ii"><b>${it.name}</b><p>${it.desc}</p></div><span class="cnt">${it.equip.weapon} · ${on ? '装备中' : '在行囊里'}</span><button class="use" data-act="wield:${on ? '' : it.id}">${on ? '卸下' : '装备'}</button></div>`);
      continue;
    }
    const useBtn = it.usable ? `<button class="use" data-act="use:${it.id}"${S.hp >= S.hpMax ? ' disabled' : ''}>服用</button>` : '';
    rows.push(`<div class="item"><div class="ii"><b>${it.name}</b><p>${it.desc}</p></div><span class="cnt">×${n}</span>${useBtn}</div>`);
  }
  return `<section class="card"><div class="rows">${rows.join('')}</div></section>
    <section class="card"><div class="kv"><div><span>银两</span><b>${S.silver} 文</b></div></div></section>`;
}
