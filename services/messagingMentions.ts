/**
 * Mentions messagerie type WhatsApp/Slack : @prénom, @email, @everyone, @canal, etc.
 */

export type MentionProfile = { id: string; fullName?: string; email?: string };

const EVERYONE_TOKENS = new Set(['everyone', 'tous', 'all', 'channel', 'canal', 'ici']);

export function isBroadcastMention(content: string): boolean {
  const tokens = Array.from(content.matchAll(/@([^\s@]+)/gi)).map((m) => m[1].toLowerCase());
  return tokens.some((t) => EVERYONE_TOKENS.has(t));
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '');
}

export const MENTION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_RE = MENTION_UUID_RE;

/** Identifiant « un mot » pour une mention (accents / espaces retirés), pour insertion depuis l’UI. */
export function mentionCompactNameToken(fullName: string): string {
  return normalizeName(String(fullName || '')).replace(/[^a-z0-9]/g, '') || 'user';
}

export function getActiveMentionQuery(
  text: string,
  cursorPos: number,
): { start: number; end: number; query: string } | null {
  const before = text.slice(0, Math.min(cursorPos, text.length));
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0) {
    const c = before.charAt(at - 1);
    if (c !== ' ' && c !== '\n' && c !== '\t') return null;
  }
  const afterAt = before.slice(at + 1);
  if (/[\s\n\t]/.test(afterAt)) return null;
  return { start: at, end: cursorPos, query: afterAt };
}

export function filterProfilesForMentionPicker(
  profiles: MentionProfile[],
  query: string,
  opts?: { onlyAmongIds?: string[] },
  limit = 12,
): MentionProfile[] {
  let list = profiles;
  if (opts?.onlyAmongIds?.length) {
    const set = new Set(opts.onlyAmongIds);
    list = list.filter((p) => set.has(p.id));
  }
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, limit);
  return list
    .filter((p) => {
      const name = String(p.fullName || '').toLowerCase();
      const email = String(p.email || '').toLowerCase();
      const local = email.split('@')[0] || '';
      return (
        name.includes(q) ||
        email.includes(q) ||
        local.startsWith(q) ||
        (local.length >= 2 && local.includes(q))
      );
    })
    .slice(0, limit);
}

/** Token à insérer après @ : préfixe e-mail ou nom compact, ou UUID si collision. */
export function mentionInsertToken(p: MentionProfile, scope: MentionProfile[]): string {
  const normLocal = (email: string) =>
    String(email || '')
      .toLowerCase()
      .split('@')[0]
      .replace(/[^a-z0-9._-]/g, '');
  const ep = normLocal(p.email || '');
  if (ep.length >= 2) {
    const dup = scope.some((o) => o.id !== p.id && normLocal(o.email || '') === ep);
    if (!dup) return ep;
  }
  const compact = mentionCompactNameToken(p.fullName || '');
  if (compact.length >= 2 && compact !== 'user') {
    const dup2 = scope.some((o) => o.id !== p.id && mentionCompactNameToken(o.fullName || '') === compact);
    if (!dup2) return compact;
  }
  return p.id;
}

/**
 * Profils mentionnés explicitement (hors @everyone / @channel).
 * Si onlyAmongMemberIds est défini, on ne retient que les membres du canal.
 */
export function extractMentionedProfileIds(
  content: string,
  profiles: MentionProfile[],
  opts?: { onlyAmongMemberIds?: string[] },
): string[] {
  const memberSet = opts?.onlyAmongMemberIds?.length ? new Set(opts.onlyAmongMemberIds) : null;
  const tokens = Array.from(content.matchAll(/@([^\s@]+)/gi)).map((m) => m[1].trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (EVERYONE_TOKENS.has(t)) continue;

    let matched: MentionProfile | undefined;

    if (UUID_RE.test(raw)) {
      matched = profiles.find((p) => p.id === raw);
    }
    if (!matched) {
      matched = profiles.find((p) => {
        if (memberSet && !memberSet.has(p.id)) return false;
        const emailPrefix = String(p.email || '').toLowerCase().split('@')[0];
        const full = normalizeName(String(p.fullName || ''));
        const first = String(p.fullName || '')
          .trim()
          .split(/\s+/)[0]
          ?.toLowerCase() || '';
        const last = String(p.fullName || '')
          .trim()
          .split(/\s+/)
          .pop()
          ?.toLowerCase() || '';
        return (
          t === emailPrefix ||
          t === full ||
          t === first ||
          t === last ||
          (full.length >= 3 && full.startsWith(t)) ||
          (first.length >= 2 && t.startsWith(first))
        );
      });
    }

    if (matched && !seen.has(matched.id)) {
      seen.add(matched.id);
      out.push(matched.id);
    }
  }
  return out;
}
