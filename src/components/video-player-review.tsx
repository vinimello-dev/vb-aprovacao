'use client';

import { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  Image as ImageIcon,
  Check,
  Edit,
  Grid,
  Smartphone,
  ExternalLink,
  Monitor,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CommentData } from '@/lib/services/post-service';
import { parseMediaUrl } from '@/lib/utils';

interface VideoPlayerReviewProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  postId: string;
  comments: CommentData[];
  onCommentAdded: (comment: CommentData) => void;
  onCommentResolvedToggle: (commentId: string) => void;
  onThumbnailUpdated?: (newThumbnailUrl: string) => void;
}

export function VideoPlayerReview({
  videoUrl,
  thumbnailUrl,
  postId,
  comments,
  onCommentAdded,
  onCommentResolvedToggle,
  onThumbnailUpdated,
}: VideoPlayerReviewProps) {
  // Controle de Visualização: 'video' (Player interativo) ou 'cover' (Capa do Vídeo / Feed)
  const [activeMediaView, setActiveMediaView] = useState<'video' | 'cover'>('video');

  // Controle de Capa
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(thumbnailUrl || null);
  const [coverAspect, setCoverAspect] = useState<'feed' | 'reels'>('feed'); // 'feed' = 1:1, 'reels' = 9:16
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [newCoverInput, setNewCoverInput] = useState('');
  const [savingCover, setSavingCover] = useState(false);
  const [coverFeedback, setCoverFeedback] = useState<string | null>(null);

  // Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Proporção e Enquadramento: Sem bordas pretas para verticais e proporção correta para horizontais
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [aspectMode, setAspectMode] = useState<'auto' | 'vertical' | 'horizontal'>('auto');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover'); // 'cover' = sem bordas pretas!

  // Garante que links do Google Drive usem a rota de streaming interno sem bloqueio de CORP do navegador
  const finalVideoUrl = parseMediaUrl(videoUrl);

  // Comentário State
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('Cliente');
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formatação MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const v = videoRef.current;
      setDuration(v.duration);
      if (v.videoWidth && v.videoHeight) {
        setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
        // Auto-detecta: se a altura for maior que a largura (ex: 9:16 ou 4:5), ativa formato vertical
        if (v.videoHeight > v.videoWidth) {
          setAspectMode('vertical');
        } else {
          setAspectMode('horizontal');
        }
      }
    }
  };

  // Determina se a exibição atual é vertical ou horizontal
  const isVertical =
    aspectMode === 'vertical' ||
    (aspectMode === 'auto' && Boolean(videoDimensions && videoDimensions.height > videoDimensions.width));
  const isFill = fitMode === 'cover';

  // REQUISITO: Ao começar a digitar o comentário, o vídeo pausa e captura o currentTime
  const handleCommentFocusOrType = () => {
    if (activeMediaView === 'video') {
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      if (capturedTime === null && videoRef.current) {
        setCapturedTime(videoRef.current.currentTime);
      }
    }
  };

  // REQUISITO: Clicar no comentário faz o vídeo pular para aquele segundo exato
  const jumpToTimestamp = (seconds?: number | null) => {
    setActiveMediaView('video');
    if (typeof seconds === 'number' && videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Salvar novo comentário (no segundo do vídeo ou na capa)
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const isCoverComment = activeMediaView === 'cover';
      const formattedContent = isCoverComment
        ? `[Capa do Vídeo]: ${commentText.trim()}`
        : commentText.trim();

      const res = await fetch(`/api/client/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          content: formattedContent,
          timestampSeconds: isCoverComment ? null : (capturedTime !== null ? capturedTime : currentTime),
        }),
      });

      const data = await res.json();
      if (data.comment) {
        onCommentAdded(data.comment);
        setCommentText('');
        setCapturedTime(null);
      }
    } catch (err) {
      console.error('Erro ao salvar comentário:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Atualizar / Trocar a Capa do Vídeo
  const handleSaveCover = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCoverInput.trim() || savingCover) return;

    setSavingCover(true);
    setCoverFeedback(null);

    try {
      const res = await fetch(`/api/client/posts/${postId}/thumbnail`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnailUrl: newCoverInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.thumbnailUrl) {
        setCurrentThumbnail(data.thumbnailUrl);
        if (onThumbnailUpdated) {
          onThumbnailUpdated(data.thumbnailUrl);
        }
        setIsEditingCover(false);
        setNewCoverInput('');
        setCoverFeedback('Capa atualizada com sucesso!');
        setTimeout(() => setCoverFeedback(null), 3000);
      } else {
        setCoverFeedback(data.error || 'Erro ao atualizar capa.');
      }
    } catch {
      setCoverFeedback('Falha na comunicação com o servidor.');
    } finally {
      setSavingCover(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Seleção: Assistir Vídeo VS Capa do Vídeo (Feed Instagram) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border-2 border-[#DCD6CC] shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMediaView('video')}
            style={
              activeMediaView === 'video'
                ? { backgroundColor: '#FD3100', color: '#FFFFFF' }
                : { color: '#111111', backgroundColor: '#FAF9F7' }
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border border-[#DCD6CC]"
          >
            <Play className={`w-3.5 h-3.5 ${activeMediaView === 'video' ? 'fill-white' : ''}`} />
            <span>Assistir Vídeo & Ajustes</span>
          </button>

          <button
            onClick={() => setActiveMediaView('cover')}
            style={
              activeMediaView === 'cover'
                ? { backgroundColor: '#FD3100', color: '#FFFFFF' }
                : { color: '#111111', backgroundColor: '#FAF9F7' }
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border border-[#DCD6CC]"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Capa do Vídeo (Feed Instagram)</span>
          </button>
        </div>

        {/* Botão de Trocar / Incluir Capa */}
        <div className="flex items-center gap-2">
          {coverFeedback && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              {coverFeedback}
            </span>
          )}

          <button
            onClick={() => {
              setIsEditingCover(!isEditingCover);
              if (activeMediaView !== 'cover') setActiveMediaView('cover');
            }}
            style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:bg-[#222222] shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
            <span>{isEditingCover ? 'Fechar Edição' : 'Incluir / Trocar Capa'}</span>
          </button>
        </div>
      </div>

      {/* Formulário Retrátil para Troca de Capa */}
      {isEditingCover && (
        <form
          onSubmit={handleSaveCover}
          className="bg-white border-2 border-[#FD3100] rounded-2xl p-4 shadow-md animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-black text-xs uppercase text-[#111111] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
              Alterar Imagem de Capa do Vídeo
            </h4>
            <span className="text-[11px] text-[#66635D] font-bold">
              Aceita link do Google Drive, Dropbox ou URL direta (.jpg/.png)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={newCoverInput}
              onChange={(e) => setNewCoverInput(e.target.value)}
              placeholder="Cole o link do Google Drive da nova capa ou URL da imagem..."
              className="flex-1 px-3.5 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs text-[#111111] placeholder-[#A09D96] font-medium focus:outline-none"
              required
            />

            <button
              type="submit"
              disabled={savingCover || !newCoverInput.trim()}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{savingCover ? 'Salvando...' : 'Salvar Nova Capa'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Grade Principal com Visualizador (7 colunas) e Comentários (5 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LADO ESQUERDO: Vídeo ou Capa */}
        <div className="lg:col-span-7 bg-[#111111] rounded-3xl overflow-hidden shadow-2xl border-2 border-[#DCD6CC] flex flex-col">
          {activeMediaView === 'video' ? (
            /* VISUALIZAÇÃO 1: PLAYER DE VÍDEO INTELIGENTE (VERTICAL / HORIZONTAL / SEM BORDAS) */
            <div className="flex flex-col">
              {/* Barra Superior de Proporção e Enquadramento */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#1b1b1b] border-b border-white/10 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-white/60 mr-1">
                    Proporção:
                  </span>

                  {/* Vertical 9:16 (Reels) */}
                  <button
                    type="button"
                    onClick={() => setAspectMode('vertical')}
                    style={aspectMode === 'vertical' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
                      aspectMode === 'vertical' ? 'shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                    title="Formato Vertical Reels / Stories (9:16)"
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Vertical (9:16)</span>
                  </button>

                  {/* Horizontal 16:9 (Widescreen) */}
                  <button
                    type="button"
                    onClick={() => setAspectMode('horizontal')}
                    style={aspectMode === 'horizontal' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
                      aspectMode === 'horizontal' ? 'shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                    title="Formato Horizontal Widescreen (16:9)"
                  >
                    <Monitor className="w-3 h-3" />
                    <span>Horizontal (16:9)</span>
                  </button>

                  {/* Auto (Detectado) */}
                  <button
                    type="button"
                    onClick={() => setAspectMode('auto')}
                    style={aspectMode === 'auto' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
                      aspectMode === 'auto' ? 'shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                    title="Detectar proporção automática do vídeo"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto {videoDimensions ? `(${videoDimensions.width}x${videoDimensions.height})` : ''}</span>
                  </button>
                </div>

                {/* Alternância Sem Bordas (Preencher) vs Conter */}
                <button
                  type="button"
                  onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                  style={fitMode === 'cover' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
                    fitMode === 'cover' ? 'shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  title={fitMode === 'cover' ? 'Sem bordas pretas (Preenchimento total)' : 'Conter (Exibir vídeo completo com bordas)'}
                >
                  {fitMode === 'cover' ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                  <span>{fitMode === 'cover' ? 'Sem Bordas (Preencher)' : 'Conter'}</span>
                </button>
              </div>

              {/* Área do Player de Vídeo Responsiva */}
              <div className={`relative bg-black flex items-center justify-center p-3 sm:p-5 overflow-hidden ${
                isVertical ? 'min-h-[500px]' : ''
              }`}>
                <div
                  className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group ${
                    isVertical
                      ? 'w-full max-w-[310px] sm:max-w-[340px] aspect-[9/16] h-[470px] sm:h-[500px] border-2 border-white/20'
                      : 'w-full aspect-video border border-white/10'
                  }`}
                >
                  <video
                    ref={videoRef}
                    src={finalVideoUrl}
                    poster={currentThumbnail || undefined}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      handleLoadedMetadata();
                      setVideoError(false);
                    }}
                    onError={(e) => {
                      console.warn('Erro ao carregar o vídeo:', e);
                      setVideoError(true);
                    }}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                    playsInline
                    preload="metadata"
                    className={`w-full h-full cursor-pointer transition-all ${
                      isFill ? 'object-cover' : 'object-contain'
                    }`}
                  />

                  {/* Selo indicativo de formato no canto do vídeo */}
                  <div className="absolute top-2.5 left-2.5 z-10 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1 shadow-md">
                    {isVertical ? <Smartphone className="w-2.5 h-2.5" /> : <Monitor className="w-2.5 h-2.5" />}
                    <span>{isVertical ? 'Reels 9:16' : '16:9 Widescreen'}</span>
                  </div>

                  {/* Mensagem caso o vídeo não carregue */}
                  {videoError && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center text-white z-20">
                      <p className="font-black text-sm text-[#FD3100] mb-1">Não foi possível reproduzir este vídeo</p>
                      <p className="text-xs text-white/70 max-w-sm mb-4">
                        O arquivo pode estar sem permissão pública no Google Drive ou em processamento.
                      </p>
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-vb-primary px-4 py-2 rounded-xl text-xs uppercase font-black flex items-center gap-1.5"
                      >
                        <span>Abrir no Google Drive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Botão Play Grande sobre o vídeo quando pausado */}
                  {!isPlaying && !videoError && (
                    <button
                      onClick={togglePlay}
                      style={{ backgroundColor: '#FD3100' }}
                      className="absolute inset-0 m-auto w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 z-10"
                    >
                      <Play className="w-8 h-8 ml-1 fill-white" />
                    </button>
                  )}

                  {/* Marcadores de comentários na timeline */}
                  {duration > 0 && (
                    <div className="absolute bottom-2 left-4 right-4 h-1 pointer-events-none z-10">
                      {comments
                        .filter((c) => typeof c.timestampSeconds === 'number')
                        .map((c) => {
                          const percent = ((c.timestampSeconds || 0) / duration) * 100;
                          return (
                            <div
                              key={c.id}
                              title={`Comentário em ${formatTime(c.timestampSeconds || 0)}: "${c.content}"`}
                              style={{ left: `${percent}%`, backgroundColor: '#FD3100' }}
                              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 border border-white rounded-full shadow-md z-10"
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Controles do Vídeo */}
              <div className="p-4 bg-[#1a1a1a] text-white flex flex-col gap-2">
                {/* Barra de Progresso Seekbar */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  style={{ accentColor: '#FD3100' }}
                  className="w-full h-1.5 bg-[#333] rounded-lg cursor-pointer transition-all"
                />

                <div className="flex items-center justify-between text-xs pt-1 font-mono">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          setCurrentTime(0);
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                      title="Voltar ao início"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="text-white font-bold">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-sans text-[11px] font-bold" style={{ color: '#FD3100' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Digite e aperte Enter para salvar</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VISUALIZAÇÃO 2: CAPA DO VÍDEO (FEED INSTAGRAM) */
            <div className="p-6 bg-[#161616] flex flex-col items-center">
              {/* Barra de alternância 1:1 vs 9:16 */}
              <div className="flex items-center gap-2 mb-6 bg-black/60 p-1.5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setCoverAspect('feed')}
                  style={coverAspect === 'feed' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#AAAAAA' }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Grade Feed (1:1 Quadrado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverAspect('reels')}
                  style={coverAspect === 'reels' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#AAAAAA' }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Reels / Story (9:16 Vertical)</span>
                </button>
              </div>

              {/* Moldura da Capa */}
              <div className="w-full flex items-center justify-center">
                {currentThumbnail ? (
                  <div
                    className={`relative overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl transition-all duration-300 bg-black ${
                      coverAspect === 'feed'
                        ? 'w-full max-w-[380px] aspect-square'
                        : 'w-full max-w-[280px] aspect-[9/16]'
                    }`}
                  >
                    <img
                      src={currentThumbnail}
                      alt="Capa do Vídeo para o Instagram"
                      className="w-full h-full object-cover"
                    />

                    {/* Simulação de Selo do Instagram */}
                    <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-white tracking-wider flex items-center gap-1 shadow-md">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>{coverAspect === 'feed' ? 'No Feed' : 'No Reels'}</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md p-2 rounded-xl text-center text-white text-[11px] font-bold">
                      Prévia exata de como a capa aparecerá no Instagram
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-[360px] aspect-square rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center p-6 text-center text-white/60">
                    <ImageIcon className="w-12 h-12 mb-3" style={{ color: '#FD3100' }} />
                    <p className="font-bold text-sm text-white mb-1">Nenhuma capa personalizada cadastrada</p>
                    <p className="text-xs max-w-xs mb-4">
                      O player usará o primeiro frame do vídeo automaticamente ou você pode definir uma capa acima.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditingCover(true)}
                      style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                      className="btn-vb-primary px-4 py-2 rounded-xl text-xs font-black uppercase"
                    >
                      Cadastrar Capa
                    </button>
                  </div>
                )}
              </div>

              {/* Informações da Capa */}
              <div className="mt-6 text-center">
                <span className="text-xs text-[#FD3100] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Visualização da Capa do Post
                </span>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Esta é a imagem que seus seguidores verão ao navegar pelo feed do perfil.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: Painel de Comentários Interativos (5 colunas) */}
        <div className="lg:col-span-5 flex flex-col h-[560px] bg-white border-2 border-[#DCD6CC] rounded-3xl shadow-lg overflow-hidden">
          {/* Topo da Aba de Comentários */}
          <div className="p-4 border-b border-[#EEEDEA] bg-[#FAF9F7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center"
                style={{ color: '#FD3100' }}
              >
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-black text-[#111111] text-sm uppercase">Revisão e Ajustes</h4>
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
                <Clock className="w-8 h-8 mb-2" style={{ color: '#FD3100' }} />
                <p className="font-black text-sm text-[#111111]">Nenhum comentário ainda</p>
                <p className="text-xs mt-1 max-w-xs font-medium">
                  Dê play no vídeo ou visualize a capa, digite no campo abaixo e aperte <strong>Enter</strong> para salvar!
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isCoverComment = comment.content.includes('[Capa do Vídeo]');

                return (
                  <div
                    key={comment.id}
                    onClick={() => {
                      if (isCoverComment) {
                        setActiveMediaView('cover');
                      } else {
                        jumpToTimestamp(comment.timestampSeconds);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer group ${
                      comment.resolved
                        ? 'bg-[#FAF9F7] border-[#E4E0D7] opacity-60'
                        : 'bg-white border-[#E2DED7] hover:border-[#FD3100] hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-[#111111]">{comment.author}</span>
                        {comment.authorRole === 'AGENCY' && (
                          <span
                            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                            className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase"
                          >
                            Agência
                          </span>
                        )}
                      </div>

                      {/* Badge do Tipo de Comentário */}
                      {isCoverComment ? (
                        <span
                          style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border shadow-sm"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Capa do Vídeo</span>
                        </span>
                      ) : (
                        typeof comment.timestampSeconds === 'number' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToTimestamp(comment.timestampSeconds);
                            }}
                            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black shadow-sm transition-colors"
                            title="Pular para este segundo no vídeo"
                          >
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(comment.timestampSeconds)}</span>
                          </button>
                        )
                      )}
                    </div>

                    <p className="text-xs text-[#111111] font-medium leading-relaxed mb-2">
                      {comment.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-[#EEEDEA] text-[10px]">
                      <span className="text-[#66635D] font-medium">
                        {isCoverComment
                          ? 'Clique para ver a capa'
                          : `Clique para pular para ${
                              typeof comment.timestampSeconds === 'number'
                                ? formatTime(comment.timestampSeconds)
                                : 'o trecho'
                            }`}
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
                {activeMediaView === 'cover' ? 'Comentário sobre a Capa' : 'Adicionar Comentário'}
              </span>

              {/* Badge indicando o contexto do comentário */}
              {activeMediaView === 'cover' ? (
                <div
                  style={{ backgroundColor: '#FFF0EC', color: '#111111', borderColor: '#FFCEBF' }}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border shadow-sm"
                >
                  <ImageIcon className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                  <span>Vinculado à Capa</span>
                </div>
              ) : (
                <div
                  style={{ backgroundColor: '#FFF0EC', color: '#111111', borderColor: '#FFCEBF' }}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                  <span>
                    {capturedTime !== null
                      ? `Pausado em ${formatTime(capturedTime)}`
                      : `Momento: ${formatTime(currentTime)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={commentText}
                onFocus={handleCommentFocusOrType}
                onChange={(e) => {
                  handleCommentFocusOrType();
                  setCommentText(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder={
                  activeMediaView === 'cover'
                    ? 'Digite seu comentário sobre a capa e aperte Enter...'
                    : 'Digite seu comentário no vídeo e aperte Enter...'
                }
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
    </div>
  );
}
