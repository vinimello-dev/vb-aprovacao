'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  X,
  List,
  LayoutGrid,
  Globe,
  Sparkles,
  Link2,
} from 'lucide-react';
import {
  CalendarEventItem,
  GoogleCalendarConnection,
} from '@/lib/services/google-calendar-service';

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

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COLOR_OPTIONS = [
  { label: 'Laranja VB', value: '#FD3100' },
  { label: 'Azul Google', value: '#2563EB' },
  { label: 'Verde Esmeralda', value: '#059669' },
  { label: 'Roxo', value: '#7C3AED' },
  { label: 'Preto', value: '#111111' },
];

function getBrazilDateParts(isoString: string): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  timeLabel: string;
  dateKey: string; // YYYY-MM-DD
} {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year || String(date.getFullYear()), 10);
  const month = parseInt(map.month || String(date.getMonth() + 1), 10);
  const day = parseInt(map.day || String(date.getDate()), 10);
  const hour = map.hour === '24' ? '00' : map.hour || '00';
  const minute = map.minute || '00';

  return {
    year,
    month,
    day,
    timeLabel: `${hour}:${minute}`,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function getTodayKey(): string {
  return getBrazilDateParts(new Date().toISOString()).dateKey;
}

export function GoogleCalendarHub() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayKey());

  const [connections, setConnections] = useState<GoogleCalendarConnection[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modo de visualização da aba: Calendário Integrado, Lista de Compromissos ou Google Clássico (Iframe)
  const [viewMode, setViewMode] = useState<'month' | 'list' | 'embed'>('month');

  // Filtros de camadas visíveis na agenda unificada
  const [showGoogle, setShowGoogle] = useState(true);
  const [showPosts, setShowPosts] = useState(true);
  const [showDemands, setShowDemands] = useState(true);
  const [showRecordings, setShowRecordings] = useState(true);

  // Modal de Conectar / Gerenciar Google Agenda
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connName, setConnName] = useState('Minha Agenda Google');
  const [connIcalUrl, setConnIcalUrl] = useState('');
  const [connEmbedUrl, setConnEmbedUrl] = useState('');
  const [connColor, setConnColor] = useState('#FD3100');
  const [savingConn, setSavingConn] = useState(false);
  const [connFeedback, setConnFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Novo Evento no Google Agenda
  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(getTodayKey());
  const [evStartTime, setEvStartTime] = useState('09:00');
  const [evEndTime, setEvEndTime] = useState('10:00');
  const [evLocation, setEvLocation] = useState('');
  const [evDescription, setEvDescription] = useState('');

  const fetchCalendarData = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(
        `/api/admin/google-calendar?month=${currentMonth}&year=${currentYear}`
      );
      const data = await res.json();

      if (data.connections) setConnections(data.connections);
      if (data.events) setEvents(data.events);
      if (data.syncErrors) setSyncErrors(data.syncErrors);
    } catch (err) {
      console.error('Erro ao buscar agenda:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalendarData(false);
  }, [currentMonth, currentYear]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.source === 'google' && !showGoogle) return false;
      if (ev.source === 'post' && !showPosts) return false;
      if (ev.source === 'demand' && !showDemands) return false;
      if (ev.source === 'recording' && !showRecordings) return false;
      return true;
    });
  }, [events, showGoogle, showPosts, showDemands, showRecordings]);

  const eventsByDateKey = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};
    for (const ev of filteredEvents) {
      const { dateKey } = getBrazilDateParts(ev.start);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    }
    return map;
  }, [filteredEvents]);

  const selectedDayEvents = eventsByDateKey[selectedDateKey] || [];
  const todayKey = getTodayKey();
  const todayEventsCount = (eventsByDateKey[todayKey] || []).length;

  const googleEventsCount = useMemo(
    () => events.filter((e) => e.source === 'google').length,
    [events]
  );

  const embedConnection = useMemo(
    () => connections.find((c) => c.embedUrl),
    [connections]
  );

  // Dias do grid do mês atual
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startingWeekday = firstDayOfMonth.getDay(); // 0 (Dom) - 6 (Sáb)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < startingWeekday; i++) {
      cells.push({ day: null, dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateKey });
    }
    return cells;
  }, [currentMonth, currentYear]);

  // Próximos eventos para a visão de lista
  const upcomingEvents = useMemo(() => {
    const nowTime = Date.now() - 12 * 60 * 60 * 1000;
    return filteredEvents.filter((ev) => new Date(ev.start).getTime() >= nowTime);
  }, [filteredEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = new Date();
    setCurrentMonth(t.getMonth() + 1);
    setCurrentYear(t.getFullYear());
    setSelectedDateKey(getTodayKey());
  };

  const handleConnectCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnFeedback(null);

    if (!connIcalUrl.trim() && !connEmbedUrl.trim()) {
      setConnFeedback({
        type: 'error',
        text: 'Cole o link secreto iCal (.ics) ou o e-mail/link de incorporação do Google Agenda.',
      });
      return;
    }

    setSavingConn(true);
    try {
      const res = await fetch('/api/admin/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connName,
          icalUrl: connIcalUrl,
          embedUrl: connEmbedUrl,
          color: connColor,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setConnFeedback({ type: 'error', text: data.error || 'Erro ao conectar agenda.' });
      } else {
        setConnFeedback({
          type: 'success',
          text: data.testWarning
            ? `Agenda salva, mas houve um aviso: ${data.testWarning}`
            : `Google Agenda conectado com sucesso! (${data.testEventsCount || 0} compromissos sincronizados)`,
        });
        setConnIcalUrl('');
        setConnEmbedUrl('');
        await fetchCalendarData(true);
      }
    } catch (err) {
      setConnFeedback({ type: 'error', text: 'Falha ao salvar conexão.' });
    } finally {
      setSavingConn(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      await fetch(`/api/admin/google-calendar?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await fetchCalendarData(true);
    } catch (err) {
      console.error('Erro ao remover conexão:', err);
    }
  };

  const handleCreateGoogleEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;

    const cleanDate = evDate.replace(/-/g, '');
    const cleanStart = evStartTime.replace(':', '') + '00';
    const cleanEnd = evEndTime.replace(':', '') + '00';
    const datesParam = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', evTitle.trim());
    url.searchParams.set('dates', datesParam);
    url.searchParams.set('ctz', 'America/Sao_Paulo');
    if (evLocation.trim()) url.searchParams.set('location', evLocation.trim());
    if (evDescription.trim()) url.searchParams.set('details', evDescription.trim());

    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    setNewEventModalOpen(false);
    setEvTitle('');
    setEvLocation('');
    setEvDescription('');
  };

  const formatSelectedDayHeader = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal da Aba Agenda */}
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FD3100] text-white flex items-center justify-center shadow-md shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight uppercase">
                  Agenda Integrada
                </h2>
                {connections.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Google Conectado ({connections.length})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0EC] text-[#FD3100] border border-[#FFCEBF] text-[10px] font-black uppercase">
                    Aguardando Conexão Google
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#66635D] mt-0.5">
                Seu Google Agenda + Posts dos Clientes + Prazos de Demandas + Captações em um único lugar.
              </p>
            </div>
          </div>

          {/* Ações Principais */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchCalendarData(true)}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-2xl border-2 border-[#E2DED7] bg-white hover:border-[#FD3100] text-[#111111] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
              title="Sincronizar eventos agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FD3100]' : ''}`} />
              <span>Sincronizar</span>
            </button>

            <button
              type="button"
              onClick={() => setConnectModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border-2 border-[#E2DED7] bg-[#FAF9F7] hover:border-[#FD3100] text-[#111111] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-[#FD3100]" />
              <span>{connections.length > 0 ? 'Configurar Google' : 'Conectar Google Agenda'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEvDate(selectedDateKey);
                setNewEventModalOpen(true);
              }}
              className="btn-vb-primary px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Evento</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros, Camadas e Modos de Visualização */}
        <div className="mt-5 pt-4 border-t border-[#EEEDEA] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Camadas / Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#888580] mr-1">Exibir:</span>

            <button
              type="button"
              onClick={() => setShowGoogle((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 ${
                showGoogle
                  ? 'bg-[#FFF0EC] border-[#FD3100] text-[#FD3100]'
                  : 'bg-[#FAF9F7] border-[#E2DED7] text-[#888580] opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FD3100]" />
              <span>Google Agenda ({googleEventsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPosts((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 ${
                showPosts
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-[#FAF9F7] border-[#E2DED7] text-[#888580] opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Posts Agendados</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDemands((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 ${
                showDemands
                  ? 'bg-amber-50 border-amber-500 text-amber-700'
                  : 'bg-[#FAF9F7] border-[#E2DED7] text-[#888580] opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>Prazos Demandas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRecordings((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5 ${
                showRecordings
                  ? 'bg-purple-50 border-purple-500 text-purple-700'
                  : 'bg-[#FAF9F7] border-[#E2DED7] text-[#888580] opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Captações</span>
            </button>
          </div>

          {/* Seletor de Modo: Mês / Lista / Google Clássico */}
          <div className="flex items-center bg-[#FAF9F7] p-1 rounded-2xl border border-[#DCD6CC] self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[#66635D] hover:text-[#111111]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[#66635D] hover:text-[#111111]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Compromissos</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('embed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                viewMode === 'embed'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[#66635D] hover:text-[#111111]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Embed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Boas-Vindas / Conexão quando ainda não há Google Agenda configurado */}
      {!loading && connections.length === 0 && (
        <div className="bg-gradient-to-r from-[#FFF0EC] to-white border-2 border-[#FFCEBF] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FD3100] text-white flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#111111]">
                Conecte sua conta do Google Agenda em 1 minuto
              </h3>
              <p className="text-xs text-[#66635D] mt-1 max-w-2xl">
                Cole o link secreto iCal (.ics) ou o e-mail/link de incorporação da sua agenda do Google para visualizar todas as suas reuniões, gravações e compromissos pessoais aqui dentro, junto com os posts e demandas da agência.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConnectModalOpen(true)}
            className="btn-vb-primary px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 shadow-md"
          >
            Conectar Agora
          </button>
        </div>
      )}

      {/* Alertas de Erro de Sincronização (se houver) */}
      {syncErrors.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase">Atenção na sincronização:</p>
            {syncErrors.map((err, i) => (
              <p key={i} className="mt-0.5">
                {err}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* MODO 1: CALENDÁRIO MENSAL UNIFICADO + DETALHES DO DIA */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Grade do Mês */}
          <div className="xl:col-span-8 bg-white border-2 border-[#DCD6CC] rounded-3xl p-4 sm:p-6 shadow-sm">
            {/* Navegação de Mês */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-[#111111] uppercase tracking-tight">
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </h3>
                {todayEventsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0EC] text-[#FD3100] text-[10px] font-black border border-[#FFCEBF]">
                    {todayEventsCount} hoje
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-[#DCD6CC] hover:border-[#FD3100] hover:bg-[#FFF0EC] transition-colors"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-3 py-1.5 rounded-xl border border-[#DCD6CC] hover:border-[#FD3100] text-xs font-black uppercase transition-colors"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-[#DCD6CC] hover:border-[#FD3100] hover:bg-[#FFF0EC] transition-colors"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cabeçalho Semana */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] sm:text-xs font-black uppercase text-[#66635D] pb-2 border-b border-[#EEEDEA]">
              {WEEK_DAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            {/* Células dos Dias */}
            {loading ? (
              <div className="py-20 text-center text-sm font-bold text-[#66635D]">
                Sincronizando compromissos...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 pt-2">
                {calendarDays.map((cell, idx) => {
                  if (!cell.day || !cell.dateKey) {
                    return (
                      <div
                        key={`empty_${idx}`}
                        className="min-h-[85px] sm:min-h-[105px] rounded-2xl bg-[#FAF9F7]/40"
                      />
                    );
                  }

                  const dayEvents = eventsByDateKey[cell.dateKey] || [];
                  const isToday = cell.dateKey === todayKey;
                  const isSelected = cell.dateKey === selectedDateKey;

                  return (
                    <button
                      type="button"
                      key={cell.dateKey}
                      onClick={() => setSelectedDateKey(cell.dateKey!)}
                      className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-2xl border-2 text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-[#FD3100] bg-[#FFF0EC] shadow-md ring-2 ring-[#FD3100]/20'
                          : isToday
                          ? 'border-[#111111] bg-white shadow-sm'
                          : 'border-[#E4E0D7] bg-white hover:border-[#FD3100]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`font-mono font-black text-xs px-1.5 py-0.5 rounded-lg ${
                            isToday
                              ? 'bg-[#FD3100] text-white'
                              : isSelected
                              ? 'text-[#FD3100]'
                              : 'text-[#111111]'
                          }`}
                        >
                          {cell.day}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[9px] font-black text-[#66635D]">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 w-full overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const { timeLabel } = getBrazilDateParts(ev.start);
                          return (
                            <div
                              key={ev.id}
                              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white truncate"
                              style={{ backgroundColor: ev.color || '#FD3100' }}
                              title={ev.title}
                            >
                              {!ev.allDay ? `${timeLabel} ` : ''}
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] font-black text-[#FD3100] pl-1">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Painel Lateral: Agenda Detalhada do Dia Selecionado */}
          <div className="xl:col-span-4 bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#FD3100] tracking-wider">
                    Compromissos do Dia
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#111111] capitalize">
                    {formatSelectedDayHeader(selectedDateKey)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEvDate(selectedDateKey);
                    setNewEventModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[#FFF0EC] text-[#FD3100] hover:bg-[#FD3100] hover:text-white transition-colors"
                  title="Adicionar evento neste dia"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-12 text-center">
                    <CalendarDays className="w-10 h-10 text-[#DCD6CC] mx-auto mb-2" />
                    <p className="text-sm font-black text-[#111111]">Dia livre!</p>
                    <p className="text-xs text-[#66635D] mt-1">
                      Nenhum compromisso ou entrega registrada para esta data.
                    </p>
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => {
                    const startParts = getBrazilDateParts(ev.start);
                    const endParts = getBrazilDateParts(ev.end);

                    return (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-2xl border-2 border-[#EEEDEA] hover:border-[#FD3100]/60 bg-[#FAF9F7]/60 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-white"
                            style={{ backgroundColor: ev.color || '#FD3100' }}
                          >
                            {ev.sourceLabel}
                          </span>
                          <span className="text-[11px] font-black text-[#111111] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#FD3100]" />
                            {ev.allDay
                              ? 'Dia inteiro'
                              : `${startParts.timeLabel} - ${endParts.timeLabel}`}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-[#111111] leading-snug">
                          {ev.title}
                        </h4>

                        {ev.description && (
                          <p className="text-xs text-[#66635D] mt-1 line-clamp-3 whitespace-pre-line">
                            {ev.description}
                          </p>
                        )}

                        {ev.location && (
                          <p className="text-[11px] font-bold text-[#66635D] mt-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#FD3100] shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </p>
                        )}

                        {ev.meetLink && (
                          <a
                            href={ev.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Entrar na Reunião</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#EEEDEA] flex items-center justify-between text-[11px] text-[#66635D]">
              <span>Fuso horário: Brasília (BRT)</span>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-[#FD3100] hover:underline flex items-center gap-1"
              >
                <span>Abrir Google Agenda</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: LISTA CRONOLÓGICA DE COMPROMISSOS */}
      {viewMode === 'list' && (
        <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] mb-4">
            <h3 className="text-lg font-black text-[#111111] uppercase">
              Próximos Compromissos & Entregas ({upcomingEvents.length})
            </h3>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-16 text-center text-sm font-bold text-[#66635D]">
              Nenhum compromisso encontrado para os próximos dias.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => {
                const startParts = getBrazilDateParts(ev.start);
                const endParts = getBrazilDateParts(ev.end);
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl border-2 border-[#EEEDEA] hover:border-[#FD3100] bg-[#FAF9F7]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl text-white flex flex-col items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: ev.color || '#FD3100' }}
                      >
                        <span className="text-base font-black leading-none">{startParts.day}</span>
                        <span className="text-[9px] font-bold uppercase">
                          {MONTH_NAMES[startParts.month - 1].slice(0, 3)}
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span
                            className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white"
                            style={{ backgroundColor: ev.color || '#FD3100' }}
                          >
                            {ev.sourceLabel}
                          </span>
                          <span className="text-xs font-bold text-[#66635D] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#FD3100]" />
                            {ev.allDay
                              ? 'Dia inteiro'
                              : `${startParts.timeLabel} - ${endParts.timeLabel}`}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-[#111111]">
                          {ev.title}
                        </h4>
                        {ev.description && (
                          <p className="text-xs text-[#66635D] mt-0.5 line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {ev.meetLink && (
                      <a
                        href={ev.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-1.5 self-start sm:self-center shrink-0"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Entrar</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODO 3: VISUALIZAÇÃO CLÁSSICA GOOGLE CALENDAR EMBED */}
      {viewMode === 'embed' && (
        <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-4 sm:p-6 shadow-sm">
          {embedConnection?.embedUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#66635D]">
                  Exibindo agenda incorporada: <strong className="text-[#111111]">{embedConnection.name}</strong>
                </p>
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black text-[#FD3100] hover:underline flex items-center gap-1"
                >
                  <span>Abrir em tela cheia</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="w-full h-[680px] rounded-2xl overflow-hidden border border-[#DCD6CC] bg-[#FAF9F7]">
                <iframe
                  src={embedConnection.embedUrl}
                  className="w-full h-full border-0"
                  title="Google Agenda"
                />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center max-w-md mx-auto">
              <Globe className="w-12 h-12 text-[#FD3100] mx-auto mb-3" />
              <h3 className="text-base font-black text-[#111111]">
                Nenhum link de incorporação configurado
              </h3>
              <p className="text-xs text-[#66635D] mt-1.5">
                Para usar o modo Google Embed, clique em <strong>Configurar Google</strong> e informe o seu e-mail do Google ou o link de incorporação da agenda.
              </p>
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="mt-4 btn-vb-primary px-5 py-2.5 rounded-2xl text-xs font-black uppercase"
              >
                Configurar Agora
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CONECTAR E GERENCIAR GOOGLE AGENDA */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF0EC] text-[#FD3100] flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#111111] uppercase">
                    Conectar Google Agenda
                  </h3>
                  <p className="text-xs text-[#66635D]">
                    Sincronize sua agenda pessoal ou da agência
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="p-2 rounded-xl hover:bg-[#FAF9F7] text-[#66635D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passo a Passo Visual */}
            <div className="mt-4 p-4 rounded-2xl bg-[#FAF9F7] border border-[#E2DED7] space-y-2 text-xs text-[#444]">
              <p className="font-black text-[#111111] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FD3100]" />
                Como pegar o link da sua agenda no Google (leva 30 segundos):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>
                  Acesse <strong>calendar.google.com</strong> no computador.
                </li>
                <li>
                  No menu esquerdo, passe o mouse na sua agenda, clique nos <strong>3 pontinhos (⋮)</strong> → <strong>Configurações e compartilhamento</strong>.
                </li>
                <li>
                  Role até a seção <strong>Integrar agenda</strong> e copie o <strong>&quot;Endereço secreto no formato iCal&quot;</strong> (termina com <code className="bg-white px-1 rounded">.ics</code>).
                </li>
              </ol>
            </div>

            <form onSubmit={handleConnectCalendar} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  Nome da Agenda
                </label>
                <input
                  type="text"
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  placeholder="Ex: Minha Agenda Pessoal / Reuniões VB"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  Link Secreto iCal (.ics) — Recomendado
                </label>
                <input
                  type="text"
                  value={connIcalUrl}
                  onChange={(e) => setConnIcalUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs font-mono"
                />
                <p className="text-[10px] text-[#66635D] mt-1">
                  Traz todos os seus eventos (inclusive privados) para o calendário integrado da plataforma.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  E-mail Google ou Link de Incorporação (Opcional)
                </label>
                <input
                  type="text"
                  value={connEmbedUrl}
                  onChange={(e) => setConnEmbedUrl(e.target.value)}
                  placeholder="seuemail@gmail.com ou https://calendar.google.com/calendar/embed?..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1.5">
                  Cor dos Eventos
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setConnColor(c.value)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border-2 flex items-center gap-1.5 transition-all ${
                        connColor === c.value
                          ? 'border-[#111111] bg-[#FAF9F7]'
                          : 'border-[#E2DED7] bg-white'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c.value }}
                      />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {connFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    connFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {connFeedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={savingConn}
                className="w-full btn-vb-primary py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
              >
                {savingConn ? 'Conectando e Sincronizando...' : 'Salvar e Conectar Agenda'}
              </button>
            </form>

            {/* Lista de Agendas já Conectadas */}
            {connections.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#EEEDEA]">
                <h4 className="text-xs font-black uppercase text-[#111111] mb-2.5">
                  Agendas Conectadas ({connections.length})
                </h4>
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="p-3 rounded-2xl border border-[#E2DED7] bg-[#FAF9F7] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: conn.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#111111] truncate">
                            {conn.name}
                          </p>
                          <p className="text-[10px] text-[#66635D] truncate">
                            {conn.icalUrl ? 'Feed iCal Sincronizado' : 'Somente Embed'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteConnection(conn.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Desconectar agenda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO EVENTO NO GOOGLE AGENDA */}
      {newEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <h3 className="text-base font-black text-[#111111] uppercase">
                Novo Evento no Google Agenda
              </h3>
              <button
                type="button"
                onClick={() => setNewEventModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#FAF9F7] text-[#66635D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoogleEvent} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Ex: Reunião de Alinhamento / Captação"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Início
                  </label>
                  <input
                    type="time"
                    value={evStartTime}
                    onChange={(e) => setEvStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={evEndTime}
                    onChange={(e) => setEvEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  Local ou Link (Opcional)
                </label>
                <input
                  type="text"
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                  placeholder="Ex: Google Meet / Escritório"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#111111] mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={evDescription}
                  onChange={(e) => setEvDescription(e.target.value)}
                  placeholder="Pauta da reunião ou lembretes..."
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E2DED7] focus:border-[#FD3100] outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-vb-primary py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
              >
                <span>Criar no Google Agenda</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
