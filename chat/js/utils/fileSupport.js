/* 附件类型白名单 + 辅助工具
 *
 * 与后端 backend/app/file_reader.py 的 SUPPORTED_EXTENSIONS / MAX_FILE_BYTES 保持一致。
 * 任何一边改了，记得另一边也改：
 *   - 后端是真理之源（最终守门），前端这里是 UX 预过滤。
 */

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.markdown', '.txt'];

/* 单个文件原始字节上限（10MB）；超过就拒绝，避免 base64 之后撑爆 JSON body。 */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/* 给 <input type="file" accept="..."> 用：扩展名 + 一些常见 MIME，
 * 保险起见两种都给（部分系统按扩展，部分按 MIME）。 */
export const FILE_INPUT_ACCEPT = [
  ...SUPPORTED_EXTENSIONS,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
].join(',');

export function getExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const i = filename.lastIndexOf('.');
  if (i < 0) return '';
  return filename.slice(i).toLowerCase();
}

export function isSupportedFile(filename) {
  return SUPPORTED_EXTENSIONS.includes(getExtension(filename));
}

/**
 * 把一份 List<{file, name, size, type}> 拆成
 *   { accepted, rejected }
 * 两组。rejected 里附 reason 字符串，方便上层弹一次提示。
 */
export function partitionAttachments(list) {
  const accepted = [];
  const rejected = [];
  for (const a of list || []) {
    if (!isSupportedFile(a.name)) {
      rejected.push({ ...a, reason: `不支持的文件类型 ${getExtension(a.name) || '(无后缀)'}` });
      continue;
    }
    if (typeof a.size === 'number' && a.size > MAX_FILE_BYTES) {
      rejected.push({ ...a, reason: `文件过大（${a.size} 字节，上限 ${MAX_FILE_BYTES}）` });
      continue;
    }
    accepted.push(a);
  }
  return { accepted, rejected };
}

/* File → base64（不含 data: 前缀）。失败时 reject Error。 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('readAsDataURL failed'));
    r.onload = () => {
      const result = String(r.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.readAsDataURL(file);
  });
}
