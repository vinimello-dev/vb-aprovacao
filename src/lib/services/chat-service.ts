import { prisma } from '../prisma';

export interface ChatMessage {
  id: string;
  clientId: string; // ID ou slug do cliente
  clientSlug?: string;
  sender: 'AGENCY' | 'CLIENT';
  senderName: string;
  content: string;
  createdAt: string; // ISO String
  readByAgency: boolean;
  readByClient: boolean;
}

// Armazenamento em memória (fallback e cache de altíssima velocidade)
export let localChatMessagesStore: ChatMessage[] = [
  {
    id: 'msg-init-1',
    clientId: 'client-stabilita',
    clientSlug: 'studio-stabilita',
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
    clientSlug: 'studio-stabilita',
    sender: 'CLIENT',
    senderName: 'Stabilitá FISIO',
    content: 'Opa Vini, tudo certo! Já estou conferindo os vídeos gravados da semana aqui no portal.',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    readByAgency: true,
    readByClient: true,
  },
];

let isTableInitialized = false;

/**
 * Garante que a tabela chat_messages exista no PostgreSQL Neon
 */
async function ensureTableExists() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        client_slug TEXT,
        sender TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        read_by_agency BOOLEAN DEFAULT false,
        read_by_client BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    isTableInitialized = true;
  } catch (err) {
    console.warn('Aviso: Não foi possível verificar tabela chat_messages no Prisma, usando cache local:', err);
  }
}

/**
 * Normaliza strings para comparação insensível
 */
function clean(str?: string | null): string {
  return (str || '').trim().toLowerCase();
}

/**
 * Busca todas as mensagens de um cliente específico (busca por ID e por Slug)
 */
export async function getChatMessages(clientIdOrSlug: string, clientSlugAlt?: string): Promise<ChatMessage[]> {
  const targetId = clean(clientIdOrSlug);
  const targetSlug = clean(clientSlugAlt || clientIdOrSlug);

  try {
    await ensureTableExists();

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        client_id as "clientId", 
        client_slug as "clientSlug", 
        sender, 
        sender_name as "senderName", 
        content, 
        read_by_agency as "readByAgency", 
        read_by_client as "readByClient", 
        created_at as "createdAt"
      FROM chat_messages
      WHERE 
        LOWER(client_id) = '${targetId}' OR 
        LOWER(client_slug) = '${targetId}' OR 
        LOWER(client_id) = '${targetSlug}' OR 
        LOWER(client_slug) = '${targetSlug}'
      ORDER BY created_at ASC
    `);

    if (rows && rows.length > 0) {
      const dbMessages = rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientSlug: r.clientSlug || undefined,
        sender: r.sender as 'AGENCY' | 'CLIENT',
        senderName: r.senderName,
        content: r.content,
        createdAt: new Date(r.createdAt).toISOString(),
        readByAgency: Boolean(r.readByAgency),
        readByClient: Boolean(r.readByClient),
      }));

      // Sincroniza cache local com o banco
      dbMessages.forEach((dbM) => {
        if (!localChatMessagesStore.some((m) => m.id === dbM.id)) {
          localChatMessagesStore.push(dbM);
        }
      });

      return dbMessages;
    }
  } catch (err) {
    console.warn('Erro ao consultar banco Neon, usando fallback local:', err);
  }

  // Fallback local
  return localChatMessagesStore.filter((m) => {
    const id = clean(m.clientId);
    const slug = clean(m.clientSlug);
    return id === targetId || id === targetSlug || slug === targetId || slug === targetSlug;
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Envia uma nova mensagem com persistência definitiva no PostgreSQL
 */
export async function sendChatMessage(data: {
  clientId: string;
  clientSlug?: string;
  sender: 'AGENCY' | 'CLIENT';
  senderName?: string;
  content: string;
}): Promise<ChatMessage> {
  const defaultSenderName = data.sender === 'AGENCY' ? 'VB Agência' : 'Cliente';
  const newMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    clientId: data.clientId.trim(),
    clientSlug: data.clientSlug ? data.clientSlug.trim() : undefined,
    sender: data.sender,
    senderName: (data.senderName || defaultSenderName).trim(),
    content: data.content.trim(),
    createdAt: new Date().toISOString(),
    readByAgency: data.sender === 'AGENCY',
    readByClient: data.sender === 'CLIENT',
  };

  // 1. Salva no cache local imediatamente
  localChatMessagesStore.push(newMsg);

  // 2. Persiste no banco de dados Neon Cloud
  try {
    await ensureTableExists();
    const sanitizedContent = newMsg.content.replace(/'/g, "''");
    const sanitizedName = newMsg.senderName.replace(/'/g, "''");
    const sanitizedClientId = newMsg.clientId.replace(/'/g, "''");
    const sanitizedSlug = (newMsg.clientSlug || '').replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      INSERT INTO chat_messages (
        id, client_id, client_slug, sender, sender_name, content, read_by_agency, read_by_client, created_at, updated_at
      ) VALUES (
        '${newMsg.id}', 
        '${sanitizedClientId}', 
        '${sanitizedSlug}', 
        '${newMsg.sender}', 
        '${sanitizedName}', 
        '${sanitizedContent}', 
        ${newMsg.readByAgency}, 
        ${newMsg.readByClient}, 
        NOW(), 
        NOW()
      )
    `);
  } catch (err) {
    console.error('Erro ao persistir mensagem no Postgres Neon:', err);
  }

  return newMsg;
}

