// 纯工具函数：不依赖 React Native / 网络，便于单测

/** 今天的本地日期，格式 YYYY-MM-DD */
export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * 将某次阅读记录归一化为 0-100 的进度。
 * 优先用百分比；否则用「当前页 / 总页数」换算；无法确定返回 null。
 */
export function normalizeProgress(opts: {
  currentPage?: number;
  progressPercent?: number;
  pageCount?: number;
}): number | null {
  const { currentPage, progressPercent, pageCount } = opts;
  if (progressPercent != null && !Number.isNaN(progressPercent)) {
    return clamp(progressPercent, 0, 100);
  }
  if (currentPage != null && pageCount != null && pageCount > 0) {
    return clamp((currentPage / pageCount) * 100, 0, 100);
  }
  return null;
}

/**
 * 解析 AI 提炼要点：按行拆分，去掉行首的序号/项目符号，过滤空行。
 * 支持 "1."、"1、"、"1)"、"-"、"•"、"*" 等前缀。
 */
export function parseKeyPoints(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.replace(/^\s*(?:\d+[\.、\)]|[-•*])\s*/, '').trim())
    .filter((s) => s.length > 0);
}

/**
 * 纯函数：根据已有列，生成缺失列的 ALTER TABLE 语句。
 * 用于老库迁移（补 readCount / rating / aiSummary 等新列）。
 */
export function planColumnMigrations(
  table: string,
  existing: string[],
  desired: Record<string, string>
): string[] {
  const have = new Set(existing);
  const out: string[] = [];
  for (const [col, def] of Object.entries(desired)) {
    if (!have.has(col)) out.push(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
  }
  return out;
}
