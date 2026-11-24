import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Limite de segurança: 10MB para imagens
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'A imagem deve ter no máximo 10MB.' },
        { status: 400 }
      );
    }

    const cleanFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Se a Vercel Blob Store estiver conectada
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(cleanFilename, file, {
        access: 'public',
      });
      return NextResponse.json({
        url: blob.url,
        name: file.name,
        size: file.size,
      });
    }

    // Fallback nativo: converter para Data URL base64 otimizado
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      url: dataUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Erro no upload de imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar o upload do arquivo.' },
      { status: 500 }
    );
  }
}
