'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  FolderOpen,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  X,
  Loader2,
  Image as ImageIcon,
  Mail,
} from 'lucide-react';
import type { PhotoFolderItem } from '@/lib/services/photo-folder-service';

interface ClientPhotosHubProps {
  mode: 'admin' | 'client';
  clientId?: string;
  clientSlug?: string;
  clientName?: string;
}

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

const MONTH_SHORT = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

function extractDriveFolderId(url: string): string | null {
  if (!url) return null;
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

export function ClientPhotosHub({
  mode,
  clientId,
  clientSlug,
  clientName,
}: ClientPhotosHubProps) {
  const [folders, setFolders] = useState<PhotoFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  // Modal Criar / Editar Pasta (Admin)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [driveUrl, setDriveUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [notifyFeedback, setNotifyFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleNotifyPhotos = async () => {
    if (!clientId) return;
    setNotifying(true);
    setNotifyFeedback(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PHOTOS_READY',
          postsCount: folders.length,
        }),
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        setNotifyFeedback({
          type: 'success',
          message: data.message || 'E-mail enviado com sucesso!',
        });
      } else {
        setNotifyFeedback({
          type: 'error',
          message: data.error || 'Não foi possível enviar o e-mail.',
        });
      }
    } catch {
      setNotifyFeedback({
        type: 'error',
        message: 'Erro de conexão ao enviar e-mail.',
      });
    } finally {
      setNotifying(false);
    }
  };

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const url =
        mode === 'admin'
          ? `/api/admin/clients/${clientId}/photos`
          : `/api/client/photos?slug=${encodeURIComponent(clientSlug || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: PhotoFolderItem[] = data.folders || [];
        setFolders(list);
        if (list.length > 0 && !expandedFolderId) {
          setExpandedFolderId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar pastas de fotos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clientId, clientSlug]);

  const monthOptions = useMemo(() => {
    const map = new Map<string, { key: string; month: number; year: number; count: number }>();
    for (const f of folders) {
      const key = `${f.year}-${String(f.month).padStart(2, '0')}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, month: f.month, year: f.year, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [folders]);

  const filteredFolders = useMemo(() => {
    if (selectedMonthKey === 'ALL') return folders;
    return folders.filter(
      (f) => `${f.year}-${String(f.month).padStart(2, '0')}` === selectedMonthKey
    );
  }, [folders, selectedMonthKey]);

  const openCreateModal = () => {
    setEditingFolderId(null);
    setTitle('');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setDriveUrl('');
    setNotes('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (folder: PhotoFolderItem) => {
    setEditingFolderId(folder.id);
    setTitle(folder.title);
    setMonth(folder.month);
    setYear(folder.year);
    setDriveUrl(folder.driveUrl);
    setNotes(folder.notes || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !driveUrl.trim() || !clientId) return;

    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/photos`, {
        method: editingFolderId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: editingFolderId || undefined,
          title: title.trim(),
          month: Number(month),
          year: Number(year),
          driveUrl: driveUrl.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao salvar pasta.');
        setSaving(false);
        return;
      }

      setModalOpen(false);
      await fetchFolders();
      if (data.folder?.id) {
        setExpandedFolderId(data.folder.id);
      }
    } catch {
      setErrorMsg('Erro de conexão ao salvar pasta.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!clientId) return;
    if (!confirm('Deseja realmente excluir esta pasta de fotos?')) return;

    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/photos?folderId=${encodeURIComponent(folderId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        if (expandedFolderId === folderId) setExpandedFolderId(null);
      }
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#FD3100] mb-2" />
        <p className="text-xs font-black uppercase text-[#66635D]">Carregando pastas de fotos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0"
          >
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg text-[#111111] uppercase tracking-tight">
              Banco de Fotos {clientName ? `• ${clientName}` : ''}
            </h3>
            <p className="text-xs text-[#66635D] font-medium">
              Pastas de fotos organizadas por mês via Google Drive — visualize aqui ou abra no Drive para baixar.
            </p>
          </div>
        </div>

        {mode === 'admin' && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={notifying}
              onClick={handleNotifyPhotos}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-2xl text-xs font-black uppercase border border-emerald-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{notifying ? 'Enviando...' : 'Notificar Cliente'}</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova Pasta de Fotos</span>
            </button>
          </div>
        )}
      </div>

      {notifyFeedback && (
        <div
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            notifyFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span>{notifyFeedback.message}</span>
          <button
            type="button"
            onClick={() => setNotifyFeedback(null)}
            className="text-xs font-black ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filtro por Mês */}
      {folders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonthKey('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
              selectedMonthKey === 'ALL'
                ? 'bg-[#FD3100] text-white border-[#FD3100] shadow-sm'
                : 'bg-white text-[#111111] border-[#DCD6CC] hover:border-[#FD3100]'
            }`}
          >
            Todos os Meses ({folders.length})
          </button>

          {monthOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedMonthKey(opt.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 ${
                selectedMonthKey === opt.key
                  ? 'bg-[#FD3100] text-white border-[#FD3100] shadow-sm'
                  : 'bg-white text-[#111111] border-[#DCD6CC] hover:border-[#FD3100]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {MONTH_SHORT[opt.month - 1]}/{opt.year}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedMonthKey === opt.key
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FAF9F7] text-[#66635D]'
                }`}
              >
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lista de Pastas */}
      {filteredFolders.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#FFCEBF] rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[#FFF0EC] rounded-2xl flex items-center justify-center mb-3 text-[#FD3100] border border-[#FFCEBF]">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h4 className="text-lg sm:text-xl font-black uppercase text-[#111111] mb-1">
            Nenhuma pasta de fotos cadastrada
          </h4>
          <p className="text-xs text-[#66635D] max-w-md mb-5 font-medium">
            {mode === 'admin'
              ? 'Adicione o link de uma pasta do Google Drive organizada por mês para o cliente acessar e baixar as fotos direto pelo VB Hub.'
              : 'Assim que a agência compartilhar as pastas de fotos de cada mês, elas aparecerão aqui para você visualizar e baixar.'}
          </p>
          {mode === 'admin' && (
            <button
              type="button"
              onClick={openCreateModal}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary px-6 py-3 rounded-2xl text-xs uppercase font-black tracking-wider"
            >
              Adicionar Primeira Pasta
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredFolders.map((folder) => {
            const driveId = extractDriveFolderId(folder.driveUrl);
            const isExpanded = expandedFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className="bg-white border-2 border-[#DCD6CC] hover:border-[#FD3100]/60 rounded-3xl overflow-hidden shadow-sm transition-all"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] text-[#FD3100] flex items-center justify-center shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFF0EC] text-[#FD3100] border border-[#FFCEBF]">
                          {MONTH_NAMES[folder.month - 1]} / {folder.year}
                        </span>
                      </div>
                      <h4 className="font-black text-base sm:text-lg text-[#111111] truncate">
                        {folder.title}
                      </h4>
                      {folder.notes && (
                        <p className="text-xs text-[#66635D] font-medium mt-0.5">
                          {folder.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {driveId && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFolderId(isExpanded ? null : folder.id)
                        }
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                          isExpanded
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-[#FAF9F7] text-[#111111] border-[#DCD6CC] hover:border-[#FD3100]'
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Ocultar Prévia</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Fotos Aqui</span>
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={folder.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir no Drive</span>
                    </a>

                    {mode === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(folder)}
                          className="p-2 bg-[#FAF9F7] hover:bg-[#EEEDEA] text-[#66635D] hover:text-[#FD3100] rounded-xl border border-[#DCD6CC] transition-all"
                          title="Editar pasta"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(folder.id)}
                          className="p-2 bg-[#FAF9F7] hover:bg-rose-50 text-[#66635D] hover:text-rose-600 rounded-xl border border-[#DCD6CC] transition-all"
                          title="Excluir pasta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Visualização embutida do Google Drive */}
                {isExpanded && driveId && (
                  <div className="border-t border-[#EEEDEA] bg-[#FAF9F7] p-3 sm:p-4">
                    <div className="rounded-2xl overflow-hidden border border-[#DCD6CC] bg-white">
                      <iframe
                        src={`https://drive.google.com/embeddedfolderview?id=${driveId}#grid`}
                        className="w-full h-[460px] border-0"
                        title={`Fotos - ${folder.title}`}
                        loading="lazy"
                      />
                    </div>
                    <p className="text-[11px] text-[#66635D] font-medium mt-2 text-center">
                      Dica: certifique-se de que a pasta no Google Drive esteja compartilhada como{' '}
                      <strong>&ldquo;Qualquer pessoa com o link&rdquo;</strong> para visualizar aqui e permitir download pelo cliente.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Pasta */}
      {modalOpen && mode === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#EEEDEA] flex items-center justify-between bg-[#FAF9F7]">
              <h3 className="font-black text-base text-[#111111] uppercase tracking-tight">
                {editingFolderId ? 'Editar Pasta de Fotos' : 'Nova Pasta de Fotos'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#66635D] hover:text-[#111111] hover:bg-[#EEEDEA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Nome da Pasta *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Ensaio Novembro, Fotos Produtos..."
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Mês de Referência *
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  >
                    {MONTH_NAMES.map((mName, idx) => (
                      <option key={mName} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Ano *
                  </label>
                  <input
                    type="number"
                    min={2024}
                    max={2035}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Link da Pasta no Google Drive *
                </label>
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Observação (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Fotos tratadas em alta resolução para feed e stories."
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-medium text-[#111111] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase text-[#66635D] hover:bg-[#EEEDEA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingFolderId ? 'Salvar Alterações' : 'Adicionar Pasta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
