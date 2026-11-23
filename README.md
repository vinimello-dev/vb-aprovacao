# VB Aprovação • Plataforma de Aprovação de Conteúdo (Fase 1)

Plataforma web de aprovação de conteúdos audiovisuais e posts para agências de marketing e criadores de conteúdo.

---

## 🎯 O que foi construído na Fase 1

1. **Estrutura Base Moderna:**
   - **Next.js 15 (App Router)** + **TypeScript** + **Tailwind CSS**.
   - Ícones com **Lucide React**.
   - Design moderno no estilo agência (tema escuro com acentos índigo/violeta).

2. **Modelagem de Dados (Prisma ORM + PostgreSQL):**
   - Configurado em `prisma/schema.prisma` pronto para deploy no **Railway** ou conexão local.
   - Tabelas criadas:
     - `Client`: dados do cliente, `slug` exclusivo e `pin` de 4 dígitos.
     - `Post`: título, legenda (copy), formato (`VIDEO`, `CAROUSEL`, `STATIC`, `REELS`, `STORIES`), status (`PENDENTE`, `AJUSTES`, `APROVADO`) e data agendada.
     - `PostMedia`: arquivos de mídia, ordem, thumbnail e duração.
     - `Comment`: autor, papel (`CLIENT` ou `AGENCY`), conteúdo, **`timestampSeconds`** (para vídeos), **`slideIndex`** (para carrosséis) e **`resolved`** (para controle de ajustes).

3. **Autenticação do Painel da Agência (Admin):**
   - Tela de login em `/admin/login`.
   - Validação de senha através de variável de ambiente (`ADMIN_PASSWORD` no arquivo `.env`).
   - Sessão protegida via cookie HTTP-only assinado com JWT (`jose`).
   - Middleware de rota em `/admin/*` para garantir acesso apenas a usuários autenticados.

4. **Dashboard do Admin:**
   - Listagem em grade de todos os clientes cadastrados.
   - Busca em tempo real por nome ou slug.
   - **Geração de Novo Cliente:**
     - Auto-geração do `slug` a partir do nome do cliente (ex: `Academia Iron Fit` ➔ `/c/academia-iron-fit`).
     - Auto-geração de **PIN de segurança de 4 dígitos** com opção de sortear outro PIN num clique.
   - Ações rápidas: copiar link do portal com 1 clique, copiar PIN, abrir portal em nova aba.
   - Fallback de teste local: se você ainda não subiu o PostgreSQL, a aplicação armazena temporariamente em memória para permitir testar toda a interface imediatamente sem erros!

---

## 🚀 Como testar localmente

### 1. Iniciar o servidor de desenvolvimento:
Abra seu terminal na pasta do projeto e execute:
```bash
npm run dev
```

### 2. Acessar o Painel da Agência:
- Abra no navegador: [http://localhost:3000/admin](http://localhost:3000/admin)
- Será solicitado a senha de acesso configurada no `.env`:
  - **Senha padrão:** `admin` (você pode alterar a qualquer momento no arquivo `.env` na linha `ADMIN_PASSWORD="sua-senha"`).

### 3. Testar o fluxo de clientes:
- No painel, clique no botão **"+ Novo Cliente"**.
- Digite o nome de uma empresa ou cliente (ex: *Cafeteria Grão Nobre*).
- Observe o slug (`/c/cafeteria-grao-nobre`) e o PIN de 4 dígitos gerados automaticamente.
- Clique em **"Cadastrar Cliente"**.
- Veja o cliente adicionado ao painel com contadores e botões para copiar o link e o PIN.
- Clique em **"Abrir Portal"** para ver a tela inicial do cliente em `/c/[slug]`.

---

## 🗄️ Conexão com o PostgreSQL (Railway / Local / Neon / Supabase)

O arquivo `.env` já está criado na raiz:
```env
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
ADMIN_PASSWORD="admin"
ADMIN_SESSION_SECRET="super-secret-admin-session-key-vb-aprovacao-change-in-prod"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Quando você criar seu banco PostgreSQL no Railway ou Supabase, basta colar a URL de conexão no `DATABASE_URL` e rodar:
```bash
npx prisma db push
```
Isso criará automaticamente todas as tabelas no seu banco PostgreSQL.

---

## 📌 Próximos Passos (Fase 2)
- Upload de arquivos e integração com storage (S3 / Cloudflare R2).
- Planejamento mensal de posts no painel do Admin.
- Portal do cliente com validação de PIN de 4 dígitos e visualização em grade mensal/calendário.
- Player de vídeo com pausa e captura de `currentTime` ao comentar.
- Visualizador de carrossel com amarração de comentários ao `slide_index`.
