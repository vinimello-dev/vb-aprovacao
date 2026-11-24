'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Video,
  FileText,
  Building2,
  FileCheck2,
  Plus,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Phone,
  Mail,
  Instagram,
  User,
  Hash,
  Trash2,
  Edit,
  Clock,
  Sparkles,
  CheckCircle2,
  FileEdit,
  Play,
  Share2,
  MessageCircle,
  X,
  RefreshCw,
  FolderPlus,
  Tag,
  AlertCircle,
  Eye,
  CalendarDays,
} from 'lucide-react';
import { formatDate, parseThumbnailUrl, parseMediaUrl, getScheduledDateInput } from '@/lib/utils';
import { PostReviewModal } from '@/components/post-review-modal';
import { AdminClientCalendar } from '@/components/admin-client-calendar';
import { ImageUploadInput } from '@/components/image-upload-input';
import { CarouselUploader, CarouselSlide } from '@/components/carousel-uploader';
import { PostData } from '@/lib/services/post-service';

interface CycleItem {
  id: string;
  name: string;
  month?: number | null;
  year?: number | null;
  targetDate?: string | null;
  active: boolean;
  createdAt: string;
  posts: PostData[];
}

interface ScriptItem {
  id: string;
  title: string;
  recordingDate?: string | null;
  hook?: string | null;
  content: string;
  status: 'A_GRAVAR' | 'GRAVADO' | 'EM_EDICAO' | 'FINALIZADO';
  scenesCount: number;
  createdAt: string;
}

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  notes?: string | null;
  createdAt: string;
}

interface ClientDetail {
  id: string;
  name: string;
  slug: string;
  pin: string;
  logoUrl?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  email?: string | null;
  responsible?: string | null;
  instagram?: string | null;
  notes?: string | null;
  createdAt: string;
  cycles: CycleItem[];
  scripts: ScriptItem[];
  documents: DocumentItem[];
  posts: PostData[]; // Posts sem ciclo
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientHubPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Abas do Hub do Cliente: 'cycles' (Entregas), 'calendar' (Calendário do Mês), 'scripts' (Roteiros), 'crm' (Dados), 'documents' (Documentos)
  const [activeTab, setActiveTab] = useState<'cycles' | 'calendar' | 'scripts' | 'crm' | 'documents'>('cycles');

