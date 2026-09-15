/** Minimal, dependency-free CSV helpers used by the admin export buttons. */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function toCsv(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  if (rows.length === 0) return '';
  const cols = headers ?? Object.keys(rows[0]);
  const lines = [cols.join(',')];
  for (const row of rows) lines.push(cols.map((c) => escapeCell(row[c])).join(','));
  return lines.join('\n');
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, headers?: string[]): boolean {
  const csv = toCsv(rows, headers);
  if (!csv) return false;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
