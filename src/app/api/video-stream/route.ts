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

  let targetUrl = '';
  if (id) {
    targetUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  } else if (urlParam) {
    targetUrl = urlParam;
  } else {
    return new NextResponse('ID ou URL não fornecido.', { status: 400 });
  }

  const range = request.headers.get('range');
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (range) {
    headers['Range'] = range;
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
    responseHeaders.set('Content-Disposition', 'inline');

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
