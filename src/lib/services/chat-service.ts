export interface ChatMessage {
  id: string;
  clientId: string; // ID ou slug do cliente
  sender: 'AGENCY' | 'CLIENT';
  senderName: string; // Ex: 'VB Agência' ou 'Restaurante Varanda'
  content: string;
  createdAt: string; // ISO String
  readByAgency: boolean;
  readByClient: boolean;
}

// Armazenamento em memória com histórico inicial acolhedor
export let localChatMessagesStore: ChatMessage[] = [
  {
    id: 'msg-init-1',
    clientId: 'client-stabilita',
    sender: 'AGENCY',
    senderName: 'VB Agência',
    content: 'Olá! Seja muito bem-vindo ao portal de aprovações da VB Agência. Você pode usar este chat para tirar dúvidas sobre os vídeos, sugerir novas ideias ou falar diretamente com a equipe!',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    readByAgency: true,
    readByClient: true,
  },
  {
    id: 'msg-init-2',
    clientId: 'client-stabilita',
    sender: 'CLIENT',
    senderName: 'Stabilitá FISIO',
    content: 'Opa Vini, tudo certo! Já estou conferindo os vídeos gravados da semana aqui no portal.',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    readByAgency: true,
    readByClient: true,
  },
  {
    id: 'msg-init-3',
    clientId: 'demo-client-1',
    sender: 'AGENCY',
    senderName: 'VB Agência',
    content: 'Olá! Seus novos conteúdos do mês já estão disponíveis para revisão no portal.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    readByAgency: true,
    readByClient: true,
  },
];

/**
 * Normaliza o ID ou slug do cliente para consulta
 */
function normalizeClientId(idOrSlug: string): string {
  return (idOrSlug || '').trim().toLowerCase();
}

/**
 * Busca todas as mensagens de um cliente específico
 */
export async function getChatMessages(clientIdOrSlug: string): Promise<ChatMessage[]> {
  const target = normalizeClientId(clientIdOrSlug);
  return localChatMessagesStore.filter((m) => {
    const id = normalizeClientId(m.clientId);
    return id === target || id.includes(target) || target.includes(id);
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Envia uma nova mensagem no chat
 */
export async function sendChatMessage(data: {
  clientId: string;
  sender: 'AGENCY' | 'CLIENT';
  senderName?: string;
  content: string;
}): Promise<ChatMessage> {
  const defaultSenderName = data.sender === 'AGENCY' ? 'VB Agência' : 'Cliente';
  const newMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    clientId: data.clientId.trim(),
    sender: data.sender,
    senderName: (data.senderName || defaultSenderName).trim(),
    content: data.content.trim(),
    createdAt: new Date().toISOString(),
    readByAgency: data.sender === 'AGENCY',
    readByClient: data.sender === 'CLIENT',
  };

  localChatMessagesStore.push(newMsg);
  return newMsg;
}

/**
 * Marca as mensagens de um cliente como lidas
 */
export async function markChatAsRead(
  clientIdOrSlug: string,
  reader: 'AGENCY' | 'CLIENT'
): Promise<void> {
  const target = normalizeClientId(clientIdOrSlug);
  localChatMessagesStore.forEach((m) => {
    const id = normalizeClientId(m.clientId);
    if (id === target || id.includes(target) || target.includes(id)) {
      if (reader === 'AGENCY') {
        m.readByAgency = true;
      } else {
        m.readByClient = true;
      }
    }
  });
}

/**
 * Retorna contagem de mensagens não lidas para a agência
 */
export async function getChatUnreadCountForAgency(): Promise<{
  total: number;
  byClient: Record<string, number>;
}> {
  const unreadMessages = localChatMessagesStore.filter(
    (m) => m.sender === 'CLIENT' && !m.readByAgency
  );

  const byClient: Record<string, number> = {};
  unreadMessages.forEach((m) => {
    byClient[m.clientId] = (byClient[m.clientId] || 0) + 1;
  });

  return {
    total: unreadMessages.length,
    byClient,
  };
}

/**
 * Retorna contagem de mensagens não lidas para um cliente específico
 */
export async function getChatUnreadCountForClient(clientIdOrSlug: string): Promise<number> {
  const target = normalizeClientId(clientIdOrSlug);
  return localChatMessagesStore.filter((m) => {
    const id = normalizeClientId(m.clientId);
    const matchesClient = id === target || id.includes(target) || target.includes(id);
    return matchesClient && m.sender === 'AGENCY' && !m.readByClient;
  }).length;
}
