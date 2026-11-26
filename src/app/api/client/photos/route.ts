import { NextResponse } from 'next/server';
import { getClientBySlug } from '@/lib/services/client-service';
import { getClientPhotoFolders } from '@/lib/services/photo-folder-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug do cliente é obrigatório.' }, { status: 400 });
    }

    const { client } = await getClientBySlug(slug);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const folders = await getClientPhotoFolders(client.id);
    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Erro ao buscar pastas de fotos (cliente):', error);
    return NextResponse.json({ error: 'Erro ao carregar pastas de fotos.' }, { status: 500 });
  }
}
