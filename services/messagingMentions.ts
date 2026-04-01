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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
