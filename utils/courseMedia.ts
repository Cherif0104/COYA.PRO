/**
 * URLs médias pour lecteur in-plateforme (évite d’ouvrir un onglet externe quand c’est possible).
 */

export function youtubeWatchToEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/\/embed\/([^/?]+)/);
      if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`;
      const s = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (s?.[1]) return `https://www.youtube.com/embed/${s[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function isDirectMediaVideoUrl(url: string): boolean {
  const lower = url.split('?')[0].toLowerCase();
  return /\.(mp4|webm|ogg|mov)(\s|$)/i.test(lower) || lower.includes('video/');
}

export function isPdfDataUrl(url: string): boolean {
  return url.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(url.split('?')[0]);
}

export function isPdfHttpUrl(url: string): boolean {
  try {
    const p = new URL(url).pathname.toLowerCase();
    return p.endsWith('.pdf');
  } catch {
    return false;
  }
}
