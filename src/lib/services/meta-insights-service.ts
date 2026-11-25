import { prisma } from '../prisma';
import { getClientMonthlyMetrics, upsertClientMonthlyMetric, MonthlyMetricItem } from './metrics-service';

const META_GRAPH_VERSION = 'v21.0';

export interface MetaClientConnection {
  clientId: string;
  igAccountId: string;
  igUsername: string | null;
  adAccountId: string | null;
  updatedAt: string;
}

export interface DiscoveredIgAccount {
  igAccountId: string;
  username: string;
  name: string;
  pageName: string;
  followersCount: number;
}

export interface DiscoveredAdAccount {
  id: string; // act_123...
  name: string;
}

let isMetaTablesInitialized = false;

async function ensureMetaTables() {
  if (isMetaTablesInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meta_agency_config (
        id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meta_client_connections (
        client_id TEXT PRIMARY KEY,
        ig_account_id TEXT NOT NULL,
        ig_username TEXT,
        ad_account_id TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    isMetaTablesInitialized = true;
  } catch (err) {
    console.error('Erro ao inicializar tabelas Meta:', err);
  }
}

export async function getAgencyMetaToken(): Promise<string | null> {
  await ensureMetaTables();
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ access_token: string }>>(
      `SELECT access_token FROM meta_agency_config WHERE id = 'default' LIMIT 1`
    );
    return rows[0]?.access_token || process.env.META_SYSTEM_USER_TOKEN || null;
  } catch (err) {
    console.error('Erro ao buscar token Meta:', err);
    return process.env.META_SYSTEM_USER_TOKEN || null;
  }
}

