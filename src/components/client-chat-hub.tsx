'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MessageSquare,
  CheckCheck,
  Check,
  ExternalLink,
  Phone,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
  Bell,
  Volume2,
} from 'lucide-react';
import { ChatMessage } from '@/lib/services/chat-service';
import { playMessageSound } from '@/lib/audio-notification';

interface ClientItem {
  id: string;
  name: string;
  slug: string;
  pin?: string;
  logoUrl?: string | null;
  phone?: string | null;
  _count?: {
    posts: number;
  };
}

interface ClientChatHubProps {
  clients: ClientItem[];
  initialClientId?: string;
}

export function ClientChatHub({ clients, initialClientId }: ClientChatHubProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (clients[0]?.id || '')
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [latestMessages, setLatestMessages] = useState<Record<string, ChatMessage>>({});
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [toastNotification, setToastNotification] = useState<{ sender: string; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knownMsgIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const selectedClient = clients.find(
    (c) => c.id === selectedClientId || c.slug === selectedClientId
  ) || clients[0];

  // Carregar mensagens do cliente selecionado (com suporte a cache local)
  const fetchMessages = async (client: ClientItem, isSilent = false) => {
    if (!client) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await fetch(`/api/chat?clientId=${client.id}&clientSlug=${client.slug}&reader=AGENCY`);
      if (res.ok) {
        const data = await res.json();
        const incomingMessages: ChatMessage[] = data.messages || [];

        // Verifica se há novas mensagens recebidas de clientes para tocar som de notificação
        let hasNewClientMessage = false;
        let lastNewClientMsg: ChatMessage | null = null;

        incomingMessages.forEach((msg) => {
          if (!knownMsgIdsRef.current.has(msg.id)) {
            knownMsgIdsRef.current.add(msg.id);
            if (!initialLoadRef.current && msg.sender === 'CLIENT') {
              hasNewClientMessage = true;
              lastNewClientMsg = msg;
            }
          }
        });

        if (hasNewClientMessage && lastNewClientMsg) {
          playMessageSound();
          setToastNotification({
            sender: (lastNewClientMsg as ChatMessage).senderName || client.name,
            text: (lastNewClientMsg as ChatMessage).content,
          });
          setTimeout(() => setToastNotification(null), 5000);
        }

        setMessages(incomingMessages);

        // Salva cache no localStorage para não perder nada ao recarregar
        try {
          localStorage.setItem(`vb_chat_${client.id}`, JSON.stringify(incomingMessages));
        } catch {}

        // Zera contagem de não lidas para o cliente selecionado
        setUnreadMap((prev) => ({
          ...prev,
          [client.id]: 0,
          [client.slug]: 0,
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens do chat:', err);
    } finally {
      if (!isSilent) setLoading(false);
      initialLoadRef.current = false;
    }
  };

  // Buscar resumo de todas as conversas (não lidas e última mensagem para ordenar no topo)
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setUnreadMap(data.byClient || {});
        setLatestMessages(data.latestMessageByClient || {});
      }
    } catch (err) {
      console.error('Erro ao buscar resumo de conversas:', err);
    }
  };

  // Carrega cache local ao trocar de cliente imediatamente (sem piscar tela)
  useEffect(() => {
    if (selectedClient) {
      try {
        const cached = localStorage.getItem(`vb_chat_${selectedClient.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {}
      fetchMessages(selectedClient);
    }
    fetchSummary();
  }, [selectedClientId]);

  // Polling a cada 3.5 segundos para novas mensagens e ordenação em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedClient) {
        fetchMessages(selectedClient, true);
      }
      fetchSummary();
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedClientId]);

  // Rolar suavemente para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar Mensagem (Persistência no PostgreSQL e no Cache)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedClient || sending) return;

    setSending(true);
    setInputText('');

    const tempId = 'temp-' + Date.now();
    const tempMsg: ChatMessage = {
      id: tempId,
      clientId: selectedClient.id,
      clientSlug: selectedClient.slug,
      sender: 'AGENCY',
      senderName: 'VB Agência',
      content: text,
      createdAt: new Date().toISOString(),
      readByAgency: true,
      readByClient: false,
    };

    knownMsgIdsRef.current.add(tempId);
    setMessages((prev) => [...prev, tempMsg]);

    // Atualiza a última mensagem imediatamente para subir a conversa
    setLatestMessages((prev) => ({
      ...prev,
      [selectedClient.id]: tempMsg,
      [selectedClient.slug]: tempMsg,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          clientSlug: selectedClient.slug,
          sender: 'AGENCY',
          senderName: 'VB Agência',
          content: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const savedMsg = data.message;
        knownMsgIdsRef.current.add(savedMsg.id);

        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? savedMsg : m))
        );

        setLatestMessages((prev) => ({
          ...prev,
          [selectedClient.id]: savedMsg,
          [selectedClient.slug]: savedMsg,
        }));
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  // ORDENAÇÃO ESTILO WHATSAPP:
  // Conversas com mensagens mais recentes sempre no topo!
  const getClientLastMessage = (c: ClientItem): ChatMessage | undefined => {
    return latestMessages[c.id] || latestMessages[c.slug];
  };

  const getClientLastTime = (c: ClientItem): number => {
    const m = getClientLastMessage(c);
    return m ? new Date(m.createdAt).getTime() : 0;
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    const timeA = getClientLastTime(a);
    const timeB = getClientLastTime(b);
    const unreadA = unreadMap[a.id] || unreadMap[a.slug] || 0;
    const unreadB = unreadMap[b.id] || unreadMap[b.slug] || 0;

    // Se ambos tiverem mensagens, o mais recente fica no topo
    if (timeA !== timeB) return timeB - timeA;
    // Se nenhum tiver ou empatar, quem tem mensagem não lida fica na frente
    return unreadB - unreadA;
  });

  const quickTemplates = [
    '📅 Olá! O calendário com as postagens deste mês já está disponível para aprovação no seu portal.',
    '✂️ Olá! Os ajustes que você solicitou nos vídeos já foram finalizados e atualizados.',
    '🎬 Lembrando que temos captação de vídeos agendada para esta semana!',
    '👋 Olá! Ficou alguma dúvida sobre os conteúdos ou legendas?',
  ];

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getWhatsAppUrl = (client: ClientItem) => {
    const phoneClean = (client.phone || '').replace(/\D/g, '');
    const greeting = encodeURIComponent(
      `Olá, ${client.name}! ✨ Aqui é da VB Agência. Gostaria de alinhar com você sobre os conteúdos do seu portal.`
    );
    if (phoneClean) {
      return `https://wa.me/55${phoneClean}?text=${greeting}`;
    }
    return `https://api.whatsapp.com/send?text=${greeting}`;
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-[#DCD6CC] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[580px] relative">
      {/* Toast Flutuante estilo WhatsApp quando chega mensagem nova de cliente */}
      {toastNotification && (
        <div
          onClick={() => setToastNotification(null)}
          className="absolute top-4 right-4 z-50 bg-[#111111] text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in slide-in-from-top duration-200 cursor-pointer max-w-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-white shrink-0 shadow-md">
            💬
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-black text-emerald-400 uppercase truncate">
              {toastNotification.sender}
            </h5>
            <p className="text-[11px] text-white/90 truncate font-medium">
              {toastNotification.text}
            </p>
          </div>
        </div>
      )}

      {/* Barra Superior do Chat */}
      <div className="p-3.5 sm:p-5 border-b border-[#EEEDEA] bg-gradient-to-r from-[#FAF9F7] to-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md font-black shrink-0"
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#111111] uppercase tracking-tight flex items-center gap-2">
              Chat com Clientes
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                Online
              </span>
            </h2>
            <p className="text-xs text-[#66635D] font-medium">
              Comunicação direta, tira-dúvidas e notificações em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => playMessageSound()}
            className="p-2 hover:bg-[#FAF9F7] text-[#66635D] hover:text-[#FD3100] rounded-xl border border-[#DCD6CC] transition-colors"
            title="Testar som de notificação estilo WhatsApp"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (selectedClient) fetchMessages(selectedClient);
              fetchSummary();
            }}
            className="p-2 hover:bg-[#FAF9F7] text-[#66635D] hover:text-[#FD3100] rounded-xl border border-[#DCD6CC] transition-colors"
            title="Recarregar mensagens"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: Lista de Conversas (Esquerda) + Área do Chat (Direita) */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= COLUNA ESQUERDA: LISTA DE CLIENTES ORDENADA ================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#EEEDEA] flex flex-col bg-[#FAF9F7]/50 ${
            mobilePane === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Busca de Clientes */}
          <div className="p-3 border-b border-[#EEEDEA] bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-[#97A0AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] placeholder:text-[#97A0AF] focus:outline-none focus:border-[#FD3100]"
              />
            </div>
          </div>

          {/* Lista de Conversas Ordenadas pela Última Mensagem no Topo */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EEEDEA]">
            {sortedClients.length === 0 ? (
              <div className="p-8 text-center text-[#97A0AF] text-xs font-medium">
                Nenhum cliente encontrado.
              </div>
            ) : (
              sortedClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const unread = unreadMap[client.id] || unreadMap[client.slug] || 0;
                const lastMsg = getClientLastMessage(client);

                return (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setMobilePane('chat');
                    }}
                    className={`w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left transition-all ${
                      isSelected
                        ? 'bg-white shadow-sm border-l-4 border-l-[#FD3100]'
                        : unread > 0
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {client.logoUrl ? (
                        <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#DCD6CC] bg-white shrink-0 shadow-sm">
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          style={{ backgroundColor: '#FFF0EC', color: '#FD3100' }}
                          className="w-10 h-10 rounded-2xl border border-[#FFCEBF] font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-sm"
                        >
                          {client.name.slice(0, 2)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs truncate uppercase ${
                              unread > 0 ? 'font-black text-[#111111]' : 'font-bold text-[#222222]'
                            }`}
                          >
                            {client.name}
                          </h4>
                          {lastMsg && (
                            <span
                              className={`text-[10px] shrink-0 ${
                                unread > 0 ? 'font-black text-emerald-600' : 'text-[#97A0AF]'
                              }`}
                            >
                              {formatMessageTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>

                        {/* Prévia da Última Mensagem estilo WhatsApp */}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-[11px] truncate ${
                              unread > 0
                                ? 'font-bold text-[#111111]'
                                : 'text-[#66635D] font-normal'
                            }`}
                          >
                            {lastMsg ? (
                              <>
                                <span className="opacity-75">
                                  {lastMsg.sender === 'AGENCY' ? 'Você: ' : ''}
                                </span>
                                {lastMsg.content}
                              </>
                            ) : (
                              <span className="text-[#97A0AF] italic">Nenhuma mensagem</span>
                            )}
                          </p>

                          {/* Badge de Mensagens Não Lidas */}
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUNA DIREITA: JANELA DO CHAT ================= */}
        {selectedClient ? (
          <div
            className={`flex-1 flex flex-col bg-white overflow-hidden ${
              mobilePane === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header da Conversa Ativa */}
            <div className="p-3 sm:p-4 border-b border-[#EEEDEA] bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Botão Voltar (Mobile) */}
                <button
                  onClick={() => setMobilePane('list')}
                  className="p-1.5 hover:bg-[#FAF9F7] text-[#111111] rounded-xl border border-[#DCD6CC] md:hidden shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {selectedClient.logoUrl ? (
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#DCD6CC] bg-white shrink-0 shadow-sm">
                    <img
                      src={selectedClient.logoUrl}
                      alt={selectedClient.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    style={{ backgroundColor: '#FFF0EC', color: '#FD3100' }}
                    className="w-9 h-9 rounded-xl border border-[#FFCEBF] font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-sm"
                  >
                    {selectedClient.name.slice(0, 2)}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-[#111111] uppercase truncate">
                    {selectedClient.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Portal do Cliente Conectado</span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas: WhatsApp & Abrir Portal */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <a
                  href={getWhatsAppUrl(selectedClient)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Abrir conversa no WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>

                <a
                  href={`/c/${selectedClient.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#EEEDEA] text-[#111111] border border-[#DCD6CC] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
                  title="Abrir o Portal do Cliente em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ver Portal</span>
                </a>
              </div>
            </div>

            {/* Thread de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAF9F7]/40">
              {loading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-bold text-[#97A0AF] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FD3100]" />
                  <span>Carregando conversa...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#97A0AF]">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCD6CC] flex items-center justify-center mb-3 shadow-sm text-[#FD3100]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-[#111111] uppercase mb-1">
                    Nenhuma mensagem ainda
                  </h4>
                  <p className="text-[11px] max-w-sm">
                    Envie uma mensagem abaixo para iniciar o alinhamento com{' '}
                    <strong>{selectedClient.name}</strong>. Ela ficará salva permanentemente!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAgency = msg.sender === 'AGENCY';

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${
                        isAgency ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Avatar do Cliente */}
                      {!isAgency && (
                        <div
                          style={{ backgroundColor: '#FFF0EC', color: '#FD3100' }}
                          className="w-7 h-7 rounded-xl border border-[#FFCEBF] text-[10px] font-black flex items-center justify-center uppercase shrink-0 shadow-sm"
                        >
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Balão de Mensagem */}
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isAgency
                            ? 'btn-vb-primary text-white rounded-br-sm'
                            : 'bg-white text-[#111111] border border-[#DCD6CC] rounded-bl-sm font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isAgency ? 'text-white/80' : 'text-[#FD3100]'
                            }`}
                          >
                            {msg.senderName || (isAgency ? 'VB Agência' : selectedClient.name)}
                          </span>
                          <span
                            className={`text-[9px] font-bold flex items-center gap-1 ${
                              isAgency ? 'text-white/70' : 'text-[#97A0AF]'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap leading-relaxed text-left font-normal text-[12px]">
                          {msg.content}
                        </p>
                      </div>

                      {/* Avatar VB Agência */}
                      {isAgency && (
                        <div
                          style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                          className="w-7 h-7 rounded-xl font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm uppercase"
                        >
                          VB
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões Rápidas de Mensagens */}
            <div className="px-3 pt-2 bg-white border-t border-[#EEEDEA] flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
              <span className="text-[10px] font-black text-[#97A0AF] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FD3100]" />
                Atalhos:
              </span>
              {quickTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(template)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F7] hover:bg-[#FFF0EC] text-[#66635D] hover:text-[#FD3100] border border-[#DCD6CC] hover:border-[#FD3100] text-[10px] font-black whitespace-nowrap transition-colors shrink-0"
                >
                  {template.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Input de Envio de Mensagem */}
            <div className="p-3 sm:p-4 bg-white border-t border-[#EEEDEA]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Digite sua mensagem para ${selectedClient.name}...`}
                  className="flex-1 px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs font-bold text-[#111111] placeholder:text-[#97A0AF] focus:outline-none shadow-sm"
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="btn-vb-primary px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-[#97A0AF]">
            Selecione um cliente para abrir a conversa.
          </div>
        )}
      </div>
    </div>
  );
}
