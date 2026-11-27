import nodemailer from 'nodemailer';

export type NotificationEmailType =
  | 'CYCLE_READY'
  | 'VIDEO_REVISED'
  | 'NEW_POST'
  | 'VIDEOS_READY'
  | 'PHOTOS_READY';

interface SendClientNotificationParams {
  to?: string | null;
  clientName: string;
  clientSlug: string;
  pin?: string | null;
  type: NotificationEmailType;
  cycleName?: string;
  postTitle?: string;
  postsCount?: number;
  revisionVersion?: number;
}

export interface EmailSendResult {
  sent: boolean;
  reason?: string;
}

export async function sendClientNotificationEmail(
  params: SendClientNotificationParams
): Promise<EmailSendResult> {
  const to = params.to?.trim();
  if (!to) {
    return { sent: false, reason: 'Cliente sem e-mail cadastrado na aba Dados.' };
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '').trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!gmailUser && !resendApiKey) {
    return {
      sent: false,
      reason: 'Configure GMAIL_USER e GMAIL_APP_PASSWORD (ou RESEND_API_KEY) na Vercel.',
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://vb-aprovacao.vercel.app').replace(
    /\/$/,
    ''
  );
  const portalUrl = `${baseUrl}/c/${params.clientSlug}`;

  let subject = `VB Hub | Novo conteúdo disponível — ${params.clientName}`;
  let headline = 'Novo conteúdo pronto para aprovação!';
  let bodyText = `Olá! Acabamos de disponibilizar novidades no portal da <strong>${params.clientName}</strong> no VB Hub.`;

  if (params.type === 'CYCLE_READY') {
    const cycleLabel = params.cycleName ? ` (${params.cycleName})` : '';
    subject = `VB Hub | Planejamento pronto para aprovação${cycleLabel}`;
    headline = 'Seu planejamento está pronto para aprovação!';
    bodyText = `Olá! Finalizamos o planejamento${cycleLabel} da <strong>${params.clientName}</strong>${
      typeof params.postsCount === 'number'
        ? ` com <strong>${params.postsCount} ${
            params.postsCount === 1 ? 'conteúdo' : 'conteúdos'
          }</strong>`
        : ''
    }. Acesse o link abaixo para revisar e aprovar.`;
  } else if (params.type === 'VIDEO_REVISED') {
    const versionLabel =
      typeof params.revisionVersion === 'number' && params.revisionVersion > 0
        ? ` (Versão ${params.revisionVersion})`
        : '';
    subject = `VB Hub | Vídeo revisado${versionLabel} pronto — ${params.postTitle || params.clientName}`;
    headline = `Seu vídeo revisado${versionLabel} está pronto!`;
    bodyText = `Olá! Já realizamos os ajustes solicitados${
      params.postTitle ? ` no material <strong>"${params.postTitle}"</strong>` : ''
    }${versionLabel ? ` — <strong>Vídeo Revisado • Versão ${params.revisionVersion}</strong>` : ''} da <strong>${params.clientName}</strong>. A nova versão já está disponível para sua aprovação no VB Hub.`;
  } else if (params.type === 'NEW_POST') {
    subject = `VB Hub | Novo material disponível — ${params.postTitle || params.clientName}`;
    headline = 'Novo material disponível para revisão!';
    bodyText = `Olá! Um novo conteúdo${
      params.postTitle ? ` (<strong>"${params.postTitle}"</strong>)` : ''
    } foi adicionado ao portal da <strong>${params.clientName}</strong> para aprovação.`;
  } else if (params.type === 'VIDEOS_READY') {
    subject = `VB Hub | Seus vídeos estão prontos para aprovação — ${params.clientName}`;
    headline = 'Seus vídeos estão prontos para aprovação!';
    bodyText = `Olá! Já disponibilizamos ${
      typeof params.postsCount === 'number' && params.postsCount > 0
        ? `<strong>${params.postsCount} ${params.postsCount === 1 ? 'vídeo' : 'vídeos'}</strong>`
        : 'os novos vídeos'
    } da <strong>${params.clientName}</strong> no VB Hub para você assistir, solicitar ajustes ou aprovar.`;
  } else if (params.type === 'PHOTOS_READY') {
    subject = `VB Hub | Suas pastas de fotos estão disponíveis — ${params.clientName}`;
    headline = 'Suas fotos já estão disponíveis no VB Hub!';
    bodyText = `Olá! Compartilhamos ${
      typeof params.postsCount === 'number' && params.postsCount > 0
        ? `<strong>${params.postsCount} ${params.postsCount === 1 ? 'pasta de fotos' : 'pastas de fotos'}</strong>`
        : 'as pastas de fotos'
    } da <strong>${params.clientName}</strong> no VB Hub para você visualizar e baixar.`;
  }

  const pinBlock = params.pin
    ? `<p style="margin:12px 0 0;font-size:13px;color:#66635D;">PIN de acesso: <strong style="color:#111111;background:#FAF9F7;padding:3px 8px;border-radius:6px;border:1px solid #DCD6CC;">${params.pin}</strong></p>`
    : '';

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#EEEDEA;padding:32px 16px;color:#111111;">
    <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border:2px solid #DCD6CC;border-radius:24px;overflow:hidden;">
      <div style="background:#111111;padding:20px 28px;display:flex;align-items:center;">
        <span style="display:inline-block;background:#FD3100;color:#FFFFFF;font-weight:900;font-size:14px;padding:6px 12px;border-radius:10px;letter-spacing:0.5px;">VB HUB</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:900;color:#111111;">${headline}</h1>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#44423E;">${bodyText}</p>
        <a href="${portalUrl}" style="display:inline-block;background:#FD3100;color:#FFFFFF;text-decoration:none;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.6px;padding:13px 24px;border-radius:14px;">
          Acessar Portal VB Hub
        </a>
        ${pinBlock}
      </div>
      <div style="padding:16px 28px;background:#FAF9F7;border-top:1px solid #EEEDEA;font-size:11px;color:#66635D;">
        Enviado automaticamente pelo VB Hub • Agência VB
      </div>
    </div>
  </div>`;

  // Prioridade 1: Gmail direto (sem necessidade de domínio próprio)
  if (gmailUser && gmailAppPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      await transporter.sendMail({
        from: `VB Hub <${gmailUser}>`,
        to,
        subject,
        html,
      });

      return { sent: true };
    } catch (err: any) {
      console.error('Erro ao enviar e-mail via Gmail:', err);
      return {
        sent: false,
        reason: `Falha ao enviar via Gmail (${err?.message || 'verifique GMAIL_USER e GMAIL_APP_PASSWORD'}).`,
      };
    }
  }

  // Prioridade 2: Resend API
  if (resendApiKey) {
    const from = process.env.EMAIL_FROM?.trim() || 'VB Hub <onboarding@resend.dev>';
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Erro ao enviar e-mail via Resend:', res.status, errText);
        return { sent: false, reason: `Falha no provedor de e-mail (${res.status}).` };
      }

      return { sent: true };
    } catch (err) {
      console.error('Erro de rede ao enviar e-mail:', err);
      return { sent: false, reason: 'Erro de conexão ao enviar e-mail.' };
    }
  }

  return { sent: false, reason: 'Nenhum provedor de e-mail configurado.' };
}