export async function saveAgencyMetaToken(token: string): Promise<void> {
  await ensureMetaTables();
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO meta_agency_config (id, access_token, updated_at)
    VALUES ('default', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      updated_at = NOW()
    `,
    token.trim()
  );
}

export async function getMetaClientConnection(clientId: string): Promise<MetaClientConnection | null> {
  await ensureMetaTables();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        client_id: string;
        ig_account_id: string;
        ig_username: string | null;
        ad_account_id: string | null;
        updated_at: Date;
      }>
    >(
      `SELECT client_id, ig_account_id, ig_username, ad_account_id, updated_at FROM meta_client_connections WHERE client_id = $1 LIMIT 1`,
      clientId
    );
    if (!rows[0]) return null;
    return {
      clientId: rows[0].client_id,
      igAccountId: rows[0].ig_account_id,
      igUsername: rows[0].ig_username,
      adAccountId: rows[0].ad_account_id,
      updatedAt:
        rows[0].updated_at instanceof Date
          ? rows[0].updated_at.toISOString()
          : String(rows[0].updated_at),
    };
  } catch (err) {
    console.error('Erro ao buscar conexão Meta do cliente:', err);
    return null;
  }
}

export async function saveMetaClientConnection(data: {
  clientId: string;
  igAccountId: string;
  igUsername?: string | null;
  adAccountId?: string | null;
}): Promise<MetaClientConnection> {
  await ensureMetaTables();
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO meta_client_connections (client_id, ig_account_id, ig_username, ad_account_id, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (client_id) DO UPDATE SET
      ig_account_id = EXCLUDED.ig_account_id,
      ig_username = EXCLUDED.ig_username,
      ad_account_id = EXCLUDED.ad_account_id,
      updated_at = NOW()
    `,
    data.clientId,
    data.igAccountId.trim(),
    data.igUsername?.trim() || null,
    data.adAccountId?.trim() || null
  );

  return {
    clientId: data.clientId,
    igAccountId: data.igAccountId.trim(),
    igUsername: data.igUsername?.trim() || null,
    adAccountId: data.adAccountId?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteMetaClientConnection(clientId: string): Promise<void> {
  await ensureMetaTables();
  await prisma.$executeRawUnsafe(
    `DELETE FROM meta_client_connections WHERE client_id = $1`,
    clientId
  );
}

export async function discoverMetaAccounts(accessToken: string): Promise<{
  igAccounts: DiscoveredIgAccount[];
  adAccounts: DiscoveredAdAccount[];
  error?: string;
}> {
  const token = accessToken.trim();
  if (!token) {
    return { igAccounts: [], adAccounts: [], error: 'Token da Meta não informado.' };
  }

  try {
    const pagesUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,instagram_business_account{id,username,name,followers_count}&limit=100&access_token=${encodeURIComponent(token)}`;
    const pagesRes = await fetch(pagesUrl, { cache: 'no-store' });
    const pagesJson = await pagesRes.json();

    if (pagesJson.error) {
      return {
        igAccounts: [],
        adAccounts: [],
        error: `Erro da Meta: ${pagesJson.error.message || 'Token inválido ou sem permissões.'}`,
      };
    }

    const igAccounts: DiscoveredIgAccount[] = [];
    for (const page of pagesJson.data || []) {
      const ig = page.instagram_business_account;
      if (ig?.id) {
        igAccounts.push({
          igAccountId: String(ig.id),
          username: ig.username || page.name || String(ig.id),
          name: ig.name || page.name || '',
          pageName: page.name || '',
          followersCount: Number(ig.followers_count || 0),
        });
      }
    }

    // Busca contas de anúncios (opcional, caso o token tenha ads_read)
    const adAccounts: DiscoveredAdAccount[] = [];
    try {
      const adsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts?fields=id,name&limit=100&access_token=${encodeURIComponent(token)}`;
      const adsRes = await fetch(adsUrl, { cache: 'no-store' });
      const adsJson = await adsRes.json();
      if (Array.isArray(adsJson.data)) {
        for (const acc of adsJson.data) {
          adAccounts.push({
            id: String(acc.id),
            name: acc.name || String(acc.id),
          });
        }
      }
    } catch {
      // Ignora caso o token não tenha permissão ads_read
    }

    return { igAccounts, adAccounts };
  } catch (err: any) {
    console.error('Erro ao listar contas Meta:', err);
    return {
      igAccounts: [],
      adAccounts: [],
      error: 'Não foi possível conectar à API da Meta.',
    };
  }
}

async function fetchIgInsightTotal(
  igAccountId: string,
  token: string,
  metric: string,
  sinceTs: number,
  untilTs: number,
  metricType: 'total_value' | 'time_series' = 'total_value'
): Promise<number | null> {
  try {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(igAccountId)}/insights?metric=${encodeURIComponent(metric)}&period=day&metric_type=${metricType}&since=${sinceTs}&until=${untilTs}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();

    if (json.error || !Array.isArray(json.data) || json.data.length === 0) {
      return null;
    }

    const entry = json.data[0];
    if (entry.total_value && typeof entry.total_value.value === 'number') {
      return entry.total_value.value;
    }
    if (Array.isArray(entry.values)) {
      return entry.values.reduce((acc: number, v: any) => acc + Number(v.value || 0), 0);
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncClientMetricsFromMeta(params: {
  clientId: string;
  month: number;
  year: number;
}): Promise<{ metric: MonthlyMetricItem | null; warnings: string[]; error?: string }> {
  const token = await getAgencyMetaToken();
  if (!token) {
    return {
      metric: null,
      warnings: [],
      error: 'Nenhum Token do Meta Business configurado. Clique em "Conectar Meta / Instagram" primeiro.',
    };
  }

  const conn = await getMetaClientConnection(params.clientId);
  if (!conn || !conn.igAccountId) {
    return {
      metric: null,
      warnings: [],
      error: 'Este cliente ainda não está vinculado a uma conta do Instagram no Meta Business.',
    };
  }

  const warnings: string[] = [];

  // Janela do mês em UNIX timestamp (limitada a no máximo hoje caso seja o mês corrente)
  const monthStart = new Date(Date.UTC(params.year, params.month - 1, 1, 3, 0, 0));
  const monthEnd = new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59));
  const now = new Date();
  const effectiveEnd = monthEnd > now ? now : monthEnd;

  if (monthStart > now) {
    return {
      metric: null,
      warnings: [],
      error: 'Não é possível puxar métricas da Meta para um mês futuro.',
    };
  }

  // A API do Instagram aceita no máximo 30 dias por consulta; dividimos em janelas de até 28 dias se necessário
  const chunkRanges: Array<{ since: number; until: number }> = [];
  let cursor = Math.floor(monthStart.getTime() / 1000);
  const endTs = Math.floor(effectiveEnd.getTime() / 1000);
  const MAX_CHUNK = 28 * 24 * 60 * 60;

  while (cursor < endTs) {
    const nextEnd = Math.min(endTs, cursor + MAX_CHUNK);
    chunkRanges.push({ since: cursor, until: nextEnd });
    cursor = nextEnd + 1;
  }

  // 1. Seguidores atuais da conta
  let followersTotal = 0;
  try {
    const profileUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(conn.igAccountId)}?fields=followers_count,username&access_token=${encodeURIComponent(token)}`;
    const profileRes = await fetch(profileUrl, { cache: 'no-store' });
    const profileJson = await profileRes.json();
    if (profileJson.error) {
      return {
        metric: null,
        warnings: [],
        error: `Erro da Meta ao acessar conta: ${profileJson.error.message}`,
      };
    }
    followersTotal = Number(profileJson.followers_count || 0);
  } catch (err) {
    warnings.push('Não foi possível ler o total de seguidores.');
  }

  // 2. Soma métricas do período (suporta meses de 30/31 dias via chunks)
  const sumMetric = async (metricName: string, type: 'total_value' | 'time_series' = 'total_value') => {
    let total = 0;
    let hadValue = false;
    for (const chunk of chunkRanges) {
      const val = await fetchIgInsightTotal(conn.igAccountId, token, metricName, chunk.since, chunk.until, type);
      if (val !== null) {
        total += val;
        hadValue = true;
      }
    }
    return hadValue ? total : null;
  };

  const [
    reach,
    views,
    profileViews,
    followerCountSeries,
    likes,
    comments,
    shares,
    saves,
    websiteClicks,
    profileLinksTaps,
  ] = await Promise.all([
    sumMetric('reach', 'total_value'),
    sumMetric('views', 'total_value'),
    sumMetric('profile_views', 'total_value'),
    sumMetric('follower_count', 'time_series'),
    sumMetric('likes', 'total_value'),
    sumMetric('comments', 'total_value'),
    sumMetric('shares', 'total_value'),
    sumMetric('saves', 'total_value'),
    sumMetric('website_clicks', 'total_value'),
    sumMetric('profile_links_taps', 'total_value'),
  ]);

  // 3. Caso tenha Conta de Anúncios vinculada, puxa investimento e leads do Meta Ads
  let adSpend = 0;
  let adsLeads = 0;
  if (conn.adAccountId) {
    try {
      const sinceStr = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
      const untilDate = effectiveEnd;
      const untilStr = `${untilDate.getUTCFullYear()}-${String(untilDate.getUTCMonth() + 1).padStart(2, '0')}-${String(untilDate.getUTCDate()).padStart(2, '0')}`;
      const actId = conn.adAccountId.startsWith('act_') ? conn.adAccountId : `act_${conn.adAccountId}`;
      const adsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(actId)}/insights?time_range=${encodeURIComponent(JSON.stringify({ since: sinceStr, until: untilStr }))}&fields=spend,actions&access_token=${encodeURIComponent(token)}`;
      const adsRes = await fetch(adsUrl, { cache: 'no-store' });
      const adsJson = await adsRes.json();
      if (Array.isArray(adsJson.data) && adsJson.data[0]) {
        adSpend = Number(adsJson.data[0].spend || 0);
        const actions = adsJson.data[0].actions || [];
        for (const a of actions) {
          if (
            a.action_type === 'lead' ||
            a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
          ) {
            adsLeads += Number(a.value || 0);
          }
        }
      }
    } catch {
      warnings.push('Não foi possível ler os dados da Conta de Anúncios.');
    }
  }

  // Preserva notas e KPIs personalizados já salvos anteriormente para este mês
  const existingAll = await getClientMonthlyMetrics(params.clientId);
  const existingMonth = existingAll.find(
    (m) => m.month === params.month && m.year === params.year
  );

  const savedMetric = await upsertClientMonthlyMetric({
    clientId: params.clientId,
    month: params.month,
    year: params.year,
    reach: reach ?? existingMonth?.reach ?? 0,
    impressions: views ?? existingMonth?.impressions ?? 0,
    profileVisits: profileViews ?? existingMonth?.profileVisits ?? 0,
    followersTotal: followersTotal || existingMonth?.followersTotal || 0,
    followersGained: followerCountSeries ?? existingMonth?.followersGained ?? 0,
    likes: likes ?? existingMonth?.likes ?? 0,
    comments: comments ?? existingMonth?.comments ?? 0,
    shares: shares ?? existingMonth?.shares ?? 0,
    saves: saves ?? existingMonth?.saves ?? 0,
    linkClicks: (profileLinksTaps ?? websiteClicks) ?? existingMonth?.linkClicks ?? 0,
    leads: adsLeads || existingMonth?.leads || 0,
    adSpend: adSpend || existingMonth?.adSpend || 0,
    notes: existingMonth?.notes || '',
    customMetrics: existingMonth?.customMetrics || [],
  });

  return {
    metric: savedMetric,
    warnings,
  };
}
