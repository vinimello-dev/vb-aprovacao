import { NextResponse } from 'next/server';
import { signAdminToken, verifyAdminPassword, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Por favor, informe a senha de acesso.' },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Senha incorreta. Verifique o valor definido no arquivo .env.' },
        { status: 401 }
      );
    }

    const token = await signAdminToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar autenticação.' },
      { status: 500 }
    );
  }
}
