import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getClients, createClient, updateClient } from '@/lib/services/client-service';
import { generateSlug, generatePin, parseThumbnailUrl } from '@/lib/utils';

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { clients, isUsingFallback } = await getClients();
    return NextResponse.json({ clients, isUsingFallback });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return NextResponse.json(
      { error: 'Não foi possível buscar a lista de clientes.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'O nome do cliente é obrigatório.' },
        { status: 400 }
      );
    }

    // Gerar ou validar slug
    let slug = body.slug?.trim() ? generateSlug(body.slug) : generateSlug(name);
    if (!slug) {
      slug = `cliente-${Date.now().toString().slice(-4)}`;
    }

    // Gerar ou validar PIN de 4 dígitos
    let pin = body.pin?.trim();
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      pin = generatePin();
    }

    const { client, isUsingFallback } = await createClient({
      name,
      slug,
      pin,
      logoUrl: body.logoUrl?.trim() ? parseThumbnailUrl(body.logoUrl) : undefined,
    });

    return NextResponse.json(
      { client, isUsingFallback, message: 'Cliente cadastrado com sucesso!' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error);
    // Erro de slug duplicado no Prisma (código P2002)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe um cliente cadastrado com este slug (identificador de URL).' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao cadastrar cliente no banco de dados.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, pin, logoUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    const { client, isUsingFallback } = await updateClient(id, {
      name: name?.trim() || undefined,
      pin: pin?.trim() || undefined,
      logoUrl: logoUrl !== undefined ? (logoUrl?.trim() ? parseThumbnailUrl(logoUrl) : null) : undefined,
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ client, isUsingFallback, success: true });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do cliente.' }, { status: 500 });
  }
}
