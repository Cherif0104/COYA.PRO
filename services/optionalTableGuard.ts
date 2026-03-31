type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

const unavailableTables = new Set<string>();
const warnedKeys = new Set<string>();

function toText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  const e = error as SupabaseLikeError;
  return [e.message, e.details, e.hint].filter(Boolean).join(' ');
}

export function extractMissingTableName(error: unknown): string | null {
  const text = toText(error);
  const regexes = [
    /table ['"]?public\.([a-z0-9_]+)['"]?/i,
    /relation ['"]?public\.([a-z0-9_]+)['"]? does not exist/i,
    /relation ['"]?([a-z0-9_]+)['"]? does not exist/i,
  ];
  for (const rx of regexes) {
    const m = text.match(rx);
    if (m?.[1]) return m[1].toLowerCase();
  }
  return null;
}

export function isMissingTableError(error: unknown, tableName?: string): boolean {
  const e = (error || {}) as SupabaseLikeError;
  const text = toText(error).toLowerCase();
  const hasMissingSignature =
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    e.status === 404 ||
    text.includes('could not find the table') ||
    text.includes('does not exist');
  if (!hasMissingSignature) return false;
  if (!tableName) return true;
  return (
    text.includes(`public.${tableName.toLowerCase()}`) ||
    text.includes(`'${tableName.toLowerCase()}'`) ||
    extractMissingTableName(error) === tableName.toLowerCase()
  );
}

export function markTableUnavailable(tableName: string): void {
  unavailableTables.add(tableName.toLowerCase());
}

export function isTableUnavailable(tableName: string): boolean {
  return unavailableTables.has(tableName.toLowerCase());
}

export function warnTableUnavailableOnce(tableName: string, context: string): void {
  const key = `${tableName.toLowerCase()}::${context}`;
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(`Table optionnelle indisponible (${tableName}) dans ${context}. Fallback silencieux activé.`);
}

export function handleOptionalTableError(error: unknown, tableName: string, context: string): boolean {
  if (!isMissingTableError(error, tableName)) return false;
  markTableUnavailable(tableName);
  warnTableUnavailableOnce(tableName, context);
  return true;
}
