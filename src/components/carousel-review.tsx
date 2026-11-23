'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  Send,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CommentData, PostMediaData } from '@/lib/services/post-service';

interface CarouselReviewProps {
  media: PostMediaData[];
  postId: string;
  comments: CommentData[];
  onCommentAdded: (comment: CommentData) => void;
  onCommentResolvedToggle: (commentId: string) => void;
}

export function CarouselReview({
  media,
  postId,
  comments,
  onCommentAdded,
  onCommentResolvedToggle,
}: CarouselReviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('Cliente');
  const [submitting, setSubmitting] = useState(false);

  const totalSlides = media.length > 0 ? media.length : 1;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Clicar no comentário faz o carrossel navegar para a lâmina correspondente
  const jumpToSlide = (slideIndex?: number | null) => {
    if (typeof slideIndex === 'number' && slideIndex >= 0 && slideIndex < totalSlides) {
      setCurrentSlide(slideIndex);
    }
  };

  // Cada comentário fica vinculado ao número da lâmina ativa
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/client/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          content: commentText.trim(),
          slideIndex: currentSlide,
        }),
      });

      const data = await res.json();
      if (data.comment) {
        onCommentAdded(data.comment);
        setCommentText('');
      }
    } catch (err) {
      console.error('Erro ao salvar comentário do carrossel:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentMedia = media[currentSlide] || media[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Visualizador de Lâminas do Carrossel (7 colunas) */}
      <div className="lg:col-span-7 bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-[#DCD6CC] flex flex-col">
        {/* Topo do Carrossel */}
        <div className="p-4 bg-[#FAF9F7] border-b border-[#EEEDEA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#FD3100' }} />
            <span className="font-black text-xs uppercase tracking-wider text-[#111111]">
              Visualizador de Carrossel
            </span>
          </div>

          <span
            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
            className="px-3.5 py-1 rounded-full font-mono text-xs font-black shadow-sm"
          >
            Lâmina {currentSlide + 1} de {totalSlides}
          </span>
        </div>

        {/* Área Visual da Imagem / Lâmina */}
        <div className="relative aspect-square sm:aspect-[4/3] bg-[#0b0f19] flex items-center justify-center overflow-hidden group select-none">
          {currentMedia ? (
            <img
              src={currentMedia.url}
              alt={`Lâmina ${currentSlide + 1}`}
              className="w-full h-full object-contain transition-all duration-300"
            />
          ) : (
            <div className="text-white text-center p-8">
              <Layers className="w-12 h-12 mx-auto mb-2" style={{ color: '#FD3100' }} />
              <p className="font-bold text-sm">Carrossel sem imagem</p>
            </div>
          )}

          {/* Botões de Navegação Anterior / Próxima */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 hover:bg-[#FD3100] hover:text-white text-[#111111] rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                title="Lâmina anterior"
              >
                <ChevronLeft className="w-6 h-6 stroke-[3]" />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 hover:bg-[#FD3100] hover:text-white text-[#111111] rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                title="Próxima lâmina"
              >
                <ChevronRight className="w-6 h-6 stroke-[3]" />
              </button>
            </>
          )}

          {/* Dots Indicadores Inferiores */}
          {totalSlides > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  style={idx === currentSlide ? { backgroundColor: '#FD3100' } : {}}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === currentSlide ? 'w-8 shadow-md' : 'w-2.5 bg-white/60 hover:bg-white'
                  }`}
                  title={`Ir para lâmina ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Rodapé do Visualizador */}
        <div className="p-3 bg-[#FAF9F7] text-xs font-medium flex items-center justify-between border-t border-[#EEEDEA]">
          <div className="flex items-center gap-1.5 font-bold" style={{ color: '#FD3100' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comentários são vinculados à lâmina atual</span>
          </div>

          <div className="flex items-center gap-1">
            {media.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={idx === currentSlide ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#111111' }}
                className={`w-7 h-7 rounded-lg text-xs font-mono font-black transition-colors ${
                  idx === currentSlide ? 'shadow-sm' : 'bg-white border border-[#DCD6CC] hover:bg-[#EEEDEA]'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seção Lateral de Comentários Vinculados à Lâmina (5 colunas) */}
      <div className="lg:col-span-5 flex flex-col h-[520px] bg-white border-2 border-[#DCD6CC] rounded-3xl shadow-lg overflow-hidden">
        {/* Topo da Aba de Comentários */}
        <div className="p-4 border-b border-[#EEEDEA] bg-[#FAF9F7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center" style={{ color: '#FD3100' }}>
              <MessageSquare className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-black text-[#111111] text-sm uppercase">Revisão das Lâminas</h4>
              <p className="text-[11px] text-[#66635D] font-medium">
                {comments.length} {comments.length === 1 ? 'comentário' : 'comentários'} no total
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Comentários Salvos */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#66635D]">
              <Layers className="w-8 h-8 mb-2" style={{ color: '#FD3100' }} />
              <p className="font-black text-sm text-[#111111]">Nenhum comentário nesta lâmina</p>
              <p className="text-xs mt-1 max-w-xs font-medium">
                Navegue pelas lâminas do carrossel, digite sua observação e aperte <strong>Enter</strong> para salvar!
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const isCurrentSlide = comment.slideIndex === currentSlide;

              return (
                <div
                  key={comment.id}
                  onClick={() => jumpToSlide(comment.slideIndex)}
                  style={isCurrentSlide ? { borderColor: '#FD3100', backgroundColor: '#FFF0EC' } : {}}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer group ${
                    comment.resolved
                      ? 'bg-[#FAF9F7] border-[#E4E0D7] opacity-60'
                      : 'bg-white border-[#E2DED7] hover:border-[#FD3100]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-[#111111]">
                        {comment.author}
                      </span>
                      {comment.authorRole === 'AGENCY' && (
                        <span style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }} className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase">
                          Agência
                        </span>
                      )}
                    </div>

                    {/* Badge da Lâmina Clicável */}
                    {typeof comment.slideIndex === 'number' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpToSlide(comment.slideIndex);
                        }}
                        style={
                          isCurrentSlide
                            ? { backgroundColor: '#FD3100', color: '#FFFFFF' }
                            : { backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }
                        }
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border transition-colors shadow-sm"
                        title="Ver esta lâmina"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Lâmina {comment.slideIndex + 1}</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#111111] font-medium leading-relaxed mb-2">
                    {comment.content}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#EEEDEA] text-[10px]">
                    <span className="text-[#66635D] font-medium">
                      Clique para ir para a lâmina {typeof comment.slideIndex === 'number' ? comment.slideIndex + 1 : '1'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCommentResolvedToggle(comment.id);
                      }}
                      className={`flex items-center gap-1 font-bold ${
                        comment.resolved ? 'text-emerald-600' : 'text-[#66635D] hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>{comment.resolved ? 'Resolvido' : 'Marcar resolvido'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Formulário com envio ao apertar Enter */}
        <form onSubmit={handleAddComment} className="p-4 bg-[#FAF9F7] border-t border-[#EEEDEA]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-[#111111] flex items-center gap-1">
              <MessageSquare className="w-3 h-3" style={{ color: '#FD3100' }} />
              Comentar na Lâmina
            </span>

            {/* Badge mostrando a lâmina vinculada com texto preto e fundo visível */}
            <div
              style={{ backgroundColor: '#FFF0EC', color: '#111111', borderColor: '#FFCEBF' }}
              className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
              <span>Vinculado à Lâmina {currentSlide + 1}</span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              placeholder={`Comentário sobre a Lâmina ${currentSlide + 1} (aperte Enter)...`}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs text-[#111111] placeholder-[#A09D96] font-medium focus:outline-none shadow-sm"
            />

            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Seu Nome"
                className="w-28 px-2.5 py-1.5 bg-white border border-[#DCD6CC] rounded-xl text-[11px] text-[#111111] font-medium focus:outline-none"
              />

              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                className="btn-vb-primary flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Salvar (Enter)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
