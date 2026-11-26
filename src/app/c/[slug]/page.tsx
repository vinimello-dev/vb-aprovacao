import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClientBySlug } from '@/lib/services/client-service';
import { ClientPortalView } from './client-portal-view';

interface ClientPortalProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClientPortalProps): Promise<Metadata> {
  const { slug } = await params;
  const { client } = await getClientBySlug(slug);

  if (!client) {
    return {
      title: 'VB Hub | Portal do Cliente',
    };
  }

  const title = `VB Hub | ${client.name}`;
  const description = `Portal do Cliente ${client.name} — Conteúdos, Roteiros, Métricas e Aprovações no VB Hub.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'VB Hub',
      type: 'website',
      locale: 'pt_BR',
      images: [{ url: client.logoUrl || '/logo-vb.png' }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [client.logoUrl || '/logo-vb.png'],
    },
  };
}

export default async function ClientPortalPage({ params }: ClientPortalProps) {
  const { slug } = await params;
  const { client } = await getClientBySlug(slug);

  if (!client) {
    notFound();
  }

  return (
    <ClientPortalView
      client={{
        id: client.id,
        name: client.name,
        slug: client.slug,
        pin: '', // Ocultado por segurança - a validação é feita via /api/client/auth
        logoUrl: client.logoUrl || null,
      }}
    />
  );
}
