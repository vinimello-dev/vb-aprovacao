import { NextResponse } from 'next/server';
import { getClientBySlug } from '@/lib/services/client-service';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || 'client-secret-plataforma-vb-aprovacao-2025'
);

export async function POST(request: Request) {
  try {
    const { slug, pin } = await request.json();

    if (!slug || !pin) {
      return NextResponse.json(
        { error: 'Slug e PIN são obrigatórios.' },
        { status: 400 }
      );
    }

    const { client } = await getClientBySlug(slug);

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado.' },
        { status: 404 }
      );
    }

    if (client.pin !== pin.trim()) {
      return NextResponse.json(
        { error: 'PIN de segurança incorreto. Tente novamente.' },
        { status: 401 }
      );
    }

    // Gerar token de sessão do cliente
    const token = await new SignJWT({
      clientId: client.id,
      slug: client.slug,
      name: client.name,
      role: 'client',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(SECRET_KEY);

    const response = NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
      },
    });

    response.cookies.set({
      name: `client_session_${client.slug}`,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (error) {
    console.error('Erro na validação do PIN do cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao validar o PIN de segurança.' },
      { status: 500 }
    );
  }
}
