import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { parseImportedScriptsDocument } from '@/lib/script-utils';

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textField = formData.get('rawText') as string | null;

      if (file) {
        const fileName = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.endsWith('.docx')) {
          const result = await mammoth.extractRawText({ buffer });
          rawText = result.value || '';
        } else if (
          fileName.endsWith('.txt') ||
          fileName.endsWith('.md') ||
          fileName.endsWith('.csv')
        ) {
          rawText = buffer.toString('utf-8');
        } else {
          return NextResponse.json(
            {
              error:
                'Formato não suportado. Envie um arquivo .docx (Word/Google Docs), .txt ou .md — ou cole o texto diretamente.',
            },
            { status: 400 }
          );
        }
      } else if (textField) {
        rawText = textField;
      }
    } else {
      const body = await request.json();
      rawText = body?.rawText || '';
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: 'Nenhum texto encontrado no documento enviado.' },
        { status: 400 }
      );
    }

    const scripts = parseImportedScriptsDocument(rawText);
    if (scripts.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível identificar roteiros no texto enviado.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, rawText, scripts });
  } catch (error) {
    console.error('Erro ao processar documento de roteiros:', error);
    return NextResponse.json(
      { error: 'Erro ao ler o documento. Verifique se o arquivo é válido.' },
      { status: 500 }
    );
  }
}
