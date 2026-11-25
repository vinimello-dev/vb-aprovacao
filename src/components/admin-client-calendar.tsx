'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { PostData } from '@/lib/services/post-service';
import { getScheduledYearMonthDay } from '@/lib/utils';

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

interface CycleSummary {
  id: string;
  name: string;
  posts: PostData[];
}

interface AdminClientCalendarProps {
  cycles: CycleSummary[];
  orphanPosts: PostData[];
  onSelectPost: (post: PostData) => void;
  onPostDateChanged: (postId: string, newDateObj: Date) => void;
  onOpenAddPost?: (cycleId?: string) => void;
}

export function AdminClientCalendar({
  cycles,
  orphanPosts,
  onSelectPost,
  onPostDateChanged,
  onOpenAddPost,
}: AdminClientCalendarProps) {
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [hasInitializedMonth, setHasInitializedMonth] = useState(false);

  const [selectedCycleId, setSelectedCycleId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'AJUSTES' | 'APROVADO'>('ALL');
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [rescheduleToast, setRescheduleToast] = useState<{
    title: string;
    day: number;
    monthName: string;
  } | null>(null);

  const allPosts = useMemo(() => {
    const cyclePosts = cycles.flatMap((c) => c.posts || []);
    return [...cyclePosts, ...(orphanPosts || [])];
  }, [cycles, orphanPosts]);

  const filteredPosts = useMemo(() => {
    let base = allPosts;
    if (selectedCycleId !== 'ALL') {
      const cycle = cycles.find((c) => c.id === selectedCycleId);
      base = cycle ? cycle.posts || [] : [];
    }
    if (statusFilter !== 'ALL') {
      base = base.filter((p) => p.status === statusFilter);
    }
    return base;
  }, [allPosts, cycles, selectedCycleId, statusFilter]);

  // Agrupa os meses que possuem posts programados (ex: Nov/2026 (5), Dez/2026 (1))
  const monthsWithPosts = useMemo(() => {
    const map = new Map<string, { year: number; month: number; count: number }>();
    for (const p of filteredPosts) {
      const ymd = getScheduledYearMonthDay(p.scheduledDate);
      if (!ymd) continue;
      const key = `${ymd.year}-${String(ymd.month).padStart(2, '0')}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { year: ymd.year, month: ymd.month, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
  }, [filteredPosts]);

  // Se o mês atual não tiver posts mas houver posts em outro mês na carga inicial, posiciona no primeiro mês com posts
  useEffect(() => {
    if (hasInitializedMonth || monthsWithPosts.length === 0) return;
    const hasCurrentMonth = monthsWithPosts.some(
      (m) => m.year === calendarYear && m.month === calendarMonth
    );
    if (!hasCurrentMonth) {
      setCalendarYear(monthsWithPosts[0].year);
      setCalendarMonth(monthsWithPosts[0].month);
    }
    setHasInitializedMonth(true);
  }, [monthsWithPosts, hasInitializedMonth, calendarYear, calendarMonth]);

  const daysInMonth = useMemo(
    () => new Date(calendarYear, calendarMonth, 0).getDate(),
    [calendarYear, calendarMonth]
  );

  const startingWeekday = useMemo(
    () => new Date(calendarYear, calendarMonth - 1, 1).getDay(),
    [calendarYear, calendarMonth]
  );

  const postsInCurrentMonthCount = useMemo(() => {
    return filteredPosts.filter((p) => {
      const ymd = getScheduledYearMonthDay(p.scheduledDate);
      return ymd && ymd.year === calendarYear && ymd.month === calendarMonth;
    }).length;
  }, [filteredPosts, calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleMovePostToDay = async (post: PostData, targetDay: number) => {
    if (targetDay < 1 || targetDay > daysInMonth) return;
    const ymd = getScheduledYearMonthDay(post.scheduledDate);
    if (ymd && ymd.year === calendarYear && ymd.month === calendarMonth && ymd.day === targetDay) {
      return;
    }

    const mm = String(calendarMonth).padStart(2, '0');
    const dd = String(targetDay).padStart(2, '0');
    const newDateStr = `${calendarYear}-${mm}-${dd}`;
    const newDateObj = new Date(`${newDateStr}T12:00:00.000Z`);

    onPostDateChanged(post.id, newDateObj);

    setRescheduleToast({
      title: post.title,
      day: targetDay,
      monthName: MONTH_NAMES[calendarMonth - 1],
    });
    setTimeout(() => {
      setRescheduleToast(null);
    }, 3500);

    try {
      await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id,
          scheduledDate: newDateStr,
        }),
      });
    } catch (err) {
      console.error('Erro ao mover publicação no calendário do admin:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Filtros e Ações */}
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase text-[#66635D] mr-1">
            Ciclo:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCycleId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
              selectedCycleId === 'ALL'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'bg-[#FAF9F7] text-[#66635D] border border-[#DCD6CC] hover:border-[#FD3100]'
            }`}
          >
            Todos ({allPosts.length})
          </button>
          {cycles.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setSelectedCycleId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                selectedCycleId === c.id
                  ? 'bg-[#FD3100] text-white shadow-sm'
                  : 'bg-[#FAF9F7] text-[#66635D] border border-[#DCD6CC] hover:border-[#FD3100]'
              }`}
            >
              {c.name} ({c.posts?.length || 0})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#FAF9F7] p-1 rounded-xl border border-[#DCD6CC]">
            {(['ALL', 'PENDENTE', 'AJUSTES', 'APROVADO'] as const).map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                  statusFilter === st
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-[#66635D] hover:text-[#111111]'
                }`}
              >
                {st === 'ALL'
                  ? 'Todos'
                  : st === 'PENDENTE'
                  ? 'Pendentes'
                  : st === 'AJUSTES'
                  ? 'Ajustes'
                  : 'Aprovados'}
              </button>
            ))}
          </div>

          {onOpenAddPost && (
            <button
              type="button"
              onClick={() => onOpenAddPost(selectedCycleId !== 'ALL' ? selectedCycleId : undefined)}
              className="btn-vb-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Adicionar Post</span>
            </button>
          )}
        </div>
      </div>

      {/* Grade Mensal Real com Navegação Entre Meses */}
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-8 shadow-lg">
        {/* Cabeçalho do Mês com Navegação */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EEEDEA] mb-5">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 shrink-0" style={{ color: '#FD3100' }} />
            <div>
              <h2 className="font-black text-xl text-[#111111] uppercase tracking-tight">
                {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </h2>
              <p className="text-[11px] text-[#66635D] font-medium">
                Arraste os posts entre os dias ou navegue pelos próximos meses do ciclo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Navegador de Mês */}
            <div className="flex items-center gap-1 bg-[#FAF9F7] p-1 rounded-2xl border border-[#DCD6CC]">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-white hover:text-[#FD3100] text-[#111111] transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-black uppercase text-[#111111] min-w-[130px] text-center">
                {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-white hover:text-[#FD3100] text-[#111111] transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div
              style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
              className="text-xs font-black px-4 py-2 rounded-full border uppercase shadow-sm"
            >
              {postsInCurrentMonthCount} neste mês • {filteredPosts.length} total
            </div>
          </div>
        </div>

        {/* Atalhos rápidos para meses que já têm posts programados */}
        {monthsWithPosts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <span className="text-[10px] font-black uppercase text-[#66635D] mr-1">
              Meses com posts:
            </span>
            {monthsWithPosts.map((m) => {
              const isCurrent = m.year === calendarYear && m.month === calendarMonth;
              return (
                <button
                  type="button"
                  key={`${m.year}-${m.month}`}
                  onClick={() => {
                    setCalendarYear(m.year);
                    setCalendarMonth(m.month);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border transition-all ${
                    isCurrent
                      ? 'bg-[#FD3100] text-white border-[#FD3100] shadow-xs'
                      : 'bg-[#FAF9F7] text-[#111111] border-[#DCD6CC] hover:border-[#FD3100]'
                  }`}
                >
                  {MONTH_NAMES[m.month - 1].slice(0, 3)}/{m.year} ({m.count})
                </button>
              );
            })}
          </div>
        )}

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-[#111111] pb-3 border-b border-[#EEEDEA]">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Grade Real dos Dias do Mês */}
        <div className="grid grid-cols-7 gap-2 pt-3">
          {/* Espaços vazios antes do dia 1 para alinhar com o dia da semana real */}
          {Array.from({ length: startingWeekday }).map((_, emptyIdx) => (
            <div
              key={`empty_${emptyIdx}`}
              className="min-h-[115px] sm:min-h-[135px] rounded-2xl bg-[#FAF9F7]/30 border border-dashed border-[#EEEDEA]"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
            const dayNumber = dayIndex + 1;
            const dayPosts = filteredPosts.filter((p) => {
              const ymd = getScheduledYearMonthDay(p.scheduledDate);
              if (!ymd) return false;
              return (
                ymd.year === calendarYear &&
                ymd.month === calendarMonth &&
                ymd.day === dayNumber
              );
            });
            const isDragOver = dragOverDay === dayNumber;

            return (
              <div
                key={dayNumber}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverDay !== dayNumber) {
                    setDragOverDay(dayNumber);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverDay === dayNumber) {
                    setDragOverDay(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDay(null);
                  const droppedPostId = e.dataTransfer.getData('text/plain') || draggedPostId;
                  if (!droppedPostId) return;
                  const post = allPosts.find((p) => p.id === droppedPostId);
                  if (post) {
                    handleMovePostToDay(post, dayNumber);
                  }
                  setDraggedPostId(null);
                }}
                className={`min-h-[115px] sm:min-h-[135px] p-2 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                  isDragOver
                    ? 'border-[#FD3100] border-dashed bg-[#FFF0EC] scale-[1.03] ring-2 ring-[#FD3100]/40 shadow-md'
                    : dayPosts.length > 0
                    ? 'border-[#FD3100] bg-[#FFF0EC]/70 shadow-sm'
                    : 'border-[#E4E0D7] bg-[#FAF9F7]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono font-black text-xs ${
                      isDragOver ? 'text-[#FD3100]' : 'text-[#111111]'
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {isDragOver && (
                    <span className="text-[8px] font-black uppercase text-[#FD3100] tracking-tighter">
                      Soltar aqui
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mt-1">
                  {dayPosts.map((post) => {
                    const isBeingDragged = draggedPostId === post.id;
                    return (
                      <div
                        key={post.id}
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedPostId(post.id);
                          e.dataTransfer.setData('text/plain', post.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedPostId(null);
                          setDragOverDay(null);
                        }}
                        onClick={() => onSelectPost(post)}
                        className={`p-1.5 bg-white border border-[#DCD6CC] hover:border-[#FD3100] rounded-xl cursor-grab active:cursor-grabbing shadow-sm transition-all group ${
                          isBeingDragged
                            ? 'opacity-35 scale-95 ring-2 ring-[#FD3100]'
                            : 'hover:scale-[1.02]'
                        }`}
                        title="Clique para abrir ou arraste para outro dia"
                      >
                        <div className="flex items-center justify-between text-[9px] mb-0.5">
                          <span className="font-black uppercase" style={{ color: '#FD3100' }}>
                            {post.format === 'VIDEO'
                              ? 'Vídeo'
                              : post.format === 'CAROUSEL'
                              ? 'Carrossel'
                              : 'Estático'}
                          </span>
                          <span
                            style={
                              post.status === 'APROVADO'
                                ? { backgroundColor: '#047857' }
                                : post.status === 'AJUSTES'
                                ? { backgroundColor: '#FD3100' }
                                : { backgroundColor: '#B45309' }
                            }
                            className="w-2 h-2 rounded-full"
                          />
                        </div>
                        <p className="text-[10px] font-black text-[#111111] line-clamp-1 group-hover:text-[#FD3100]">
                          {post.title}
                        </p>

                        {/* Controles de Mudança Rápida de Dia */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 pt-1 border-t border-[#EEEDEA] flex items-center justify-between text-[9px] text-[#66635D]"
                        >
                          <button
                            type="button"
                            disabled={dayNumber <= 1}
                            onClick={() => handleMovePostToDay(post, dayNumber - 1)}
                            title="Voltar 1 dia"
                            className="p-0.5 rounded hover:bg-[#FFF0EC] hover:text-[#FD3100] disabled:opacity-25 transition-colors"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>

                          <select
                            value={dayNumber}
                            onChange={(e) => handleMovePostToDay(post, Number(e.target.value))}
                            title="Mudar dia da publicação"
                            className="text-[9px] font-black bg-[#FAF9F7] text-[#111111] border border-[#DCD6CC] rounded px-1 py-0.5 outline-none cursor-pointer hover:border-[#FD3100]"
                          >
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Dia {d}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={dayNumber >= daysInMonth}
                            onClick={() => handleMovePostToDay(post, dayNumber + 1)}
                            title="Avançar 1 dia"
                            className="p-0.5 rounded hover:bg-[#FFF0EC] hover:text-[#FD3100] disabled:opacity-25 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div />
              </div>
            );
          })}
        </div>
      </div>

      {/* Toast de Confirmação */}
      {rescheduleToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111111] text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-[#FD3100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-8 h-8 rounded-xl bg-[#FD3100] flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white">Publicação Reprogramada!</p>
            <p className="text-[11px] text-[#A9A6A0]">
              &quot;{rescheduleToast.title}&quot; movido para{' '}
              <strong className="text-[#FD3100]">
                {rescheduleToast.day} de {rescheduleToast.monthName}
              </strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
