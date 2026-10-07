/**
 * 云存档后台（Supabase 免费版）的地址和公开密钥。设置步骤见 docs/cloud-setup.md。
 * 这两样本来就是公开给网页用的，靠数据库的行级权限保证每人只能读写自己的存档。
 * 留空时，账号功能自动隐藏，游戏照常单机运行。
 */
export const SUPABASE_URL = 'https://yzcsthweybkyljkmdqnc.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_qtw7I4qGIcWN7OzsFy2JcA_1HKEY-61';
/** 用户名换算成的内部邮箱用这个域名；邮箱验证已关，不会真的发信 */
export const EMAIL_DOMAIN = 'players.jianghu-yeyu.net';
