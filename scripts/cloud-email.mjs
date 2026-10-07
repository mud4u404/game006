// 用户名换算成内部邮箱。和 src/net/cloud.ts 的 usernameEmail 必须一致，tests/cloud.test.ts 会核对。
export const usernameEmail = (username, domain) =>
  'u' + Array.from(new TextEncoder().encode(username.trim().toLowerCase()), b => b.toString(16).padStart(2, '0')).join('') + '@' + domain;
