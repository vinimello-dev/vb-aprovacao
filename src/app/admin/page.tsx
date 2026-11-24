'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Calendar,
  Database,
  Search,
  RefreshCw,
  X,
  Layers,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckCircle2,
  FileEdit,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Send,
  MessageCircle,
} from 'lucide-react';
import { generateSlug, generatePin, formatDate, parseMediaUrl, parseThumbnailUrl } from '@/lib/utils';

interface ClientItem {
  id: string;
  name: string;
  slug: string;
  pin: string;
  logoUrl?: string | null;
  createdAt: string;
  _count?: {
    posts: number;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [search, setSearch] = useState('');

  // Modal Novo Cliente State
  const [modalOpen, setModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientSlug, setNewClientSlug] = useState('');
  const [newClientPin, setNewClientPin] = useState('');
  const [newClientLogoUrl, setNewClientLogoUrl] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal Editar Logo do Cliente State
  const [editLogoModalOpen, setEditLogoModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Modal Novo Post State
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postClientId, setPostClientId] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postFormat, setPostFormat] = useState<'VIDEO' | 'CAROUSEL' | 'STATIC'>('VIDEO');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postThumbnailUrl, setPostThumbnailUrl] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/clients');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.clients) {
        setClients(data.clients);
        setIsUsingFallback(Boolean(data.isUsingFallback));
        if (data.clients.length > 0 && !postClientId) {
          setPostClientId(data.clients[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenModal = () => {
    setNewClientName('');
    setNewClientSlug('');
    setNewClientPin(generatePin());
    setNewClientLogoUrl('');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEditLogo = (client: ClientItem) => {
    setEditingClient(client);
    setEditLogoUrl(client.logoUrl || '');
    setEditError('');
    setEditSuccess('');
    setEditLogoModalOpen(true);
  };

  const handleSaveEditLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setEditSubmitting(true);
    setEditError('');
    setEditSuccess('');

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClient.id,
          logoUrl: editLogoUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Não foi possível atualizar o logo.');
        setEditSubmitting(false);
        return;
      }

      setEditSuccess('Logo atualizado com sucesso!');
      await fetchClients();
      setTimeout(() => {
        setEditLogoModalOpen(false);
        setEditingClient(null);
      }, 700);
    } catch {
      setEditError('Erro de conexão ao salvar logo.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenPostModal = (specificClientId?: string) => {
    if (specificClientId) {
      setPostClientId(specificClientId);
    } else if (clients.length > 0 && !postClientId) {
      setPostClientId(clients[0].id);
    }
    setPostTitle('');
    setPostMediaUrl('');
    setPostThumbnailUrl('');
    setPostCaption('');
    setPostError('');
    setPostSuccess('');
    setPostModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setNewClientName(val);
    setNewClientSlug(generateSlug(val));
  };

  const handleRegeneratePin = () => {
    setNewClientPin(generatePin());
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          slug: newClientSlug,
          pin: newClientPin,
          logoUrl: newClientLogoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Não foi possível cadastrar o cliente.');
        setFormSubmitting(false);
        return;
      }

      setModalOpen(false);
      await fetchClients();
    } catch {
      setFormError('Erro ao comunicar com o servidor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    setPostSuccess('');

    if (!postMediaUrl.trim()) {
      setPostError('Por favor, informe o link do vídeo ou imagem (Google Drive, Dropbox ou link direto).');
      return;
    }

    setPostSubmitting(true);

    try {
      // Se for carrossel e o usuário colocar múltiplos links separados por vírgula ou linha:
      const rawUrls = postMediaUrl
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      const mediaUrls = rawUrls.map((url, idx) => ({
        url: parseMediaUrl(url),
        mediaType: postFormat === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        order: idx,
      }));

      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: postClientId,
          title: postTitle,
          caption: postCaption,
          format: postFormat,
          scheduledDate: postDate,
          mediaUrls,
          thumbnailUrl: postThumbnailUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPostError(data.error || 'Erro ao cadastrar post.');
        setPostSubmitting(false);
        return;
      }

      setPostSuccess('Publicação criada com sucesso!');
      setTimeout(() => {
        setPostModalOpen(false);
        fetchClients();
      }, 1000);
    } catch {
      setPostError('Erro ao comunicar com o servidor.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyWhatsAppMessage = (clientName: string, portalUrl: string, pin: string, id: string) => {
    const msg = `Olá, ${clientName}! ✨\n\nO seu novo conteúdo e planejamento já estão disponíveis para revisão e aprovação na plataforma da VB!\n\n👉 Link de Acesso: ${portalUrl}\n🔑 Seu PIN de Segurança: ${pin}\n\nVocê pode assistir aos vídeos, conferir a grade do feed, ler a legenda e deixar seus comentários no segundo exato de cada post!`;
    navigator.clipboard.writeText(msg);
    setCopiedId(`wa-${id}`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#EEEDEA] text-[#111111] flex flex-col font-sans">
      {/* Linha de Destaque Laranja no topo da página */}
      <div className="h-1.5 bg-[#FD3100] w-full" />

      {/* Header Superior da Agência */}
      <header className="border-b border-[#DCD6CC] bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 flex items-center justify-center">
              <img
                src="/logo-vb.png?v=4"
                alt="Logo VB"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl text-[#111111] tracking-tight uppercase">
                  VB <span style={{ color: '#FD3100' }}>APROVAÇÃO</span>
                </span>
                <span
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="px-2.5 py-0.5 text-[10px] font-black rounded-full tracking-wider uppercase shadow-sm"
                >
                  Agência Admin
                </span>
              </div>
              <p style={{ color: '#FD3100' }} className="text-xs font-bold tracking-wide">
                Gestão e Aprovação de Conteúdos Audiovisuais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isUsingFallback ? (
              <div
                title="PostgreSQL ainda não conectado localmente. Dados em memória temporária para testes."
                className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800"
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo Local / Teste</span>
              </div>
            ) : (
              <div
                title="PostgreSQL conectado com sucesso via Prisma ORM."
                className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>PostgreSQL Ativo</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="btn-vb-secondary flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
              <span className="text-[#111111]">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Banner de Boas-vindas e Ação Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#FD3100' }}>
              <Sparkles className="w-4 h-4" />
              <span>Painel de Controle</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#111111] uppercase tracking-tight">
              Clientes <span style={{ color: '#FD3100' }}>Cadastrados</span>
            </h1>
            <p className="text-sm text-[#55524C] mt-1 font-medium max-w-2xl">
              Gerencie seus clientes, crie novas publicações com links do Google Drive e acompanhe as aprovações.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão Novo Post */}
            <button
              onClick={() => handleOpenPostModal()}
              style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs uppercase tracking-wider font-black shadow-md hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Video className="w-4 h-4" style={{ color: '#FD3100' }} />
              <span>+ Novo Post</span>
            </button>

            {/* Botão Novo Cliente */}
            <button
              onClick={handleOpenModal}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Resumo Rápido da Agência */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#66635D]">Total Clientes</span>
              <div className="w-8 h-8 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center" style={{ color: '#FD3100' }}>
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#111111]">{clients.length}</p>
            <span style={{ color: '#FD3100' }} className="text-[11px] font-bold mt-1 inline-block">Ativos na plataforma</span>
          </div>

          <div className="bg-white border border-[#DCD6CC] rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#66635D]">Pendentes</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#111111]">0</p>
            <span className="text-[11px] font-bold text-[#66635D] mt-1 inline-block">Aguardando aprovação</span>
          </div>

          <div className="bg-white border border-[#DCD6CC] rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#66635D]">Em Ajustes</span>
              <div className="w-8 h-8 rounded-xl bg-[#FFF0EC] border border-[#FFCEBF] flex items-center justify-center" style={{ color: '#FD3100' }}>
                <FileEdit className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#111111]">0</p>
            <span className="text-[11px] font-bold text-[#66635D] mt-1 inline-block">Comentários no segundo</span>
          </div>

          <div className="bg-white border border-[#DCD6CC] rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#66635D]">Aprovados</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#111111]">0</p>
            <span className="text-[11px] font-bold text-emerald-600 mt-1 inline-block">Prontos para postagem</span>
          </div>
        </div>

        {/* Barra de Busca e Filtro */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#FD3100' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou slug do cliente..."
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-sm text-[#111111] placeholder-[#A09D96] font-medium focus:outline-none shadow-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#111111] bg-white px-4 py-2.5 rounded-2xl border border-[#DCD6CC] shadow-sm">
            <Users className="w-4 h-4" style={{ color: '#FD3100' }} />
            <span>
              Listando <strong style={{ color: '#FD3100' }} className="font-black">{filteredClients.length}</strong> de <strong className="font-black text-[#111111]">{clients.length}</strong> clientes
            </span>
          </div>
        </div>

        {/* Lista de Clientes */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#FD3100' }} />
            <p className="text-sm font-bold" style={{ color: '#FD3100' }}>Carregando clientes da agência...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#FFCEBF] rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-20 h-20 bg-[#FFF0EC] rounded-3xl flex items-center justify-center mb-4 border-2 border-[#FFCEBF] shadow-sm" style={{ color: '#FD3100' }}>
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-[#111111] uppercase mb-1">
              Nenhum cliente cadastrado ainda
            </h3>
            <p className="text-[#66635D] text-sm max-w-md mb-6 font-medium">
              Cadastre seu primeiro cliente para gerar um link único com PIN de 4 dígitos e iniciar o planejamento de posts.
            </p>
            <button
              onClick={handleOpenModal}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary flex items-center gap-2 px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => {
              const clientPortalPath = `/c/${client.slug}`;
              const fullPortalUrl = typeof window !== 'undefined'
                ? `${window.location.origin}${clientPortalPath}`
                : clientPortalPath;

              return (
                <div
                  key={client.id}
                  className="bg-white border-2 border-[#E2DED7] hover:border-[#FD3100] rounded-3xl p-6 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(253,49,0,0.14)] flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#FD3100] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="relative group/logo shrink-0">
                          {client.logoUrl ? (
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#DCD6CC] bg-white flex items-center justify-center shadow-md">
                              <img
                                src={client.logoUrl}
                                alt={`Logo ${client.name}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-md"
                            >
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditLogo(client)}
                            className="absolute -bottom-1 -right-1 p-1 bg-white hover:bg-[#FAF9F7] text-[#66635D] hover:text-[#FD3100] border border-[#DCD6CC] rounded-lg shadow-sm transition-all"
                            title="Editar ou adicionar logo da empresa"
                          >
                            <ImageIcon className="w-3 h-3" />
                          </button>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-[#111111] text-lg group-hover:text-[#FD3100] transition-colors leading-tight">
                              {client.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleOpenEditLogo(client)}
                              className="text-[10px] font-bold text-[#66635D] hover:text-[#FD3100] underline opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Editar logo"
                            >
                              {client.logoUrl ? 'trocar logo' : '+ logo'}
                            </button>
                          </div>
                          <span className="text-xs text-[#66635D] flex items-center gap-1 mt-0.5 font-medium">
                            <Calendar className="w-3 h-3" style={{ color: '#FD3100' }} />
                            {formatDate(client.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Botão de Post Rápido para este Cliente */}
                      <button
                        onClick={() => handleOpenPostModal(client.id)}
                        className="px-2.5 py-1 bg-[#FFF0EC] hover:bg-[#FD3100] text-[#FD3100] hover:text-white rounded-xl text-[11px] font-black border border-[#FFCEBF] transition-all flex items-center gap-1"
                        title="Criar novo post para este cliente"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>Post</span>
                      </button>
                    </div>

                    {/* Informações de Acesso do Cliente */}
                    <div className="bg-[#FAF9F7] border border-[#DCD6CC] rounded-2xl p-4 mb-5 space-y-3">
                      {/* Slug / Link */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#111111] font-black uppercase text-[10px] tracking-wider">Portal do Cliente:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold bg-white px-2.5 py-1 rounded-xl border border-[#DCD6CC]" style={{ color: '#FD3100' }}>
                          <span>/c/{client.slug}</span>
                          <button
                            onClick={() => copyToClipboard(fullPortalUrl, `url-${client.id}`)}
                            title="Copiar link completo do portal"
                            className="p-1 hover:bg-[#EEEDEA] rounded-lg transition-colors text-[#66635D] hover:text-[#111111]"
                          >
                            {copiedId === `url-${client.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* PIN de Acesso */}
                      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-[#E4E0D7]">
                        <span className="text-[#111111] font-black uppercase text-[10px] tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                          PIN de Acesso:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
                            className="font-mono font-black px-3 py-1 rounded-xl text-xs tracking-widest shadow-sm"
                          >
                            {client.pin}
                          </span>
                          <button
                            onClick={() => copyToClipboard(client.pin, `pin-${client.id}`)}
                            title="Copiar PIN"
                            className="p-1 hover:bg-[#EEEDEA] rounded-lg transition-colors text-[#66635D] hover:text-[#111111]"
                          >
                            {copiedId === `pin-${client.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Envio Rápido para WhatsApp */}
                  <button
                    type="button"
                    onClick={() => copyWhatsAppMessage(client.name, fullPortalUrl, client.pin, client.id)}
                    className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all mb-2 border shadow-sm ${
                      copiedId === `wa-${client.id}`
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366] hover:text-white border-[#25D366]/30'
                    }`}
                    title="Copiar mensagem pronta com link e PIN para enviar no WhatsApp"
                  >
                    {copiedId === `wa-${client.id}` ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3] text-emerald-600" />
                        <span>Mensagem de WhatsApp Copiada!</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        <span>Copiar Convite p/ WhatsApp</span>
                      </>
                    )}
                  </button>

                  {/* Ações do Card */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`/c/${client.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-vb-secondary flex-1 py-3 px-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Abrir Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: '#FD3100' }} />
                    </a>

                    <a
                      href={`/c/${client.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                      className="btn-vb-primary flex-1 py-3 px-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <span>Ver Planejamento</span>
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL 1: Criação de Novo Post (Google Drive / Vídeo / Carrossel) */}
      {postModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden my-auto">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#FFF0EC] border border-[#FFCEBF] rounded-2xl flex items-center justify-center shadow-sm" style={{ color: '#FD3100' }}>
                  <Video className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-[#111111] text-lg uppercase tracking-tight">
                    Criar Nova <span style={{ color: '#FD3100' }}>Publicação</span>
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Suporta link do Google Drive, Dropbox ou arquivo direto
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPostModalOpen(false)}
                className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#FAF9F7] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {postError && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                {postError}
              </div>
            )}

            {postSuccess && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{postSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="mt-6 space-y-4">
              {/* Selecionar Cliente */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Cliente *
                </label>
                <select
                  value={postClientId}
                  onChange={(e) => setPostClientId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] text-sm font-bold focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (/c/{c.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Título do Post */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Título do Post / Campanha *
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Ex: Vídeo de Lançamento da Coleção de Verão"
                  required
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] placeholder-[#A09D96] text-sm font-medium focus:outline-none"
                />
              </div>

              {/* Formato da Mídia */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Formato do Post
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostFormat('VIDEO')}
                    style={postFormat === 'VIDEO' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      postFormat === 'VIDEO' ? 'border-[#FD3100] shadow-sm' : 'border-[#DCD6CC] bg-[#FAF9F7] text-[#111111]'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Vídeo / Reels</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostFormat('CAROUSEL')}
                    style={postFormat === 'CAROUSEL' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      postFormat === 'CAROUSEL' ? 'border-[#FD3100] shadow-sm' : 'border-[#DCD6CC] bg-[#FAF9F7] text-[#111111]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Carrossel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostFormat('STATIC')}
                    style={postFormat === 'STATIC' ? { backgroundColor: '#FD3100', color: '#FFFFFF' } : {}}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      postFormat === 'STATIC' ? 'border-[#FD3100] shadow-sm' : 'border-[#DCD6CC] bg-[#FAF9F7] text-[#111111]'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Post Único</span>
                  </button>
                </div>
              </div>

              {/* Link do Arquivo com Suporte a Google Drive */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                    Link do Vídeo ou Mídia *
                  </label>
                  <span className="text-[10px] font-bold text-brand-600 bg-[#FFF0EC] px-2 py-0.5 rounded-md border border-[#FFCEBF]">
                    Google Drive Suportado ⚡
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={postMediaUrl}
                    onChange={(e) => setPostMediaUrl(e.target.value)}
                    placeholder="Cole o link do Google Drive (ou link direto .mp4)..."
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF9F7] border-2 border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] placeholder-[#A09D96] text-xs font-mono font-medium focus:outline-none"
                  />
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#FD3100' }} />
                </div>
                <p className="text-[11px] text-[#66635D] font-medium mt-1">
                  💡 <strong>Google Drive:</strong> certifique-se de que o arquivo esteja com acesso <em>"Qualquer pessoa com o link pode ver"</em>. O sistema converte automaticamente para streaming direto no player!
                </p>
              </div>

              {/* Capa do Vídeo (Thumbnail / Feed Instagram) */}
              {postFormat === 'VIDEO' && (
                <div className="bg-[#FAF9F7] p-3.5 rounded-2xl border border-[#DCD6CC]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                      Capa do Vídeo para o Feed (Opcional)
                    </label>
                    <span className="text-[10px] font-bold text-[#FD3100]">
                      Feed Instagram & Reels
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      value={postThumbnailUrl}
                      onChange={(e) => setPostThumbnailUrl(e.target.value)}
                      placeholder="Link da imagem de capa (Google Drive ou link direto)..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-[#111111] placeholder-[#A09D96] text-xs font-mono font-medium focus:outline-none"
                    />
                    <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#FD3100' }} />
                  </div>
                  <p className="text-[10px] text-[#66635D] font-medium mt-1">
                    Se deixar em branco para vídeos do Google Drive, a capa oficial é gerada automaticamente pelo Drive!
                  </p>
                </div>
              )}

              {/* Data Programada */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Data Programada para Postagem
                </label>
                <input
                  type="date"
                  value={postDate}
                  onChange={(e) => setPostDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Legenda (Copy) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Legenda (Copy) da Publicação
                </label>
                <textarea
                  rows={3}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Texto que acompanhará o post, hashtags e chamada para ação..."
                  className="w-full p-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-xs text-[#111111] font-medium focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#EEEDEA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPostModalOpen(false)}
                  className="btn-vb-secondary px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={postSubmitting}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-7 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {postSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Criar e Publicar para o Cliente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Criação de Novo Cliente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#FFF0EC] border border-[#FFCEBF] rounded-2xl flex items-center justify-center shadow-sm" style={{ color: '#FD3100' }}>
                  <Users className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-[#111111] text-lg uppercase tracking-tight">
                    Novo <span style={{ color: '#FD3100' }}>Cliente</span>
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    Gere o link exclusivo e o PIN de 4 dígitos para o portal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#FAF9F7] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Nome do Cliente / Empresa *
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Studio Fitness, Restaurante Bella..."
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] focus:border-[#FD3100] rounded-2xl text-[#111111] placeholder-[#A09D96] text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2">
                  Slug do Link (Identificador da URL)
                </label>
                <div className="flex items-center rounded-2xl bg-[#FAF9F7] border border-[#DCD6CC] px-4 py-3 text-sm focus-within:border-[#FD3100]">
                  <span style={{ color: '#FD3100' }} className="font-bold select-none">/c/</span>
                  <input
                    type="text"
                    value={newClientSlug}
                    onChange={(e) => setNewClientSlug(generateSlug(e.target.value))}
                    placeholder="nome-do-cliente"
                    required
                    className="w-full bg-transparent text-[#111111] font-mono font-bold focus:outline-none ml-1"
                  />
                </div>
                <p className="text-[11px] text-[#66635D] font-medium mt-1">
                  O link do portal será: <code style={{ color: '#FD3100' }} className="font-black font-mono">/c/{newClientSlug || 'slug'}</code>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                    PIN de Segurança (4 dígitos) *
                  </label>
                  <button
                    type="button"
                    onClick={handleRegeneratePin}
                    style={{ color: '#FD3100' }}
                    className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 stroke-[2.5]" />
                    Sortear outro PIN
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    value={newClientPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewClientPin(val);
                    }}
                    placeholder="4 dígitos numéricos"
                    required
                    className="w-full px-4 py-3 bg-[#FAF9F7] border-2 border-[#FFCEBF] focus:border-[#FD3100] rounded-2xl text-[#111111] font-mono text-center tracking-widest text-2xl font-black focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#66635D] font-medium mt-1">
                  O cliente digitará esse PIN ao acessar o link para visualizar os posts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center justify-between">
                  <span>Logo da Empresa (Opcional)</span>
                  <span className="text-[10px] text-[#66635D] font-normal normal-case">Google Drive ou link direto de imagem</span>
                </label>
                <div className="flex items-center rounded-2xl bg-[#FAF9F7] border border-[#DCD6CC] px-4 py-3 text-sm focus-within:border-[#FD3100]">
                  <LinkIcon className="w-4 h-4 mr-2 shrink-0" style={{ color: '#FD3100' }} />
                  <input
                    type="url"
                    value={newClientLogoUrl}
                    onChange={(e) => setNewClientLogoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... ou https://..."
                    className="w-full bg-transparent text-[#111111] placeholder-[#A09D96] text-xs font-medium focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#66635D] font-medium mt-1">
                  Pode colar link de compartilhamento do Google Drive ou link direto (.png, .jpg).
                </p>
              </div>

              <div className="pt-4 border-t border-[#EEEDEA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-vb-secondary px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-7 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {formSubmitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Editar Logo do Cliente */}
      {editLogoModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-2 border-[#FFCEBF] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FD3100]" />

            <div className="flex items-center justify-between pb-4 border-b border-[#EEEDEA]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#FFF0EC] border border-[#FFCEBF] rounded-2xl flex items-center justify-center shadow-sm" style={{ color: '#FD3100' }}>
                  <ImageIcon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-[#111111] text-lg uppercase tracking-tight">
                    Logo da <span style={{ color: '#FD3100' }}>Empresa</span>
                  </h3>
                  <p className="text-xs text-[#66635D] font-medium">
                    {editingClient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditLogoModalOpen(false)}
                className="text-[#66635D] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#FAF9F7] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditLogo} className="mt-6 space-y-5">
              {/* Prévia do Logo Atual / Novo */}
              <div className="flex items-center gap-4 bg-[#FAF9F7] p-4 rounded-2xl border border-[#DCD6CC]">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#DCD6CC] bg-white flex items-center justify-center shadow-md shrink-0">
                  {editLogoUrl.trim() ? (
                    <img
                      src={parseThumbnailUrl(editLogoUrl.trim())}
                      alt="Prévia do Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo-vb.png?v=4';
                      }}
                    />
                  ) : editingClient.logoUrl ? (
                    <img
                      src={editingClient.logoUrl}
                      alt={editingClient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                      className="w-full h-full rounded-xl flex items-center justify-center font-black text-xl"
                    >
                      {editingClient.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-black text-[#111111] uppercase">Prévia do Logo</p>
                  <p className="text-[#66635D] font-medium mt-0.5">
                    {editLogoUrl.trim()
                      ? 'Visualização em tempo real do link acima'
                      : editingClient.logoUrl
                      ? 'Logo atual cadastrado'
                      : 'Nenhum logo cadastrado no momento'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-2 flex items-center justify-between">
                  <span>Link do Logo da Empresa</span>
                  <span className="text-[10px] text-[#66635D] font-normal normal-case">Google Drive ou link direto</span>
                </label>
                <div className="flex items-center rounded-2xl bg-[#FAF9F7] border border-[#DCD6CC] px-4 py-3 text-sm focus-within:border-[#FD3100]">
                  <LinkIcon className="w-4 h-4 mr-2 shrink-0" style={{ color: '#FD3100' }} />
                  <input
                    type="url"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... ou link direto da imagem"
                    className="w-full bg-transparent text-[#111111] placeholder-[#A09D96] text-xs font-medium focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#66635D] font-medium mt-1">
                  Cole o link público de visualização do Google Drive ou deixe em branco para remover o logo.
                </p>
              </div>

              <div className="pt-4 border-t border-[#EEEDEA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditLogoModalOpen(false)}
                  className="btn-vb-secondary px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                  className="btn-vb-primary px-7 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {editSubmitting ? 'Salvando...' : 'Salvar Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
