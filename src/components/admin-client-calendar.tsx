'use client';

import { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { PostData } from '@/lib/services/post-service';
import { getScheduledDay } from '@/lib/utils';

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
  const [selectedCycleId, setSelectedCycleId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'AJUSTES' | 'APROVADO'>('ALL');
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [rescheduleToast, setRescheduleToast] = useState<{ title: string; day: number } | null>(null);

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

  const handleMovePostToDay = async (post: PostData, targetDay: number) => {
    if (targetDay < 1 || targetDay > 31) return;
    const currentDay = getScheduledDay(post.scheduledDate);
    if (currentDay === targetDay) return;

    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;

    if (post.scheduledDate) {
      const rawDate = post.scheduledDate as unknown;
      if (typeof rawDate === 'string') {
        const m = rawDate.match(/^(\d{4})-(\d{2})/);
        if (m) {
          year = parseInt(m[1], 10);
          month = parseInt(m[2], 10);
        }
      } else if (post.scheduledDate instanceof Date) {
        if (post.scheduledDate.getUTCHours() === 0 && post.scheduledDate.getUTCMinutes() === 0) {
          year = post.scheduledDate.getUTCFullYear();
          month = post.scheduledDate.getUTCMonth() + 1;
        } else {
          year = post.scheduledDate.getFullYear();
          month = post.scheduledDate.getMonth() + 1;
        }
      }
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(targetDay).padStart(2, '0');
    const newDateStr = `${year}-${mm}-${dd}`;
    const newDateObj = new Date(`${newDateStr}T12:00:00.000Z`);

    // Atualização otimista no estado pai
    onPostDateChanged(post.id, newDateObj);

    setRescheduleToast({
      title: post.title,
      day: targetDay,
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

      {/* Grade Mensal (Mesmo Padrão do Portal do Cliente) */}
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-8 shadow-lg">
        {/* Cabeçalho do Mês */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#EEEDEA] mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" style={{ color: '#FD3100' }} />
            <div>
              <h2 className="font-black text-xl text-[#111111] uppercase tracking-tight">
                Planejamento do Mês
              </h2>
              <p className="text-[11px] text-[#66635D] font-medium">
                Arraste os posts entre os dias ou use as setas para reprogramar a grade.
              </p>
            </div>
          </div>

          <div
            style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
            className="text-xs font-black px-4 py-1.5 rounded-full border uppercase shadow-sm self-start sm:self-auto"
          >
            {filteredPosts.length} publicações programadas
          </div>
        </div>

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

        {/* Grade dos Dias do Mês */}
        <div className="grid grid-cols-7 gap-2 pt-3">
          {Array.from({ length: 31 }).map((_, dayIndex) => {
            const dayNumber = dayIndex + 1;
            const dayPosts = filteredPosts.filter((p) => {
              if (!p.scheduledDate) return false;
              return getScheduledDay(p.scheduledDate) === dayNumber;
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
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Dia {d}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={dayNumber >= 31}
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
              &quot;{rescheduleToast.title}&quot; movido para o{' '}
              <strong className="text-[#FD3100]">Dia {rescheduleToast.day}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
