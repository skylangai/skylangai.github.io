/* 收集"请求当下"的客户端环境信息（时间 + 时区 + 地区），
 * 跟着 chat 请求一起发给后端，让 LLM 在 system prompt 里能拿到。
 *
 * 设计要点：
 *  - 全部用浏览器内置 Intl / navigator API；不发起 IP 定位、不弹权限框，
 *    所以拿不到精确街道级城市，但能拿到"足够 LLM 推理用"的时区/国家。
 *  - datetime 用 ISO 8601 + 显式 ±HH:MM 偏移（即时区偏移），
 *    格式 "2026-05-09T13:49:00+08:00"，全球都能解析。
 *  - timezone 用 IANA tz database 名字（如 "Asia/Shanghai"）；
 *    这一项就隐含了"哪座城市"——比 IP 反查准、且不需要权限。
 *  - locale 用 BCP 47（如 "zh-CN"）。
 *  - country 用 ISO 3166-1 alpha-2（如 "CN"），从 locale 末尾切出。
 *  - 拿不到的字段直接省略，让后端兜底（不发 null，避免无意义字段进 prompt）。
 */

export function buildClientContext() {
  const ctx = {};

  ctx.datetime = isoWithOffset(new Date());

  let tz;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    /* 古早浏览器没有 Intl 时静默放过 */
  }
  if (tz && typeof tz === 'string') ctx.timezone = tz;

  const lang = (navigator.language || '').trim();
  if (lang) {
    ctx.locale = lang;
    /* 'zh-CN' / 'en-US' / 'pt-BR' / 'sr-Cyrl-RS' 末段必为国家码（也可能有脚本段） */
    const parts = lang.split('-');
    if (parts.length >= 2) {
      const cc = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2}$/.test(cc)) ctx.country = cc;
    }
  }

  return ctx;
}

/* ISO 8601 with ±HH:MM offset；不用 toISOString() 是因为它强制 UTC，丢掉本地时区。 */
function isoWithOffset(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();         // 分钟数；东 8 区是 +480
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes()) +
    ':' + pad(d.getSeconds()) +
    sign + oh + ':' + om
  );
}
