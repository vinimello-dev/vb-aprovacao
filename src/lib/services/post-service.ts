import { prisma } from '../prisma';
import { parseDateInput } from '../utils';

export interface PostMediaData {
  id: string;
  postId: string;
  url: string;
  mediaType: string; // "VIDEO" | "IMAGE"
  order: number;
  thumbnailUrl?: string | null;
  duration?: number | null;
  createdAt: Date;
}

export interface CommentData {
  id: string;
  postId: string;
  author: string;
  authorRole: string; // "CLIENT" | "AGENCY"
  content: string;
  timestampSeconds?: number | null;
  slideIndex?: number | null;
  isCaptionComment?: boolean;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostData {
  id: string;
  clientId: string;
  cycleId?: string | null;
  title: string;
  caption?: string | null;
  format: 'VIDEO' | 'CAROUSEL' | 'STATIC' | 'REELS' | 'STORIES';
  status: 'PENDENTE' | 'AJUSTES' | 'APROVADO';
  scheduledDate?: Date | null;
  scheduledTime?: string | null;
  createdAt: Date;
  updatedAt: Date;
  media: PostMediaData[];
  comments: CommentData[];
}

export let localPostsStore: PostData[] = [
  // Vídeo Real do Studio Stabilitá enviado pelo cliente
  {
    id: 'post-stabilita-drive',
    clientId: 'client-stabilita',
    title: 'Vídeo Institucional • Studio Stabilitá',
    caption: '✨ Cuidar do seu corpo e da sua mente é uma prioridade. Conheça a experiência única do Studio Stabilitá e descubra como elevar o seu bem-estar diário através de um método personalizado e acolhedor.\n\nAgende sua aula experimental pelo link da bio! 🌿\n\n#StudioStabilita #Pilates #BemEstar #QualidadeDeVida',
    format: 'VIDEO',
    status: 'PENDENTE',
    scheduledDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    media: [
      {
        id: 'media-stabilita-1',
        postId: 'post-stabilita-drive',
        url: '/api/video-stream?id=1dohvLNVDhmcRiufHc4L8Z_ODX9IF28zS',
        mediaType: 'VIDEO',
        order: 0,
        thumbnailUrl: 'https://lh3.googleusercontent.com/d/1dohvLNVDhmcRiufHc4L8Z_ODX9IF28zS',
        duration: 30.0,
        createdAt: new Date(),
      },
    ],
    comments: [
      {
        id: 'c-stab-1',
        postId: 'post-stabilita-drive',
        author: 'Studio Stabilitá',
        authorRole: 'CLIENT',
        content: 'Ficou ótimo! Gostei muito da iluminação e da trilha sonora.',
        timestampSeconds: 5.0,
        slideIndex: null,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: 'post-video-demo',
    clientId: 'demo-client-1',
    title: 'Vídeo Institucional • Campanha de Posicionamento',
    caption: '🚀 Posicionamento forte gera autoridade e atrai clientes qualificados. Confira nosso novo filme institucional da marca!\n\n#Marketing #Audiovisual #Autoridade #Branding',
    format: 'VIDEO',
    status: 'PENDENTE',
    scheduledDate: new Date(Date.now() + 86400000 * 2),
    createdAt: new Date(),
    updatedAt: new Date(),
    media: [
      {
        id: 'media-v1',
        postId: 'post-video-demo',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        mediaType: 'VIDEO',
        order: 0,
        thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
        duration: 15.0,
        createdAt: new Date(),
      },
    ],
    comments: [
      {
        id: 'c-v1',
        postId: 'post-video-demo',
        author: 'Cliente',
        authorRole: 'CLIENT',
        content: 'Neste segundo aqui a transição ficou muito rápida, dá para estender um pouco?',
        timestampSeconds: 4.5,
        slideIndex: null,
        resolved: false,
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
      },
      {
        id: 'c-v2',
        postId: 'post-video-demo',
        author: 'Agência VB',
        authorRole: 'AGENCY',
        content: 'Perfeito! Vamos alongar a transição neste trecho em 0.8s.',
        timestampSeconds: 4.5,
        slideIndex: null,
        resolved: true,
        createdAt: new Date(Date.now() - 1800000),
        updatedAt: new Date(Date.now() - 1800000),
      },
    ],
  },
  {
    id: 'post-carousel-demo',
    clientId: 'demo-client-1',
    title: 'Carrossel Estratégico • 4 Pilares de Crescimento',
    caption: '👉 Arraste para o lado e conheça os 4 pilares indispensáveis para escalar sua presença digital neste trimestre.\n\nSalva esse post para consultar depois! 📌',
    format: 'CAROUSEL',
    status: 'AJUSTES',
    scheduledDate: new Date(Date.now() + 86400000 * 5),
    createdAt: new Date(),
    updatedAt: new Date(),
    media: [
      {
        id: 'media-c1',
        postId: 'post-carousel-demo',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        mediaType: 'IMAGE',
        order: 0,
        thumbnailUrl: null,
        duration: null,
        createdAt: new Date(),
      },
      {
        id: 'media-c2',
        postId: 'post-carousel-demo',
        url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        mediaType: 'IMAGE',
        order: 1,
        thumbnailUrl: null,
        duration: null,
        createdAt: new Date(),
      },
    ],
    comments: [],
  },
];

export async function getPostsByClientId(clientId: string): Promise<PostData[]> {
  try {
    const posts = await prisma.post.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (posts.length === 0) {
      return localPostsStore.filter((p) => p.clientId === clientId);
    }

    return posts as unknown as PostData[];
  } catch (error) {
    console.warn('PostgreSQL indisponível. Usando posts do armazenamento temporário.', error);
    return localPostsStore.filter((p) => p.clientId === clientId);
  }
}

export async function getPostById(postId: string): Promise<PostData | null> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (post) return post as unknown as PostData;

    const local = localPostsStore.find((p) => p.id === postId);
    return local || null;
  } catch {
    const local = localPostsStore.find((p) => p.id === postId);
    return local || null;
  }
}

export interface PostWithClientData extends PostData {
  client?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
}

export async function getAllPosts(options?: {
  status?: string;
  clientId?: string;
}): Promise<PostWithClientData[]> {
  const where: any = {};
  if (options?.status && options.status !== 'ALL') {
    where.status = options.status;
  }
  if (options?.clientId && options.clientId !== 'ALL') {
    where.clientId = options.clientId;
  }

  try {
    const posts = await prisma.post.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    });

