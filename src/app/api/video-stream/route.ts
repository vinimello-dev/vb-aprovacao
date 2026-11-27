import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return handleVideoStream(request, 'GET');
}

export async function HEAD(request: NextRequest) {
  return handleVideoStream(request, 'HEAD');
}

async function handleVideoStream(request: NextRequest, method: 'GET' | 'HEAD') {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const urlParam = searchParams.get('url');
  const isDownload = searchParams.get('download') === '1';

  let targetUrl = '';
  if (id) {
    targetUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  } else if (urlParam) {
    targetUrl = urlParam;
  } else {
    return new NextResponse('ID ou URL não fornecido.', { status: 400 });
  }

  // Para download direto de arquivos grandes do Drive, redireciona direto para evitar limite de 4.5MB da Vercel
  if (isDownload && id && method === 'GET') {
    return NextResponse.redirect(targetUrl, 302);
  }

  // Limite máximo de 2 MB por chunk para nunca exceder o limite de payload (4.5 MB) das Serverless Functions da Vercel
  const MAX_CHUNK_BYTES = 2 * 1024 * 1024;
  const rawRange = request.headers.get('range');
  let boundedRange: string | undefined;

  if (rawRange) {
    const match = rawRange.match(/^bytes=(\d+)-(\d*)$/i);
    if (match) {
      const start = parseInt(match[1], 10);
      const requestedEnd = match[2] ? parseInt(match[2], 10) : null;
      const maxEnd = start + MAX_CHUNK_BYTES - 1;
      const finalEnd = requestedEnd !== null ? Math.min(requestedEnd, maxEnd) : maxEnd;
      boundedRange = `bytes=${start}-${finalEnd}`;
    } else {
      boundedRange = rawRange;
    }
  } else if (method === 'GET' && !isDownload) {
    boundedRange = `bytes=0-${MAX_CHUNK_BYTES - 1}`;
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (boundedRange) {
    headers['Range'] = boundedRange;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'video/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    responseHeaders.set(
      'Content-Disposition',
      isDownload ? 'attachment; filename="video-vbhub.mp4"' : 'inline'
    );

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    if (method === 'HEAD') {
      return new NextResponse(null, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Erro no streaming de vídeo:', error);
    return new NextResponse('Erro ao obter fluxo de vídeo.', { status: 502 });
  }
}
