const {SCENARIOS}=require('./content');

function choose(arr, idx=0){ return arr[idx % arr.length]; }

function analyzeText(text='', scenario='free', lang='en') {
  const clean = String(text).trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  const chars = clean.length;
  const confidence = Math.min(95, Math.max(42, 48 + words * 5 + (chars > 40 ? 7 : 0)));
  const grammar = Math.min(96, Math.max(45, 46 + words * 6 + (/[?.!]/.test(clean) ? 5 : 0)));
  const natural = Math.min(95, Math.max(42, 43 + words * 6 + (/\b(and|because|but|so|also|pero|porque|mais|parce que)\b/i.test(clean) ? 8 : 0)));
  const avg = Math.round((confidence + grammar + natural) / 3);
  const weaknesses = [];
  const strengths = [];
  if (words < 4) weaknesses.push('expansão de frases');
  else strengths.push('respostas mais completas');
  if (!/[?.!]/.test(clean)) weaknesses.push('entonação e pontuação');
  if (avg >= 80) strengths.push('boa clareza');
  if (/\b(yesterday|last|ago|ayer|hier|demain|tomorrow|mañana)\b/i.test(clean)) strengths.push('marcadores de tempo');
  if (/\b(i|my|me|yo|mi|je|moi)\b/i.test(clean)) strengths.push('fala pessoal e natural');
  const note = avg >= 80
    ? 'Você está respondendo com boa segurança. Agora vamos ganhar mais naturalidade.'
    : avg >= 65
    ? 'Você já consegue se comunicar. O próximo passo é alongar um pouco mais as respostas.'
    : 'A base está começando a aparecer. Vamos priorizar respostas simples e claras.';
  return { confidence, grammar, natural, avg, weaknesses, strengths, note };
}

function betterExample({lang='en', scenario='free', userText=''}) {
  const base = {
    en: {
      hotel: 'I have a reservation for two nights under Lucas Oliveira.',
      restaurant: 'I would like grilled chicken, a salad, and water, please.',
      airport: 'I am traveling for vacation, and I packed my bags myself.',
      work: 'I help clients solve problems by understanding their needs before discussing price.',
      free: 'Today was productive, and I am practicing this language to become more confident.'
    },
    es: {
      hotel: 'Tengo una reserva para dos noches a nombre de Lucas Oliveira.',
      restaurant: 'Quisiera pollo a la parrilla, una ensalada y agua, por favor.',
      airport: 'Viajo por vacaciones y preparé mis maletas yo mismo.',
      work: 'Ayudo a los clientes a resolver problemas entendiendo sus necesidades antes de hablar del precio.',
      free: 'Hoy fue un día productivo y practico este idioma para tener más confianza.'
    },
    fr: {
      hotel: 'J’ai une réservation pour deux nuits au nom de Lucas Oliveira.',
      restaurant: 'Je voudrais du poulet grillé, une salade et de l’eau, s’il vous plaît.',
      airport: 'Je voyage pour les vacances et j’ai préparé mes bagages moi-même.',
      work: 'J’aide les clients à résoudre des problèmes en comprenant leurs besoins avant de parler du prix.',
      free: 'Aujourd’hui a été productif et je pratique cette langue pour parler avec plus de confiance.'
    }
  };
  const candidate = base[lang]?.[scenario] || base[lang]?.free || userText;
  if (!userText || userText.split(/\s+/).length < 4) return candidate;
  const normalized=userText.trim().replace(/\s+/g,' '); return normalized.charAt(0).toUpperCase()+normalized.slice(1)+(/[.!?]$/.test(normalized)?'':'.');
}

function buildHeuristicCoach(body) {
  const lang = body.lang || 'en';
  const scenario = body.scenario || 'free';
  const memory = body.memory || {};
  const analysis = analyzeText(body.userText || '', scenario, lang);
  const correction = betterExample({ lang, scenario, userText: body.userText || '' });
  const promptList = SCENARIOS[scenario]?.prompts?.[lang] || SCENARIOS.free.prompts[lang] || [];
  const nextPrompt = choose(promptList, (body.turn || 0) + 1);
  const weakest = analysis.weaknesses[0] || 'naturalidade';
  const strong = analysis.strengths[0] || 'clareza';
  const note = `${memory.name || 'Aluno'} mostrou ${strong} e precisa focar em ${weakest}.`;
  const tip = weakest === 'expansão de frases'
    ? 'Tente responder usando pelo menos 6 a 10 palavras e inclua um detalhe extra.'
    : weakest === 'entonação e pontuação'
    ? 'Leia a frase em voz alta como se estivesse em uma conversa real e feche com uma pausa clara.'
    : 'Mantenha a ideia simples e acrescente uma segunda informação para soar mais natural.';
  const teacherReply = analysis.avg >= 80
    ? `Boa resposta. Você já está se comunicando bem. Agora vamos deixar isso ainda mais natural.`
    : analysis.avg >= 65
    ? `Boa base. A mensagem foi entendida. Vamos só deixar a frase mais completa e mais fluida.`
    : `Você está no caminho certo. Vamos simplificar e organizar melhor a frase para ganhar confiança.`;
  return {
    ai: false,
    teacher_reply: teacherReply,
    correction,
    tip,
    next_prompt: nextPrompt,
    note,
    scores: {
      pronunciation: analysis.confidence,
      grammar: analysis.grammar,
      naturalness: analysis.natural,
      overall: analysis.avg
    },
    memory_update: {
      note,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      saved_phrase: correction,
      topic: scenario
    }
  };
}

async function buildOpenAICoach(body) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        store: false,
        text: { format: { type: 'json_schema', name: 'fluent8_coach', schema: {
          type: 'object', additionalProperties: false,
          properties: {
            teacher_reply: { type: 'string' },
            correction: { type: 'string' },
            tip: { type: 'string' },
            next_prompt: { type: 'string' },
            note: { type: 'string' },
            scores: {
              type: 'object', additionalProperties: false,
              properties: {
                pronunciation: { type: 'number' },
                grammar: { type: 'number' },
                naturalness: { type: 'number' },
                overall: { type: 'number' }
              },
              required: ['pronunciation','grammar','naturalness','overall']
            },
            memory_update: {
              type: 'object', additionalProperties: false,
              properties: {
                note: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
                saved_phrase: { type: 'string' },
                topic: { type: 'string' }
              },
              required: ['note','strengths','weaknesses','saved_phrase','topic']
            }
          },
          required: ['teacher_reply','correction','tip','next_prompt','note','scores','memory_update']
        }}},
        instructions: [
          'You are Fluent8, a premium language teacher.',
          'The UI is in Brazilian Portuguese, but the corrected example and next prompt must be in the target language.',
          'Be practical, encouraging, concise, and personalized.',
          'Use the student memory to adapt feedback and update the memory.',
          'Never output markdown. Return only valid JSON according to schema.'
        ].join(' '),
        input: JSON.stringify(body)
      })
    });
    if (!response.ok) return null;
    const json = await response.json();
    const text = json.output_text || (json.output || []).flatMap(o => o.content || []).find(c => c.type === 'output_text')?.text;
    if (!text) return null;
    return { ai: true, ...JSON.parse(text) };
  } catch {
    return null;
  }
}

module.exports={buildHeuristicCoach,buildOpenAICoach};