    return posts as unknown as PostWithClientData[];
  } catch (error) {
    console.warn('PostgreSQL indisponível. Usando posts do armazenamento temporário:', error);
    let list = [...localPostsStore] as PostWithClientData[];
    if (options?.status && options.status !== 'ALL') {
      list = list.filter((p) => p.status === options.status);
    }
    if (options?.clientId && options.clientId !== 'ALL') {
      list = list.filter((p) => p.clientId === options.clientId);
    }
    return list;
  }
}

export async function createPost(data: {
  clientId: string;
  cycleId?: string | null;
  title: string;
  caption?: string;
  format: 'VIDEO' | 'CAROUSEL' | 'STATIC' | 'REELS' | 'STORIES';
  scheduledDate?: Date;
  scheduledTime?: string | null;
  mediaUrls: { url: string; mediaType: string; order: number; thumbnailUrl?: string }[];
}): Promise<PostData> {
  try {
    const post = await prisma.post.create({
      data: {
        clientId: data.clientId,
        cycleId: data.cycleId || null,
        title: data.title,
        caption: data.caption || null,
        format: data.format,
        scheduledDate: data.scheduledDate || null,
        scheduledTime: data.scheduledTime?.trim() || null,
        status: 'PENDENTE',
        media: {
          create: data.mediaUrls.map((m) => ({
            url: m.url,
            mediaType: m.mediaType,
            order: m.order,
            thumbnailUrl: m.thumbnailUrl || null,
          })),
        },
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: true,
      },
    });
    return post as unknown as PostData;
  } catch (error) {
    console.warn('Salvando post em memória temporária:', error);
    const newPost: PostData = {
      id: 'post-' + Date.now(),
      clientId: data.clientId,
      title: data.title,
      caption: data.caption || null,
      format: data.format,
      status: 'PENDENTE',
      scheduledDate: data.scheduledDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      media: data.mediaUrls.map((m, idx) => ({
        id: 'media-' + Date.now() + '-' + idx,
        postId: 'post-' + Date.now(),
        url: m.url,
        mediaType: m.mediaType,
        order: m.order,
        thumbnailUrl: m.thumbnailUrl || null,
        duration: null,
        createdAt: new Date(),
      })),
      comments: [],
    };
    localPostsStore.unshift(newPost);
    return newPost;
  }
}

