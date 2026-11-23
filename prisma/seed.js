const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.upsert({
    where: { slug: 'studio-stabilita' },
    update: {},
    create: {
      id: 'client-stabilita',
      name: 'Studio Stabilitá',
      slug: 'studio-stabilita',
      pin: '1234',
    },
  });
  console.log('Cliente salvo no Neon:', client.name, '(/c/' + client.slug + ')');

  const post = await prisma.post.upsert({
    where: { id: 'post-stabilita-drive' },
    update: {},
    create: {
      id: 'post-stabilita-drive',
      clientId: client.id,
      title: 'Vídeo Institucional • Studio Stabilitá',
      caption: '✨ Cuidar do seu corpo e da sua mente é uma prioridade. Conheça a experiência única do Studio Stabilitá e descubra como elevar o seu bem-estar diário através de um método personalizado e acolhedor.\n\nAgende sua aula experimental pelo link da bio! 🌿\n\n#StudioStabilita #Pilates #BemEstar #QualidadeDeVida',
      format: 'VIDEO',
      status: 'PENDENTE',
      scheduledDate: new Date(),
      media: {
        create: {
          id: 'media-stabilita-1',
          url: '/api/video-stream?id=1dohvLNVDhmcRiufHc4L8Z_ODX9IF28zS',
          mediaType: 'VIDEO',
          order: 0,
          thumbnailUrl: 'https://lh3.googleusercontent.com/d/1dohvLNVDhmcRiufHc4L8Z_ODX9IF28zS',
          duration: 30,
        },
      },
      comments: {
        create: {
          id: 'c-stab-1',
          author: 'Studio Stabilitá',
          authorRole: 'CLIENT',
          content: 'Ficou ótimo! Gostei muito da iluminação e da trilha sonora.',
          timestampSeconds: 5,
          resolved: false,
        },
      },
    },
  });
  console.log('Post salvo no Neon:', post.title);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed no Neon concluído com sucesso!');
  })
  .catch(async (e) => {
    console.error('Erro no seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