/**
 * Marca as mensagens de um cliente como lidas
 */
export async function markChatAsRead(
  clientIdOrSlug: string,
  reader: 'AGENCY' | 'CLIENT'
): Promise<void> {
  const target = clean(clientIdOrSlug);

  // Cache local
  localChatMessagesStore.forEach((m) => {
    const id = clean(m.clientId);
    const slug = clean(m.clientSlug);
    if (id === target || slug === target) {
      if (reader === 'AGENCY') m.readByAgency = true;
      else m.readByClient = true;
    }
  });

  // Banco de Dados
  try {
    await ensureTableExists();
    const fieldToUpdate = reader === 'AGENCY' ? 'read_by_agency = true' : 'read_by_client = true';
    await prisma.$executeRawUnsafe(`
      UPDATE chat_messages 
      SET ${fieldToUpdate}, updated_at = NOW()
      WHERE LOWER(client_id) = '${target}' OR LOWER(client_slug) = '${target}'
    `);
  } catch (err) {
    console.error('Erro ao atualizar status de leitura no Postgres:', err);
  }
}

/**
 * Retorna contagem de mensagens não lidas e última mensagem de cada cliente
 * Permite ordenar clientes por mensagem mais recente no topo (estilo WhatsApp)
 */
export async function getChatSummaryForAgency(): Promise<{
  totalUnread: number;
  byClient: Record<string, number>;
  latestMessageByClient: Record<string, ChatMessage>;
}> {
  let allMessages: ChatMessage[] = [];

  try {
    await ensureTableExists();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        client_id as "clientId", 
        client_slug as "clientSlug", 
        sender, 
        sender_name as "senderName", 
        content, 
        read_by_agency as "readByAgency", 
        read_by_client as "readByClient", 
        created_at as "createdAt"
      FROM chat_messages
      ORDER BY created_at ASC
    `);

    if (rows && rows.length > 0) {
      allMessages = rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientSlug: r.clientSlug || undefined,
        sender: r.sender as 'AGENCY' | 'CLIENT',
        senderName: r.senderName,
        content: r.content,
        createdAt: new Date(r.createdAt).toISOString(),
        readByAgency: Boolean(r.readByAgency),
        readByClient: Boolean(r.readByClient),
      }));
    } else {
      allMessages = localChatMessagesStore;
    }
  } catch {
    allMessages = localChatMessagesStore;
  }

  const byClient: Record<string, number> = {};
  const latestMessageByClient: Record<string, ChatMessage> = {};
  let totalUnread = 0;

  allMessages.forEach((m) => {
    const key = m.clientId;
    const slugKey = m.clientSlug;

    // Mensagens não lidas enviadas pelo cliente
    if (m.sender === 'CLIENT' && !m.readByAgency) {
      totalUnread++;
      byClient[key] = (byClient[key] || 0) + 1;
      if (slugKey) {
        byClient[slugKey] = (byClient[slugKey] || 0) + 1;
      }
    }

    // Última mensagem (já que está ordenado por created_at ASC, a última substitui a anterior)
    latestMessageByClient[key] = m;
    if (slugKey) {
      latestMessageByClient[slugKey] = m;
    }
  });

  return {
    totalUnread,
    byClient,
    latestMessageByClient,
  };
}

/**
 * Retorna contagem de mensagens não lidas para um cliente específico
 */
export async function getChatUnreadCountForClient(clientIdOrSlug: string): Promise<number> {
  const target = clean(clientIdOrSlug);
  const messages = await getChatMessages(target);
  return messages.filter((m) => m.sender === 'AGENCY' && !m.readByClient).length;
}