export async function updatePostStatus(
  postId: string,
  status: 'PENDENTE' | 'AJUSTES' | 'APROVADO'
): Promise<PostData | null> {
  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { status },
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Se o cliente solicitou ajustes, cria automaticamente um cartão de ALTA prioridade no Quadro de Demandas
    if (status === 'AJUSTES') {
      try {
        let targetCol = await prisma.demandColumn.findFirst({
          where: { slug: 'revisar' },
        });
        if (!targetCol) {
          targetCol = await prisma.demandColumn.findFirst({
            orderBy: { order: 'asc' },
          });
        }

        if (targetCol) {
          const demandTitle = `🚨 Ajustes: ${updated.title}`;
          const existingDemand = await prisma.demand.findFirst({
            where: {
              columnId: targetCol.id,
              title: demandTitle,
              completed: false,
            },
          });

          if (!existingDemand) {
            const count = await prisma.demand.count({
              where: { columnId: targetCol.id },
            });
            await prisma.demand.create({
              data: {
                title: demandTitle,
                description: `O cliente finalizou a revisão e solicitou alterações neste conteúdo. Verifique os comentários do cliente no post.`,
                columnId: targetCol.id,
                order: count,
                priority: 'ALTA',
                clientId: updated.clientId,
              },
            });
          }
        }
      } catch (demandErr) {
        console.warn('Erro ao criar demanda automática de ajuste:', demandErr);
      }
    }

    return updated as unknown as PostData;
  } catch {
    const post = localPostsStore.find((p) => p.id === postId);
    if (post) {
      post.status = status;
      post.updatedAt = new Date();
      return post;
    }
    return null;
  }
}

export async function updatePostCaption(postId: string, caption: string): Promise<PostData | null> {
  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { caption },
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    return updated as unknown as PostData;
  } catch {
    const post = localPostsStore.find((p) => p.id === postId);
    if (post) {
      post.caption = caption;
      post.updatedAt = new Date();
      return post;
    }
    return null;
  }
}

export async function updatePostThumbnail(postId: string, thumbnailUrl: string): Promise<PostData | null> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { media: true },
    });
    if (post && post.media.length > 0) {
      await prisma.postMedia.update({
        where: { id: post.media[0].id },
        data: { thumbnailUrl },
      });
    }
    return (await getPostById(postId)) as PostData;
  } catch {
    const post = localPostsStore.find((p) => p.id === postId);
    if (post && post.media.length > 0) {
      post.media[0].thumbnailUrl = thumbnailUrl;
      post.updatedAt = new Date();
      return post;
    }
    return null;
  }
}

