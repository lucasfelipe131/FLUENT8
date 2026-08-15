const { buildHeuristicCoach } = require('./coach');

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French'
};

const LANGUAGE_HINTS = {
  en: 'en',
  es: 'es',
  fr: 'fr'
};

const AUDIO_FORMATS = new Set(['wav', 'mp3']);
const MAX_AUDIO_BYTES = 2.5 * 1024 * 1024;

function hasVoiceAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function clampScore(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function stripCodeFence(value = '') {
  return String(value)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function parseJsonReply(value) {
  const clean = stripCodeFence(value);
  try { return JSON.parse(clean); }
  catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('invalid_voice_analysis');
    return JSON.parse(clean.slice(start, end + 1));
  }
}

async function openAI(path, options = {}) {
  const { timeoutMs = 45000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://api.openai.com/v1${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...(fetchOptions.headers || {})
      }
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 600);
      throw new Error(`openai_${response.status}:${detail}`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function validateAudio(input = {}) {
  const format = String(input.format || '').toLowerCase();
  if (!AUDIO_FORMATS.has(format)) throw new Error('unsupported_audio_format');
  const audio = Buffer.from(String(input.audio || ''), 'base64');
  if (audio.length < 1600) throw new Error('audio_too_short');
  if (audio.length > MAX_AUDIO_BYTES) throw new Error('audio_too_large');
  return { audio, format };
}

async function transcribe({ audio, format, lang, prompt }) {
  const form = new FormData();
  const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  form.set('file', new Blob([audio], { type: mime }), `fluent8.${format}`);
  form.set('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe');
  if (LANGUAGE_HINTS[lang]) form.set('language', LANGUAGE_HINTS[lang]);
  if (prompt) form.set('prompt', String(prompt).slice(0, 400));
  const response = await openAI('/audio/transcriptions', {
    method: 'POST',
    body: form,
    timeoutMs: 50000
  });
  const data = await response.json();
  const text = String(data.text || '').trim();
  if (!text) throw new Error('empty_transcript');
  return text;
}

function voiceInstructions(lang, level) {
  const language = LANGUAGE_NAMES[lang] || 'English';
  return [
    'You are Fluent8, a premium language teacher and pronunciation coach.',
    `The student is learning ${language} at level ${level || 'A1'}.`,
    'Listen to the supplied audio itself. Evaluate audible pronunciation, stress, rhythm, pacing and intelligibility; do not infer pronunciation from spelling alone.',
    'React naturally to the meaning of the answer and keep the conversation moving.',
    `teacher_reply, correction and next_prompt must be in ${language}.`,
    'feedback_pt, pronunciation_tip_pt and sound_focus_pt must be concise Brazilian Portuguese.',
    'Use supportive but honest scoring. Scores below 60 require a specific audible problem; scores above 90 require near-native clarity.',
    'Return only valid JSON with exactly these keys:',
    'teacher_reply, correction, next_prompt, translation_pt, feedback_pt, pronunciation_tip_pt, sound_focus_pt,',
    'voice_scores (pronunciation, fluency, rhythm, overall),',
    'language_scores (grammar, vocabulary, naturalness),',
    'memory_update (note, strengths, weaknesses, saved_phrase, topic).',
    'All scores are integers from 0 to 100. Arrays in memory_update contain short Brazilian Portuguese labels.'
  ].join(' ');
}

async function analyzeVoice({ audioBase64, format, lang, body, transcript }) {
  const response = await openAI('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_AUDIO_MODEL || 'gpt-audio-1.5',
      modalities: ['text'],
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: voiceInstructions(lang, body.student?.level) },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                verified_transcript: transcript,
                student: body.student || {},
                scenario: body.scenario || 'free',
                current_prompt: body.prompt || '',
                turn: Number(body.turn || 0),
                recent_history: Array.isArray(body.history) ? body.history.slice(-8) : [],
                memory: body.memory || {}
              })
            },
            {
              type: 'input_audio',
              input_audio: { data: audioBase64, format }
            }
          ]
        }
      ]
    }),
    timeoutMs: 60000
  });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty_voice_analysis');
  return parseJsonReply(content);
}

