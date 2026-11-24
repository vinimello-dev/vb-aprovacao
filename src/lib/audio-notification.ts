/**
 * Utilitário de Notificação Sonora e Visual estilo WhatsApp
 * Usa a Web Audio API nativa do navegador (sem arquivos externos, resposta instantânea com zero lag)
 */

let lastSoundTime = 0;

export function playMessageSound() {
  const now = Date.now();
  // Evita disparos múltiplos repetidos em menos de 1 segundo
  if (now - lastSoundTime < 800) return;
  lastSoundTime = now;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Primeiro tom suave (880Hz / Lá)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Segundo tom harmônico característico de mensagem (1320Hz / Mi)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.07);
    osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.16);

    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.22);

    osc2.start(ctx.currentTime + 0.07);
    osc2.stop(ctx.currentTime + 0.32);
  } catch (err) {
    // Se o navegador bloquear áudio automático até interação do usuário
    console.debug('Áudio bloqueado pelo navegador até primeira interação:', err);
  }
}
