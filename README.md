# Fluent8

Aplicativo mobile-first para aprender inglês, espanhol e francês com foco em conversação real.

## Recursos

- missões diárias de 5, 8, 10 ou 15 minutos;
- gravação PCM real compatível com Safari/iPhone;
- transcrição no servidor, sem depender do reconhecimento nativo do navegador;
- notas acústicas de pronúncia, fluência e ritmo;
- respostas faladas com voz natural gerada por IA;
- conversas em inglês, espanhol e francês;
- tratamento específico de permissões e erros de microfone no iPhone;
- respostas por texto como alternativa imediata;
- professor IA com memória individual por aluno;
- correções de clareza, estrutura e naturalidade;
- revisão inteligente, indicadores de fluência e PWA instalável.

## Estrutura

```text
public/          interface, voz, PWA e estilos
src/content.js   idiomas, objetivos e cenários
src/coach.js     professor de texto e fallback local
src/voice.js     transcrição, análise acústica e voz natural
src/server.js    servidor HTTP e API
```

## Executar

```bash
npm start
```

Healthcheck: `GET /health`

O modo digitado mantém um motor adaptativo local como contingência. O modo de voz avançado exige `OPENAI_API_KEY`.

Variáveis opcionais: `OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_AUDIO_MODEL`, `OPENAI_TTS_MODEL` e `OPENAI_TTS_VOICE`.

Os áudios são processados em memória e não são gravados em disco pelo Fluent8.
