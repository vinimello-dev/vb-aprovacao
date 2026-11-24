import { notFound } from 'next/navigation';
import { getClientBySlug } from '@/lib/services/client-service';
import { ClientPortalView } from './client-portal-view';

interface ClientPortalProps {
  params: Promise<{ slug: string }>;
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
