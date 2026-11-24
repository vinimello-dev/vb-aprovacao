'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Check,
  Clock,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit2,
  Users,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  FolderPlus,
  ChevronDown,
  Tag,
  Flag,
  GripVertical,
  ClipboardList,
} from 'lucide-react';
import { DemandColumnData, DemandData } from '@/lib/services/demand-service';
import { formatDate, getScheduledDateInput } from '@/lib/utils';

export const PRIORITY_CONFIG: Record<
  string,
  {
    label: string;
    short: string;
    badgeClass: string;
    flagColor: string;
    chipColor: string;
  }
> = {
  BAIXA: {
    label: 'Baixa Prioridade',
    short: 'Baixa',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    flagColor: 'text-emerald-500 fill-emerald-500',
    chipColor: 'bg-emerald-500',
  },
  MEDIA: {
    label: 'Média Prioridade',
    short: 'Média',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    flagColor: 'text-amber-500 fill-amber-500',
    chipColor: 'bg-amber-500',
  },
  NORMAL: {
    label: 'Média Prioridade',
    short: 'Média',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    flagColor: 'text-amber-500 fill-amber-500',
    chipColor: 'bg-amber-500',
  },
  ALTA: {
    label: 'Alta Prioridade',
    short: 'Alta',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    flagColor: 'text-rose-600 fill-rose-600',
    chipColor: 'bg-rose-600',
  },
  URGENTE: {
    label: 'Urgente',
    short: 'Urgente',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    flagColor: 'text-purple-600 fill-purple-600',
    chipColor: 'bg-purple-600',
  },
};

interface ClientOption {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface DemandsBoardProps {
  clients: ClientOption[];
  onOpenCreatePostModal?: (clientId?: string) => void;
}

export function DemandsBoard({ clients, onOpenCreatePostModal }: DemandsBoardProps) {
  const [columns, setColumns] = useState<DemandColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL'); // 'ALL' | 'INTERNAL' | client.id
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL'); // 'ALL' | 'ALTA' | 'MEDIA' | 'BAIXA' | 'URGENTE'
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and Drop State (Clicar e segurar cartão)
  const [draggedDemandId, setDraggedDemandId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ colId: string; index: number } | null>(null);

  // Formulário Inline de Novo Cartão por Coluna (colId -> text)
  const [activeNewCardColId, setActiveNewCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardClientId, setNewCardClientId] = useState<string>('');
  const [newCardPriority, setNewCardPriority] = useState<string>('NORMAL');
  const [submittingCard, setSubmittingCard] = useState(false);

  // Adicionar Nova Coluna / Lista
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [submittingColumn, setSubmittingColumn] = useState(false);

  // Modal de Detalhes / Edição de Demanda
  const [editingDemand, setEditingDemand] = useState<DemandData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState('NORMAL');
  const [editColumnId, setEditColumnId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/demands');
      if (!res.ok) throw new Error('Falha ao carregar');
      const data = await res.json();
      if (data.columns) {
        setColumns(data.columns);
      }
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar o quadro de demandas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  // Adicionar Cartão Rápido
  const handleQuickAddCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    setSubmittingCard(true);

    try {
      const res = await fetch('/api/admin/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCardTitle.trim(),
          columnId,
          clientId: newCardClientId ? newCardClientId : null,
          priority: newCardPriority,
        }),
      });

