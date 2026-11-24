import { prisma } from '../prisma';

export interface ClientData {
  id: string;
  name: string;
  slug: string;
  pin: string;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  cycles?: Array<{
    id: string;
    name: string;
    month?: number | null;
    year?: number | null;
    active: boolean;
  }>;
  _count?: {
    posts: number;
  };
}

// Armazenamento em memória caso o banco de dados PostgreSQL ainda não esteja ativo localmente
let localClientsStore: ClientData[] = [
  {
    id: 'client-stabilita',
    name: 'Studio Stabilitá',
    slug: 'studio-stabilita',
    pin: '1234',
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { posts: 1 },
  },
  {
    id: 'demo-client-1',
    name: 'Cliente Exemplo (Demo)',
    slug: 'cliente-exemplo',
    pin: '1234',
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { posts: 2 },
  },
];

let databaseAvailable: boolean | null = null;

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseAvailable = true;
    return true;
  } catch {
    databaseAvailable = false;
    return false;
  }
}

export async function getClients(): Promise<{ clients: ClientData[]; isUsingFallback: boolean }> {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cycles: {
          select: { id: true, name: true, month: true, year: true, active: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { posts: true },
        },
      },
    });
    databaseAvailable = true;
    return { clients, isUsingFallback: false };
  } catch (error) {
    console.warn('PostgreSQL indisponível no momento. Usando fallback local para testes.', error);
    databaseAvailable = false;
    return { clients: localClientsStore, isUsingFallback: true };
  }
}

export async function createClient(data: {
  name: string;
  slug: string;
  pin: string;
  logoUrl?: string;
}): Promise<{ client: ClientData; isUsingFallback: boolean }> {
  try {
    const newClient = await prisma.client.create({
      data: {
        name: data.name,
        slug: data.slug,
        pin: data.pin,
        logoUrl: data.logoUrl || null,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
    databaseAvailable = true;
    return { client: newClient, isUsingFallback: false };
  } catch (error) {
    console.warn('PostgreSQL indisponível. Salvando cliente no armazenamento temporário.', error);
    databaseAvailable = false;
    const fallbackClient: ClientData = {
      id: 'local-' + Date.now(),
      name: data.name,
      slug: data.slug,
      pin: data.pin,
      logoUrl: data.logoUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { posts: 0 },
    };
    localClientsStore.unshift(fallbackClient);
    return { client: fallbackClient, isUsingFallback: true };
  }
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    pin?: string;
    logoUrl?: string | null;
  }
): Promise<{ client: ClientData | null; isUsingFallback: boolean }> {
  try {
    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.pin && { pin: data.pin }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
    return { client: updated, isUsingFallback: false };
  } catch (error) {
    console.warn('Erro ao atualizar cliente no Prisma, atualizando local:', error);
    const client = localClientsStore.find((c) => c.id === id);
    if (client) {
      if (data.name) client.name = data.name;
      if (data.pin) client.pin = data.pin;
      if (data.logoUrl !== undefined) client.logoUrl = data.logoUrl;
      client.updatedAt = new Date();
      return { client, isUsingFallback: true };
    }
    return { client: null, isUsingFallback: true };
  }
}

export async function getClientBySlug(slug: string): Promise<{ client: ClientData | null; isUsingFallback: boolean }> {
  try {
    const client = await prisma.client.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
    return { client, isUsingFallback: false };
  } catch (error) {
    console.warn('PostgreSQL indisponível. Buscando cliente no armazenamento temporário.', error);
    const client = localClientsStore.find((c) => c.slug === slug) || null;
    return { client, isUsingFallback: true };
  }
}
