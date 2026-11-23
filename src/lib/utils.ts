export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Extrai o File ID de um link do Google Drive
 */
export function extractGoogleDriveId(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Converte automaticamente links do Google Drive, Dropbox ou similares
 * em URLs de streaming direto compatíveis com players de vídeo HTML5.
 */
export function parseMediaUrl(inputUrl: string): string {
  const url = inputUrl.trim();

  // Google Drive: usa o endpoint interno de streaming com suporte a HTTP Range (206) e sem bloqueio CORP
  const driveId = extractGoogleDriveId(url);
  if (driveId) {
    return `/api/video-stream?id=${driveId}`;
  }

  // Dropbox: altera ?dl=0 para ?raw=1 para streaming direto
  if (url.includes('dropbox.com')) {
    return url.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
  }

  return url;
}

/**
 * Obtém a thumbnail / capa automática para links do Google Drive
 */
export function getAutoThumbnail(inputUrl: string): string | null {
  const driveId = extractGoogleDriveId(inputUrl);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  return null;
}

/**
 * Trata e converte links de imagem de capa (Google Drive, Dropbox, links diretos)
 */
export function parseThumbnailUrl(inputUrl: string): string {
  const url = inputUrl.trim();
  if (!url) return '';
  const driveId = extractGoogleDriveId(url);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  if (url.includes('dropbox.com')) {
    return url.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
  }
  return url;
}