function normalizeAnalysis(raw, transcript, body) {
  const voice = raw.voice_scores || {};
  const language = raw.language_scores || {};
  const pronunciation = clampScore(voice.pronunciation, 0);
  const fluency = clampScore(voice.fluency, pronunciation);
  const rhythm = clampScore(voice.rhythm, fluency);
  const overall = clampScore(voice.overall, Math.round((pronunciation + fluency + rhythm) / 3));
  const grammar = clampScore(language.grammar, overall);
  const naturalness = clampScore(language.naturalness, overall);
  const memory = raw.memory_update || {};
  return {
    ai: true,
    mode: 'voice',
    transcript,
    teacher_reply: String(raw.teacher_reply || '').trim(),
    correction: String(raw.correction || transcript).trim(),
    next_prompt: String(raw.next_prompt || body.prompt || '').trim(),
    translation_pt: String(raw.translation_pt || '').trim(),
    feedback_pt: String(raw.feedback_pt || '').trim(),
    pronunciation_tip_pt: String(raw.pronunciation_tip_pt || '').trim(),
    sound_focus_pt: String(raw.sound_focus_pt || '').trim(),
    voice_scores: { pronunciation, fluency, rhythm, overall },
    scores: { pronunciation, grammar, naturalness, overall },
    note: String(memory.note || raw.feedback_pt || '').trim(),
    memory_update: {
      note: String(memory.note || raw.feedback_pt || '').trim(),
      strengths: Array.isArray(memory.strengths) ? memory.strengths.slice(0, 4) : [],
      weaknesses: Array.isArray(memory.weaknesses) ? memory.weaknesses.slice(0, 4) : [],
      saved_phrase: String(memory.saved_phrase || raw.correction || '').trim(),
      topic: String(memory.topic || body.scenario || 'free').trim()
    }
  };
}

async function synthesizeSpeech(text, lang) {
  const input = String(text || '').trim().slice(0, 1400);
  if (!input) return null;
  const language = LANGUAGE_NAMES[lang] || 'English';
  const response = await openAI('/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE || 'marin',
      input,
      response_format: 'mp3',
      instructions: `Speak in natural ${language}. Warm, clear language teacher. Conversational cadence, realistic pauses, concise and encouraging. Do not sound like an announcer.`
    }),
    timeoutMs: 45000
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { data: bytes.toString('base64'), mime: 'audio/mpeg' };
}

async function processVoice(input = {}) {
  if (!hasVoiceAI()) {
    const error = new Error('voice_ai_not_configured');
    error.statusCode = 503;
    throw error;
  }
  const { audio, format } = validateAudio(input);
  const lang = LANGUAGE_NAMES[input.lang] ? input.lang : 'en';
  const body = input.context && typeof input.context === 'object' ? input.context : {};
  const audioBase64 = audio.toString('base64');
  const transcript = await transcribe({ audio, format, lang, prompt: body.prompt });
  let normalized;
  try {
    const analysis = await analyzeVoice({ audioBase64, format, lang, body, transcript });
    normalized = normalizeAnalysis(analysis, transcript, body);
  } catch (error) {
    const fallback = buildHeuristicCoach({ ...body, lang, userText: transcript });
    normalized = {
      ...fallback,
      ai: false,
      mode: 'voice_transcript_only',
      transcript,
      feedback_pt: 'A transcrição funcionou, mas a análise acústica não ficou disponível nesta tentativa.',
      pronunciation_tip_pt: 'Tente novamente em um ambiente silencioso.',
      sound_focus_pt: '',
      voice_scores: null
    };
  }
  try {
    normalized.audio = await synthesizeSpeech(
      [normalized.teacher_reply, normalized.next_prompt].filter(Boolean).join(' '),
      lang
    );
  } catch {
    normalized.audio = null;
  }
  return normalized;
}

module.exports = {
  MAX_AUDIO_BYTES,
  hasVoiceAI,
  normalizeAnalysis,
  parseJsonReply,
  processVoice,
  synthesizeSpeech,
  validateAudio
};