export async function updatePost(
  postId: string,
  data: {
    title?: string;
    caption?: string | null;
    scheduledDate?: Date | string | null;
    scheduledTime?: string | null;
    status?: 'PENDENTE' | 'AJUSTES' | 'APROVADO';
    resolveComments?: boolean;
    format?: 'VIDEO' | 'CAROUSEL' | 'STATIC' | 'REELS' | 'STORIES';
    cycleId?: string | null;
    mediaUrl?: string;
    thumbnailUrl?: string | null;
    mediaUrls?: Array<{
      url: string;
      mediaType?: string;
      order?: number;
      thumbnailUrl?: string | null;
    }>;
  }
): Promise<PostData | null> {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.caption !== undefined) updateData.caption = data.caption ? data.caption.trim() : null;
  if (data.scheduledDate !== undefined) {
    updateData.scheduledDate = data.scheduledDate ? parseDateInput(data.scheduledDate) : null;
  }
  if (data.scheduledTime !== undefined) {
    updateData.scheduledTime = data.scheduledTime ? data.scheduledTime.trim() : null;
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.format !== undefined) updateData.format = data.format;
  if (data.cycleId !== undefined) updateData.cycleId = data.cycleId || null;

  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (data.mediaUrls && Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0) {
      await prisma.postMedia.deleteMany({
        where: { postId },
      });
      await prisma.postMedia.createMany({
        data: data.mediaUrls.map((m, idx) => ({
          postId,
          url: m.url,
          mediaType: m.mediaType || 'IMAGE',
          order: typeof m.order === 'number' ? m.order : idx,
          thumbnailUrl: m.thumbnailUrl || null,
        })),
      });
    } else if (data.mediaUrl || data.thumbnailUrl !== undefined) {
      if (updated.media.length > 0) {
        const mediaUpdate: any = {};
        if (data.mediaUrl) mediaUpdate.url = data.mediaUrl;
        if (data.thumbnailUrl !== undefined) mediaUpdate.thumbnailUrl = data.thumbnailUrl;
        await prisma.postMedia.update({
          where: { id: updated.media[0].id },
          data: mediaUpdate,
        });
      }
    }

    if (data.resolveComments) {
      await prisma.comment.updateMany({
        where: { postId },
        data: { resolved: true },
      });
    }

    const finalPost = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    return finalPost as unknown as PostData;
  } catch (err) {
    console.warn('Atualizando post em memória temporária:', err);
    const post = localPostsStore.find((p) => p.id === postId);
    if (post) {
      if (data.title !== undefined) post.title = data.title;
      if (data.caption !== undefined) post.caption = data.caption;
      if (data.scheduledDate !== undefined) {
        post.scheduledDate = data.scheduledDate ? parseDateInput(data.scheduledDate) : null;
      }
      if (data.format !== undefined) post.format = data.format;
      if (data.cycleId !== undefined) post.cycleId = data.cycleId;
      if (data.mediaUrl && post.media.length > 0) post.media[0].url = data.mediaUrl;
      if (data.thumbnailUrl !== undefined && post.media.length > 0) {
        post.media[0].thumbnailUrl = data.thumbnailUrl;
      }
      post.updatedAt = new Date();
      return post;
    }
    return null;
  }
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    await prisma.post.delete({
      where: { id: postId },
    });
    return true;
  } catch (err) {
    console.warn('Excluindo post em memória temporária:', err);
    localPostsStore = localPostsStore.filter((p) => p.id !== postId);
    return true;
  }
}

export async function addComment(
  postId: string,
  data: {
    author: string;
    authorRole: string;
    content: string;
    timestampSeconds?: number;
    slideIndex?: number;
  }
): Promise<CommentData> {
  try {
    const comment = await prisma.comment.create({
      data: {
        postId,
        author: data.author,
        authorRole: data.authorRole || 'CLIENT',
        content: data.content,
        timestampSeconds: data.timestampSeconds ?? null,
        slideIndex: data.slideIndex ?? null,
        resolved: false,
      },
    });
    return comment as unknown as CommentData;
  } catch {
    const newComment: CommentData = {
      id: 'comment-' + Date.now(),
      postId,
      author: data.author,
      authorRole: data.authorRole || 'CLIENT',
      content: data.content,
      timestampSeconds: data.timestampSeconds ?? null,
      slideIndex: data.slideIndex ?? null,
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const post = localPostsStore.find((p) => p.id === postId);
    if (post) {
      post.comments.push(newComment);
    }
    return newComment;
  }
}

export async function toggleCommentResolved(commentId: string): Promise<boolean> {
  try {
    const current = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!current) return false;
    await prisma.comment.update({
      where: { id: commentId },
      data: { resolved: !current.resolved },
    });
    return true;
  } catch {
    for (const post of localPostsStore) {
      const comment = post.comments.find((c) => c.id === commentId);
      if (comment) {
        comment.resolved = !comment.resolved;
        return true;
      }
    }
    return false;
  }
}
