'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MessageSquare,
  CheckCheck,
  ExternalLink,
  Phone,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';
import { ChatMessage } from '@/lib/services/chat-service';

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
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find(
    (c) => c.id === selectedClientId || c.slug === selectedClientId
  ) || clients[0];

  // Carregar mensagens do cliente selecionado
  const fetchMessages = async (clientId: string, isSilent = false) => {
    if (!clientId) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await fetch(`/api/chat?clientId=${clientId}&reader=AGENCY`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Atualiza mapa de não lidas para este cliente
        setUnreadMap((prev) => ({ ...prev, [clientId]: 0 }));
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Buscar contagem geral de mensagens não lidas
  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setUnreadMap(data.byClient || {});
      }
    } catch (err) {
      console.error('Erro ao buscar não lidas:', err);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      fetchMessages(selectedClient.id);
    }
    fetchUnreadCounts();

    // Polling suave a cada 5 segundos para novas mensagens
    const interval = setInterval(() => {
      if (selectedClient) {
        fetchMessages(selectedClient.id, true);
      }
      fetchUnreadCounts();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedClientId]);

  // Rolar para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar Mensagem
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedClient || sending) return;

    setSending(true);
    setInputText('');

    // Mensagem temporária otimista
    const tempMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      clientId: selectedClient.id,
      sender: 'AGENCY',
      senderName: 'VB Agência',
      content: text,
      createdAt: new Date().toISOString(),
      readByAgency: true,
      readByClient: false,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          sender: 'AGENCY',
          senderName: 'VB Agência',
          content: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? data.message : m))
        );
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const quickTemplates = [
    '📅 Olá! O calendário com as postagens deste mês já está disponível para aprovação no seu portal.',
    '✂️ Olá! Os ajustes que você solicitou nos vídeos já foram finalizados e atualizados.',
    '🎬 Lembrando que temos captação de vídeos agendada para esta semana!',
    '👋 Olá! Ficou alguma dúvida sobre os conteúdos ou legendas?',
  ];

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
    <div className="bg-white rounded-3xl border-2 border-[#DCD6CC] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[580px]">
      {/* Barra de Título Superior do Hub de Chat */}
      <div className="p-4 sm:p-5 border-b border-[#EEEDEA] bg-gradient-to-r from-[#FAF9F7] to-white flex items-center justify-between gap-3">
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
              Comunicação direta e tira-dúvidas de aprovação com cada cliente
            </p>
          </div>
        </div>

        <button
          onClick={() => selectedClient && fetchMessages(selectedClient.id)}
          className="p-2 hover:bg-[#FAF9F7] text-[#66635D] hover:text-[#FD3100] rounded-xl border border-[#DCD6CC] transition-colors"
          title="Recarregar mensagens"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Principal: Lista de Clientes (Esquerda) + Janela de Mensagens (Direita) */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= COLUNA ESQUERDA: LISTA DE CLIENTES ================= */}
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
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] placeholder:text-[#97A0AF] focus:outline-none focus:border-[#FD3100]"
              />
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EEEDEA]">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-[#97A0AF] text-xs font-medium">
                Nenhum cliente encontrado.
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const unread = unreadMap[client.id] || 0;

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
                          <h4 className="text-xs font-black text-[#111111] truncate uppercase">
                            {client.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-[#66635D] font-medium truncate mt-0.5">
                          @{client.slug} • Portal Ativo
                        </p>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm shrink-0 animate-pulse">
                        {unread}
                      </span>
                    )}
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
            <div className="p-3.5 sm:p-4 border-b border-[#EEEDEA] bg-white flex items-center justify-between gap-3 shrink-0">
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

              {/* Botões Rápidos de Ação: WhatsApp & Abrir Portal */}
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

            {/* Área de Mensagens (Thread) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAF9F7]/40">
              {loading ? (
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
                    Envie uma mensagem abaixo para iniciar a comunicação com{' '}
                    <strong>{selectedClient.name}</strong>. Ele verá diretamente no portal dele!
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
                      {/* Avatar do Cliente (se recebida) */}
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
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap leading-relaxed text-left font-normal text-[12px]">
                          {msg.content}
                        </p>
                      </div>

                      {/* Avatar VB Agência (se enviada) */}
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

            {/* Sugestões Rápidas de Mensagens (Templates) */}
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
