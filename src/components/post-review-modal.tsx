'use client';

import { useState } from 'react';
import {
  X,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Edit3,
  Save,
  MessageSquare,
  Send,
} from 'lucide-react';
import { PostData, CommentData } from '@/lib/services/post-service';
import { VideoPlayerReview } from './video-player-review';
import { CarouselReview } from './carousel-review';
import { formatDate } from '@/lib/utils';

interface PostReviewModalProps {
  post: PostData;
  onClose: () => void;
  onPostUpdated: (updatedPost: PostData) => void;
}

export function PostReviewModal({ post, onClose, onPostUpdated }: PostReviewModalProps) {
  const [currentPost, setCurrentPost] = useState<PostData>(post);
  const [activeTab, setActiveTab] = useState<'review' | 'caption'>('review');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edição de Legenda
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editableCaption, setEditableCaption] = useState(post.caption || '');
  const [savingCaption, setSavingCaption] = useState(false);
  const [captionSaveSuccess, setCaptionSaveSuccess] = useState(false);

  // Comentário sobre a legenda
  const [captionCommentText, setCaptionCommentText] = useState('');
  const [captionAuthorName, setCaptionAuthorName] = useState('Cliente');
  const [savingCaptionComment, setSavingCaptionComment] = useState(false);

  // Feedback de Status
  const [statusFeedbackMessage, setStatusFeedbackMessage] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: 'APROVADO' | 'AJUSTES' | 'PENDENTE') => {
    setUpdatingStatus(true);
    setStatusFeedbackMessage(null);
    try {
      const res = await fetch(`/api/client/posts/${currentPost.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.post) {
        setCurrentPost(data.post);
        onPostUpdated(data.post);
        if (newStatus === 'AJUSTES') {
          setStatusFeedbackMessage(
            'Alterações e comentários enviados com sucesso para a Agência VB! A equipe já foi notificada no painel de demandas.'
          );
        } else if (newStatus === 'APROVADO') {
          setStatusFeedbackMessage(
            'Publicação aprovada com sucesso! A equipe da Agência VB foi notificada para prosseguir com o agendamento.'
          );
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCommentAdded = (newComment: CommentData) => {
    const updated = {
      ...currentPost,
      comments: [...currentPost.comments, newComment],
    };
    setCurrentPost(updated);
    onPostUpdated(updated);
  };

  const handleCommentResolvedToggle = async (commentId: string) => {
    try {
      await fetch(`/api/client/posts/${currentPost.id}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });

      const updated = {
        ...currentPost,
        comments: currentPost.comments.map((c) =>
          c.id === commentId ? { ...c, resolved: !c.resolved } : c
        ),
      };
      setCurrentPost(updated);
      onPostUpdated(updated);
    } catch (err) {
      console.error('Erro ao alternar status do comentário:', err);
    }
  };

  const handleCopyCaption = () => {
    if (currentPost.caption) {
      navigator.clipboard.writeText(currentPost.caption);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleSaveCaption = async () => {
    setSavingCaption(true);
    try {
      const res = await fetch(`/api/client/posts/${currentPost.id}/caption`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: editableCaption }),
      });
      const data = await res.json();
      if (data.post) {
        setCurrentPost(data.post);
        onPostUpdated(data.post);
        setIsEditingCaption(false);
        setCaptionSaveSuccess(true);
        setTimeout(() => setCaptionSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao salvar legenda:', err);
    } finally {
      setSavingCaption(false);
    }
  };

  const handleAddCaptionComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!captionCommentText.trim() || savingCaptionComment) return;

    setSavingCaptionComment(true);
    try {
      const res = await fetch(`/api/client/posts/${currentPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: captionAuthorName,
          content: `[Sugestão na Legenda]: ${captionCommentText.trim()}`,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        handleCommentAdded(data.comment);
        setCaptionCommentText('');
      }
    } catch (err) {
      console.error('Erro ao comentar legenda:', err);
    } finally {
      setSavingCaptionComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#EEEDEA] border-2 border-[#DCD6CC] rounded-3xl w-full max-w-6xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Barra Superior de Ações com Garantia Total de Cores e Enquadramento */}
        <div className="bg-white border-b border-[#DCD6CC] px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="btn-vb-secondary px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-black shadow-sm shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" style={{ color: '#FD3100' }} />
              <span className="text-[#111111] hidden sm:inline">Voltar</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-sm sm:text-base md:text-lg text-[#111111] uppercase tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">
                  {currentPost.title}
                </h2>

                {/* Badge de Status Atual */}
                {currentPost.status === 'APROVADO' && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] sm:text-[11px] font-black uppercase flex items-center gap-1 shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    Aprovado
                  </span>
                )}
                {currentPost.status === 'AJUSTES' && (
                  <span
                    style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                    className="px-2.5 py-0.5 border rounded-full text-[10px] sm:text-[11px] font-black uppercase flex items-center gap-1 shrink-0"
                  >
                    <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                    Ajustes
                  </span>
                )}
                {currentPost.status === 'PENDENTE' && (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] sm:text-[11px] font-black uppercase flex items-center gap-1 shrink-0">
                    Pendente
                  </span>
                )}
              </div>

              {currentPost.scheduledDate && (
                <span className="text-[11px] sm:text-xs font-bold flex items-center gap-1 mt-0.5 text-[#66635D] truncate">
                  <Calendar className="w-3 h-3 shrink-0" style={{ color: '#FD3100' }} />
                  <span>Agendado para {formatDate(currentPost.scheduledDate)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Botões de Decisão 100% Enquadrados */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end self-end md:self-center">
            {/* Botão Solicitar Ajustes */}
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusChange('AJUSTES')}
              style={
                currentPost.status === 'AJUSTES'
                  ? { backgroundColor: '#111111', color: '#FFFFFF', borderColor: '#111111' }
                  : { backgroundColor: '#FFFFFF', color: '#111111', borderColor: '#FD3100' }
              }
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-2 shadow-sm shrink-0 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
            >
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: '#FD3100' }} />
              <span>Solicitar Ajustes</span>
            </button>

            {/* Botão Principal de Aprovação (Laranja VB com degradê) */}
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusChange('APROVADO')}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 whitespace-nowrap shadow-md"
            >
              <CheckCircle className="w-4 h-4 stroke-[3]" />
              <span>Aprovar Post</span>
            </button>

            {/* Botão Fechar Modal */}
            <button
              onClick={onClose}
              className="p-2 text-[#66635D] hover:text-[#111111] rounded-xl hover:bg-[#FAF9F7] transition-colors shrink-0 ml-1"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de Feedback de Status Enviado */}
        {statusFeedbackMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
              <span>{statusFeedbackMessage}</span>
            </div>
            <button
              onClick={() => setStatusFeedbackMessage(null)}
              className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Abas: Revisão Interativa vs Legenda */}
        <div className="bg-[#FAF9F7] border-b border-[#DCD6CC] px-4 sm:px-6 flex items-center gap-4 sm:gap-6 text-xs font-black uppercase tracking-wider overflow-x-auto whitespace-nowrap shrink-0">
          <button
            onClick={() => setActiveTab('review')}
            style={activeTab === 'review' ? { borderColor: '#FD3100', color: '#FD3100' } : { color: '#111111' }}
            className="py-3 sm:py-3.5 border-b-2 transition-all flex items-center gap-2 font-black shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Mídia & Revisão</span>
          </button>

          <button
            onClick={() => setActiveTab('caption')}
            style={activeTab === 'caption' ? { borderColor: '#FD3100', color: '#FD3100' } : { color: '#111111' }}
            className="py-3 sm:py-3.5 border-b-2 transition-all flex items-center gap-2 font-black shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Legenda (Copy) & Edição</span>
          </button>
        </div>

        {/* Conteúdo Principal do Modal */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'review' ? (
            <div>
              {currentPost.format === 'VIDEO' || currentPost.format === 'REELS' ? (
                <VideoPlayerReview
                  videoUrl={currentPost.media[0]?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                  thumbnailUrl={currentPost.media[0]?.thumbnailUrl}
                  postId={currentPost.id}
                  comments={currentPost.comments}
                  onCommentAdded={handleCommentAdded}
                  onCommentResolvedToggle={handleCommentResolvedToggle}
                  onThumbnailUpdated={(newThumbnailUrl) => {
                    const updated = {
                      ...currentPost,
                      media: currentPost.media.map((m, idx) =>
                        idx === 0 ? { ...m, thumbnailUrl: newThumbnailUrl } : m
                      ),
                    };
                    setCurrentPost(updated);
                    onPostUpdated(updated);
                  }}
                />
              ) : (
                <CarouselReview
                  media={currentPost.media}
                  postId={currentPost.id}
                  comments={currentPost.comments}
                  onCommentAdded={handleCommentAdded}
                  onCommentResolvedToggle={handleCommentResolvedToggle}
                />
              )}
            </div>
          ) : (
            /* Visualizador e Editor de Legenda (Copy) */
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EEEDEA] gap-3 mb-6">
                  <div>
                    <h3 className="font-black text-[#111111] text-lg uppercase">
                      Legenda (Copy) do Post
                    </h3>
                    <p className="text-xs text-[#66635D] font-medium mt-0.5">
                      Você pode revisar, editar o texto diretamente ou enviar comentários pontuais
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {captionSaveSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Legenda atualizada!
                      </span>
                    )}

                    {!isEditingCaption ? (
                      <button
                        onClick={() => {
                          setEditableCaption(currentPost.caption || '');
                          setIsEditingCaption(true);
                        }}
                        style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                        className="btn-vb-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Legenda</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingCaption(false)}
                          className="btn-vb-secondary px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={savingCaption}
                          onClick={handleSaveCaption}
                          style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                          className="btn-vb-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingCaption ? 'Salvando...' : 'Salvar Alterações'}</span>
                        </button>
                      </div>
                    )}

                    {currentPost.caption && (
                      <button
                        onClick={handleCopyCaption}
                        className="btn-vb-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                        title="Copiar texto da legenda"
                      >
                        {copyFeedback ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            <span className="text-emerald-600 font-bold">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isEditingCaption ? (
                  <div className="space-y-3">
                    <textarea
                      rows={8}
                      value={editableCaption}
                      onChange={(e) => setEditableCaption(e.target.value)}
                      placeholder="Escreva ou edite a legenda da publicação..."
                      className="w-full p-4 bg-[#FAF9F7] border-2 border-[#FD3100] rounded-2xl text-sm text-[#111111] font-medium focus:outline-none"
                    />
                    <p className="text-[11px] text-[#66635D] font-medium">
                      Suas alterações serão salvas diretamente na publicação da agência.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#FAF9F7] border border-[#E4E0D7] rounded-2xl p-6 text-sm text-[#111111] whitespace-pre-wrap font-medium leading-relaxed">
                    {currentPost.caption || 'Nenhuma legenda cadastrada para esta publicação.'}
                  </div>
                )}
              </div>

              {/* Seção de Comentários ou Sugestões na Legenda */}
              <div className="bg-white border border-[#DCD6CC] rounded-3xl p-6 shadow-sm">
                <h4 className="font-black text-xs uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: '#FD3100' }} />
                  <span>Enviar Observação ou Ajuste sobre a Legenda</span>
                </h4>

                <form onSubmit={handleAddCaptionComment} className="flex gap-2">
                  <input
                    type="text"
                    value={captionCommentText}
                    onChange={(e) => setCaptionCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCaptionComment();
                      }
                    }}
                    placeholder="Ex: Trocar a hashtag por #MinhaMarca (aperte Enter para enviar)..."
                    className="flex-1 px-4 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs text-[#111111] font-medium focus:outline-none"
                  />

                  <input
                    type="text"
                    value={captionAuthorName}
                    onChange={(e) => setCaptionAuthorName(e.target.value)}
                    placeholder="Seu Nome"
                    className="w-28 px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs text-[#111111] font-medium focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={savingCaptionComment || !captionCommentText.trim()}
                    style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                    className="btn-vb-primary px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
