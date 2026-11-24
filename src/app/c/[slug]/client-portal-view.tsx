'use client';

import { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  Calendar as CalendarIcon,
  Layers,
  Play,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  LogOut,
  ArrowRight,
  LayoutGrid,
  CalendarDays,
  Instagram,
  Send,
  Phone,
  User,
} from 'lucide-react';
import { PostData } from '@/lib/services/post-service';
import { PostReviewModal } from '@/components/post-review-modal';
import { formatDate, getScheduledDay } from '@/lib/utils';
import { ChatMessage } from '@/lib/services/chat-service';
import { playMessageSound } from '@/lib/audio-notification';

interface ClientPortalViewProps {
  client: {
    id: string;
    name: string;
    slug: string;
    pin: string;
    logoUrl?: string | null;
  };
}

export function ClientPortalView({ client }: ClientPortalViewProps) {
  // Autenticação por PIN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [validatingPin, setValidatingPin] = useState(false);

  // Posts do Cliente
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'AJUSTES' | 'APROVADO'>('ALL');

  // Modo de Visualização: Instagram Feed, Calendário Mensal, Cards ou Chat com a Agência
  const [viewMode, setViewMode] = useState<'instagram' | 'calendar' | 'cards' | 'chat'>('instagram');

  // Chat com a Agência
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [clientUnreadChat, setClientUnreadChat] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const knownClientMsgIdsRef = useRef<Set<string>>(new Set());
  const initialClientChatRef = useRef<boolean>(true);

  const fetchChatMessages = async (isSilent = false) => {
    try {
      const res = await fetch(
        `/api/chat?clientId=${encodeURIComponent(client.id || client.slug)}&clientSlug=${encodeURIComponent(client.slug)}&reader=CLIENT`
      );
      if (res.ok) {
        const data = await res.json();
        const incomingMessages: ChatMessage[] = data.messages || [];
        setChatMessages(incomingMessages);

        // Notificação sonora estilo WhatsApp caso chegue mensagem da agência
        let hasNewAgencyMsg = false;
        incomingMessages.forEach((msg) => {
          if (!knownClientMsgIdsRef.current.has(msg.id)) {
            knownClientMsgIdsRef.current.add(msg.id);
            if (!initialClientChatRef.current && msg.sender === 'AGENCY') {
              hasNewAgencyMsg = true;
            }
          }
        });
        initialClientChatRef.current = false;

        if (hasNewAgencyMsg) {
          playMessageSound();
        }

        if (viewMode === 'chat') {
          setClientUnreadChat(0);
        } else {
          setClientUnreadChat(data.unreadForClient || 0);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar chat do cliente:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchChatMessages();
      const interval = setInterval(() => {
        fetchChatMessages(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, viewMode]);

  useEffect(() => {
    if (viewMode === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, viewMode]);

  const handleSendClientMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatSending) return;

    setChatSending(true);
    setChatInput('');

    const tempMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      clientId: client.id || client.slug,
      sender: 'CLIENT',
      senderName: client.name,
      content: text,
      createdAt: new Date().toISOString(),
      readByAgency: false,
      readByClient: true,
    };
    knownClientMsgIdsRef.current.add(tempMsg.id);
    setChatMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id || client.slug,
          clientSlug: client.slug,
          sender: 'CLIENT',
          senderName: client.name,
          content: text,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          knownClientMsgIdsRef.current.add(data.message.id);
          setChatMessages((prev) =>
            prev.map((m) => (m.id === tempMsg.id ? data.message : m))
          );
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem no portal do cliente:', err);
    } finally {
      setChatSending(false);
    }
  };

  const fetchClientPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/client/posts?slug=${client.slug}`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setValidatingPin(true);

    try {
      const res = await fetch('/api/client/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: client.slug, pin: pinInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPinError(data.error || 'PIN de segurança incorreto.');
        setValidatingPin(false);
        return;
      }

      setIsAuthenticated(true);
      await fetchClientPosts();
    } catch {
      setPinError('Erro ao validar o PIN.');
    } finally {
      setValidatingPin(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  // TELA 1: Bloqueio por PIN de 4 dígitos
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEEDEA] px-4 py-12 relative overflow-hidden font-sans">
        <div className="h-1.5 bg-[#FD3100] w-full fixed top-0 left-0" />

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-8 sm:p-10 shadow-xl text-center">
            {/* Logo Oficial da VB */}
            <div className="h-16 flex items-center justify-center mb-5">
              <img
                src="/logo-vb.png?v=4"
                alt="Logo VB"
                className="h-16 w-auto object-contain"
              />
            </div>

            {client.logoUrl && (
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden border-2 border-[#DCD6CC] bg-white flex items-center justify-center shadow-md">
                <img
                  src={client.logoUrl}
                  alt={`Logo ${client.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <span
              style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
              className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase border inline-block mb-2 shadow-sm"
            >
              Portal do Cliente
            </span>

            <h1 className="text-2xl font-black text-[#111111] uppercase tracking-tight">
              {client.name}
            </h1>

            <p className="text-[#66635D] text-xs mt-1 mb-6 font-medium">
              Digite seu PIN de 4 dígitos para acessar o calendário de aprovação de conteúdos.
            </p>

            {pinError && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold animate-in fade-in">
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center justify-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                  <span>PIN de Segurança (4 dígitos)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPinInput(val);
                  }}
                  placeholder="••••"
                  autoFocus
                  required
                  className="w-48 mx-auto px-4 py-3 bg-[#FAF9F7] border-2 border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] font-mono text-center tracking-widest text-3xl font-black focus:outline-none shadow-sm"
                />
              </div>

              {/* Botão Principal em Laranja VB com Letras Brancas */}
              <button
                type="submit"
                disabled={validatingPin || pinInput.length !== 4}
                style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                className="btn-vb-primary w-full py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                {validatingPin ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Acessar Planejamento</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-5 border-t border-[#EEEDEA] text-center text-[11px] text-[#66635D] font-medium flex items-center justify-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
              <span>O PIN de segurança foi enviado para o seu WhatsApp pela VB Agência</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TELA 2: Portal do Cliente com Seletores de Visão (Feed Instagram, Calendário, Cards)
  return (
    <div className="min-h-screen bg-[#EEEDEA] text-[#111111] flex flex-col font-sans">
      <div className="h-1.5 bg-[#FD3100] w-full" />

      {/* Header do Cliente */}
      <header className="border-b border-[#DCD6CC] bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
            {/* Logo VB */}
            <div className="h-9 sm:h-12 flex items-center justify-center shrink-0">
              <img
                src="/logo-vb.png?v=4"
                alt="Logo VB"
                className="h-8 sm:h-12 w-auto object-contain"
              />
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-[#DCD6CC] shrink-0" />

            {/* Logo do Cliente */}
            {client.logoUrl ? (
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl overflow-hidden border border-[#DCD6CC] bg-white flex items-center justify-center shrink-0 shadow-sm">
                <img
                  src={client.logoUrl}
                  alt={`Logo ${client.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-[#FFF0EC] text-[#FD3100] border border-[#FFCEBF] font-black text-xs sm:text-sm flex items-center justify-center shrink-0">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Nome da Empresa e Tag */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-xs sm:text-lg text-[#111111] tracking-tight uppercase truncate max-w-[130px] sm:max-w-[260px] md:max-w-none">
                  {client.name}
                </span>
                <span
                  style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                  className="hidden md:inline-block px-2 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-wider shrink-0"
                >
                  Portal do Cliente
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-[#FD3100] truncate">
                Aprovação de Conteúdo
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="btn-vb-secondary flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all shadow-sm shrink-0"
            title="Sair do Portal"
          >
            <LogOut className="w-3.5 h-3.5 text-[#FD3100]" />
            <span className="hidden sm:inline text-[#111111]">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 w-full">
        {/* Barra Superior com Modos de Visualização & Filtros */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] uppercase tracking-tight">
              Planejamento de <span style={{ color: '#FD3100' }}>Conteúdo</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#66635D] mt-1 font-medium">
              Acompanhe a harmonia do feed, visualize o mês completo e aprove seus posts.
            </p>
          </div>

          {/* Seletores de Modo de Visualização */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Seletor de Modo com Letras Pretas e Laranja no Ativo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex items-center bg-white p-1 rounded-2xl border-2 border-[#DCD6CC] shadow-sm text-[11px] sm:text-xs font-black uppercase w-full sm:w-auto">
              <button
                onClick={() => setViewMode('instagram')}
                style={viewMode === 'instagram' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#111111' }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl transition-all font-black"
                title="Ver prévia como Grade do Instagram"
              >
                <Instagram className="w-3.5 sm:w-4 h-3.5 sm:h-4 stroke-[2.5]" />
                <span className="truncate">Feed</span>
              </button>

              <button
                onClick={() => setViewMode('calendar')}
                style={viewMode === 'calendar' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#111111' }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl transition-all font-black"
                title="Ver como Calendário Mensal"
              >
                <CalendarDays className="w-3.5 sm:w-4 h-3.5 sm:h-4 stroke-[2.5]" />
                <span className="truncate">Mês</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                style={viewMode === 'cards' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#111111' }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl transition-all font-black"
                title="Ver lista de cards com legenda"
              >
                <LayoutGrid className="w-3.5 sm:w-4 h-3.5 sm:h-4 stroke-[2.5]" />
                <span className="truncate">Cards</span>
              </button>

              <button
                onClick={() => setViewMode('chat')}
                style={viewMode === 'chat' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#111111' }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl transition-all font-black relative"
                title="Tirar dúvidas ou conversar com a agência"
              >
                <MessageSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4 stroke-[2.5]" />
                <span className="truncate">Chat</span>
                {clientUnreadChat > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                )}
              </button>
            </div>

            {/* Filtro por Status com Letras Pretas */}
            <div className="grid grid-cols-4 sm:flex items-center bg-white p-1 rounded-2xl border-2 border-[#DCD6CC] shadow-sm text-[10px] sm:text-xs font-black uppercase text-center w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                style={statusFilter === 'ALL' ? { backgroundColor: '#111111', color: '#FFFFFF' } : { color: '#111111' }}
                className="px-2 sm:px-3 py-2 rounded-xl transition-all font-black truncate"
              >
                Todos ({posts.length})
              </button>
              <button
                onClick={() => setStatusFilter('PENDENTE')}
                style={statusFilter === 'PENDENTE' ? { backgroundColor: '#B45309', color: '#FFFFFF' } : { color: '#111111' }}
                className="px-2 sm:px-3 py-2 rounded-xl transition-all font-black truncate"
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('AJUSTES')}
                style={statusFilter === 'AJUSTES' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : { color: '#111111' }}
                className="px-2 sm:px-3 py-2 rounded-xl transition-all font-black truncate"
              >
                Ajustes
              </button>
              <button
                onClick={() => setStatusFilter('APROVADO')}
                style={statusFilter === 'APROVADO' ? { backgroundColor: '#047857', color: '#FFFFFF' } : { color: '#111111' }}
                className="px-2 sm:px-3 py-2 rounded-xl transition-all font-black truncate"
              >
                Aprovados
              </button>
            </div>
          </div>
        </div>

        {/* 1. VISÃO FEED DO INSTAGRAM (GRADE 3x3) */}
        {viewMode === 'instagram' && (
          <div className="max-w-4xl mx-auto bg-white border-2 border-[#DCD6CC] rounded-3xl p-6 sm:p-10 shadow-lg">
            {/* Header com estilo Perfil Instagram */}
            <div className="flex items-center justify-between pb-6 border-b border-[#EEEDEA] mb-8">
              <div className="flex items-center gap-4">
                <div
                  style={{ backgroundColor: '#FD3100' }}
                  className="w-16 h-16 rounded-full p-0.5 flex items-center justify-center shadow-md overflow-hidden shrink-0"
                >
                  {client.logoUrl ? (
                    <img
                      src={client.logoUrl}
                      alt={client.name}
                      className="w-full h-full rounded-full object-cover bg-white"
                    />
                  ) : (
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-xl" style={{ color: '#FD3100' }}>
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="font-black text-xl text-[#111111] lowercase tracking-tight">
                    @{client.slug}
                  </h2>
                  <p className="text-xs text-[#66635D] font-bold mt-0.5">
                    Prévia da Harmonia Visual do Feed • {posts.length} publicações programadas
                  </p>
                </div>
              </div>

              <span
                style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase border shadow-sm"
              >
                <Instagram className="w-3.5 h-3.5" />
                Grade Oficial do Instagram
              </span>
            </div>

            {/* Grid 3x3 Quadrada do Instagram */}
            {filteredPosts.length === 0 ? (
              <div className="py-20 text-center text-[#66635D] font-bold">
                Nenhum post encontrado para este filtro.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-square bg-[#0b0f19] rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-[#DCD6CC]"
                  >
                    {/* Capa do Post (Vídeo ou Carrossel) */}
                    <img
                      src={
                        post.media[0]?.thumbnailUrl ||
                        (post.format === 'VIDEO' || post.format === 'REELS'
                          ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'
                          : post.media[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80')
                      }
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Ícone de Formato no Canto Superior Direito (Igual ao Instagram) */}
                    <div className="absolute top-2.5 right-2.5 z-10 drop-shadow-md">
                      {post.format === 'VIDEO' || post.format === 'REELS' ? (
                        <div className="w-7 h-7 bg-black/75 backdrop-blur-md rounded-lg flex items-center justify-center text-white">
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-black/75 backdrop-blur-md rounded-lg flex items-center justify-center text-white">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Badge de Status no Canto Inferior Esquerdo */}
                    <div className="absolute bottom-2.5 left-2.5 z-10">
                      {post.status === 'APROVADO' && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[9px] font-black uppercase shadow-sm">
                          Aprovado
                        </span>
                      )}
                      {post.status === 'AJUSTES' && (
                        <span style={{ backgroundColor: '#FD3100' }} className="px-2 py-0.5 text-white rounded-md text-[9px] font-black uppercase shadow-sm">
                          Ajustes
                        </span>
                      )}
                      {post.status === 'PENDENTE' && (
                        <span className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[9px] font-black uppercase shadow-sm">
                          Pendente
                        </span>
                      )}
                    </div>

                    {/* Overlay Escuro com Informações ao Passar o Mouse */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-white text-center">
                      <p className="font-black text-xs line-clamp-2 mb-2">
                        {post.title}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs font-mono font-bold">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          {post.comments.length}
                        </span>
                      </div>

                      <span
                        style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                        className="btn-vb-primary mt-3 px-3.5 py-1.5 rounded-xl text-[10px] uppercase shadow-md"
                      >
                        Revisar Post
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. VISÃO CALENDÁRIO MENSAL (MÊS INTEIRO) */}
        {viewMode === 'calendar' && (
          <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-6 sm:p-8 shadow-lg">
            {/* Cabeçalho do Mês */}
            <div className="flex items-center justify-between pb-6 border-b border-[#EEEDEA] mb-6">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-6 h-6" style={{ color: '#FD3100' }} />
                <h2 className="font-black text-xl text-[#111111] uppercase tracking-tight">
                  Planejamento do Mês
                </h2>
              </div>

              <div
                style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                className="text-xs font-black px-4 py-1.5 rounded-full border uppercase shadow-sm"
              >
                {posts.length} publicações programadas
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

                return (
                  <div
                    key={dayNumber}
                    className={`min-h-[110px] sm:min-h-[130px] p-2 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      dayPosts.length > 0
                        ? 'border-[#FD3100] bg-[#FFF0EC] shadow-sm'
                        : 'border-[#E4E0D7] bg-[#FAF9F7]/60'
                    }`}
                  >
                    <span className="font-mono font-black text-xs text-[#111111]">
                      {dayNumber}
                    </span>

                    <div className="space-y-1.5 mt-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="p-1.5 bg-white border border-[#DCD6CC] hover:border-[#FD3100] rounded-xl cursor-pointer shadow-sm transition-all hover:scale-[1.02] group"
                        >
                          <div className="flex items-center justify-between text-[9px] mb-0.5">
                            <span className="font-black uppercase" style={{ color: '#FD3100' }}>
                              {post.format === 'VIDEO' ? 'Vídeo' : 'Carrossel'}
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
                        </div>
                      ))}
                    </div>

                    <div />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VISÃO CARDS DETALHADOS (LISTA COM LEGENDA) */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white border-2 border-[#E2DED7] hover:border-[#FD3100] rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(218,87,53,0.14)] transition-all cursor-pointer flex flex-col group"
              >
                {/* Visual da Thumbnail / Mídia */}
                <div className="relative aspect-video bg-[#0b0f19] flex items-center justify-center overflow-hidden">
                  {post.format === 'VIDEO' || post.format === 'REELS' ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <img
                        src={
                          post.media[0]?.thumbnailUrl ||
                          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div
                          style={{ backgroundColor: '#FD3100' }}
                          className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                        >
                          <Play className="w-6 h-6 ml-1 fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full relative">
                      <img
                        src={post.media[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  {/* Badge de Formato no canto da imagem */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-wider">
                    {post.format === 'VIDEO' ? (
                      <>
                        <Play className="w-3 h-3 fill-white text-white" />
                        <span>Vídeo</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3" style={{ color: '#FD3100' }} />
                        <span>Carrossel ({post.media.length} lâminas)</span>
                      </>
                    )}
                  </div>

                  {/* Badge de Status no canto direito */}
                  <div className="absolute top-3 right-3">
                    {post.status === 'APROVADO' && (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Aprovado
                      </span>
                    )}
                    {post.status === 'AJUSTES' && (
                      <span style={{ backgroundColor: '#FD3100' }} className="px-2.5 py-1 text-white rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Em Ajustes
                      </span>
                    )}
                    {post.status === 'PENDENTE' && (
                      <span className="px-2.5 py-1 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {post.scheduledDate && (
                      <span className="text-xs font-bold flex items-center gap-1 mb-2" style={{ color: '#FD3100' }}>
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Agendado para {formatDate(post.scheduledDate)}
                      </span>
                    )}

                    <h3 className="font-black text-[#111111] text-base group-hover:text-[#FD3100] transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h3>

                    {post.caption && (
                      <p className="text-xs text-[#66635D] mt-2 line-clamp-2 font-medium">
                        {post.caption}
                      </p>
                    )}
                  </div>

                  {/* Rodapé do Card com Comentários e Botão Principal em Laranja */}
                  <div className="pt-4 mt-4 border-t border-[#EEEDEA] flex items-center justify-between">
                    <span className="text-xs text-[#111111] font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                      {post.comments.length} {post.comments.length === 1 ? 'comentário' : 'comentários'}
                    </span>

                    <button
                      type="button"
                      style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                      className="btn-vb-primary px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Revisar Conteúdo →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. VISÃO DE CHAT COM A VB AGÊNCIA */}
        {viewMode === 'chat' && (
          <div className="max-w-4xl mx-auto bg-white border-2 border-[#DCD6CC] rounded-3xl shadow-lg overflow-hidden flex flex-col h-[650px]">
            {/* Header do Chat */}
            <div className="p-4 sm:p-5 border-b border-[#EEEDEA] bg-gradient-to-r from-[#FAF9F7] to-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-md shrink-0 text-sm"
                >
                  VB
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#111111] uppercase truncate">
                    VB Agência Audiovisual
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online • Atendimento e Alinhamento de Posts</span>
                  </p>
                </div>
              </div>

              <a
                href="https://api.whatsapp.com/send"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chamar no WhatsApp</span>
              </a>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAF9F7]/40">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#97A0AF]">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCD6CC] flex items-center justify-center mb-3 shadow-sm text-[#FD3100]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-[#111111] uppercase mb-1">
                    Canal Direto com a VB Agência
                  </h4>
                  <p className="text-[11px] max-w-sm">
                    Envie suas dúvidas, comentários ou alinhamentos de postagens abaixo. A equipe da agência responderá prontamente!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender === 'CLIENT';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <div
                          style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                          className="w-7 h-7 rounded-xl font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm uppercase"
                        >
                          VB
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isMe
                            ? 'btn-vb-primary text-white rounded-br-sm'
                            : 'bg-white text-[#111111] border border-[#DCD6CC] rounded-bl-sm font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isMe ? 'text-white/80' : 'text-[#FD3100]'
                            }`}
                          >
                            {isMe ? 'Você' : 'VB Agência'}
                          </span>
                          <span
                            className={`text-[9px] font-bold ${
                              isMe ? 'text-white/70' : 'text-[#97A0AF]'
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-[12px]">{msg.content}</p>
                      </div>

                      {isMe && (
                        <div
                          style={{ backgroundColor: '#FFF0EC', color: '#FD3100' }}
                          className="w-7 h-7 rounded-xl border border-[#FFCEBF] text-[10px] font-black flex items-center justify-center uppercase shrink-0 shadow-sm"
                        >
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Formulário de Envio */}
            <div className="p-3 sm:p-4 bg-white border-t border-[#EEEDEA]">
              <form onSubmit={handleSendClientMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Digite sua dúvida ou mensagem para a VB Agência..."
                  className="flex-1 px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs font-bold text-[#111111] placeholder:text-[#97A0AF] focus:outline-none shadow-sm"
                  disabled={chatSending}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="btn-vb-primary px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Botão Flutuante de Chat na parte inferior direita */}
      {viewMode !== 'chat' && (
        <button
          onClick={() => setViewMode('chat')}
          className="fixed bottom-6 right-6 z-40 btn-vb-primary px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all"
          title="Falar diretamente com a agência"
        >
          <MessageSquare className="w-4 h-4 stroke-[2.5]" />
          <span>Falar com a VB</span>
          {clientUnreadChat > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white text-[#FD3100] text-[10px] font-black animate-bounce">
              {clientUnreadChat}
            </span>
          )}
        </button>
      )}

      {/* Modal de Revisão Interativa de Vídeo ou Carrossel */}
      {selectedPost && (
        <PostReviewModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setSelectedPost(updated);
          }}
        />
      )}
    </div>
  );
}