  // Ciclo Selecionado na aba de Entregas
  const [selectedCycleId, setSelectedCycleId] = useState<string>('ALL');

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal Novo Ciclo / Entrega (Imagem 1)
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cycleMonth, setCycleMonth] = useState(new Date().getMonth() + 1);
  const [cycleYear, setCycleYear] = useState(new Date().getFullYear());
  const [cycleTargetDate, setCycleTargetDate] = useState('');
  const [submittingCycle, setSubmittingCycle] = useState(false);

  // Modal Novo Post
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postFormat, setPostFormat] = useState<'VIDEO' | 'CAROUSEL' | 'STATIC'>('VIDEO');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postThumbnailUrl, setPostThumbnailUrl] = useState('');
  const [postCarouselSlides, setPostCarouselSlides] = useState<CarouselSlide[]>([]);
  const [postCaption, setPostCaption] = useState('');
  const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
  const [postCycleId, setPostCycleId] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');

  // Modal Editar Post
  const [editPostModalOpen, setEditPostModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostFormat, setEditPostFormat] = useState<'VIDEO' | 'CAROUSEL' | 'STATIC'>('VIDEO');
  const [editPostMediaUrl, setEditPostMediaUrl] = useState('');
  const [editPostThumbnailUrl, setEditPostThumbnailUrl] = useState('');
  const [editPostCarouselSlides, setEditPostCarouselSlides] = useState<CarouselSlide[]>([]);
  const [editPostCaption, setEditPostCaption] = useState('');
  const [editPostDate, setEditPostDate] = useState('');
  const [editPostCycleId, setEditPostCycleId] = useState('');
  const [savingEditPost, setSavingEditPost] = useState(false);
  const [editPostError, setEditPostError] = useState('');

  // Modal Novo Roteiro de Gravação
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptEditingId, setScriptEditingId] = useState<string | null>(null);
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptDate, setScriptDate] = useState('');
  const [scriptHook, setScriptHook] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptStatus, setScriptStatus] = useState<'A_GRAVAR' | 'GRAVADO' | 'EM_EDICAO' | 'FINALIZADO'>('A_GRAVAR');
  const [scriptScenes, setScriptScenes] = useState(1);
  const [submittingScript, setSubmittingScript] = useState(false);

  // Modal Novo Documento / Contrato
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('CONTRATO');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Formulário Dados do Cliente (CRM)
  const [crmPhone, setCrmPhone] = useState('');
  const [crmCnpj, setCrmCnpj] = useState('');
  const [crmEmail, setCrmEmail] = useState('');
  const [crmResponsible, setCrmResponsible] = useState('');
  const [crmInstagram, setCrmInstagram] = useState('');
  const [crmPin, setCrmPin] = useState('');
  const [crmNotes, setCrmNotes] = useState('');
  const [crmSubmitting, setCrmSubmitting] = useState(false);
  const [crmSuccess, setCrmSuccess] = useState('');

  // Modal Review de Post
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/clients/${id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) throw new Error('Cliente não encontrado');
      const data = await res.json();
      if (data.client) {
        setClient(data.client);
        setCrmPhone(data.client.phone || '');
        setCrmCnpj(data.client.cnpj || '');
        setCrmEmail(data.client.email || '');
        setCrmResponsible(data.client.responsible || '');
        setCrmInstagram(data.client.instagram || '');
        setCrmPin(data.client.pin || '');
        setCrmNotes(data.client.notes || '');
      }
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar os dados deste cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 1. Criar Ciclo / Entrega (Imagem 1)
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName.trim()) return;
    setSubmittingCycle(true);

    try {
      const res = await fetch(`/api/admin/clients/${id}/cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cycleName.trim(),
          month: cycleMonth,
          year: cycleYear,
          targetDate: cycleTargetDate || null,
        }),
      });

      if (res.ok) {
        setCycleName('');
        setCycleTargetDate('');
        setCycleModalOpen(false);
        await fetchClientData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCycle(false);
    }
  };

  // Excluir Ciclo
  const handleDeleteCycle = async (cycleId: string, name: string) => {
    if (!confirm(`Deseja excluir o ciclo "${name}"? Os posts continuarão salvos no cliente.`)) return;
    try {
      await fetch(`/api/admin/clients/${id}/cycles?cycleId=${cycleId}`, {
        method: 'DELETE',
      });
      await fetchClientData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Criar Novo Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');

    if (postFormat === 'CAROUSEL') {
      if (postCarouselSlides.length === 0) {
        setPostError('Adicione pelo menos 1 foto ao carrossel.');
        return;
      }
    } else {
      if (!postMediaUrl.trim()) {
        setPostError(postFormat === 'STATIC' ? 'Selecione ou informe a foto do post.' : 'Informe o link do vídeo.');
        return;
      }
    }

    setSubmittingPost(true);

    try {
      const mediaUrlsPayload =
        postFormat === 'CAROUSEL'
          ? postCarouselSlides.map((s, idx) => ({
              url: s.url,
              mediaType: 'IMAGE',
              order: idx,
            }))
          : [
              {
                url: postMediaUrl.trim(),
                mediaType: postFormat === 'STATIC' ? 'IMAGE' : 'VIDEO',
                order: 0,
                thumbnailUrl: postFormat === 'VIDEO' ? postThumbnailUrl.trim() || undefined : undefined,
              },
            ];

      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: id,
          cycleId: postCycleId || null,
          title: postTitle,
          format: postFormat,
          scheduledDate: postDate,
          caption: postCaption,
          thumbnailUrl: postThumbnailUrl.trim() || undefined,
          mediaUrls: mediaUrlsPayload,
        }),
      });

      if (res.ok) {
        setPostModalOpen(false);
        setPostTitle('');
        setPostMediaUrl('');
        setPostThumbnailUrl('');
        setPostCarouselSlides([]);
        setPostCaption('');
        await fetchClientData();
      } else {
        const d = await res.json();
        setPostError(d.error || 'Erro ao criar post.');
      }
    } catch {
      setPostError('Erro de conexão ao criar post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Abrir Modal de Edição de Post
  const handleOpenEditPost = (post: PostData) => {
    setEditingPostId(post.id);
    setEditPostTitle(post.title);
    setEditPostFormat(
      post.format === 'CAROUSEL' ? 'CAROUSEL' : post.format === 'STATIC' ? 'STATIC' : 'VIDEO'
    );
    setEditPostMediaUrl(post.media && post.media.length > 0 ? post.media[0].url : '');
    setEditPostThumbnailUrl(post.media && post.media.length > 0 ? (post.media[0].thumbnailUrl || '') : '');
    if (post.format === 'CAROUSEL' && post.media) {
      setEditPostCarouselSlides(
        post.media.map((m, idx) => ({
          id: m.id || `slide-${idx}`,
          url: m.url,
          order: typeof m.order === 'number' ? m.order : idx,
        }))
      );
    } else {
      setEditPostCarouselSlides([]);
    }
    setEditPostCaption(post.caption || '');
    setEditPostDate(getScheduledDateInput(post.scheduledDate));
    setEditPostCycleId(post.cycleId || '');
    setEditPostError('');
    setEditPostModalOpen(true);
  };

  // Salvar Edição do Post
  const handleSaveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId || !editPostTitle.trim()) return;

    if (editPostFormat === 'CAROUSEL' && editPostCarouselSlides.length === 0) {
      setEditPostError('O carrossel deve conter pelo menos 1 imagem.');
      return;
    }

    setSavingEditPost(true);
    setEditPostError('');

    try {
      const editMediaUrlsPayload =
        editPostFormat === 'CAROUSEL'
          ? editPostCarouselSlides.map((s, idx) => ({
              url: s.url,
              mediaType: 'IMAGE',
              order: idx,
            }))
          : undefined;

      const res = await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPostId,
          title: editPostTitle.trim(),
          caption: editPostCaption,
          format: editPostFormat,
          scheduledDate: editPostDate || null,
          cycleId: editPostCycleId || null,
          mediaUrl: editPostMediaUrl.trim() || undefined,
          thumbnailUrl: editPostThumbnailUrl.trim() || undefined,
          mediaUrls: editMediaUrlsPayload,
        }),
      });

      if (res.ok) {
        setEditPostModalOpen(false);
        setEditingPostId(null);
        await fetchClientData();
      } else {
        const d = await res.json();
        setEditPostError(d.error || 'Erro ao salvar alterações do post.');
      }
    } catch {
      setEditPostError('Erro de conexão ao salvar post.');
    } finally {
      setSavingEditPost(false);
    }
  };

  // Excluir Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja realmente excluir este post?')) return;
    try {
      await fetch(`/api/admin/posts?id=${postId}`, {
        method: 'DELETE',
      });
      await fetchClientData();
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Salvar Roteiro de Gravação
  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptTitle.trim() || !scriptContent.trim()) return;
    setSubmittingScript(true);

    try {
      const endpoint = `/api/admin/clients/${id}/scripts`;
      const method = scriptEditingId ? 'PATCH' : 'POST';
      const body = scriptEditingId
        ? {
            scriptId: scriptEditingId,
            title: scriptTitle.trim(),
            recordingDate: scriptDate || null,
            hook: scriptHook.trim() || null,
            content: scriptContent.trim(),
            status: scriptStatus,
            scenesCount: scriptScenes,
          }
        : {
            title: scriptTitle.trim(),
            recordingDate: scriptDate || null,
            hook: scriptHook.trim() || null,
            content: scriptContent.trim(),
            status: scriptStatus,
            scenesCount: scriptScenes,
          };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setScriptModalOpen(false);
        setScriptEditingId(null);
        setScriptTitle('');
        setScriptDate('');
        setScriptHook('');
        setScriptContent('');
        setScriptScenes(1);
        await fetchClientData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingScript(false);
    }
  };

  const handleOpenEditScript = (script: ScriptItem) => {
    setScriptEditingId(script.id);
    setScriptTitle(script.title);
    setScriptDate(getScheduledDateInput(script.recordingDate));
    setScriptHook(script.hook || '');
    setScriptContent(script.content);
    setScriptStatus(script.status);
    setScriptScenes(script.scenesCount || 1);
    setScriptModalOpen(true);
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (!confirm('Deseja realmente excluir este roteiro de gravação?')) return;
    try {
      await fetch(`/api/admin/clients/${id}/scripts?scriptId=${scriptId}`, {
        method: 'DELETE',
      });
      await fetchClientData();
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Salvar Documento / Contrato
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docUrl.trim()) return;
    setSubmittingDoc(true);

    try {
      const res = await fetch(`/api/admin/clients/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim(),
          type: docType,
          fileUrl: docUrl.trim(),
          notes: docNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setDocModalOpen(false);
        setDocTitle('');
        setDocUrl('');
        setDocNotes('');
        await fetchClientData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Deseja excluir este documento?')) return;
    try {
      await fetch(`/api/admin/clients/${id}/documents?documentId=${docId}`, {
        method: 'DELETE',
      });
      await fetchClientData();
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Salvar Dados do Cliente (CRM)
  const handleSaveCrm = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrmSubmitting(true);
    setCrmSuccess('');

    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: crmPhone,
          cnpj: crmCnpj,
          email: crmEmail,
          responsible: crmResponsible,
          instagram: crmInstagram,
          pin: crmPin,
          notes: crmNotes,
        }),
      });

      if (res.ok) {
        setCrmSuccess('Dados atualizados com sucesso!');
        await fetchClientData();
        setTimeout(() => setCrmSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCrmSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aprovado
          </span>
        );
      case 'AJUSTES':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
            <FileEdit className="w-3 h-3 text-rose-600" />
            Em Ajustes
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        );
    }
  };

  const getScriptStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZADO':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">Finalizado</span>;
      case 'EM_EDICAO':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-purple-100 text-purple-800">Em Edição</span>;
      case 'GRAVADO':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-blue-100 text-blue-800">Gravado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-100 text-amber-800">A Gravar</span>;
    }
  };

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEEDEA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#FD3100' }} />
          <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#FD3100' }}>
            Carregando painel do cliente...
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#EEEDEA] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border text-center max-w-md">
          <h2 className="text-xl font-black mb-2">Cliente não encontrado</h2>
          <Link href="/admin" className="btn-vb-primary inline-flex px-5 py-2.5 rounded-xl text-xs uppercase font-black">
            Voltar ao Painel
          </Link>
        </div>
      </div>
    );
  }

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/c/${client.slug}`
    : `/c/${client.slug}`;

  // Posts filtrados por ciclo
  const allPostsCount = client.cycles.reduce((acc, c) => acc + c.posts.length, client.posts.length);

  return (
    <div className="min-h-screen bg-[#EEEDEA] text-[#111111] flex flex-col font-sans">
      <div className="h-1.5 bg-[#FD3100] w-full" />

      {/* Header Superior com Navegação de Retorno */}
      <header className="border-b border-[#DCD6CC] bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Link
              href="/admin"
              className="p-2 sm:p-2.5 hover:bg-[#FAF9F7] text-[#111111] hover:text-[#FD3100] rounded-xl sm:rounded-2xl border border-[#DCD6CC] transition-colors flex items-center gap-1.5 text-xs font-black uppercase shrink-0"
              title="Voltar ao Painel Geral"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>

            <div className="h-10 sm:h-12 hidden md:flex items-center justify-center shrink-0">
              <img src="/logo-vb.png?v=4" alt="Logo VB" className="h-10 sm:h-12 w-auto object-contain" />
            </div>

            <div className="h-6 w-px bg-[#DCD6CC] hidden md:block shrink-0" />

            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-[#DCD6CC] bg-white flex items-center justify-center shadow-sm shrink-0">
                {client.logoUrl ? (
                  <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xs sm:text-sm text-[#FD3100]">
                    {client.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-xs sm:text-lg text-[#111111] leading-tight uppercase truncate max-w-[130px] sm:max-w-xs md:max-w-none">
                  {client.name}
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold text-[#66635D] truncate">
                  /c/{client.slug} • PIN: <strong className="font-mono text-[#FD3100]">{client.pin}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={`/c/${client.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-vb-secondary flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all shadow-sm"
              title="Abrir Portal do Cliente"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#FD3100]" />
              <span className="hidden sm:inline">Ver Portal</span>
            </a>

            <button
              onClick={() => {
                setPostCycleId(selectedCycleId !== 'ALL' ? selectedCycleId : '');
                setPostModalOpen(true);
              }}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span className="truncate">Novo Post</span>
            </button>
          </div>
        </div>
      </header>

      {/* Banner & Abas do Hub do Cliente (Estilo Imagem 2) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 w-full">
        {/* Cartão de Resumo do Cliente */}
        <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-4 sm:p-8 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden border-2 border-[#DCD6CC] bg-white flex items-center justify-center shadow-md shrink-0">
              {client.logoUrl ? (
                <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="w-full h-full flex items-center justify-center font-black text-2xl"
                >
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#111111] uppercase tracking-tight">
                  {client.name}
                </h2>
                <span
                  style={{ backgroundColor: '#FFF0EC', color: '#FD3100', borderColor: '#FFCEBF' }}
                  className="px-3 py-0.5 text-[10px] font-black rounded-full border uppercase"
                >
                  Cliente Ativo
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#66635D] mt-1.5">
                {client.responsible && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#FD3100]" />
                    {client.responsible}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#FD3100]" />
                    {client.phone}
                  </span>
                )}
                {client.instagram && (
                  <span className="flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-[#FD3100]" />
                    @{client.instagram.replace('@', '')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos de Acesso e Link */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => copyToClipboard(portalUrl, 'portal-url')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-[#DCD6CC] bg-[#FAF9F7] hover:bg-[#EEEDEA] text-xs font-black uppercase text-[#111111] transition-all"
            >
              {copiedKey === 'portal-url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#FD3100]" />}
              <span>{copiedKey === 'portal-url' ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              onClick={() => copyToClipboard(client.pin, 'pin')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-[#DCD6CC] bg-[#FAF9F7] hover:bg-[#EEEDEA] text-xs font-black uppercase text-[#111111] transition-all"
            >
              {copiedKey === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <KeyRound className="w-3.5 h-3.5 text-[#FD3100]" />}
              <span>PIN: {client.pin}</span>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS (Estilo Imagem 2: Entregas, Roteiros, Dados, Documentos) */}
        <div className="flex items-center gap-2 border-b-2 border-[#DCD6CC] pb-0 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-[2px] whitespace-nowrap shrink-0 ${
              activeTab === 'cycles'
                ? 'border-[#FD3100] text-[#FD3100] bg-white rounded-t-2xl'
                : 'border-transparent text-[#66635D] hover:text-[#111111]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Entregas & Ciclos ({client.cycles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-[2px] whitespace-nowrap shrink-0 ${
              activeTab === 'calendar'
                ? 'border-[#FD3100] text-[#FD3100] bg-white rounded-t-2xl'
                : 'border-transparent text-[#66635D] hover:text-[#111111]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendário do Mês</span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-[2px] ${
              activeTab === 'scripts'
                ? 'border-[#FD3100] text-[#FD3100] bg-white rounded-t-2xl'
                : 'border-transparent text-[#66635D] hover:text-[#111111]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Roteiros de Gravação ({client.scripts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-[2px] ${
              activeTab === 'crm'
                ? 'border-[#FD3100] text-[#FD3100] bg-white rounded-t-2xl'
                : 'border-transparent text-[#66635D] hover:text-[#111111]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Dados do Cliente</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-[2px] ${
              activeTab === 'documents'
                ? 'border-[#FD3100] text-[#FD3100] bg-white rounded-t-2xl'
                : 'border-transparent text-[#66635D] hover:text-[#111111]'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Documentos & Contratos ({client.documents.length})</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex-1 w-full">
        {/* ABA 1: ENTREGAS & CICLOS POR MÊS (Estilo Imagens 1 e 2) */}
        {activeTab === 'cycles' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm">
              <div>
                <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                  Planejamento por <span style={{ color: '#FD3100' }}>Ciclos de Entrega</span>
                </h3>
                <p className="text-xs text-[#66635D] font-medium">
                  Agrupe as publicações por mês de captação ou entrega para aprovação do cliente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setCycleModalOpen(true)}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>+ Nova Entrega / Ciclo</span>
                </button>
              </div>
            </div>

            {/* Lista de Ciclos Cadastrados */}
            {client.cycles.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#FFCEBF] rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#FFF0EC] rounded-2xl flex items-center justify-center mb-3 text-[#FD3100] border border-[#FFCEBF]">
                  <Calendar className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black uppercase text-[#111111] mb-1">
                  Nenhum ciclo de entrega criado
                </h4>
                <p className="text-xs text-[#66635D] max-w-md mb-6 font-medium">
                  Crie entregas mensais (ex: Ciclo 11 - Novembro, Ciclo 12 - Dezembro) para organizar os posts por lote de aprovação.
                </p>
                <button
                  onClick={() => setCycleModalOpen(true)}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-3 rounded-2xl text-xs uppercase font-black tracking-wider"
                >
                  Criar Primeiro Ciclo
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {client.cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-6 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#EEEDEA] mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100] font-black text-sm">
                          📅
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                              {cycle.name}
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FAF9F7] border border-[#DCD6CC] text-[#66635D]">
                              {cycle.posts.length} {cycle.posts.length === 1 ? 'post' : 'posts'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] font-bold text-[#66635D]">
                            {cycle.targetDate && (
                              <span className="flex items-center gap-1 text-[#FD3100] bg-[#FFF0EC] px-2 py-0.5 rounded-md border border-[#FFCEBF]">
                                <Calendar className="w-3 h-3" />
                                <span>Data: {formatDate(cycle.targetDate)}</span>
                              </span>
                            )}
                            {cycle.month && cycle.year && (
                              <span>• {MONTHS[cycle.month - 1]} de {cycle.year}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPostCycleId(cycle.id);
                            setPostModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-[#FAF9F7] hover:bg-[#EEEDEA] text-[#111111] hover:text-[#FD3100] rounded-xl text-xs font-black uppercase border border-[#DCD6CC] transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Post</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCycle(cycle.id, cycle.name)}
                          className="p-2 text-[#66635D] hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                          title="Excluir este ciclo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Posts dentro deste Ciclo */}
                    {cycle.posts.length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-[#66635D] bg-[#FAF9F7] rounded-2xl border border-dashed border-[#DCD6CC]">
                        Nenhum post adicionado a este ciclo ainda.{' '}
                        <button
                          onClick={() => {
                            setPostCycleId(cycle.id);
                            setPostModalOpen(true);
                          }}
                          className="text-[#FD3100] underline ml-1"
                        >
                          Adicionar primeiro post
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cycle.posts.map((post) => (
                          <div
                            key={post.id}
                            className="bg-[#FAF9F7] border border-[#DCD6CC] rounded-2xl p-4 flex flex-col justify-between hover:border-[#FD3100] transition-colors"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white border border-[#DCD6CC] text-[#111111]">
                                  {post.format}
                                </span>
                                {getStatusBadge(post.status)}
                              </div>

                              <h5 className="font-black text-sm text-[#111111] line-clamp-2 mb-1">
                                {post.title}
                              </h5>

                              {post.caption && (
                                <p className="text-[11px] text-[#66635D] line-clamp-2 font-medium">
                                  {post.caption}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#DCD6CC]/60 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[#66635D] flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#FD3100]" />
                                {post.scheduledDate ? formatDate(post.scheduledDate) : 'Sem data'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPost(post)}
                                  className="p-1.5 bg-white hover:bg-[#EEEDEA] text-[#66635D] hover:text-[#FD3100] rounded-xl border border-[#DCD6CC] transition-all"
                                  title="Editar legenda, data e informações deste post"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 bg-white hover:bg-rose-50 text-[#66635D] hover:text-rose-600 rounded-xl border border-[#DCD6CC] transition-all"
                                  title="Excluir post"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPost(post)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-[#FD3100] hover:text-white text-[#111111] rounded-xl text-xs font-black uppercase border border-[#DCD6CC] transition-all flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Ver</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Posts Gerais (sem ciclo atribuído) */}
            {client.posts.length > 0 && (
              <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-6 shadow-sm">
                <h4 className="font-black text-base text-[#111111] uppercase tracking-tight mb-4 flex items-center gap-2">
                  <span>Outras Publicações (Gerais)</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#FAF9F7] border border-[#DCD6CC] text-[#66635D]">
                    {client.posts.length}
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {client.posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#FAF9F7] border border-[#DCD6CC] rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white border border-[#DCD6CC] text-[#111111]">
                            {post.format}
                          </span>
                          {getStatusBadge(post.status)}
                        </div>
                        <h5 className="font-black text-sm text-[#111111] line-clamp-2 mb-1">
                          {post.title}
                        </h5>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#DCD6CC]/60 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#66635D] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#FD3100]" />
                          {post.scheduledDate ? formatDate(post.scheduledDate) : 'Sem data'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPost(post)}
                            className="p-1.5 bg-white hover:bg-[#EEEDEA] text-[#66635D] hover:text-[#FD3100] rounded-xl border border-[#DCD6CC] transition-all"
                            title="Editar legenda, data e informações deste post"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 bg-white hover:bg-rose-50 text-[#66635D] hover:text-rose-600 rounded-xl border border-[#DCD6CC] transition-all"
                            title="Excluir post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPost(post)}
                            className="px-2.5 py-1.5 bg-white hover:bg-[#FD3100] hover:text-white text-[#111111] rounded-xl text-xs font-black uppercase border border-[#DCD6CC] transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA CALENDÁRIO DO MÊS (VISÃO MENSAL COM ARRASTAR E MOVER POSTS) */}
        {activeTab === 'calendar' && (
          <AdminClientCalendar
            cycles={client.cycles}
            orphanPosts={client.posts}
            onSelectPost={(post) => setSelectedPost(post)}
            onPostDateChanged={(postId, newDateObj) => {
              setClient((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  cycles: prev.cycles.map((c) => ({
                    ...c,
                    posts: c.posts.map((p) =>
                      p.id === postId ? { ...p, scheduledDate: newDateObj } : p
                    ),
                  })),
                  posts: prev.posts.map((p) =>
                    p.id === postId ? { ...p, scheduledDate: newDateObj } : p
                  ),
                };
              });
            }}
            onOpenAddPost={(cycleId) => {
              if (cycleId) setPostCycleId(cycleId);
              setPostModalOpen(true);
            }}
          />
        )}

        {/* ABA 2: ROTEIROS DE GRAVAÇÃO (CAPTAÇÕES) */}
        {activeTab === 'scripts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm">
              <div>
                <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                  Roteiros de <span style={{ color: '#FD3100' }}>Gravação & Captações</span>
                </h3>
                <p className="text-xs text-[#66635D] font-medium">
                  Planeje os ganchos, cenas e falas para o dia de filmagem com o cliente.
                </p>
              </div>

              <button
                onClick={() => {
                  setScriptEditingId(null);
                  setScriptTitle('');
                  setScriptDate('');
                  setScriptHook('');
                  setScriptContent('');
                  setScriptStatus('A_GRAVAR');
                  setScriptScenes(1);
                  setScriptModalOpen(true);
                }}
                style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                className="btn-vb-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Novo Roteiro</span>
              </button>
            </div>

            {client.scripts.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#FFCEBF] rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#FFF0EC] rounded-2xl flex items-center justify-center mb-3 text-[#FD3100] border border-[#FFCEBF]">
                  <Video className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black uppercase text-[#111111] mb-1">
                  Nenhum roteiro de gravação cadastrado
                </h4>
                <p className="text-xs text-[#66635D] max-w-md mb-6 font-medium">
                  Crie roteiros estruturados com gancho inicial, tópicos e falas para as captações deste cliente.
                </p>
                <button
                  onClick={() => setScriptModalOpen(true)}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-3 rounded-2xl text-xs uppercase font-black tracking-wider"
                >
                  Cadastrar Primeiro Roteiro
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {client.scripts.map((script) => (
                  <div
                    key={script.id}
                    className="bg-white border-2 border-[#DCD6CC] hover:border-[#FD3100] rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getScriptStatusBadge(script.status)}
                            <span className="text-[10px] font-bold text-[#66635D]">
                              {script.scenesCount} {script.scenesCount === 1 ? 'cena' : 'cenas'}
                            </span>
                          </div>
                          <h4 className="font-black text-lg text-[#111111] leading-tight">
                            {script.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditScript(script)}
                            className="p-1.5 hover:bg-[#FAF9F7] text-[#66635D] hover:text-[#FD3100] rounded-xl"
                            title="Editar roteiro"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteScript(script.id)}
                            className="p-1.5 hover:bg-rose-50 text-[#66635D] hover:text-rose-600 rounded-xl"
                            title="Excluir roteiro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Gancho (Hook) */}
                      {script.hook && (
                        <div className="bg-[#FFF0EC] border border-[#FFCEBF] rounded-2xl p-3 mb-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#FD3100] mb-0.5">
                            🎯 Gancho Inicial (Primeiros 3 segundos)
                          </p>
                          <p className="text-xs font-bold text-[#111111] italic">
                            "{script.hook}"
                          </p>
                        </div>
                      )}

                      {/* Conteúdo / Falas */}
                      <div className="bg-[#FAF9F7] border border-[#DCD6CC] rounded-2xl p-3.5 text-xs text-[#111111] font-medium whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                        {script.content}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EEEDEA] flex items-center justify-between text-[11px] font-bold text-[#66635D]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#FD3100]" />
                        {script.recordingDate
                          ? `Data de Gravação: ${formatDate(script.recordingDate)}`
                          : 'Data a definir'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: DADOS DO CLIENTE (CRM) */}
        {activeTab === 'crm' && (
          <div className="bg-white border-2 border-[#DCD6CC] rounded-3xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto">
            <div className="flex items-center gap-3 pb-6 border-b border-[#EEEDEA] mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-xl text-[#111111] uppercase tracking-tight">
                  Dados Cadastrais da Empresa
                </h3>
                <p className="text-xs text-[#66635D] font-medium">
                  Informações de contato, responsáveis e notas importantes para a agência.
                </p>
              </div>
            </div>

            {crmSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{crmSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveCrm} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nome do Responsável */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#FD3100]" />
                    <span>Nome do Responsável / Decisor</span>
                  </label>
                  <input
                    type="text"
                    value={crmResponsible}
                    onChange={(e) => setCrmResponsible(e.target.value)}
                    placeholder="Ex: Dra. Juliana Ferreira"
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm font-bold text-[#111111] focus:outline-none"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#FD3100]" />
                    <span>Telefone / WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    value={crmPhone}
                    onChange={(e) => setCrmPhone(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm font-bold text-[#111111] focus:outline-none"
                  />
                </div>

                {/* CNPJ ou CPF */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#FD3100]" />
                    <span>CNPJ / CPF</span>
                  </label>
                  <input
                    type="text"
                    value={crmCnpj}
                    onChange={(e) => setCrmCnpj(e.target.value)}
                    placeholder="Ex: 00.000.000/0001-00"
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm font-bold text-[#111111] focus:outline-none"
                  />
                </div>

                {/* E-mail Comercial */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#FD3100]" />
                    <span>E-mail de Contato</span>
                  </label>
                  <input
                    type="email"
                    value={crmEmail}
                    onChange={(e) => setCrmEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm font-bold text-[#111111] focus:outline-none"
                  />
                </div>

                {/* Perfil Instagram */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-[#FD3100]" />
                    <span>Instagram (@ da marca)</span>
                  </label>
                  <input
                    type="text"
                    value={crmInstagram}
                    onChange={(e) => setCrmInstagram(e.target.value)}
                    placeholder="Ex: @stabilitafitness"
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm font-bold text-[#111111] focus:outline-none"
                  />
                </div>

                {/* PIN do Portal */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#FD3100]" />
                    <span>PIN de Acesso ao Portal (4 dígitos)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={crmPin}
                    onChange={(e) => setCrmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl font-mono text-center tracking-widest text-lg font-black text-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              {/* Observações Internas */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Observações & Preferências da Conta
                </label>
                <textarea
                  value={crmNotes}
                  onChange={(e) => setCrmNotes(e.target.value)}
                  placeholder="Ex: Preferência por vídeos curtos com iluminação quente, dias preferidos de postagem: Terças e Quintas..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs font-medium text-[#111111] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-[#EEEDEA] flex items-center justify-end">
                <button
                  type="submit"
                  disabled={crmSubmitting}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {crmSubmitting ? 'Salvando...' : 'Salvar Dados do Cliente'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ABA 4: DOCUMENTOS & CONTRATOS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm">
              <div>
                <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                  Documentos, Contratos & Briefings
                </h3>
                <p className="text-xs text-[#66635D] font-medium">
                  Centralize links de contratos assinados, manuais de marca e briefings do Google Drive.
                </p>
              </div>

              <button
                onClick={() => setDocModalOpen(true)}
                style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                className="btn-vb-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Novo Documento</span>
              </button>
            </div>

            {client.documents.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#FFCEBF] rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#FFF0EC] rounded-2xl flex items-center justify-center mb-3 text-[#FD3100] border border-[#FFCEBF]">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black uppercase text-[#111111] mb-1">
                  Nenhum documento cadastrado
                </h4>
                <p className="text-xs text-[#66635D] max-w-md mb-6 font-medium">
                  Adicione contratos de prestação de serviços, formulários de briefing e links de pastas de arquivos.
                </p>
                <button
                  onClick={() => setDocModalOpen(true)}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-3 rounded-2xl text-xs uppercase font-black tracking-wider"
                >
                  Adicionar Primeiro Documento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {client.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border-2 border-[#DCD6CC] hover:border-[#FD3100] rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFF0EC] text-[#FD3100] border border-[#FFCEBF]">
                          {doc.type}
                        </span>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-[#66635D] hover:text-rose-600 rounded-lg transition-colors"
                          title="Excluir documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-black text-base text-[#111111] mb-1.5">
                        {doc.title}
                      </h4>

                      {doc.notes && (
                        <p className="text-[11px] text-[#66635D] font-medium line-clamp-2 mb-3">
                          {doc.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EEEDEA] flex items-center justify-between">
                      <span className="text-[10px] text-[#66635D] font-bold">
                        {formatDate(doc.createdAt)}
                      </span>

                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#FD3100] transition-colors"
                      >
                        <span>Abrir Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Nova Entrega / Ciclo (Imagem 1) */}
      {cycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-md p-5 sm:p-8 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    Nova Entrega
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Defina o nome da entrega e o ciclo mensal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCycleModalOpen(false)}
                className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="mt-4 sm:mt-5 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Nome da Entrega *
                </label>
                <input
                  type="text"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  placeholder="Ex: Entrega Teste, Lote 01 - Verão..."
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Ciclo (Mês / Ano)
                </label>
                <select
                  value={cycleMonth}
                  onChange={(e) => setCycleMonth(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs font-bold text-[#111111] focus:outline-none"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      Ciclo {String(idx + 1).padStart(2, '0')} • {m} {cycleYear}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5 flex items-center justify-between">
                  <span>Data da Entrega / Post (Opcional)</span>
                  <span className="text-[10px] text-[#66635D] font-normal normal-case">Dia específico</span>
                </label>
                <input
                  type="date"
                  value={cycleTargetDate}
                  onChange={(e) => setCycleTargetDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#EEEDEA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCycleModalOpen(false)}
                  className="btn-vb-secondary px-5 py-2.5 rounded-2xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCycle}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-2.5 rounded-2xl text-xs uppercase font-black disabled:opacity-50"
                >
                  {submittingCycle ? 'Criando...' : 'Criar Entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Novo Post */}
      {postModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    Novo Post para {client.name}
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Suporta link do Google Drive ou link direto
                  </p>
                </div>
              </div>
              <button onClick={() => setPostModalOpen(false)} className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {postError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {postError}
              </div>
            )}

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4 overflow-y-auto pr-1">
              {/* Ciclo de Entrega e Data do Post lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FD3100]" />
                      <span>Ciclo de Entrega</span>
                    </span>
                    <span className="text-[10px] text-[#66635D] font-normal normal-case">Lote mensal</span>
                  </label>
                  <select
                    value={postCycleId}
                    onChange={(e) => setPostCycleId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  >
                    <option value="">📌 Sem ciclo específico (Geral)</option>
                    {client.cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        🗓️ {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FD3100]" />
                      <span>Data do Post *</span>
                    </span>
                    <span className="text-[10px] text-[#66635D] font-normal normal-case">Dia agendado</span>
                  </label>
                  <input
                    type="date"
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Título do Post *
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Ex: Vídeo de Depoimento Aluna..."
                  required
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Formato do Post
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {(['VIDEO', 'CAROUSEL', 'STATIC'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setPostFormat(fmt)}
                      style={postFormat === fmt ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                      className={`py-2 rounded-xl border text-center uppercase tracking-wider font-black ${
                        postFormat === fmt ? 'border-[#FD3100]' : 'border-[#DCD6CC] bg-[#FAF9F7] text-[#111111]'
                      }`}
                    >
                      {fmt === 'VIDEO' ? 'Vídeo / Reels' : fmt === 'CAROUSEL' ? 'Carrossel' : 'Estático'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mídia do Post (Carrossel com Reordenação, Foto com Upload Direto ou Vídeo do Google Drive) */}
              {postFormat === 'CAROUSEL' ? (
                <CarouselUploader
                  slides={postCarouselSlides}
                  onChange={setPostCarouselSlides}
                />
              ) : postFormat === 'STATIC' ? (
                <ImageUploadInput
                  value={postMediaUrl}
                  onChange={setPostMediaUrl}
                  label="Imagem do Post"
                  sublabel="Envie do computador ou cole link do Drive"
                  placeholder="Link do Google Drive ou link direto da imagem"
                />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                      Link do Vídeo (Google Drive ou Direto) *
                    </label>
                    <span className="text-[10px] font-bold text-[#FD3100] bg-[#FFF0EC] px-2 py-0.5 rounded-md border border-[#FFCEBF]">
                      Google Drive ⚡
                    </span>
                  </div>
                  <input
                    type="url"
                    value={postMediaUrl}
                    onChange={(e) => setPostMediaUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    required
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-mono font-medium text-[#111111] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#66635D] font-medium mt-1">
                    Cole o link de compartilhamento do Google Drive com acesso público.
                  </p>
                </div>
              )}

              {/* Capa do Vídeo (Upload Direto do Computador ou Link) */}
              {postFormat === 'VIDEO' && (
                <ImageUploadInput
                  value={postThumbnailUrl}
                  onChange={setPostThumbnailUrl}
                  label="Capa do Vídeo (Thumbnail / Feed 1:1)"
                  optional
                  sublabel="Opcional • Envie imagem ou deixe em branco"
                  placeholder="Link do Google Drive ou link direto da imagem"
                />
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Legenda do Post (Caption)
                </label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Escreva a legenda com hashtags..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-medium text-[#111111] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#EEEDEA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPostModalOpen(false)}
                  className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-2 rounded-xl text-xs font-black uppercase disabled:opacity-50"
                >
                  {submittingPost ? 'Salvando...' : 'Criar Publicação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Post */}
      {editPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    Editar Publicação
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Altere legenda, data, título, mídia ou ciclo deste post
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditPostModalOpen(false)}
                className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editPostError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {editPostError}
              </div>
            )}

            <form onSubmit={handleSaveEditPost} className="mt-4 space-y-4 overflow-y-auto pr-1">
              {/* Ciclo de Entrega e Data do Post lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FD3100]" />
                      <span>Ciclo de Entrega</span>
                    </span>
                    <span className="text-[10px] text-[#66635D] font-normal normal-case">Lote</span>
                  </label>
                  <select
                    value={editPostCycleId}
                    onChange={(e) => setEditPostCycleId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  >
                    <option value="">📌 Sem ciclo específico (Geral)</option>
                    {client.cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        🗓️ {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FD3100]" />
                      <span>Data do Post *</span>
                    </span>
                    <span className="text-[10px] text-[#66635D] font-normal normal-case">Agendamento</span>
                  </label>
                  <input
                    type="date"
                    value={editPostDate}
                    onChange={(e) => setEditPostDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Título do Post *
                </label>
                <input
                  type="text"
                  value={editPostTitle}
                  onChange={(e) => setEditPostTitle(e.target.value)}
                  placeholder="Ex: Vídeo de Depoimento Aluna..."
                  required
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Formato do Post
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {(['VIDEO', 'CAROUSEL', 'STATIC'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setEditPostFormat(fmt)}
                      style={editPostFormat === fmt ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                      className={`py-2 rounded-xl border text-center uppercase tracking-wider font-black ${
                        editPostFormat === fmt ? 'border-[#FD3100]' : 'border-[#DCD6CC] bg-[#FAF9F7] text-[#111111]'
                      }`}
                    >
                      {fmt === 'VIDEO' ? 'Vídeo / Reels' : fmt === 'CAROUSEL' ? 'Carrossel' : 'Estático'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mídia do Post na Edição (Carrossel com Reordenação, Foto ou Vídeo) */}
              {editPostFormat === 'CAROUSEL' ? (
                <CarouselUploader
                  slides={editPostCarouselSlides}
                  onChange={setEditPostCarouselSlides}
                />
              ) : editPostFormat === 'STATIC' ? (
                <ImageUploadInput
                  value={editPostMediaUrl}
                  onChange={setEditPostMediaUrl}
                  label="Imagem do Post"
                  sublabel="Envie do computador ou cole link do Drive"
                  placeholder="Link do Google Drive ou link direto da imagem"
                />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                      Link do Vídeo (Google Drive ou Direto) *
                    </label>
                    <span className="text-[10px] font-bold text-[#FD3100] bg-[#FFF0EC] px-2 py-0.5 rounded-md border border-[#FFCEBF]">
                      Google Drive ⚡
                    </span>
                  </div>
                  <input
                    type="url"
                    value={editPostMediaUrl}
                    onChange={(e) => setEditPostMediaUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    required
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-mono font-medium text-[#111111] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#66635D] font-medium mt-1">
                    Cole o link de compartilhamento do Google Drive com acesso público.
                  </p>
                </div>
              )}

              {/* Capa do Vídeo na Edição (Upload Direto do Computador ou Link) */}
              {editPostFormat === 'VIDEO' && (
                <ImageUploadInput
                  value={editPostThumbnailUrl}
                  onChange={setEditPostThumbnailUrl}
                  label="Capa do Vídeo (Thumbnail / Feed 1:1)"
                  optional
                  sublabel="Opcional • Envie imagem ou deixe em branco"
                  placeholder="Link do Google Drive ou link direto da imagem"
                />
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Legenda do Post (Caption)
                </label>
                <textarea
                  value={editPostCaption}
                  onChange={(e) => setEditPostCaption(e.target.value)}
                  placeholder="Escreva a legenda com hashtags..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-medium text-[#111111] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#EEEDEA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditPostModalOpen(false)}
                  className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditPost}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-2 rounded-xl text-xs font-black uppercase disabled:opacity-50"
                >
                  {savingEditPost ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Novo Roteiro de Gravação */}
      {scriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    {scriptEditingId ? 'Editar Roteiro' : 'Novo Roteiro de Gravação'}
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Estruture a fala e cenas para a captação
                  </p>
                </div>
              </div>
              <button onClick={() => setScriptModalOpen(false)} className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScript} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Título do Roteiro / Tema *
                </label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  placeholder="Ex: Captação 01 • Roteiro Mitos da Alimentação"
                  required
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Data da Captação
                  </label>
                  <input
                    type="date"
                    value={scriptDate}
                    onChange={(e) => setScriptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Status da Captação
                  </label>
                  <select
                    value={scriptStatus}
                    onChange={(e) => setScriptStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                  >
                    <option value="A_GRAVAR">A Gravar</option>
                    <option value="GRAVADO">Gravado</option>
                    <option value="EM_EDICAO">Em Edição</option>
                    <option value="FINALIZADO">Finalizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Gancho / Hook (Primeiros 3 segundos de impacto)
                </label>
                <input
                  type="text"
                  value={scriptHook}
                  onChange={(e) => setScriptHook(e.target.value)}
                  placeholder="Ex: Você ainda comete esse erro todos os dias?"
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Roteiro Completo (Falas e Orientações de Cena) *
                </label>
                <textarea
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  placeholder="Cena 1: Olhando para a câmera dizendo...\nCena 2: Mostrando o produto em uso..."
                  rows={6}
                  required
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-medium text-[#111111] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#EEEDEA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScriptModalOpen(false)}
                  className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingScript}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-2 rounded-xl text-xs font-black uppercase disabled:opacity-50"
                >
                  {submittingScript ? 'Salvando...' : 'Salvar Roteiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Novo Documento / Contrato */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-md p-5 sm:p-8 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center text-[#FD3100]">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
                    Novo Documento
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Link de contrato, briefing ou identidade
                  </p>
                </div>
              </div>
              <button onClick={() => setDocModalOpen(false)} className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ex: Contrato Anual de Gestão 2026"
                  required
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Tipo de Documento
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
                >
                  <option value="CONTRATO">Contrato de Prestação</option>
                  <option value="BRIEFING">Briefing de Marca / Persona</option>
                  <option value="IDENTIDADE_VISUAL">Manual de Identidade Visual</option>
                  <option value="DRIVE_BRUTO">Pasta de Arquivos Brutos (Drive)</option>
                  <option value="OUTRO">Outro Documento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Link de Acesso (Google Drive, DocuSign, etc.) *
                </label>
                <input
                  type="url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  required
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-mono font-medium text-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                  Notas / Observações
                </label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Ex: Assinado digitalmente em Jan/2026"
                  className="w-full px-3 py-2 bg-[#FAF9F7] border border-[#DCD6CC] rounded-xl text-xs font-medium text-[#111111] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#EEEDEA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDocModalOpen(false)}
                  className="btn-vb-secondary px-4 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingDoc}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-6 py-2 rounded-xl text-xs font-black uppercase disabled:opacity-50"
                >
                  {submittingDoc ? 'Salvando...' : 'Adicionar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REVISÃO DO POST (SE CLICADO) */}
      {selectedPost && (
        <PostReviewModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdated={() => fetchClientData()}
        />
      )}
    </div>
  );
}
