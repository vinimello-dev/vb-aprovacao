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

export interface ParsedImportedScript {
  title: string;
  hook: string;
  scenes: ScriptScene[];
}

function parseSingleScriptBlock(block: string, fallbackIndex: number): ParsedImportedScript | null {
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  let title = '';
  let hook = '';
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar Título explícito ou cabeçalho Markdown
    const titleMatch = line.match(/^(?:#{1,3}\s*|🎬\s*)?(?:T[íi]tulo|Roteiro\s*\d*\s*[-–:]|V[íi]deo\s*\d*\s*[-–:]|Reels\s*\d*\s*[-–:])\s*(.+)$/i);
    if (!title && titleMatch) {
      title = titleMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      continue;
    }

    const mdHeading = line.match(/^#{1,3}\s+(.+)$/);
    if (!title && mdHeading) {
      title = mdHeading[1].replace(/^\*\*|\*\*$/g, '').trim();
      continue;
    }

    // Detectar Gancho / Hook
    const hookMatch = line.match(/^(?:🎯\s*)?(?:Gancho(?:\s*\([^)]*\))?|Hook|Abertura|Chamada)\s*[:\-–]\s*(.+)$/i);
    if (hookMatch && !hook) {
      hook = hookMatch[1].replace(/^["“]|["”]$/g, '').trim();
      continue;
    }

    if (!title && i === 0 && !/^(?:Cena|Take|Parte)\s*\d+/i.test(line)) {
      title = line.replace(/^["“]|["”]$/g, '').replace(/^\*\*|\*\*$/g, '').trim();
      continue;
    }

    bodyLines.push(line);
  }

  if (!title) {
    title = `Roteiro Importado ${fallbackIndex}`;
  }

  // Agrupar em cenas quando houver marcadores de Cena / Take / Parte / numeração
  const scenes: ScriptScene[] = [];
  let currentScene: ScriptScene | null = null;

  const pushCurrent = () => {
    if (currentScene && (currentScene.direction || currentScene.speech || currentScene.notes)) {
      scenes.push(currentScene);
    }
  };

  for (const line of bodyLines) {
    const sceneHeaderMatch = line.match(
      /^(?:-{2,}\s*)?(?:🎬\s*)?(?:Cena|Take|Parte|Bloco)\s*\d+\s*(?:[:\-–]\s*(.*))?$/i
    );

    if (sceneHeaderMatch) {
      pushCurrent();
      const rest = (sceneHeaderMatch[1] || '').replace(/-{2,}$/, '').trim();
      currentScene = {
        id: `scene_${Date.now()}_${scenes.length + 1}`,
        sceneNumber: scenes.length + 1,
        direction: '',
        speech: '',
        notes: '',
      };
      if (rest) {
        currentScene.direction = rest;
      }
      continue;
    }

    if (!currentScene) {
      currentScene = {
        id: `scene_${Date.now()}_${scenes.length + 1}`,
        sceneNumber: scenes.length + 1,
        direction: '',
        speech: '',
        notes: '',
      };
    }

    const dirMatch = line.match(
      /^(?:🎥\s*)?(?:Dire[çc][ãa]o(?:\s*\/\s*Cena)?|Cena|Visual|Enquadramento|A[çc][ãa]o|V[íi]deo|Imagem)\s*[:\-–]\s*(.+)$/i
    );
    const speechMatch = line.match(
      /^(?:🗣️\s*|🎙️\s*)?(?:Fala|Texto|Narra[çc][ãa]o|Locu[çc][ãa]o|[ÁA]udio)\s*[:\-–]\s*(.+)$/i
    );
    const notesMatch = line.match(
      /^(?:📝\s*)?(?:Obs(?:\s*\/\s*Tela)?|Observa[çc][ãa]o|Notas?|Texto\s*na\s*tela|Tela|Legenda|Dura[çc][ãa]o|CTA)\s*[:\-–]\s*(.+)$/i
    );

    if (dirMatch) {
      currentScene.direction = currentScene.direction
        ? `${currentScene.direction} ${dirMatch[1].trim()}`
        : dirMatch[1].trim();
    } else if (speechMatch) {
      const cleaned = speechMatch[1].replace(/^["“]|["”]$/g, '').trim();
      currentScene.speech = currentScene.speech ? `${currentScene.speech} ${cleaned}` : cleaned;
    } else if (notesMatch) {
      currentScene.notes = currentScene.notes
        ? `${currentScene.notes} • ${notesMatch[1].trim()}`
        : notesMatch[1].trim();
    } else if (/^[\[\(].*[\]\)]$/.test(line)) {
      const cleaned = line.slice(1, -1).trim();
      currentScene.direction = currentScene.direction
        ? `${currentScene.direction} ${cleaned}`
        : cleaned;
    } else {
      // Texto livre sem prefixo: vira fala da cena (ou nova cena se a atual já tem fala e não havia marcador)
      const hasExplicitHeaders = scenes.length > 0 || Boolean(currentScene.direction);
      if (!hasExplicitHeaders && currentScene.speech) {
        pushCurrent();
        currentScene = {
          id: `scene_${Date.now()}_${scenes.length + 1}`,
          sceneNumber: scenes.length + 1,
          direction: '',
          speech: line.replace(/^["“]|["”]$/g, '').trim(),
          notes: '',
        };
      } else {
        const cleaned = line.replace(/^["“]|["”]$/g, '').trim();
        currentScene.speech = currentScene.speech ? `${currentScene.speech} ${cleaned}` : cleaned;
      }
    }
  }

  pushCurrent();

  if (scenes.length === 0) {
    scenes.push({
      id: `scene_${Date.now()}_1`,
      sceneNumber: 1,
      direction: '',
      speech: hook || title,
      notes: '',
    });
  }

  return {
    title,
    hook,
    scenes: scenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 })),
  };
}

/**
 * Converte texto bruto (de .docx, .txt, .md ou colado) em 1 ou mais roteiros estruturados por cenas.
 */
export function parseImportedScriptsDocument(rawText: string): ParsedImportedScript[] {
  const normalized = (rawText || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Divide múltiplos roteiros por separadores explícitos (===, --- isolado antes de título, ou "ROTEIRO 1 / ROTEIRO 2")
  const splitRegex =
    /(?=^(?:={3,}|#{1,2}\s*Roteiro\s*\d+|Roteiro\s*\d+\s*[:\-–]|V[íi]deo\s*\d+\s*[:\-–]|Reels\s*\d+\s*[:\-–]|🎬\s*.+))/gim;

  const rawBlocks = normalized
    .split(splitRegex)
    .map((b) => b.replace(/^={3,}\s*/g, '').trim())
    .filter((b) => b.length > 0);

  const blocks = rawBlocks.length > 0 ? rawBlocks : [normalized];
  const parsed: ParsedImportedScript[] = [];

  blocks.forEach((block, idx) => {
    const item = parseSingleScriptBlock(block, idx + 1);
    if (item) parsed.push(item);
  });

  return parsed;
}
