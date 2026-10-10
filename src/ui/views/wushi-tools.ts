/** 设置页（人物页「存档」一栏）里的巫师工具，只拼 HTML，处理函数在 ui/wushi.ts。普通玩家看不到 */
import { FOES, ROOMS } from '../../content';
import { S } from '../../core/state';
import { wushiOn } from '../../core/wushi';

export function wushiToolsHTML(): string {
  if (!wushiOn()) return '';
  const areas = [...new Set(ROOMS.map(r => r.area))];
  const rooms = areas.map(a => `<optgroup label="${a}">${ROOMS.filter(r => r.area === a).map(r => `<option value="${r.id}"${r.id === S.loc ? ' selected' : ''}>${r.name}</option>`).join('')}</optgroup>`).join('');
  const foes = FOES.map(f => `<option value="${f.id}">${f.name}${f.title ? '（' + f.title + '）' : ''}</option>`).join('');
  return `<div class="wushi-tools"><div class="sec-h"><h2>巫师工具</h2><span class="count">只改本地存档</span></div>
    <label class="muted" for="wsRoom">瞬移到</label>
    <select id="wsRoom">${rooms}</select>
    <div class="btnrow"><button class="act" data-act="wsGo">瞬移</button></div>
    <p class="muted">时辰拨快（世事照常结算）</p>
    <div class="btnrow"><button class="act" data-act="wsHour:1">+1 小时</button><button class="act" data-act="wsHour:6">+6 小时</button><button class="act" data-act="wsHour:24">+24 小时</button></div>
    <div class="btnrow"><button class="act" data-act="wsSilver">银两 +1000</button><button class="act" data-act="saveExport">导出存档码</button></div>
    <label class="muted" for="wsFoe">直接开打</label>
    <select id="wsFoe">${foes}</select>
    <div class="btnrow"><button class="act" data-act="wsFight">开打</button></div>
    <div class="btnrow"><button class="act" data-act="wsOff">关闭巫师模式</button></div></div>`;
}
