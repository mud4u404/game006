// 云存档体检：对真实的 Supabase 项目走一遍注册或登录、写存档、读存档、记历史、匿名读不到别人的存档。
// 用一个固定的体检账号「体检员」，不会每次新建账号。由 .github/workflows/keepalive.yml 运行，也顺带防休眠。
// 用法：node scripts/cloud-check.mjs
import { readFileSync } from 'node:fs';
import { usernameEmail } from './cloud-email.mjs';

const cfg = readFileSync(new URL('../src/net/config.ts', import.meta.url), 'utf8');
const val = name => cfg.match(new RegExp(`export const ${name} = '([^']*)'`))?.[1] ?? '';
const URL_ = val('SUPABASE_URL'), KEY = val('SUPABASE_KEY'), DOMAIN = val('EMAIL_DOMAIN');
if (!URL_ || !KEY) { console.log('还没配置云存档，跳过'); process.exit(0); }


const NAME = '体检员', PASS = 'jhyy-probe-' + KEY.slice(-8);
let ok = true;
const step = (label, good, detail = '') => { console.log(`${good ? '✓' : '✗'} ${label}${detail ? '：' + detail : ''}`); if (!good) ok = false; };
async function call(path, { token, ...init } = {}) {
  const headers = { apikey: KEY, 'content-type': 'application/json', ...(init.headers ?? {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(URL_ + path, { ...init, headers });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}

const st = await call('/auth/v1/settings');
step('读取登录设置', st.status === 200, `允许注册 ${!st.body?.disable_signup}，免邮箱验证 ${!!st.body?.mailer_autoconfirm}`);
if (!st.body?.mailer_autoconfirm) step('邮箱验证已关闭', false, '请在 Authentication → Sign In / Providers → Email 里关掉 Confirm email');

const email = usernameEmail(NAME, DOMAIN);
let a = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: PASS }) });
if (a.status !== 200) {
  a = await call('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password: PASS, data: { username: NAME } }) });
  step('注册体检账号', a.status === 200 && !!a.body?.access_token, `HTTP ${a.status} ${a.status === 200 ? '' : JSON.stringify(a.body)}`);
} else step('登录体检账号', true);
const token = a.body?.access_token, uid = a.body?.user?.id;
if (!token) { console.log('拿不到登录凭证，后面的检查跳过'); process.exit(1); }

const data = { v: 2, name: '体检', probe: new Date().toISOString() };
const w = await call('/rest/v1/saves?on_conflict=user_id', { method: 'POST', token, headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, username: NAME, version: 2, summary: '体检', data, updated_at: new Date().toISOString() }) });
step('写存档', w.status === 201 || w.status === 204 || w.status === 200, `HTTP ${w.status} ${w.body ? JSON.stringify(w.body) : ''}`);
const r = await call(`/rest/v1/saves?select=data&user_id=eq.${uid}`, { token });
step('读回自己的存档', r.status === 200 && r.body?.[0]?.data?.probe === data.probe, `HTTP ${r.status}`);
const h = await call('/rest/v1/save_history', { method: 'POST', token, headers: { prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uid, version: 2, summary: '体检', data }) });
step('记一份历史', h.status === 201 || h.status === 204, `HTTP ${h.status} ${h.body ? JSON.stringify(h.body) : ''}`);
const anon = await call('/rest/v1/saves?select=user_id&limit=5');
step('不登录读不到任何人的存档', anon.status === 200 && Array.isArray(anon.body) && anon.body.length === 0, `HTTP ${anon.status} ${JSON.stringify(anon.body)}`);
console.log(ok ? '云存档体检通过' : '云存档体检没通过');
process.exit(ok ? 0 : 1);
