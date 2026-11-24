import { prisma } from '../prisma';

export interface GoogleCalendarConnection {
  id: string;
  name: string;
  icalUrl: string | null;
  embedUrl: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO string
  end: string; // ISO string
  allDay: boolean;
  source: 'google' | 'post' | 'demand' | 'recording';
  sourceLabel: string;
  color: string;
  calendarName?: string;
  meetLink?: string;
  clientName?: string;
  status?: string;
}

let isCalendarTableInitialized = false;

async function ensureCalendarTable() {
  if (isCalendarTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS google_calendar_connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ical_url TEXT,
        embed_url TEXT,
        color TEXT NOT NULL DEFAULT '#FD3100',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    isCalendarTableInitialized = true;
  } catch (err) {
    console.error('Erro ao inicializar tabela google_calendar_connections:', err);
  }
}

export async function getGoogleCalendarConnections(): Promise<GoogleCalendarConnection[]> {
  await ensureCalendarTable();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        ical_url: string | null;
        embed_url: string | null;
        color: string;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }>
    >(`
      SELECT id, name, ical_url, embed_url, color, is_active, created_at, updated_at
      FROM google_calendar_connections
      ORDER BY created_at ASC
    `);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icalUrl: r.ical_url,
      embedUrl: r.embed_url,
      color: r.color || '#FD3100',
      isActive: Boolean(r.is_active),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
    }));
  } catch (err) {
    console.error('Erro ao buscar conexões do Google Agenda:', err);
    return [];
  }
}

export async function saveGoogleCalendarConnection(data: {
  name: string;
  icalUrl?: string | null;
  embedUrl?: string | null;
  color?: string;
}): Promise<GoogleCalendarConnection> {
  await ensureCalendarTable();
  const id = `gcal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const normalizedIcal = normalizeIcalUrl(data.icalUrl);
  const normalizedEmbed = normalizeEmbedUrl(data.embedUrl);
  const color = data.color || '#FD3100';

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO google_calendar_connections (id, name, ical_url, embed_url, color, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
    `,
    id,
    data.name.trim() || 'Minha Agenda Google',
    normalizedIcal,
    normalizedEmbed,
    color
  );

  return {
    id,
    name: data.name.trim() || 'Minha Agenda Google',
    icalUrl: normalizedIcal,
    embedUrl: normalizedEmbed,
    color,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteGoogleCalendarConnection(id: string): Promise<boolean> {
  await ensureCalendarTable();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM google_calendar_connections WHERE id = $1`,
      id
    );
    return true;
  } catch (err) {
    console.error('Erro ao remover conexão do Google Agenda:', err);
    return false;
  }
}

export function normalizeIcalUrl(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  let url = raw.trim();
  if (url.startsWith('webcal://')) {
    url = 'https://' + url.slice('webcal://'.length);
  }
  return url;
}

export function normalizeEmbedUrl(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Caso o usuário cole o <iframe src="..."> inteiro do Google Agenda
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1];
  }

  // Caso o usuário cole apenas o e-mail do Google (ex: contato@gmail.com)
  if (!trimmed.startsWith('http') && trimmed.includes('@')) {
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(trimmed)}&ctz=America%2FSao_Paulo`;
  }

  return trimmed;
}

function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function unfoldIcalLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Linhas dobradas no padrão RFC 5545 começam com espaço ou tab
  const unfolded = normalized.replace(/\n[ \t]/g, '');
  return unfolded.split('\n');
}

function parseIcalDate(rawValue: string, paramsPart = ''): { date: Date; allDay: boolean } | null {
  const value = rawValue.trim();

  // Formato somente data: YYYYMMDD (evento de dia inteiro)
  const dateOnlyMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnlyMatch) {
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10) - 1;
    const day = parseInt(dateOnlyMatch[3], 10);
    // Usa meio-dia UTC para evitar deslocamento de dia em qualquer fuso horário
    return {
      date: new Date(Date.UTC(year, month, day, 12, 0, 0)),
      allDay: true,
    };
  }

  // Formato data+hora: YYYYMMDDTHHMMSSZ ou YYYYMMDDTHHMMSS
  const dateTimeMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dateTimeMatch) {
    const year = parseInt(dateTimeMatch[1], 10);
    const month = parseInt(dateTimeMatch[2], 10) - 1;
    const day = parseInt(dateTimeMatch[3], 10);
    const hour = parseInt(dateTimeMatch[4], 10);
    const minute = parseInt(dateTimeMatch[5], 10);
    const second = parseInt(dateTimeMatch[6], 10);
    const isUtc = dateTimeMatch[7] === 'Z';

    if (isUtc) {
      return {
        date: new Date(Date.UTC(year, month, day, hour, minute, second)),
        allDay: false,
      };
    }

    // Se vier com TZID=America/Sao_Paulo (UTC-3), converte para UTC adicionando +3h
    if (paramsPart.includes('America/Sao_Paulo') || paramsPart.includes('America/Fortaleza')) {
      return {
        date: new Date(Date.UTC(year, month, day, hour + 3, minute, second)),
        allDay: false,
      };
    }

    // Fallback padrão para horário local de Brasília (UTC-3)
    return {
      date: new Date(Date.UTC(year, month, day, hour + 3, minute, second)),
      allDay: false,
    };
  }

  return null;
}