      if (res.ok) {
        setNewCardTitle('');
        setNewCardClientId('');
        setNewCardPriority('NORMAL');
        setActiveNewCardColId(null);
        await fetchBoard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCard(false);
    }
  };

  // Reordenação via Drag & Drop (Clicar e Segurar)
  const handleDropCard = async (targetColId: string, dropIndex?: number) => {
    if (!draggedDemandId) return;

    let movedItem: DemandData | null = null;
    let sourceColId = '';
    for (const col of columns) {
      const found = col.demands.find((d) => d.id === draggedDemandId);
      if (found) {
        movedItem = found;
        sourceColId = col.id;
        break;
      }
    }

    if (!movedItem) {
      setDraggedDemandId(null);
      setDragOverTarget(null);
      setDragOverColId(null);
      return;
    }

    const nextColumns = columns.map((col) => {
      if (col.id === sourceColId && sourceColId !== targetColId) {
        const remaining = col.demands.filter((d) => d.id !== draggedDemandId);
        return {
          ...col,
          demands: remaining.map((d, idx) => ({ ...d, order: idx })),
        };
      }

      if (col.id === targetColId) {
        const withoutItem = col.demands.filter((d) => d.id !== draggedDemandId);
        const insertPos =
          dropIndex !== undefined
            ? Math.max(0, Math.min(dropIndex, withoutItem.length))
            : withoutItem.length;

        const updatedItem: DemandData = {
          ...movedItem!,
          columnId: targetColId,
        };

        const updatedList = [...withoutItem];
        updatedList.splice(insertPos, 0, updatedItem);

        return {
          ...col,
          demands: updatedList.map((d, idx) => ({ ...d, order: idx })),
        };
      }

      return col;
    });

    setColumns(nextColumns);
    setDraggedDemandId(null);
    setDragOverTarget(null);
    setDragOverColId(null);

    const itemsToPersist: Array<{ id: string; columnId: string; order: number }> = [];

    const targetCol = nextColumns.find((c) => c.id === targetColId);
    targetCol?.demands.forEach((d, idx) => {
      itemsToPersist.push({ id: d.id, columnId: targetCol.id, order: idx });
    });

    if (sourceColId !== targetColId) {
      const sourceCol = nextColumns.find((c) => c.id === sourceColId);
      sourceCol?.demands.forEach((d, idx) => {
        itemsToPersist.push({ id: d.id, columnId: sourceCol.id, order: idx });
      });
    }

    try {
      await fetch('/api/admin/demands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToPersist }),
      });
    } catch (err) {
      console.error('Erro ao salvar reordenação:', err);
      await fetchBoard();
    }
  };

  // Mover Cartão para outra Coluna
  const handleMoveDemand = async (demand: DemandData, targetColumnId: string) => {
    try {
      // Otimisticamente atualiza local
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === demand.columnId) {
            return {
              ...col,
              demands: col.demands.filter((d) => d.id !== demand.id),
            };
          }
          if (col.id === targetColumnId) {
            return {
              ...col,
              demands: [...col.demands, { ...demand, columnId: targetColumnId }],
            };
          }
          return col;
        })
      );

      await fetch('/api/admin/demands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: demand.id,
          columnId: targetColumnId,
        }),
      });
    } catch (err) {
      console.error(err);
      await fetchBoard();
    }
  };

  // Alternar Conclusão do Cartão
  const handleToggleComplete = async (demand: DemandData) => {
    const newStatus = !demand.completed;
    try {
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          demands: col.demands.map((d) =>
            d.id === demand.id ? { ...d, completed: newStatus } : d
          ),
        }))
      );

      await fetch('/api/admin/demands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: demand.id,
          completed: newStatus,
        }),
      });
    } catch (err) {
      console.error(err);
      await fetchBoard();
    }
  };

  // Excluir Demanda
  const handleDeleteDemand = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cartão de demanda?')) return;

    try {
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          demands: col.demands.filter((d) => d.id !== id),
        }))
      );

      if (editingDemand?.id === id) {
        setEditingDemand(null);
      }

      await fetch(`/api/admin/demands?id=${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
      await fetchBoard();
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (demand: DemandData) => {
    setEditingDemand(demand);
    setEditTitle(demand.title);
    setEditDescription(demand.description || '');
    setEditClientId(demand.clientId || '');
    setEditDueDate(getScheduledDateInput(demand.dueDate));
    setEditPriority(demand.priority || 'NORMAL');
    setEditColumnId(demand.columnId);
  };

  // Salvar Edição Completa
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDemand) return;
    setSavingEdit(true);

    try {
      const res = await fetch('/api/admin/demands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDemand.id,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          clientId: editClientId ? editClientId : null,
          dueDate: editDueDate || null,
          priority: editPriority,
          columnId: editColumnId,
        }),
      });

      if (res.ok) {
        setEditingDemand(null);
        await fetchBoard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Criar Nova Coluna / Lista
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    setSubmittingColumn(true);

    try {
      const res = await fetch('/api/admin/demands/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newColumnTitle.trim() }),
      });

      if (res.ok) {
        setNewColumnTitle('');
        setAddingColumn(false);
        await fetchBoard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingColumn(false);
    }
  };

  // Excluir Coluna
  const handleDeleteColumn = async (columnId: string, title: string) => {
    if (!confirm(`Deseja excluir a coluna "${title}" e todos os cartões nela?`)) return;

    try {
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      await fetch(`/api/admin/demands/columns?id=${columnId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
      await fetchBoard();
    }
  };

  // Filtragem de demandas
  const filterDemand = (demand: DemandData) => {
    if (selectedClientId === 'INTERNAL' && demand.clientId) return false;
    if (
      selectedClientId !== 'ALL' &&
      selectedClientId !== 'INTERNAL' &&
      demand.clientId !== selectedClientId
    ) {
      return false;
    }
    if (selectedPriority !== 'ALL') {
      const p = demand.priority === 'NORMAL' ? 'MEDIA' : demand.priority || 'MEDIA';
      if (p !== selectedPriority) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = demand.title.toLowerCase().includes(q);
      const matchClient = demand.client?.name.toLowerCase().includes(q);
      const matchDesc = demand.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchClient && !matchDesc) return false;
    }
    return true;
  };

  const totalDemandsCount = columns.reduce(
    (acc, col) => acc + col.demands.filter((d) => !d.completed).length,
    0
  );

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Barra Superior do Quadro com Filtros */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0"
            >
              <ClipboardList className="w-5 h-5 text-white stroke-[1.75]" />
            </span>
            <div>
              <h2 className="text-base sm:text-xl font-black text-[#111111] uppercase tracking-tight flex items-center gap-2 flex-wrap">
                <span>Quadro de Demandas</span>
                <span
                  style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                  className="px-2 py-0.5 text-[10px] font-black rounded-full border shrink-0 whitespace-nowrap flex items-center gap-1"
                >
                  <span>{totalDemandsCount}</span>
                  <span className="hidden sm:inline">abertas</span>
                </span>
              </h2>
              <p className="text-xs text-[#66635D] font-medium">
                Organize as tarefas da equipe, prazos e demandas de cada cliente
              </p>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[150px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66635D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar cartão..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs text-[#111111] font-medium focus:outline-none"
            />
          </div>

          {/* Filtro por Cliente */}
          <div className="flex items-center gap-1.5 bg-[#FAF9F7] border border-[#DCD6CC] px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#111111] flex-1 sm:flex-none min-w-[140px] max-w-full">
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: '#FD3100' }} />
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-transparent text-xs font-black text-[#111111] focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL">Todos os Clientes & Planejamento</option>
              <option value="INTERNAL">📌 Só Planejamento Interno (Sem cliente)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Prioridade */}
          <div className="flex items-center gap-1.5 bg-[#FAF9F7] border border-[#DCD6CC] px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#111111] flex-1 sm:flex-none min-w-[130px] max-w-full">
            <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600 shrink-0" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-xs font-black text-[#111111] focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL">Todas as Prioridades</option>
              <option value="ALTA">🚩 Alta Prioridade</option>
              <option value="MEDIA">🚩 Média Prioridade</option>
              <option value="BAIXA">🚩 Baixa Prioridade</option>
              <option value="URGENTE">🚩 Urgente</option>
            </select>
          </div>

          <button
            onClick={fetchBoard}
            className="p-2 hover:bg-[#EEEDEA] text-[#66635D] hover:text-[#111111] rounded-xl transition-colors shrink-0"
            title="Atualizar quadro"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ÁREA KANBAN (COLUNAS ESTILO TRELLO) */}
      <div className="overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory">
        <div className="flex items-start gap-3 sm:gap-4 min-w-max px-1">
          {columns.map((column, colIdx) => {
            const visibleDemands = column.demands.filter(filterDemand);

            const isColumnDropTarget = dragOverColId === column.id && !dragOverTarget;

            return (
              <div
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColId !== column.id) setDragOverColId(column.id);
                }}
                onDragLeave={() => {
                  if (dragOverColId === column.id) setDragOverColId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropCard(column.id);
                }}
                className={`w-[84vw] sm:w-80 shrink-0 snap-center rounded-2xl p-3 border shadow-sm flex flex-col max-h-[calc(100vh-220px)] transition-all ${
                  isColumnDropTarget
                    ? 'bg-[#FFF0EC] border-[#FD3100] ring-2 ring-[#FD3100]/30'
                    : 'bg-[#F1F2F4] border-[#DCD6CC]'
                }`}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-[#172B4D] tracking-tight">
                      {column.title}
                    </h3>
                    <span className="text-[11px] font-bold text-[#626F86] bg-white px-2 py-0.5 rounded-full border border-[#DCD6CC]">
                      {visibleDemands.length}
                    </span>
                  </div>

                  {columns.length > 3 && (
                    <button
                      onClick={() => handleDeleteColumn(column.id, column.title)}
                      className="p-1 text-[#626F86] hover:text-rose-600 rounded-lg hover:bg-white/80 transition-colors"
                      title="Excluir esta lista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lista de Cartões (Scrollável com Drag & Drop) */}
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-[40px]">
                  {visibleDemands.map((demand, cardIdx) => {
                    const isOverdue =
                      demand.dueDate &&
                      new Date(demand.dueDate) < new Date() &&
                      !demand.completed;

                    const isDragged = draggedDemandId === demand.id;
                    const isOverThis =
                      dragOverTarget?.colId === column.id &&
                      dragOverTarget?.index === cardIdx;
                    const priorityMeta =
                      PRIORITY_CONFIG[demand.priority] || PRIORITY_CONFIG.MEDIA;

                    return (
                      <div key={demand.id}>
                        {/* Linha indicadora de drop acima do cartão */}
                        {isOverThis && !isDragged && (
                          <div className="h-1.5 bg-[#FD3100] rounded-full animate-pulse my-1.5 shadow-sm" />
                        )}

                        <div
                          draggable={!demand.completed}
                          onDragStart={(e) => {
                            setDraggedDemandId(demand.id);
                            e.dataTransfer.setData('text/plain', demand.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedDemandId(null);
                            setDragOverTarget(null);
                            setDragOverColId(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (
                              dragOverTarget?.colId !== column.id ||
                              dragOverTarget?.index !== cardIdx
                            ) {
                              setDragOverTarget({ colId: column.id, index: cardIdx });
                              setDragOverColId(column.id);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDropCard(column.id, cardIdx);
                          }}
                          className={`bg-white rounded-xl p-3 border shadow-sm transition-all hover:shadow-md group relative cursor-grab active:cursor-grabbing ${
                            isDragged
                              ? 'opacity-30 border-dashed border-[#FD3100] scale-95'
                              : demand.completed
                              ? 'opacity-60 border-emerald-300 bg-emerald-50/20'
                              : 'border-[#DFE1E6] hover:border-[#FD3100]'
                          }`}
                        >
                          {/* Topo do Cartão: Grip + Tags (Cliente & Bandeira Prioridade) */}
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                              {/* Grip Vertical */}
                              <GripVertical className="w-3 h-3 text-[#97A0AF] group-hover:text-[#111111] shrink-0" />

                              {/* Tag do Cliente */}
                              {demand.client && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#FFF0EC] text-[#FD3100] border border-[#FFCEBF] max-w-[130px] truncate">
                                  {demand.client.logoUrl ? (
                                    <img
                                      src={demand.client.logoUrl}
                                      alt=""
                                      className="w-3 h-3 rounded object-cover"
                                    />
                                  ) : (
                                    <Tag className="w-2.5 h-2.5" />
                                  )}
                                  <span className="truncate">{demand.client.name}</span>
                                </span>
                              )}
                            </div>

                            {/* Bandeirinha de Prioridade */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border shrink-0 ${priorityMeta.badgeClass}`}
                              title={priorityMeta.label}
                            >
                              <Flag className={`w-2.5 h-2.5 ${priorityMeta.flagColor}`} />
                              {priorityMeta.short}
                            </span>
                          </div>

                          {/* Corpo do Cartão: Checkbox + Título */}
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(demand);
                              }}
                              className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                demand.completed
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-[#97A0AF] hover:border-[#FD3100] bg-white'
                              }`}
                              title={
                                demand.completed
                                  ? 'Marcar como pendente'
                                  : 'Marcar como concluído'
                              }
                            >
                              {demand.completed && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </button>

                            <div
                              onClick={() => handleOpenEdit(demand)}
                              className="flex-1 cursor-pointer"
                            >
                              <p
                                className={`text-xs font-bold text-[#172B4D] leading-snug break-words ${
                                  demand.completed
                                    ? 'line-through text-[#626F86]'
                                    : ''
                                }`}
                              >
                                {demand.title}
                              </p>

                              {demand.description && (
                                <p className="text-[11px] text-[#626F86] mt-1 line-clamp-2 font-medium">
                                  {demand.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Rodapé do Cartão: Prazo + Mover */}
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#F1F2F4] text-[10px]">
                            {/* Badge de Prazo */}
                            {demand.dueDate ? (
                              <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold ${
                                  demand.completed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800 font-black'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {formatDate(demand.dueDate)}
                              </span>
                            ) : (
                              <span />
                            )}

                            {/* Ações de Mover e Editar */}
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              {colIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveDemand(
                                      demand,
                                      columns[colIdx - 1].id
                                    );
                                  }}
                                  className="p-1 hover:bg-[#EEEDEA] text-[#626F86] hover:text-[#111111] rounded"
                                  title={`Mover para ${columns[colIdx - 1].title}`}
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}

                              {colIdx < columns.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveDemand(
                                      demand,
                                      columns[colIdx + 1].id
                                    );
                                  }}
                                  className="p-1 hover:bg-[#EEEDEA] text-[#626F86] hover:text-[#111111] rounded"
                                  title={`Mover para ${columns[colIdx + 1].title}`}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(demand);
                                }}
                                className="p-1 hover:bg-[#EEEDEA] text-[#626F86] hover:text-[#FD3100] rounded"
                                title="Editar cartão"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé: + Adicionar um cartão (estilo Trello) */}
                <div className="mt-2 pt-1 border-t border-[#DCD6CC]/60">
                  {activeNewCardColId === column.id ? (
                    <div className="bg-white p-2.5 rounded-xl border border-[#DCD6CC] shadow-sm space-y-2 animate-in fade-in">
                      <textarea
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        placeholder="Insira um título para este cartão..."
                        autoFocus
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleQuickAddCard(column.id);
                          }
                        }}
                        className="w-full text-xs font-bold text-[#111111] placeholder-[#97A0AF] p-1.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-lg focus:outline-none resize-none"
                      />

                      {/* Escolher Cliente (opcional) */}
                      <div className="flex items-center gap-1 text-[10px]">
                        <select
                          value={newCardClientId}
                          onChange={(e) => setNewCardClientId(e.target.value)}
                          className="w-full p-1 bg-[#FAF9F7] border border-[#DCD6CC] rounded-lg text-[#111111] font-bold focus:outline-none"
                        >
                          <option value="">📌 Sem cliente (Planejamento Interno)</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              🏢 {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selecionar Prioridade no Novo Cartão com Bandeirinhas */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#66635D]">
                            Prioridade:
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { key: 'BAIXA', label: 'Baixa', color: 'text-emerald-500 fill-emerald-500', activeBg: 'bg-emerald-600 text-white border-emerald-600' },
                            { key: 'NORMAL', label: 'Média', color: 'text-amber-500 fill-amber-500', activeBg: 'bg-amber-500 text-white border-amber-500' },
                            { key: 'ALTA', label: 'Alta', color: 'text-rose-600 fill-rose-600', activeBg: 'bg-rose-600 text-white border-rose-600' },
                            { key: 'URGENTE', label: 'Urgente', color: 'text-purple-600 fill-purple-600', activeBg: 'bg-purple-600 text-white border-purple-600' },
                          ].map((p) => {
                            const isSelected =
                              newCardPriority === p.key ||
                              (p.key === 'NORMAL' && newCardPriority === 'MEDIA');
                            return (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => setNewCardPriority(p.key)}
                                className={`py-1 px-1 rounded-lg text-[10px] font-black border transition-all flex items-center justify-center gap-1 ${
                                  isSelected
                                    ? `${p.activeBg} shadow-sm`
                                    : 'bg-[#FAF9F7] border-[#DCD6CC] text-[#66635D] hover:bg-white'
                                }`}
                              >
                                <Flag
                                  className={`w-2.5 h-2.5 ${
                                    isSelected ? 'text-white fill-white' : p.color
                                  }`}
                                />
                                <span className="truncate">{p.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAddCard(column.id)}
                          disabled={submittingCard || !newCardTitle.trim()}
                          style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                          className="btn-vb-primary px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider font-black disabled:opacity-50"
                        >
                          {submittingCard ? 'Salvando...' : 'Adicionar cartão'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNewCardColId(null);
                            setNewCardTitle('');
                            setNewCardClientId('');
                            setNewCardPriority('NORMAL');
                          }}
                          className="p-1 text-[#626F86] hover:text-[#111111] rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNewCardColId(column.id);
                        setNewCardTitle('');
                        setNewCardPriority('NORMAL');
                        setNewCardClientId(
                          selectedClientId !== 'ALL' && selectedClientId !== 'INTERNAL'
                            ? selectedClientId
                            : ''
                        );
                      }}
                      className="w-full py-2 px-2.5 rounded-xl text-xs font-bold text-[#626F86] hover:text-[#172B4D] hover:bg-white/80 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Adicionar um cartão</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Botão + Adicionar outra lista (coluna) */}
          <div className="w-72 sm:w-80 shrink-0">
            {addingColumn ? (
              <form
                onSubmit={handleCreateColumn}
                className="bg-[#F1F2F4] p-3 rounded-2xl border border-[#DCD6CC] shadow-sm space-y-2 animate-in fade-in"
              >
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Insira o título da lista..."
                  autoFocus
                  required
                  className="w-full text-xs font-bold text-[#111111] placeholder-[#97A0AF] p-2 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submittingColumn}
                    style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                    className="btn-vb-primary px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-black disabled:opacity-50"
                  >
                    {submittingColumn ? 'Criando...' : 'Adicionar lista'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="p-1.5 text-[#626F86] hover:text-[#111111] rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingColumn(true)}
                className="w-full py-3 px-4 bg-white/70 hover:bg-white border-2 border-dashed border-[#DCD6CC] hover:border-[#FD3100] rounded-2xl text-xs font-black uppercase tracking-wider text-[#626F86] hover:text-[#FD3100] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Adicionar outra lista</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Detalhes & Edição Completa da Demanda */}
      {editingDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <div className="flex items-center gap-2.5">
                <span
                  style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black border text-lg"
                >
                  📝
                </span>
                <div>
                  <h3 className="font-black text-[#111111] text-lg uppercase tracking-tight">
                    Editar Demanda
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Detalhes da tarefa e prazos de entrega
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteDemand(editingDemand.id)}
                  className="p-2 text-[#66635D] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Excluir este cartão"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDemand(null)}
                  className="p-2 text-[#66635D] hover:text-[#111111] hover:bg-[#FAF9F7] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              {/* Título da Demanda */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Título da Demanda *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  placeholder="Ex: Videos Cris, Roteiros Gravação..."
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] font-bold text-sm focus:outline-none"
                />
              </div>

              {/* Descrição / Notas */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Descrição / Orientações
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Adicione orientações, links ou detalhes adicionais..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] text-xs font-medium focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Associar ao Cliente */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Cliente / Empresa
                  </label>
                  <select
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] text-xs font-bold focus:outline-none"
                  >
                    <option value="">📌 Sem cliente (Planejamento Interno)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coluna / Lista */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Coluna (Lista)
                  </label>
                  <select
                    value={editColumnId}
                    onChange={(e) => setEditColumnId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] text-xs font-bold focus:outline-none"
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prioridade com Bandeirinhas */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Prioridade do Cartão
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      key: 'BAIXA',
                      label: 'Baixa',
                      color: 'text-emerald-500 fill-emerald-500',
                      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-400',
                    },
                    {
                      key: 'NORMAL',
                      label: 'Média',
                      color: 'text-amber-500 fill-amber-500',
                      badgeClass: 'bg-amber-50 text-amber-800 border-amber-400',
                    },
                    {
                      key: 'ALTA',
                      label: 'Alta',
                      color: 'text-rose-600 fill-rose-600',
                      badgeClass: 'bg-rose-50 text-rose-800 border-rose-400',
                    },
                    {
                      key: 'URGENTE',
                      label: 'Urgente',
                      color: 'text-purple-600 fill-purple-600',
                      badgeClass: 'bg-purple-50 text-purple-800 border-purple-400',
                    },
                  ].map((p) => {
                    const isSelected =
                      editPriority === p.key ||
                      (p.key === 'NORMAL' && editPriority === 'MEDIA');
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setEditPriority(p.key)}
                        className={`py-2 px-3 rounded-2xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? `${p.badgeClass} ring-2 ring-[#FD3100] shadow-sm`
                            : 'bg-[#FAF9F7] border-[#DCD6CC] text-[#66635D] hover:bg-white'
                        }`}
                      >
                        <Flag className={`w-3.5 h-3.5 ${p.color}`} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data / Prazo */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Prazo / Data de Entrega
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#EEEDEA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDemand(null)}
                  className="btn-vb-secondary px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
