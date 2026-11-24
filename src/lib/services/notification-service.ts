import { prisma } from '../prisma';
import { getPostsByClientId, localPostsStore, PostData } from './post-service';

export interface NotificationItem {
  id: string;
  type: 'AJUSTES' | 'APROVADO' | 'COMENTARIO';
  title: string;
  description: string;
  clientName: string;
  clientLogo?: string | null;
  clientId: string;
  postTitle: string;
  postId: string;
  commentPreview?: string;
  commentCount?: number;
  createdAt: string;
}

export async function getAdminNotifications(): Promise<{
  notifications: NotificationItem[];
  pendingAdjustmentsCount: number;
}> {
  const notifications: NotificationItem[] = [];

  try {
    // 1. Busca posts que estão com status AJUSTES
    const adjustmentPosts = await prisma.post.findMany({
      where: {
        status: 'AJUSTES',
      },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    for (const post of adjustmentPosts) {
      const clientComments = post.comments.filter((c) => c.authorRole === 'CLIENT');
      const latestComment = clientComments[0] || post.comments[0];

      notifications.push({
        id: `adjust-${post.id}`,
        type: 'AJUSTES',
        title: 'Alterações Solicitadas pelo Cliente',
        description: `O cliente finalizou a revisão e solicitou alterações no post "${post.title}".`,
        clientName: post.client?.name || 'Cliente',
        clientLogo: post.client?.logoUrl,
        clientId: post.clientId,
        postTitle: post.title,
        postId: post.id,
        commentPreview: latestComment?.content ? `"${latestComment.content}"` : undefined,
        commentCount: post.comments.length,
        createdAt: post.updatedAt.toISOString(),
      });
    }

    // 2. Busca posts aprovados recentemente (últimos 7 dias)
    const recentApprovedPosts = await prisma.post.findMany({
      where: {
        status: 'APROVADO',
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    for (const post of recentApprovedPosts) {
      notifications.push({
        id: `approved-${post.id}`,
        type: 'APROVADO',
        title: 'Conteúdo Aprovado!',
        description: `O cliente aprovou a publicação "${post.title}" com sucesso.`,
        clientName: post.client?.name || 'Cliente',
        clientLogo: post.client?.logoUrl,
        clientId: post.clientId,
        postTitle: post.title,
        postId: post.id,
        createdAt: post.updatedAt.toISOString(),
      });
    }
  } catch (err) {
    console.warn('Buscando notificações do fallback local:', err);

    // Fallback local se o banco não estiver acessível
    for (const post of localPostsStore) {
      if (post.status === 'AJUSTES') {
        const clientComments = post.comments.filter((c: any) => c.authorRole === 'CLIENT');
        const latestComment = clientComments[0] || post.comments[0];

        notifications.push({
          id: `adjust-${post.id}`,
          type: 'AJUSTES',
          title: 'Alterações Solicitadas pelo Cliente',
          description: `O cliente finalizou a revisão e solicitou alterações no post "${post.title}".`,
          clientName: 'Cliente',
          clientId: post.clientId,
          postTitle: post.title,
          postId: post.id,
          commentPreview: latestComment?.content ? `"${latestComment.content}"` : undefined,
          commentCount: post.comments.length,
          createdAt: post.updatedAt.toISOString(),
        });
      } else if (post.status === 'APROVADO') {
        notifications.push({
          id: `approved-${post.id}`,
          type: 'APROVADO',
          title: 'Conteúdo Aprovado!',
          description: `O cliente aprovou a publicação "${post.title}" com sucesso.`,
          clientName: 'Cliente',
          clientId: post.clientId,
          postTitle: post.title,
          postId: post.id,
          createdAt: post.updatedAt.toISOString(),
        });
      }
    }
  }

  // Ordena por data decrescente
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingAdjustmentsCount = notifications.filter((n) => n.type === 'AJUSTES').length;

  return {
    notifications,
    pendingAdjustmentsCount,
  };
}
