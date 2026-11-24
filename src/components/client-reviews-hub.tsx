'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Video,
  Layers,
  Image as ImageIcon,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Calendar,
  Sparkles,
  Users,
  Check,
  Send,
  Eye,
} from 'lucide-react';
import { PostWithClientData } from '@/lib/services/post-service';
import { formatDate } from '@/lib/utils';

interface ClientReviewsHubProps {
  clients: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  }>;
  onSelectPostForReview: (post: any) => void;
  onRefreshNotifications?: () => void;
}

export function ClientReviewsHub({
  clients,
  onSelectPostForReview,
  onRefreshNotifications,
}: ClientReviewsHubProps) {
  const [posts, setPosts] = useState<PostWithClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'AJUSTES' | 'PENDENTE' | 'APROVADO' | 'ALL'>('AJUSTES');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/posts');
      if (res.ok) {
        const data = await res.json();
        if (data.posts) {
          setPosts(data.posts);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar posts para revisão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleQuickStatusChange = async (postId: string, newStatus: 'PENDENTE' | 'APROVADO' | 'AJUSTES') => {
    try {
      setUpdatingPostId(postId);
      const res = await fetch(`/api/client/posts/${postId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
          );
          if (onRefreshNotifications) onRefreshNotifications();
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status do post:', err);
    } finally {
      setUpdatingPostId(null);
    }
  };

  // Contadores globais
  const adjustmentsCount = posts.filter((p) => p.status === 'AJUSTES').length;
  const pendingCount = posts.filter((p) => p.status === 'PENDENTE').length;
  const approvedCount = posts.filter((p) => p.status === 'APROVADO').length;

  // Filtragem dos posts
  const filteredPosts = posts.filter((post) => {
    // Filtro de Status
    if (statusFilter !== 'ALL' && post.status !== statusFilter) {
      return false;
    }

    // Filtro de Cliente
    if (selectedClientId !== 'ALL' && post.clientId !== selectedClientId) {
      return false;
    }

    // Filtro de Formato
    if (formatFilter !== 'ALL' && post.format !== formatFilter) {
      return false;
    }

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchClient = post.client?.name?.toLowerCase().includes(q);
      const matchCaption = post.caption?.toLowerCase().includes(q);
      const matchComment = post.comments?.some((c) =>
        c.content?.toLowerCase().includes(q)
      );

      if (!matchTitle && !matchClient && !matchCaption && !matchComment) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-200">
      {/* Topo: Cabeçalho da Central de Revisões */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#DCD6CC] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span
            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0"
          >
            📝
          </span>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-[#111111] uppercase tracking-tight">
                Central de <span style={{ color: '#FD3100' }}>Revisões dos Clientes</span>
              </h2>
              {adjustmentsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-rose-600 text-white shadow-sm flex items-center gap-1.5 animate-pulse shrink-0 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>{adjustmentsCount}</span>
                  <span className="hidden sm:inline">aguardando ajustes</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#66635D] font-medium mt-0.5">
              Acompanhe todas as alterações solicitadas, analise os comentários nos posts e envie ajustes para aprovação
            </p>
          </div>
        </div>

        <button
          onClick={fetchPosts}
          disabled={loading}
          className="btn-vb-secondary px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all self-end lg:self-auto shrink-0 shadow-sm"
          title="Atualizar lista de revisões"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: '#FD3100' }} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Barra de Filtros e Abas de Status */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm flex flex-col space-y-4">
        {/* Abas Rápidas por Status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter('AJUSTES')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              statusFilter === 'AJUSTES'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                : 'bg-[#FAF9F7] text-[#111111] border border-[#DCD6CC] hover:bg-[#EEEDEA]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Ajustes Solicitados</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'AJUSTES'
                  ? 'bg-white text-rose-600'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {adjustmentsCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('PENDENTE')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              statusFilter === 'PENDENTE'
                ? 'btn-vb-primary shadow-md'
                : 'bg-[#FAF9F7] text-[#111111] border border-[#DCD6CC] hover:bg-[#EEEDEA]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Aguardando Cliente</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'PENDENTE'
                  ? 'bg-white text-[#FD3100]'
                  : 'bg-[#FFF0EC] text-[#FD3100]'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APROVADO')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              statusFilter === 'APROVADO'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                : 'bg-[#FAF9F7] text-[#111111] border border-[#DCD6CC] hover:bg-[#EEEDEA]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aprovados</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'APROVADO'
                  ? 'bg-white text-emerald-600'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-[#111111] text-white shadow-md'
                : 'bg-[#FAF9F7] text-[#66635D] border border-[#DCD6CC] hover:bg-[#EEEDEA]'
            }`}
          >
            Todos os Posts ({posts.length})
          </button>
        </div>

        {/* Linha de Busca e Seletores */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#EEEDEA]">
          {/* Busca Textual */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66635D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por post, cliente ou comentário..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs text-[#111111] font-medium focus:outline-none"
            />
          </div>

          {/* Filtro de Cliente */}
          <div className="sm:col-span-3 flex items-center gap-2 bg-[#FAF9F7] border border-[#DCD6CC] px-3 py-2 rounded-2xl text-xs font-bold text-[#111111]">
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: '#FD3100' }} />
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-transparent text-xs font-black text-[#111111] focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Formato */}
          <div className="sm:col-span-3 flex items-center gap-2 bg-[#FAF9F7] border border-[#DCD6CC] px-3 py-2 rounded-2xl text-xs font-bold text-[#111111]">
            <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: '#FD3100' }} />
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-[#111111] focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL">Todos os Formatos</option>
              <option value="VIDEO">🎬 Vídeo / Reels</option>
              <option value="CAROUSEL">📑 Carrossel</option>
              <option value="STATIC">🖼️ Estático / Foto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Publicações em Revisão */}
      {loading ? (
        <div className="p-16 bg-white rounded-3xl border-2 border-[#DCD6CC] flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-4 border-[#FD3100]/20 border-t-[#FD3100] rounded-full animate-spin mb-4" />
          <p className="text-sm font-black text-[#111111] uppercase tracking-wider">
            Carregando revisões dos clientes...
          </p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-12 sm:p-16 bg-white rounded-3xl border-2 border-[#DCD6CC] text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl mb-4 shadow-sm">
            🎉
          </div>
          <h3 className="text-lg font-black uppercase text-[#111111] tracking-tight">
            Nenhuma publicação encontrada
          </h3>
          <p className="text-xs sm:text-sm text-[#66635D] font-medium max-w-md mt-1">
            {statusFilter === 'AJUSTES'
              ? 'Tudo em dia! Seus clientes não possuem nenhum post aguardando alterações no momento.'
              : 'Nenhum post corresponde aos filtros selecionados. Tente alterar o cliente ou o status.'}
          </p>
          {statusFilter !== 'ALL' && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSelectedClientId('ALL');
                setFormatFilter('ALL');
                setSearchQuery('');
              }}
              className="btn-vb-secondary mt-5 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider"
            >
              Limpar Filtros e Ver Todos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredPosts.map((post) => {
            const clientComments = post.comments?.filter((c) => c.authorRole === 'CLIENT') || [];
            const isAdjustment = post.status === 'AJUSTES';
            const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
            const thumbUrl = firstMedia?.thumbnailUrl || firstMedia?.url;

            return (
              <div
                key={post.id}
                className={`bg-white rounded-3xl border-2 p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 ${
                  isAdjustment
                    ? 'border-rose-300 bg-gradient-to-r from-rose-50/20 via-white to-white ring-1 ring-rose-200'
                    : 'border-[#DCD6CC]'
                }`}
              >
                {/* Lado Esquerdo: Thumbnail + Detalhes do Post */}
                <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                  {/* Thumbnail / Mídia do Post com Badge */}
                  <div
                    onClick={() => onSelectPostForReview(post)}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#111111] border-2 border-[#DCD6CC] shrink-0 cursor-pointer group shadow-sm"
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50 bg-[#1e1e1e]">
                        {post.format === 'VIDEO' ? (
                          <Video className="w-8 h-8" />
                        ) : post.format === 'CAROUSEL' ? (
                          <Layers className="w-8 h-8" />
                        ) : (
                          <ImageIcon className="w-8 h-8" />
                        )}
                      </div>
                    )}

                    {/* Overlay de Ação no Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-2 rounded-xl bg-white/90 text-[#111111] shadow-lg">
                        <Eye className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Badge de Formato no canto da imagem */}
                    <span className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1">
                      {post.format === 'VIDEO' && <Video className="w-2.5 h-2.5 text-[#FD3100]" />}
                      {post.format === 'CAROUSEL' && <Layers className="w-2.5 h-2.5 text-[#FD3100]" />}
                      {post.format === 'STATIC' && <ImageIcon className="w-2.5 h-2.5 text-[#FD3100]" />}
                      <span>{post.format}</span>
                    </span>
                  </div>

                  {/* Informações Textuais */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {/* Cliente */}
                      {post.client && (
                        <Link
                          href={`/admin/clients/${post.client.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black uppercase bg-[#FFF0EC] text-[#FD3100] border border-[#FFCEBF] hover:bg-[#FFE5DE] transition-colors"
                        >
                          {post.client.logoUrl ? (
                            <img
                              src={post.client.logoUrl}
                              alt=""
                              className="w-3.5 h-3.5 rounded object-cover"
                            />
                          ) : (
                            <Users className="w-3 h-3" />
                          )}
                          <span className="truncate max-w-[130px] sm:max-w-xs">{post.client.name}</span>
                        </Link>
                      )}

                      {/* Status */}
                      {post.status === 'AJUSTES' && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                          Alterações Solicitadas
                        </span>
                      )}
                      {post.status === 'PENDENTE' && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Aguardando Cliente
                        </span>
                      )}
                      {post.status === 'APROVADO' && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Aprovado
                        </span>
                      )}

                      {/* Data de agendamento */}
                      {post.scheduledDate && (
                        <span className="text-[11px] text-[#66635D] font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.scheduledDate)}
                        </span>
                      )}
                    </div>

                    {/* Título do Post */}
                    <h3
                      onClick={() => onSelectPostForReview(post)}
                      className="text-base sm:text-lg font-black text-[#111111] leading-snug hover:text-[#FD3100] transition-colors cursor-pointer"
                    >
                      {post.title}
                    </h3>

                    {/* Legenda (Caption) prévia */}
                    {post.caption && (
                      <p className="text-xs text-[#66635D] line-clamp-1 mt-1 font-medium">
                        {post.caption}
                      </p>
                    )}

                    {/* Bloco de Comentários e Apontamentos do Cliente */}
                    {clientComments.length > 0 ? (
                      <div className="mt-3 p-3 rounded-2xl bg-[#FFF0EC]/70 border border-[#FFCEBF] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[#FD3100]">
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            Comentários do Cliente ({clientComments.length})
                          </span>
                          <span className="text-[10px] text-[#66635D] font-normal normal-case">
                            Último apontamento:
                          </span>
                        </div>
                        <p className="text-xs text-[#111111] font-bold italic line-clamp-2">
                          "{clientComments[0].content}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#97A0AF] font-medium mt-2 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Nenhum comentário específico adicionado na timeline
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Ações Rápidas */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2.5 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EEEDEA]">
                  {/* Botão Principal: Abrir Revisão Interativa */}
                  <button
                    onClick={() => onSelectPostForReview(post)}
                    className="btn-vb-primary px-5 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all font-black"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Fazer Revisão</span>
                  </button>

                  {/* Ação de Status Rápida */}
                  {isAdjustment ? (
                    <button
                      disabled={updatingPostId === post.id}
                      onClick={() => handleQuickStatusChange(post.id, 'PENDENTE')}
                      className="btn-vb-secondary px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Marca os ajustes como realizados e reenvia para o cliente aprovar"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{updatingPostId === post.id ? 'Salvando...' : 'Reenviar p/ Aprovação'}</span>
                    </button>
                  ) : post.status === 'PENDENTE' ? (
                    <button
                      disabled={updatingPostId === post.id}
                      onClick={() => handleQuickStatusChange(post.id, 'APROVADO')}
                      className="btn-vb-secondary px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>{updatingPostId === post.id ? 'Salvando...' : 'Aprovar Direto'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1 py-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Pronto para postagem
                    </span>
                  )}

                  {post.client && (
                    <Link
                      href={`/admin/clients/${post.client.id}`}
                      className="text-[11px] font-black uppercase tracking-wider text-[#66635D] hover:text-[#FD3100] transition-colors flex items-center justify-center gap-1 py-1"
                    >
                      <span>Ver Hub do Cliente</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