function extractMeetLink(description?: string, location?: string): string | undefined {
  const combined = `${description || ''} ${location || ''}`;
  const match = combined.match(/https:\/\/(?:meet\.google\.com|us\d+web\.zoom\.us|teams\.microsoft\.com)[^\s<>"']+/i);
  return match ? match[0] : undefined;
}

export async function fetchIcalEvents(
  connection: GoogleCalendarConnection,
  rangeStart: Date,
  rangeEnd: Date
): Promise<{ events: CalendarEventItem[]; error?: string }> {
  if (!connection.icalUrl) {
    return { events: [] };
  }

  try {
    const res = await fetch(connection.icalUrl, {
      headers: {
        'User-Agent': 'VB-Agencia-Calendar-Sync/1.0',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        events: [],
        error: `Não foi possível ler o feed iCal (HTTP ${res.status}). Verifique se o link secreto do Google Agenda está correto.`,
      };
    }

    const icsText = await res.text();
    if (!icsText.includes('BEGIN:VCALENDAR')) {
      return {
        events: [],
        error: 'O link informado não retornou uma agenda iCal (.ics) válida.',
      };
    }

    const lines = unfoldIcalLines(icsText);
    const parsedEvents: CalendarEventItem[] = [];

    let inEvent = false;
    let uid = '';
    let summary = '';
    let description = '';
    let location = '';
    let status = '';
    let dtStart: { date: Date; allDay: boolean } | null = null;
    let dtEnd: { date: Date; allDay: boolean } | null = null;
    let rrule = '';

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        uid = '';
        summary = '';
        description = '';
        location = '';
        status = '';
        dtStart = null;
        dtEnd = null;
        rrule = '';
        continue;
      }

      if (line === 'END:VEVENT') {
        inEvent = false;
        if (dtStart && summary) {
          const endObj = dtEnd || {
            date: new Date(dtStart.date.getTime() + (dtStart.allDay ? 0 : 60 * 60 * 1000)),
            allDay: dtStart.allDay,
          };

          const baseEvent: CalendarEventItem = {
            id: `${connection.id}_${uid || dtStart.date.getTime()}`,
            title: summary,
            description: description || undefined,
            location: location || undefined,
            start: dtStart.date.toISOString(),
            end: endObj.date.toISOString(),
            allDay: dtStart.allDay,
            source: 'google',
            sourceLabel: 'Google Agenda',
            color: connection.color || '#FD3100',
            calendarName: connection.name,
            meetLink: extractMeetLink(description, location),
            status: status || undefined,
          };

          // Verifica recorrência simples (WEEKLY / MONTHLY / YEARLY) dentro da janela solicitada
          if (rrule && dtStart.date <= rangeEnd) {
            const expanded = expandSimpleRecurrence(baseEvent, dtStart.date, endObj.date, rrule, rangeStart, rangeEnd);
            parsedEvents.push(...expanded);
          } else if (dtStart.date >= rangeStart && dtStart.date <= rangeEnd) {
            parsedEvents.push(baseEvent);
          } else if (endObj.date >= rangeStart && dtStart.date <= rangeEnd) {
            parsedEvents.push(baseEvent);
          }
        }
        continue;
      }

      if (!inEvent) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const keyPart = line.slice(0, colonIdx);
      const valuePart = line.slice(colonIdx + 1);
      const semiIdx = keyPart.indexOf(';');
      const propName = (semiIdx === -1 ? keyPart : keyPart.slice(0, semiIdx)).toUpperCase();
      const paramsPart = semiIdx === -1 ? '' : keyPart.slice(semiIdx + 1);

      switch (propName) {
        case 'UID':
          uid = valuePart.trim();
          break;
        case 'SUMMARY':
          summary = unescapeIcalText(valuePart);
          break;
        case 'DESCRIPTION':
          description = unescapeIcalText(valuePart);
          break;
        case 'LOCATION':
          location = unescapeIcalText(valuePart);
          break;
        case 'STATUS':
          status = valuePart.trim();
          break;
        case 'DTSTART':
          dtStart = parseIcalDate(valuePart, paramsPart);
          break;
        case 'DTEND':
          dtEnd = parseIcalDate(valuePart, paramsPart);
          break;
        case 'RRULE':
          rrule = valuePart.trim();
          break;
      }
    }

    return { events: parsedEvents };
  } catch (err: any) {
    console.error('Erro ao buscar eventos iCal:', err);
    return {
      events: [],
      error: 'Falha de conexão ao sincronizar com o Google Agenda.',
    };
  }
}

function expandSimpleRecurrence(
  base: CalendarEventItem,
  startDate: Date,
  endDate: Date,
  rrule: string,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventItem[] {
  const results: CalendarEventItem[] = [];
  const freqMatch = rrule.match(/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i);
  if (!freqMatch) {
    if (startDate >= rangeStart && startDate <= rangeEnd) return [base];
    return [];
  }

  const freq = freqMatch[1].toUpperCase();
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/i);
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;
  const countMatch = rrule.match(/COUNT=(\d+)/i);
  const maxCount = countMatch ? parseInt(countMatch[1], 10) : 120;

  let untilDate: Date | null = null;
  const untilMatch = rrule.match(/UNTIL=(\d{8}(?:T\d{6}Z?)?)/i);
  if (untilMatch) {
    const parsedUntil = parseIcalDate(untilMatch[1]);
    if (parsedUntil) untilDate = parsedUntil.date;
  }

  const durationMs = endDate.getTime() - startDate.getTime();
  const current = new Date(startDate.getTime());
  let occurrences = 0;

  while (current <= rangeEnd && occurrences < maxCount && occurrences < 180) {
    if (untilDate && current > untilDate) break;

    if (current >= rangeStart) {
      const occEnd = new Date(current.getTime() + durationMs);
      results.push({
        ...base,
        id: `${base.id}_occ_${current.getTime()}`,
        start: current.toISOString(),
        end: occEnd.toISOString(),
      });
    }

    occurrences++;
    if (freq === 'DAILY') {
      current.setUTCDate(current.getUTCDate() + interval);
    } else if (freq === 'WEEKLY') {
      current.setUTCDate(current.getUTCDate() + 7 * interval);
    } else if (freq === 'MONTHLY') {
      current.setUTCMonth(current.getUTCMonth() + interval);
    } else if (freq === 'YEARLY') {
      current.setUTCFullYear(current.getUTCFullYear() + interval);
    }
  }

  return results;
}

function toNoonUtcIso(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)).toISOString();
}

