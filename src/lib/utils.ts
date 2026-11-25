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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  // Se for string no formato ISO ou YYYY-MM-DD
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(year, month, day, 12, 0, 0));
    }
  }

  if (date instanceof Date) {
    // Se for meia-noite UTC (00:00:00Z), usa componentes UTC ao meio-dia para evitar retrocesso de 1 dia no fuso do Brasil
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Extrai o dia do mês (1-31) de uma data agendada sem interferência de fuso horário
 */
export function getScheduledDay(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return parseInt(match[3], 10);
    }
  }
  if (date instanceof Date) {
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
      return date.getUTCDate();
    }
    return date.getDate();
  }
  const d = new Date(date);
  return d.getUTCDate();
}

/**
 * Extrai ano, mês (1-12) e dia (1-31) de uma data agendada sem interferência de fuso horário
 */
export function getScheduledYearMonthDay(
  date: Date | string | null | undefined
): { year: number; month: number; day: number } | null {
  if (!date) return null;
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
  }
  if (date instanceof Date) {
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
      };
    }
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Converte qualquer valor de data para string YYYY-MM-DD para uso em <input type="date"> sem desvio de fuso
 */
export function getScheduledDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  if (date instanceof Date) {
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Converte string de data recebida do formulário (YYYY-MM-DD) para Date em 12:00:00Z (meio-dia UTC),
 * garantindo imunidade total a fusos horários ocidentais e orientais.
 */
export function parseDateInput(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
    }
  }
  return new Date(val);
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
