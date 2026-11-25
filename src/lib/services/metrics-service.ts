import { prisma } from '../prisma';

export interface CustomMetricItem {
  label: string;
  value: string;
}

export interface MonthlyMetricItem {
  id: string;
  clientId: string;
  month: number; // 1 a 12
  year: number;
  reach: number;
  impressions: number;
  profileVisits: number;
  followersTotal: number;
  followersGained: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  linkClicks: number;
  leads: number;
  adSpend: number;
  notes: string;
  customMetrics: CustomMetricItem[];
  createdAt: string;
  updatedAt: string;
}

let isMetricsTableInitialized = false;

async function ensureMetricsTable() {
  if (isMetricsTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS client_monthly_metrics (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        reach INTEGER NOT NULL DEFAULT 0,
        impressions INTEGER NOT NULL DEFAULT 0,
        profile_visits INTEGER NOT NULL DEFAULT 0,
        followers_total INTEGER NOT NULL DEFAULT 0,
        followers_gained INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        saves INTEGER NOT NULL DEFAULT 0,
        link_clicks INTEGER NOT NULL DEFAULT 0,
        leads INTEGER NOT NULL DEFAULT 0,
        ad_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        custom_metrics JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (client_id, month, year)
      );
    `);
    isMetricsTableInitialized = true;
  } catch (err) {
    console.error('Erro ao inicializar tabela client_monthly_metrics:', err);
  }
}

function mapMetricRow(r: any): MonthlyMetricItem {
  let custom: CustomMetricItem[] = [];
  if (Array.isArray(r.custom_metrics)) {
    custom = r.custom_metrics;
  } else if (typeof r.custom_metrics === 'string') {
    try {
      const parsed = JSON.parse(r.custom_metrics);
      if (Array.isArray(parsed)) custom = parsed;
    } catch {
      custom = [];
    }
  }

  return {
    id: r.id,
    clientId: r.client_id,
    month: Number(r.month),
    year: Number(r.year),
    reach: Number(r.reach || 0),
    impressions: Number(r.impressions || 0),
    profileVisits: Number(r.profile_visits || 0),
    followersTotal: Number(r.followers_total || 0),
    followersGained: Number(r.followers_gained || 0),
    likes: Number(r.likes || 0),
    comments: Number(r.comments || 0),
    shares: Number(r.shares || 0),
    saves: Number(r.saves || 0),
    linkClicks: Number(r.link_clicks || 0),
    leads: Number(r.leads || 0),
    adSpend: Number(r.ad_spend || 0),
    notes: r.notes || '',
    customMetrics: custom,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

export async function getClientMonthlyMetrics(clientId: string): Promise<MonthlyMetricItem[]> {
  await ensureMetricsTable();
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT *
      FROM client_monthly_metrics
      WHERE client_id = $1
      ORDER BY year ASC, month ASC
      `,
      clientId
    );
    return rows.map(mapMetricRow);
  } catch (err) {
    console.error('Erro ao buscar métricas do cliente:', err);
    return [];
  }
}

export async function upsertClientMonthlyMetric(data: {
  clientId: string;
  month: number;
  year: number;
  reach?: number;
  impressions?: number;
  profileVisits?: number;
  followersTotal?: number;
  followersGained?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  linkClicks?: number;
  leads?: number;
  adSpend?: number;
  notes?: string;
  customMetrics?: CustomMetricItem[];
}): Promise<MonthlyMetricItem | null> {
  await ensureMetricsTable();
  const id = `metric_${data.clientId}_${data.year}_${String(data.month).padStart(2, '0')}`;
  const customJson = JSON.stringify(Array.isArray(data.customMetrics) ? data.customMetrics : []);

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO client_monthly_metrics (
        id, client_id, month, year,
        reach, impressions, profile_visits,
        followers_total, followers_gained,
        likes, comments, shares, saves,
        link_clicks, leads, ad_spend,
        notes, custom_metrics, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18::jsonb, NOW(), NOW()
      )
      ON CONFLICT (client_id, month, year)
      DO UPDATE SET
        reach = EXCLUDED.reach,
        impressions = EXCLUDED.impressions,
        profile_visits = EXCLUDED.profile_visits,
        followers_total = EXCLUDED.followers_total,
        followers_gained = EXCLUDED.followers_gained,
        likes = EXCLUDED.likes,
        comments = EXCLUDED.comments,
        shares = EXCLUDED.shares,
        saves = EXCLUDED.saves,
        link_clicks = EXCLUDED.link_clicks,
        leads = EXCLUDED.leads,
        ad_spend = EXCLUDED.ad_spend,
        notes = EXCLUDED.notes,
        custom_metrics = EXCLUDED.custom_metrics,
        updated_at = NOW()
      `,
      id,
      data.clientId,
      Number(data.month),
      Number(data.year),
      Math.max(0, Math.round(Number(data.reach || 0))),
      Math.max(0, Math.round(Number(data.impressions || 0))),
      Math.max(0, Math.round(Number(data.profileVisits || 0))),
      Math.max(0, Math.round(Number(data.followersTotal || 0))),
      Math.round(Number(data.followersGained || 0)),
      Math.max(0, Math.round(Number(data.likes || 0))),
      Math.max(0, Math.round(Number(data.comments || 0))),
      Math.max(0, Math.round(Number(data.shares || 0))),
      Math.max(0, Math.round(Number(data.saves || 0))),
      Math.max(0, Math.round(Number(data.linkClicks || 0))),
      Math.max(0, Math.round(Number(data.leads || 0))),
      Number(data.adSpend || 0),
      (data.notes || '').trim(),
      customJson
    );

    const all = await getClientMonthlyMetrics(data.clientId);
    return all.find((m) => m.month === Number(data.month) && m.year === Number(data.year)) || null;
  } catch (err) {
    console.error('Erro ao salvar métrica mensal:', err);
    return null;
  }
}

export async function deleteClientMonthlyMetric(clientId: string, metricId: string): Promise<boolean> {
  await ensureMetricsTable();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM client_monthly_metrics WHERE id = $1 AND client_id = $2`,
      metricId,
      clientId
    );
    return true;
  } catch (err) {
    console.error('Erro ao excluir métrica mensal:', err);
    return false;
  }
}