export async function getAgencyUnifiedEvents(rangeStart: Date, rangeEnd: Date): Promise<CalendarEventItem[]> {
  const unified: CalendarEventItem[] = [];

  try {
    // 1. Publicações agendadas dos clientes
    const posts = await prisma.post.findMany({
      where: {
        scheduledDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        client: {
          select: { name: true },
        },
      },
    });

    for (const p of posts) {
      if (!p.scheduledDate) continue;
      const iso = toNoonUtcIso(p.scheduledDate);
      unified.push({
        id: `post_${p.id}`,
        title: `Post: ${p.title}`,
        description: `Cliente: ${p.client?.name || 'Cliente'} • Formato: ${p.format} • Status: ${p.status}`,
        start: iso,
        end: iso,
        allDay: true,
        source: 'post',
        sourceLabel: 'Post Agendado',
        color: '#059669',
        clientName: p.client?.name,
        status: p.status,
      });
    }

    // 2. Demandas com prazo (Trello)
    const demands = await prisma.demand.findMany({
      where: {
        dueDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        completed: false,
      },
      include: {
        client: {
          select: { name: true },
        },
      },
    });

    for (const d of demands) {
      if (!d.dueDate) continue;
      const iso = toNoonUtcIso(d.dueDate);
      unified.push({
        id: `demand_${d.id}`,
        title: `Prazo: ${d.title}`,
        description: d.description || (d.client?.name ? `Cliente: ${d.client.name}` : 'Demanda interna da agência'),
        start: iso,
        end: iso,
        allDay: true,
        source: 'demand',
        sourceLabel: 'Prazo Demanda',
        color: '#D97706',
        clientName: d.client?.name,
        status: d.priority,
      });
    }

    // 3. Captações / Roteiros de gravação
    const scripts = await prisma.recordingScript.findMany({
      where: {
        recordingDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        client: {
          select: { name: true },
        },
      },
    });

    for (const s of scripts) {
      if (!s.recordingDate) continue;
      const iso = toNoonUtcIso(s.recordingDate);
      unified.push({
        id: `rec_${s.id}`,
        title: `Captação: ${s.title}`,
        description: `Cliente: ${s.client?.name || 'Cliente'} • Status: ${s.status}`,
        start: iso,
        end: iso,
        allDay: true,
        source: 'recording',
        sourceLabel: 'Captação',
        color: '#7C3AED',
        clientName: s.client?.name,
        status: s.status,
      });
    }
  } catch (err) {
    console.error('Erro ao buscar eventos unificados da agência:', err);
  }

  return unified;
}
