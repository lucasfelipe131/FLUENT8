# Fluent8

Aplicativo mobile-first para aprender inglês, espanhol e francês com foco em conversação real.

## Recursos

- missões diárias de 5, 8, 10 ou 15 minutos;
- conversas por voz em situações reais;
- tratamento específico de permissões e erros de microfone no iPhone;
- respostas por texto como alternativa imediata;
- professor IA com memória individual por aluno;
- correções de clareza, estrutura e naturalidade;
- revisão inteligente, indicadores de fluência e PWA instalável.

## Estrutura

```text
public/          interface, voz, PWA e estilos
src/content.js   idiomas, objetivos e cenários
src/coach.js     professor IA e fallback local
src/server.js    servidor HTTP e API
```

## Executar

```bash
npm start
```

Healthcheck: `GET /health`

O professor usa o motor adaptativo local por padrão. Para ativar respostas do modelo, configure `OPENAI_API_KEY` e, opcionalmente, `OPENAI_MODEL`.
