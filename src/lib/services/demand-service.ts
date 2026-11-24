import { prisma } from '../prisma';
import { generateSlug, parseDateInput } from '../utils';

export interface DemandClientInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export interface DemandData {
  id: string;
  title: string;
  description?: string | null;
  columnId: string;
  order: number;
  dueDate?: Date | string | null;
  completed: boolean;
  priority: string;
  clientId?: string | null;
  client?: DemandClientInfo | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DemandColumnData {
  id: string;
  title: string;
  slug: string;
  order: number;
  demands: DemandData[];
}

const DEFAULT_COLUMNS = [
  { title: 'Hoje', slug: 'hoje', order: 0 },
  { title: 'Esta semana', slug: 'esta-semana', order: 1 },
  { title: 'Mais tarde', slug: 'mais-tarde', order: 2 },
  { title: 'Revisar', slug: 'revisar', order: 3 },
  { title: 'Concluído', slug: 'concluido', order: 4 },
];

export async function getDemandBoard(): Promise<{ columns: DemandColumnData[] }> {
  try {
    let columns = await prisma.demandColumn.findMany({
      orderBy: { order: 'asc' },
      include: {
        demands: {
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          include: {
            client: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
      },
    });

    // Se nenhuma coluna existir no banco, inicializa as colunas padrão (estilo Trello)
    if (columns.length === 0) {
      for (const col of DEFAULT_COLUMNS) {
        await prisma.demandColumn.create({
          data: col,
        });
      }

      columns = await prisma.demandColumn.findMany({
        orderBy: { order: 'asc' },
        include: {
          demands: {
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
            include: {
              client: {
                select: { id: true, name: true, slug: true, logoUrl: true },
              },
            },
          },
        },
      });
    }

    return { columns: columns as unknown as DemandColumnData[] };
  } catch (error) {
    console.error('Erro ao buscar quadro de demandas:', error);
    return {
      columns: DEFAULT_COLUMNS.map((c, i) => ({
        id: `local-col-${i}`,
        title: c.title,
        slug: c.slug,
        order: c.order,
        demands: [],
      })),
    };
  }
}

export async function createDemand(data: {
  title: string;
  columnId: string;
  description?: string;
  dueDate?: Date | string | null;
  clientId?: string | null;
  priority?: string;
}): Promise<DemandData> {
  const count = await prisma.demand.count({
    where: { columnId: data.columnId },
  });

  const demand = await prisma.demand.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      columnId: data.columnId,
      order: count,
      dueDate: data.dueDate ? parseDateInput(data.dueDate) : null,
      clientId: data.clientId || null,
      priority: data.priority || 'NORMAL',
    },
    include: {
      client: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
    },
  });

  return demand as unknown as DemandData;
}

export async function updateDemand(
  id: string,
  data: {
    title?: string;
    columnId?: string;
    description?: string | null;
    dueDate?: Date | string | null;
    completed?: boolean;
    clientId?: string | null;
    priority?: string;
    order?: number;
  }
): Promise<DemandData> {
  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.columnId !== undefined) updateData.columnId = data.columnId;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? parseDateInput(data.dueDate) : null;
  if (data.completed !== undefined) updateData.completed = data.completed;
  if (data.clientId !== undefined) updateData.clientId = data.clientId || null;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.order !== undefined) updateData.order = data.order;

  const demand = await prisma.demand.update({
    where: { id },
    data: updateData,
    include: {
      client: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
    },
  });

  return demand as unknown as DemandData;
}

export async function deleteDemand(id: string): Promise<boolean> {
  await prisma.demand.delete({
    where: { id },
  });
  return true;
}

export async function reorderDemands(
  items: Array<{ id: string; columnId: string; order: number }>
): Promise<boolean> {
  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.demand.update({
          where: { id: item.id },
          data: {
            columnId: item.columnId,
            order: item.order,
          },
        })
      )
    );
    return true;
  } catch (err) {
    console.error('Erro ao reordenar demandas no banco:', err);
    return false;
  }
}

export async function createDemandColumn(title: string): Promise<DemandColumnData> {
  const count = await prisma.demandColumn.count();
  const slug = `${generateSlug(title)}-${Date.now().toString().slice(-4)}`;

  const column = await prisma.demandColumn.create({
    data: {
      title: title.trim(),
      slug,
      order: count,
    },
    include: {
      demands: {
        include: {
          client: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      },
    },
  });

  return column as unknown as DemandColumnData;
}

export async function deleteDemandColumn(id: string): Promise<boolean> {
  await prisma.demandColumn.delete({
    where: { id },
  });
  return true;
}
