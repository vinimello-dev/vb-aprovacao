import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getClientPhotoFolders,
  createClientPhotoFolder,
  updateClientPhotoFolder,
  deleteClientPhotoFolder,
} from '@/lib/services/photo-folder-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const folders = await getClientPhotoFolders(id);
    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Erro ao buscar pastas de fotos (admin):', error);
    return NextResponse.json({ error: 'Erro ao carregar pastas de fotos.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, month, year, driveUrl, notes } = body;

    if (!title?.trim() || !driveUrl?.trim() || !month || !year) {
      return NextResponse.json(
        { error: 'Título, mês, ano e link do Google Drive são obrigatórios.' },
        { status: 400 }
      );
    }

    const folder = await createClientPhotoFolder({
      clientId: id,
      title,
      month: Number(month),
      year: Number(year),
      driveUrl,
      notes,
    });

    if (!folder) {
      return NextResponse.json({ error: 'Falha ao salvar pasta de fotos.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, folder }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pasta de fotos (admin):', error);
    return NextResponse.json({ error: 'Erro ao salvar pasta de fotos.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { folderId, title, month, year, driveUrl, notes } = body;

    if (!folderId || !title?.trim() || !driveUrl?.trim() || !month || !year) {
      return NextResponse.json(
        { error: 'ID da pasta, título, mês, ano e link do Drive são obrigatórios.' },
        { status: 400 }
      );
    }

    const folder = await updateClientPhotoFolder(folderId, id, {
      title,
      month: Number(month),
      year: Number(year),
      driveUrl,
      notes,
    });

    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('Erro ao atualizar pasta de fotos (admin):', error);
    return NextResponse.json({ error: 'Erro ao atualizar pasta de fotos.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'folderId é obrigatório.' }, { status: 400 });
    }

    await deleteClientPhotoFolder(folderId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir pasta de fotos (admin):', error);
    return NextResponse.json({ error: 'Erro ao excluir pasta de fotos.' }, { status: 500 });
  }
}
