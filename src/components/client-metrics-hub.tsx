'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointerClick,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Sparkles,
  DollarSign,
  Target,
  RefreshCw,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Link2,
} from 'lucide-react';
import { MonthlyMetricItem, CustomMetricItem } from '@/lib/services/metrics-service';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n || 0);
}

function calcDelta(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

interface ClientMetricsHubProps {
  mode: 'admin' | 'client';
  clientId?: string;
  clientSlug?: string;
  clientName: string;
}

export function ClientMetricsHub({
  mode,
  clientId,
  clientSlug,
  clientName,
}: ClientMetricsHubProps) {
  const [metrics, setMetrics] = useState<MonthlyMetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [chartField, setChartField] = useState<
    'reach' | 'profileVisits' | 'followersGained' | 'interactions' | 'leads'
  >('reach');

  // Modal de Lançamento / Edição (Admin)
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const [formMonth, setFormMonth] = useState(now.getMonth() + 1);
  const [formYear, setFormYear] = useState(now.getFullYear());
  const [formReach, setFormReach] = useState(0);
  const [formImpressions, setFormImpressions] = useState(0);
  const [formProfileVisits, setFormProfileVisits] = useState(0);
  const [formFollowersTotal, setFormFollowersTotal] = useState(0);
  const [formFollowersGained, setFormFollowersGained] = useState(0);
  const [formLikes, setFormLikes] = useState(0);
  const [formComments, setFormComments] = useState(0);
  const [formShares, setFormShares] = useState(0);
  const [formSaves, setFormSaves] = useState(0);
  const [formLinkClicks, setFormLinkClicks] = useState(0);
  const [formLeads, setFormLeads] = useState(0);
  const [formAdSpend, setFormAdSpend] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formCustom, setFormCustom] = useState<CustomMetricItem[]>([]);

  // Integração Meta Business / Instagram Graph API (Admin)
  const [metaConn, setMetaConn] = useState<{
    igAccountId: string;
    igUsername: string | null;
    adAccountId: string | null;
  } | null>(null);
  const [hasAgencyMetaToken, setHasAgencyMetaToken] = useState(false);
  const [metaConnectOpen, setMetaConnectOpen] = useState(false);
  const [metaSyncOpen, setMetaSyncOpen] = useState(false);
  const [metaTokenInput, setMetaTokenInput] = useState('');
  const [discoveringMeta, setDiscoveringMeta] = useState(false);
  const [discoveredIg, setDiscoveredIg] = useState<
    Array<{ igAccountId: string; username: string; pageName: string; followersCount: number }>
  >([]);
  const [discoveredAds, setDiscoveredAds] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedIgId, setSelectedIgId] = useState('');
  const [selectedIgUsername, setSelectedIgUsername] = useState('');
  const [selectedAdId, setSelectedAdId] = useState('');
  const [syncMonth, setSyncMonth] = useState(now.getMonth() + 1);
  const [syncYear, setSyncYear] = useState(now.getFullYear());
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [metaFeedback, setMetaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMetaConnection = async () => {
    if (mode !== 'admin' || !clientId) return;
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/metrics/meta`);
      if (res.ok) {
        const data = await res.json();
        setMetaConn(data.connection || null);
        setHasAgencyMetaToken(Boolean(data.hasAgencyToken));
        if (data.connection) {
          setSelectedIgId(data.connection.igAccountId || '');
          setSelectedIgUsername(data.connection.igUsername || '');
          setSelectedAdId(data.connection.adAccountId || '');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar conexão Meta:', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const url =
        mode === 'admin' && clientId
          ? `/api/admin/clients/${clientId}/metrics`
          : `/api/client/metrics?slug=${encodeURIComponent(clientSlug || '')}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: MonthlyMetricItem[] = data.metrics || [];
        setMetrics(list);
        if (list.length > 0) {
          setSelectedMetricId((prev) =>
            prev && list.some((m) => m.id === prev) ? prev : list[list.length - 1].id
          );
        }
      }
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchMetaConnection();
  }, [mode, clientId, clientSlug]);

  const handleOpenMetaConnect = async () => {
    setMetaFeedback(null);
    setMetaConnectOpen(true);
    if (hasAgencyMetaToken && discoveredIg.length === 0) {
      setDiscoveringMeta(true);
      try {
        const res = await fetch('/api/admin/meta/accounts?discover=true');
        const data = await res.json();
        if (data.igAccounts) setDiscoveredIg(data.igAccounts);
        if (data.adAccounts) setDiscoveredAds(data.adAccounts);
        if (data.error) setMetaFeedback({ type: 'error', text: data.error });
      } catch {
        setMetaFeedback({ type: 'error', text: 'Falha ao buscar contas do Business Manager.' });
      } finally {
        setDiscoveringMeta(false);
      }
    }
  };

  const handleValidateAndSaveToken = async () => {
    if (!metaTokenInput.trim()) return;
    setDiscoveringMeta(true);
    setMetaFeedback(null);
    try {
      const res = await fetch('/api/admin/meta/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: metaTokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMetaFeedback({ type: 'error', text: data.error || 'Token inválido.' });
      } else {
        setHasAgencyMetaToken(true);
        setDiscoveredIg(data.igAccounts || []);
        setDiscoveredAds(data.adAccounts || []);
        setMetaTokenInput('');
        setMetaFeedback({
          type: 'success',
          text: `Token validado! Encontramos ${(data.igAccounts || []).length} conta(s) do Instagram.`,
        });
      }
    } catch {
      setMetaFeedback({ type: 'error', text: 'Erro ao validar token da Meta.' });
    } finally {
      setDiscoveringMeta(false);
    }
  };

  const handleSaveClientMetaLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedIgId.trim()) return;
    setDiscoveringMeta(true);
    setMetaFeedback(null);
    try {
      const matched = discoveredIg.find((a) => a.igAccountId === selectedIgId.trim());
      const res = await fetch(`/api/admin/clients/${clientId}/metrics/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          igAccountId: selectedIgId.trim(),
          igUsername: matched?.username || selectedIgUsername || null,
          adAccountId: selectedAdId.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMetaFeedback({ type: 'error', text: data.error || 'Erro ao vincular conta.' });
      } else {
        setMetaConn(data.connection);
        setMetaConnectOpen(false);
        setMetaSyncOpen(true);
      }
    } catch {
      setMetaFeedback({ type: 'error', text: 'Falha ao salvar vínculo.' });
    } finally {
      setDiscoveringMeta(false);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!clientId) return;
    try {
      await fetch(`/api/admin/clients/${clientId}/metrics/meta`, { method: 'DELETE' });
      setMetaConn(null);
      setSelectedIgId('');
      setSelectedIgUsername('');
      setSelectedAdId('');
    } catch (err) {
      console.error('Erro ao desvincular Meta:', err);
    }
  };

  const handleSyncFromMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setSyncingMeta(true);
    setMetaFeedback(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/metrics/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          month: syncMonth,
          year: syncYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMetaFeedback({ type: 'error', text: data.error || 'Erro ao sincronizar.' });
      } else {
        setMetaSyncOpen(false);
        await fetchMetrics();
        if (data.metric?.id) setSelectedMetricId(data.metric.id);
      }
    } catch {
      setMetaFeedback({ type: 'error', text: 'Falha de conexão com a API da Meta.' });
    } finally {
      setSyncingMeta(false);
    }
  };

  const currentMetric = useMemo(() => {
    if (metrics.length === 0) return null;
    return metrics.find((m) => m.id === selectedMetricId) || metrics[metrics.length - 1];
  }, [metrics, selectedMetricId]);

  const previousMetric = useMemo(() => {
    if (!currentMetric) return undefined;
    const idx = metrics.findIndex((m) => m.id === currentMetric.id);
    return idx > 0 ? metrics[idx - 1] : undefined;
  }, [metrics, currentMetric]);

  const totalInteractions = (m: MonthlyMetricItem) =>
    (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);

  const openNewOrEditForm = (existing?: MonthlyMetricItem | null) => {
    if (existing) {
      setFormMonth(existing.month);
      setFormYear(existing.year);
      setFormReach(existing.reach);
      setFormImpressions(existing.impressions);
      setFormProfileVisits(existing.profileVisits);
      setFormFollowersTotal(existing.followersTotal);
      setFormFollowersGained(existing.followersGained);
      setFormLikes(existing.likes);
      setFormComments(existing.comments);
      setFormShares(existing.shares);
      setFormSaves(existing.saves);
      setFormLinkClicks(existing.linkClicks);
      setFormLeads(existing.leads);
      setFormAdSpend(existing.adSpend);
      setFormNotes(existing.notes || '');
      setFormCustom(existing.customMetrics || []);
    } else {
      const t = new Date();
      setFormMonth(t.getMonth() + 1);
      setFormYear(t.getFullYear());
      setFormReach(0);
      setFormImpressions(0);
      setFormProfileVisits(0);
      setFormFollowersTotal(currentMetric?.followersTotal || 0);
      setFormFollowersGained(0);
      setFormLikes(0);
      setFormComments(0);
      setFormShares(0);
      setFormSaves(0);
      setFormLinkClicks(0);
      setFormLeads(0);
      setFormAdSpend(0);
      setFormNotes('');
      setFormCustom([]);
    }
    setFormOpen(true);
  };

  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'admin' || !clientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: formMonth,
          year: formYear,
          reach: formReach,
          impressions: formImpressions,
          profileVisits: formProfileVisits,
          followersTotal: formFollowersTotal,
          followersGained: formFollowersGained,
          likes: formLikes,
          comments: formComments,
          shares: formShares,
          saves: formSaves,
          linkClicks: formLinkClicks,
          leads: formLeads,
          adSpend: formAdSpend,
          notes: formNotes,
          customMetrics: formCustom.filter((c) => c.label.trim() && c.value.trim()),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormOpen(false);
        await fetchMetrics();
        if (data.metric?.id) setSelectedMetricId(data.metric.id);
      }
    } catch (err) {
      console.error('Erro ao salvar métricas:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (mode !== 'admin' || !clientId) return;
    if (!confirm('Deseja realmente excluir os dados deste mês?')) return;
    try {
      await fetch(`/api/admin/clients/${clientId}/metrics?metricId=${encodeURIComponent(metricId)}`, {
        method: 'DELETE',
      });
      await fetchMetrics();
    } catch (err) {
      console.error('Erro ao excluir métrica:', err);
    }
  };

  // Dados para gráfico de evolução (últimos 6 meses cadastrados)
  const evolutionData = useMemo(() => {
    const slice = metrics.slice(-6);
    return slice.map((m) => {
      let val = 0;
      if (chartField === 'reach') val = m.reach;
      else if (chartField === 'profileVisits') val = m.profileVisits;
      else if (chartField === 'followersGained') val = m.followersGained;
      else if (chartField === 'interactions') val = totalInteractions(m);
      else if (chartField === 'leads') val = m.leads + m.linkClicks;
      return {
        id: m.id,
        label: `${MONTH_NAMES[m.month - 1].slice(0, 3)}/${String(m.year).slice(-2)}`,
        value: val,
      };
    });
  }, [metrics, chartField]);

  const maxChartVal = useMemo(() => {
    const max = Math.max(...evolutionData.map((d) => d.value), 1);
    return max;
  }, [evolutionData]);

  // Dados do Donut de Engajamento
  const engagementBreakdown = useMemo(() => {
    if (!currentMetric) return [];
    const items = [
      { label: 'Curtidas', value: currentMetric.likes, color: '#FD3100', icon: Heart },
      { label: 'Comentários', value: currentMetric.comments, color: '#F59E0B', icon: MessageCircle },
      { label: 'Compartilhamentos', value: currentMetric.shares, color: '#3B82F6', icon: Share2 },
      { label: 'Salvamentos', value: currentMetric.saves, color: '#10B981', icon: Bookmark },
    ];
    return items;
  }, [currentMetric]);

  const currentTotalInteractions = currentMetric ? totalInteractions(currentMetric) : 0;
  const engagementRate =
    currentMetric && currentMetric.reach > 0
      ? ((currentTotalInteractions / currentMetric.reach) * 100).toFixed(1)
      : '0.0';

  const renderDeltaBadge = (current: number, prev: number | undefined) => {
    const delta = calcDelta(current, prev);
    if (delta === null) return null;
    const isPositive = delta >= 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black border ${
          isPositive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>
          {isPositive ? '+' : ''}
          {delta}% vs mês ant.
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho & Seletor de Meses */}
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FD3100] text-white flex items-center justify-center shadow-md shrink-0">
            <BarChart3 className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="font-black text-lg sm:text-xl text-[#111111] uppercase tracking-tight">
              Métricas & Resultados • {clientName}
            </h2>
            <p className="text-xs text-[#66635D] font-medium">
              Acompanhe a evolução mensal de alcance, engajamento, seguidores e conversões.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {metrics.map((m) => {
            const isActive = currentMetric?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMetricId(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all border ${
                  isActive
                    ? 'bg-[#FD3100] text-white border-[#FD3100] shadow-sm'
                    : 'bg-[#FAF9F7] text-[#111111] border-[#DCD6CC] hover:border-[#FD3100]'
                }`}
              >
                {MONTH_NAMES[m.month - 1].slice(0, 3)}/{m.year}
              </button>
            );
          })}

          {mode === 'admin' && (
            <>
              <button
                type="button"
                onClick={handleOpenMetaConnect}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                  metaConn
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
                    : 'bg-[#FAF9F7] text-[#111111] border-[#DCD6CC] hover:border-[#FD3100]'
                }`}
                title="Configurar conta do Instagram / Meta Business"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>
                  {metaConn?.igUsername
                    ? `@${metaConn.igUsername}`
                    : metaConn
                    ? 'Meta Conectado'
                    : 'Conectar Meta'}
                </span>
              </button>

              {metaConn && (
                <button
                  type="button"
                  onClick={() => {
                    setMetaFeedback(null);
                    setMetaSyncOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] hover:bg-[#FD3100] hover:text-white text-[#FD3100] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  title="Puxar métricas do mês direto da API da Meta"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Puxar do Meta</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openNewOrEditForm(null)}
                className="btn-vb-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Lançar Mês</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Estado de Carregamento ou Vazio */}
      {loading ? (
        <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-16 text-center text-sm font-bold text-[#66635D]">
          Carregando relatório de métricas...
        </div>
      ) : !currentMetric ? (
        <div className="bg-white border-2 border-dashed border-[#FFCEBF] rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100] mb-3">
            <BarChart3 className="w-8 h-8 stroke-[1.75]" />
          </div>
          <h3 className="text-lg font-black uppercase text-[#111111]">
            Nenhuma métrica lançada ainda
          </h3>
          <p className="text-xs text-[#66635D] max-w-md mt-1">
            {mode === 'admin'
              ? 'Lance os resultados mensais da empresa para gerar gráficos automáticos de evolução e disponibilizar no portal do cliente.'
              : 'Assim que a Agência VB fechar o relatório de resultados do mês, os números e gráficos aparecerão aqui.'}
          </p>
          {mode === 'admin' && (
            <button
              type="button"
              onClick={() => openNewOrEditForm(null)}
              className="mt-5 btn-vb-primary px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md"
            >
              Lançar Primeiro Mês
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Barra do Mês Selecionado + Botões Admin */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#FD3100]">
                Relatório Referente a:
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-[#DCD6CC] text-xs font-black uppercase text-[#111111] shadow-xs">
                {MONTH_NAMES[currentMetric.month - 1]} de {currentMetric.year}
              </span>
            </div>

            {mode === 'admin' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openNewOrEditForm(currentMetric)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-[#DCD6CC] hover:border-[#FD3100] text-xs font-black uppercase text-[#111111] flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#FD3100]" />
                  <span>Editar este Mês</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMetric(currentMetric.id)}
                  className="p-2 rounded-xl bg-white border border-[#DCD6CC] hover:border-rose-300 text-[#66635D] hover:text-rose-600 transition-colors"
                  title="Excluir relatório deste mês"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Grid Principal de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Alcance */}
            <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase text-[#66635D] tracking-wider">
                  Alcance Total
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <Eye className="w-4 h-4 stroke-[2]" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  {formatNumber(currentMetric.reach)}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {renderDeltaBadge(currentMetric.reach, previousMetric?.reach)}
                  {currentMetric.impressions > 0 && (
                    <span className="text-[10px] font-bold text-[#66635D]">
                      {formatNumber(currentMetric.impressions)} impressões
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 2: Visitas ao Perfil */}
            <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase text-[#66635D] tracking-wider">
                  Visitas ao Perfil
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Target className="w-4 h-4 stroke-[2]" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  {formatNumber(currentMetric.profileVisits)}
                </p>
                <div className="mt-2">
                  {renderDeltaBadge(currentMetric.profileVisits, previousMetric?.profileVisits)}
                </div>
              </div>
            </div>

            {/* KPI 3: Seguidores */}
            <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase text-[#66635D] tracking-wider">
                  Novos Seguidores
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Users className="w-4 h-4 stroke-[2]" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  {currentMetric.followersGained >= 0 ? '+' : ''}
                  {formatNumber(currentMetric.followersGained)}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {currentMetric.followersTotal > 0 && (
                    <span className="text-[11px] font-bold text-[#66635D]">
                      Base total: <strong className="text-[#111111]">{formatNumber(currentMetric.followersTotal)}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 4: Cliques & Leads */}
            <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase text-[#66635D] tracking-wider">
                  Cliques & Leads
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <MousePointerClick className="w-4 h-4 stroke-[2]" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  {formatNumber(currentMetric.linkClicks + currentMetric.leads)}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold text-[#66635D]">
                  <span>{formatNumber(currentMetric.linkClicks)} cliques</span>
                  <span>•</span>
                  <span>{formatNumber(currentMetric.leads)} leads/msgs</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs Extras (Tráfego Pago + Personalizados se houver) */}
          {(currentMetric.adSpend > 0 || (currentMetric.customMetrics && currentMetric.customMetrics.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentMetric.adSpend > 0 && (
                <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#66635D]">
                      Investimento Tráfego
                    </span>
                    <p className="text-xl font-black text-[#111111] mt-0.5">
                      {formatCurrency(currentMetric.adSpend)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              )}

              {currentMetric.customMetrics?.map((cm, i) => (
                <div
                  key={i}
                  className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-4 shadow-sm"
                >
                  <span className="text-[10px] font-black uppercase text-[#FD3100]">
                    {cm.label}
                  </span>
                  <p className="text-xl font-black text-[#111111] mt-0.5">{cm.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Gráficos Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico 1: Evolução Mensal */}
            <div className="lg:col-span-7 bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEEDEA]">
                <div>
                  <h3 className="font-black text-base text-[#111111] uppercase tracking-tight">
                    Evolução Mensal
                  </h3>
                  <p className="text-[11px] text-[#66635D]">
                    Comparativo dos últimos meses registrados
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 bg-[#FAF9F7] p-1 rounded-xl border border-[#DCD6CC]">
                  {(
                    [
                      { key: 'reach', label: 'Alcance' },
                      { key: 'profileVisits', label: 'Visitas' },
                      { key: 'followersGained', label: 'Seguidores' },
                      { key: 'interactions', label: 'Interações' },
                      { key: 'leads', label: 'Cliques/Leads' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setChartField(item.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        chartField === item.key
                          ? 'bg-[#FD3100] text-white shadow-xs'
                          : 'text-[#66635D] hover:text-[#111111]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barras Verticais Responsivas */}
              <div className="mt-6 pt-4">
                <div className="h-56 flex items-end justify-around gap-2 sm:gap-4 px-2">
                  {evolutionData.map((d) => {
                    const heightPct = Math.max(8, Math.round((d.value / maxChartVal) * 100));
                    const isSelected = d.id === currentMetric.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedMetricId(d.id)}
                        className="flex-1 flex flex-col items-center justify-end h-full group focus:outline-none"
                      >
                        <span
                          className={`text-[10px] sm:text-xs font-black mb-1.5 transition-colors ${
                            isSelected ? 'text-[#FD3100]' : 'text-[#66635D]'
                          }`}
                        >
                          {formatNumber(d.value)}
                        </span>
                        <div className="w-full max-w-[54px] flex-1 flex items-end justify-center">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t-2xl transition-all duration-500 ${
                              isSelected
                                ? 'bg-gradient-to-t from-[#FD3100] to-[#FF8A6E] shadow-md'
                                : 'bg-[#FAF9F7] border-2 border-[#DCD6CC] group-hover:border-[#FD3100]'
                            }`}
                          />
                        </div>
                        <span
                          className={`mt-2 text-[10px] sm:text-[11px] font-black uppercase ${
                            isSelected ? 'text-[#FD3100]' : 'text-[#66635D]'
                          }`}
                        >
                          {d.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gráfico 2: Distribuição de Engajamento (Donut + Barras) */}
            <div className="lg:col-span-5 bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
                <div>
                  <h3 className="font-black text-base text-[#111111] uppercase tracking-tight">
                    Engajamento do Mês
                  </h3>
                  <p className="text-[11px] text-[#66635D]">
                    Taxa de engajamento: <strong className="text-[#FD3100]">{engagementRate}%</strong>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFF0EC] border border-[#FFCEBF] text-[#FD3100] text-[10px] font-black uppercase">
                  {formatNumber(currentTotalInteractions)} ações
                </span>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
                {/* Donut SVG */}
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#EEEDEA"
                      strokeWidth="4.5"
                    />
                    {(() => {
                      let offset = 0;
                      const total = currentTotalInteractions || 1;
                      return engagementBreakdown.map((item) => {
                        const pct = (item.value / total) * 100;
                        const dashArray = `${pct} ${100 - pct}`;
                        const dashOffset = -offset;
                        offset += pct;
                        return (
                          <circle
                            key={item.label}
                            cx="18"
                            cy="18"
                            r="14"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="4.5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="butt"
                            pathLength={100}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-[#111111] leading-none">
                      {formatNumber(currentTotalInteractions)}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-[#66635D] mt-0.5">
                      Interações
                    </span>
                  </div>
                </div>

                {/* Lista de Proporções */}
                <div className="flex-1 w-full space-y-2.5">
                  {engagementBreakdown.map((item) => {
                    const pct =
                      currentTotalInteractions > 0
                        ? Math.round((item.value / currentTotalInteractions) * 100)
                        : 0;
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#111111] flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                            <span>{item.label}</span>
                          </span>
                          <span className="font-black text-[#111111]">
                            {formatNumber(item.value)}{' '}
                            <span className="text-[10px] font-bold text-[#66635D]">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#FAF9F7] overflow-hidden border border-[#EEEDEA]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Análise Estratégica da Agência */}
          {currentMetric.notes && (
            <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#FD3100]" />
                <h3 className="font-black text-sm text-[#111111] uppercase tracking-wider">
                  Análise & Destaques do Mês — Agência VB
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#55524C] whitespace-pre-line leading-relaxed font-medium">
                {currentMetric.notes}
              </p>
            </div>
          )}
        </>
      )}

      {/* MODAL ADMIN: LANÇAR / EDITAR MÉTRICAS DO MÊS */}
      {formOpen && mode === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-2xl p-5 sm:p-8 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    Lançar Métricas do Mês
                  </h3>
                  <p className="text-xs text-[#66635D]">
                    Os gráficos e comparativos são gerados automaticamente para o cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-xl text-[#66635D] hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMetrics} className="mt-4 space-y-5 overflow-y-auto pr-1">
              {/* Mês e Ano */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Mês de Referência
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111]"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111]"
                  />
                </div>
              </div>

              {/* Bloco 1: Alcance & Crescimento */}
              <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E2DED7] space-y-3">
                <p className="text-[11px] font-black uppercase text-[#FD3100]">
                  Alcance & Crescimento
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Alcance Total
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formReach}
                      onChange={(e) => setFormReach(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Impressões
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formImpressions}
                      onChange={(e) => setFormImpressions(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Visitas ao Perfil
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formProfileVisits}
                      onChange={(e) => setFormProfileVisits(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Novos Seguidores
                    </label>
                    <input
                      type="number"
                      value={formFollowersGained}
                      onChange={(e) => setFormFollowersGained(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Seguidores Totais
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formFollowersTotal}
                      onChange={(e) => setFormFollowersTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Engajamento */}
              <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E2DED7] space-y-3">
                <p className="text-[11px] font-black uppercase text-[#FD3100]">
                  Engajamento
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Curtidas
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formLikes}
                      onChange={(e) => setFormLikes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Comentários
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formComments}
                      onChange={(e) => setFormComments(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Compartilhamentos
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formShares}
                      onChange={(e) => setFormShares(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Salvamentos
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formSaves}
                      onChange={(e) => setFormSaves(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Conversões & Tráfego */}
              <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E2DED7] space-y-3">
                <p className="text-[11px] font-black uppercase text-[#FD3100]">
                  Conversões & Investimento
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Cliques no Link
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formLinkClicks}
                      onChange={(e) => setFormLinkClicks(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Leads / Mensagens
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formLeads}
                      onChange={(e) => setFormLeads(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#66635D] mb-1">
                      Tráfego Pago (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formAdSpend}
                      onChange={(e) => setFormAdSpend(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Métricas Personalizadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-[#111111]">
                    KPIs Personalizados (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormCustom((prev) => [...prev, { label: '', value: '' }])}
                    className="text-[10px] font-black uppercase text-[#FD3100] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar KPI
                  </button>
                </div>
                {formCustom.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nome (ex: Agendamentos)"
                      value={item.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormCustom((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, label: val } : c))
                        );
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Valor (ex: 42)"
                      value={item.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormCustom((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, value: val } : c))
                        );
                      }}
                      className="w-32 px-3 py-1.5 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setFormCustom((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Análise / Observações */}
              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  Análise & Destaques do Mês (Visível para o cliente)
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Crescemos 28% no alcance orgânico com os Reels educativos e tivemos recorde de agendamentos via Direct..."
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-medium resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#EEEDEA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-vb-primary px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Salvando...' : 'Salvar Métricas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: CONECTAR META BUSINESS / INSTAGRAM */}
      {metaConnectOpen && mode === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-xl p-5 sm:p-8 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    Conectar Meta Business
                  </h3>
                  <p className="text-xs text-[#66635D]">
                    Puxe alcance, visitas, seguidores e engajamento direto da API oficial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMetaConnectOpen(false)}
                className="p-1.5 rounded-xl text-[#66635D] hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5 overflow-y-auto pr-1">
              {/* Passo a Passo Token da Agência */}
              <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E2DED7] space-y-2 text-xs">
                <p className="font-black text-[#111111] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#FD3100]" />
                  <span>1. Token do seu Gerenciador de Negócios (configura só 1 vez):</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#66635D]">
                  <li>
                    Acesse <strong>business.facebook.com</strong> → <strong>Configurações do Negócio</strong> → <strong>Usuários do Sistema</strong>.
                  </li>
                  <li>
                    Crie um usuário do sistema, atribua as contas dos clientes e clique em <strong>Gerar novo token</strong> com as permissões: <code className="bg-white px-1 rounded">instagram_basic</code>, <code className="bg-white px-1 rounded">instagram_manage_insights</code>, <code className="bg-white px-1 rounded">pages_show_list</code> e <code className="bg-white px-1 rounded">ads_read</code> (opcional).
                  </li>
                </ol>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="password"
                    value={metaTokenInput}
                    onChange={(e) => setMetaTokenInput(e.target.value)}
                    placeholder={
                      hasAgencyMetaToken
                        ? 'Token da agência já salvo (cole outro para substituir)'
                        : 'Cole aqui o Access Token do Meta Business...'
                    }
                    className="flex-1 px-3 py-2 bg-white border border-[#DCD6CC] rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    disabled={discoveringMeta || !metaTokenInput.trim()}
                    onClick={handleValidateAndSaveToken}
                    className="btn-vb-primary px-4 py-2 rounded-xl text-[11px] font-black uppercase shrink-0 disabled:opacity-50"
                  >
                    {discoveringMeta ? 'Validando...' : 'Validar Token'}
                  </button>
                </div>
              </div>

              {metaFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    metaFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {metaFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{metaFeedback.text}</span>
                </div>
              )}

              {/* Passo 2: Selecionar Instagram deste Cliente */}
              <form onSubmit={handleSaveClientMetaLink} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1.5">
                    2. Conta Instagram Business de {clientName}
                  </label>
                  {discoveredIg.length > 0 ? (
                    <select
                      value={selectedIgId}
                      onChange={(e) => {
                        setSelectedIgId(e.target.value);
                        const found = discoveredIg.find((a) => a.igAccountId === e.target.value);
                        if (found) setSelectedIgUsername(found.username);
                      }}
                      className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111]"
                    >
                      <option value="">Selecione o @Instagram do cliente...</option>
                      {discoveredIg.map((acc) => (
                        <option key={acc.igAccountId} value={acc.igAccountId}>
                          @{acc.username} ({acc.pageName}) — {formatNumber(acc.followersCount)} seg.
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedIgId}
                      onChange={(e) => setSelectedIgId(e.target.value)}
                      placeholder="ID da Conta Instagram Business (ex: 17841400000000000)"
                      className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-mono"
                    />
                  )}
                </div>

                {discoveredAds.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-black uppercase text-[#111111] mb-1.5">
                      Conta de Anúncios (Opcional — para puxar Tráfego Pago)
                    </label>
                    <select
                      value={selectedAdId}
                      onChange={(e) => setSelectedAdId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111]"
                    >
                      <option value="">Sem conta de anúncios vinculada</option>
                      {discoveredAds.map((ad) => (
                        <option key={ad.id} value={ad.id}>
                          {ad.name} ({ad.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-3 border-t border-[#EEEDEA] flex items-center justify-between gap-2">
                  {metaConn ? (
                    <button
                      type="button"
                      onClick={handleDisconnectMeta}
                      className="text-xs font-black text-rose-600 hover:underline"
                    >
                      Desvincular conta
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMetaConnectOpen(false)}
                      className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                    >
                      Fechar
                    </button>
                    <button
                      type="submit"
                      disabled={discoveringMeta || !selectedIgId.trim()}
                      className="btn-vb-primary px-5 py-2 rounded-xl text-xs font-black uppercase disabled:opacity-50"
                    >
                      Salvar Vínculo
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: PUXAR MÉTRICAS DO MÊS DO META */}
      {metaSyncOpen && mode === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#111111] uppercase">
                    Puxar Métricas do Meta
                  </h3>
                  <p className="text-[11px] text-[#66635D]">
                    {metaConn?.igUsername ? `@${metaConn.igUsername}` : 'Instagram conectado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMetaSyncOpen(false)}
                className="p-1.5 rounded-xl text-[#66635D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSyncFromMeta} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Mês
                  </label>
                  <select
                    value={syncMonth}
                    onChange={(e) => setSyncMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={syncYear}
                    onChange={(e) => setSyncYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {metaFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    metaFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {metaFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMetaSyncOpen(false)}
                  className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={syncingMeta}
                  className="btn-vb-primary px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingMeta ? 'animate-spin' : ''}`} />
                  <span>{syncingMeta ? 'Puxando da Meta...' : 'Sincronizar Agora'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
