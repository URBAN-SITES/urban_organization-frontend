# Cobranças das tarefas

Cobranças (vaquinhas) anexadas a uma tarefa e pagas por Pix, pelo Mercado Pago. É o que sobrou
deste módulo: o plano pago da IA foi removido (front e back), e o assistente é liberado para
toda conta logada, com limite de uso por hora no backend.

- Componentes: `TaskCharges` (lista e cria cobranças na tarefa), `ChargePayDialog` e `PixCode`.
- Store: `useChargesStore`; serviços em `services/charge.ts`, sempre pela instância do axios.
- Backend: `MP_ACCESS_TOKEN` (só no servidor) e o webhook `POST /api/v1/payments/webhook/`,
  que confere o status no Mercado Pago antes de aprovar.

## Verificação

```bash
node --test src/modules/payments/__tests__/charges.spec.ts
npm run type-check
```
