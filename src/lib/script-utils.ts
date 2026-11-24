export interface ScriptScene {
  id: string;
  sceneNumber: number;
  direction: string; // O que aparece / Enquadramento / Ação
  speech: string; // Fala / Locução
  notes?: string; // Texto na tela / Duração / Áudio
}

export interface ScriptTemplate {
  id: string;
  label: string;
  badge: string;
  hook: string;
  scenes: Array<{
    direction: string;
    speech: string;
    notes?: string;
  }>;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'reels-dinamico',
    label: 'Reels Dica Rápida (4 Cenas)',
    badge: 'Educativo',
    hook: 'Você ainda comete esse erro todos os dias sem perceber?',
    scenes: [
      {
        direction: 'Plano médio, olhando direto para a câmera com energia',
        speech: 'Você ainda comete esse erro todos os dias sem perceber? Deixa eu te mostrar como resolver em 30 segundos.',
        notes: '0-3s • Texto grande na tela com o título',
      },
      {
        direction: 'Corte mostrando o erro comum na prática (close no detalhe)',
        speech: 'A maioria das pessoas faz desse jeito aqui, e é exatamente isso que impede o resultado.',
        notes: '3-10s • Legenda dinâmica',
      },
      {
        direction: 'Mostrando o jeito certo passo a passo no ambiente',
        speech: 'Em vez disso, faça assim: primeiro ajuste esse ponto, e depois aplique essa técnica simples.',
        notes: '10-22s • B-roll + narração',
      },
      {
        direction: 'Volta para câmera sorrindo, gesto leve com a mão',
        speech: 'Já salva esse vídeo para não esquecer e envia para alguém que precisa ver isso hoje!',
        notes: '22-28s • CTA na tela: Salve e compartilhe',
      },
    ],
  },
  {
    id: 'mito-verdade',
    label: 'Mito vs. Verdade (4 Cenas)',
    badge: 'Engajamento',
    hook: 'Todo mundo fala isso, mas será que é verdade mesmo?',
    scenes: [
      {
        direction: 'Câmera próxima, expressão de dúvida',
        speech: 'Muita gente acha que [inserir mito], mas será que isso funciona mesmo na prática?',
        notes: '0-3s • Selo "MITO OU VERDADE?" na tela',
      },
      {
        direction: 'Corte rápido com movimento de mão negando',
        speech: 'Na verdade, isso é um mito! Quando você faz isso, o efeito é exatamente o contrário.',
        notes: '3-9s • Texto vermelho "MITO"',
      },
      {
        direction: 'Mostrando a explicação correta com exemplo real',
        speech: 'O que realmente traz resultado é focar nisso aqui, porque garante mais segurança e consistência.',
        notes: '9-22s • Texto verde "VERDADE"',
      },
      {
        direction: 'Encerramento olhando para câmera',
        speech: 'Você também já acreditou nisso? Comenta aqui embaixo que eu quero saber!',
        notes: '22-27s • CTA comentários',
      },
    ],
  },
  {
    id: 'bastidores',
    label: 'Bastidores / Dia a Dia (3 Cenas)',
    badge: 'Conexão',
    hook: 'Vem ver como funciona um dia real por trás dos nossos atendimentos!',
    scenes: [
      {
        direction: 'Entrando no espaço / preparando o ambiente ou equipamento',
        speech: 'Muita gente vê só o resultado final, mas hoje eu quero te mostrar o cuidado que existe antes de tudo começar.',
        notes: '0-5s • Música leve de fundo',
      },
      {
        direction: 'Sequência de 3 takes curtos (2s cada) mostrando detalhes do processo',
        speech: 'Cada etapa aqui é pensada nos mínimos detalhes para garantir qualidade, conforto e resultado de verdade.',
        notes: '5-18s • Cortes no ritmo da música',
      },
      {
        direction: 'Resultado final pronto + sorriso para câmera',
        speech: 'E é por isso que o resultado entrega tanto valor. Quer agendar o seu horário? Chama no direct!',
        notes: '18-25s • CTA Direct / Link da bio',
      },
    ],
  },
  {
    id: 'prova-social',
    label: 'Transformação / História (3 Cenas)',
    badge: 'Conversão',
    hook: 'Olha o que mudou depois de aplicar esse método passo a passo.',
    scenes: [
      {
        direction: 'Falando para câmera em tom próximo e acolhedor',
        speech: 'No começo, a maior dificuldade era não saber por onde começar e sentir insegurança com o resultado.',
        notes: '0-7s • Legenda destaque',
      },
      {
        direction: 'Cenas de acompanhamento / execução do serviço',
        speech: 'A partir do momento que ajustamos a estratégia e colocamos em prática com acompanhamento de perto, tudo começou a destravar.',
        notes: '7-18s • B-roll de atendimento',
      },
      {
        direction: 'Mostrando resultado final com confiança',
        speech: 'Hoje a diferença é visível! Se você também quer dar esse próximo passo, clique no link da bio e fale com nossa equipe.',
        notes: '18-26s • CTA Link da Bio',
      },
    ],
  },
];

export function createEmptyScene(sceneNumber: number): ScriptScene {
  return {
    id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sceneNumber,
    direction: '',
    speech: '',
    notes: '',
  };
}

/**
 * Lê o campo content do banco (JSON estruturado ou texto legado) e retorna lista de cenas.
 */
export function parseScriptScenes(content: string | null | undefined): ScriptScene[] {
  if (!content || !content.trim()) {
    return [createEmptyScene(1)];
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        return parsed.scenes.map((s: any, idx: number) => ({
          id: s.id || `scene_${idx + 1}_${Math.random().toString(36).slice(2, 5)}`,
          sceneNumber: idx + 1,
          direction: String(s.direction || ''),
          speech: String(s.speech || ''),
          notes: s.notes ? String(s.notes) : '',
        }));
      }
    } catch {
      // Fallback para texto simples
    }
  }

  // Fallback: converte texto legado (ex: "Cena 1: ...\nCena 2: ...") em cenas estruturadas
  const lines = trimmed.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [createEmptyScene(1)];

  return lines.map((line, idx) => ({
    id: `legacy_${idx + 1}`,
    sceneNumber: idx + 1,
    direction: '',
    speech: line.replace(/^Cena\s*\d+\s*[:\-–]\s*/i, '').trim(),
    notes: '',
  }));
}

export function serializeScriptScenes(scenes: ScriptScene[]): string {
  const normalized = scenes.map((s, idx) => ({
    id: s.id || `scene_${idx + 1}`,
    sceneNumber: idx + 1,
    direction: (s.direction || '').trim(),
    speech: (s.speech || '').trim(),
    notes: (s.notes || '').trim(),
  }));
  return JSON.stringify({ version: 2, scenes: normalized });
}

export function formatScriptAsPlainText(
  title: string,
  hook: string | null | undefined,
  scenes: ScriptScene[]
): string {
  const parts: string[] = [];
  parts.push(`🎬 ${title.toUpperCase()}`);
  if (hook?.trim()) {
    parts.push(`\n🎯 GANCHO (3s): "${hook.trim()}"`);
  }
  parts.push('');
  for (const s of scenes) {
    parts.push(`--- CENA ${s.sceneNumber} ---`);
    if (s.direction) parts.push(`🎥 Direção/Cena: ${s.direction}`);
    if (s.speech) parts.push(`🗣️ Fala: "${s.speech}"`);
    if (s.notes) parts.push(`📝 Obs/Tela: ${s.notes}`);
    parts.push('');
  }
  return parts.join('\n').trim();
}
