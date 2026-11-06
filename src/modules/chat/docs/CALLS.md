# Ligações e reações no chat

Contrato completo da API: `docs/LIGACOES.md` no backend.

## Ligações (WebRTC)

- **Onde começa:** cabeçalho da conversa em `views/ChatView.vue`, botões "Ligação de voz" e
  "Chamada de vídeo". Aparecem em conversas com 2 a 6 pessoas (`CALL_MAX_PEOPLE`, igual ao
  `CALL_MAX_PARTICIPANTS` do backend). Conversas maiores continuam com o Meet.
- **Estado:** `stores/call.ts` (`useCallStore`). Fases `idle → outgoing/incoming → active`.
  Uma `RTCPeerConnection` por pessoa (malha); quem entra por último manda a oferta.
- **Eventos:** chegam pelo socket único (`composables/useChatSocket.ts`); `useChatAlerts`
  manda os `call.*` para o `useCallStore` e os `chat.*` para o `useChatStore`. Os sinais
  WebRTC saem pelo socket (`sendRealtime`) e, com ele fechado, pelo `POST /calls/<id>/signal/`.
- **Tela:** `components/callOverlay.vue`, montado uma vez no `DefaultLayout`: toque com
  Atender/Recusar, vídeos, microfone, câmera, compartilhar a tela e encerrar.
- **Resumo:** quando a ligação termina, o backend publica uma mensagem com `call`
  preenchido; `chatMessageItem.vue` mostra um selo em português no lugar do balão.

Sem variáveis novas no frontend: os servidores ICE vêm de `GET /calls/ice-servers/`.
O navegador pede permissão de microfone/câmera e exige HTTPS fora de `localhost`.

## Reações

`components/chatReactions.vue` mostra os emojis e um seletor rápido; `chat.react()` chama
`POST /chat/messages/<id>/reactions/` (mesmo emoji de novo remove). Os outros recebem a
mudança como `chat.message_updated`.
