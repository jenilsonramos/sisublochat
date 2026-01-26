# Documentação de Uso - Ublochat

Esta seção detalha o funcionamento das novas funcionalidades de atendimento automático.

## 1. Saudações Automáticas (Greeting Messages)

A funcionalidade de saudação envia uma mensagem automática para novos contatos ou após um período de inatividade.

### Como configurar:
1. No painel **Chatbots**, clique no botão **Saudação** (ícone de mão 👋).
2. Selecione a instância conectada.
3. Digite a mensagem de boas-vindas que deseja enviar.
4. Defina o **Tempo de Cooldown** (em horas). Isso evita que o cliente receba a mesma saudação repetidamente.
   - *Exemplo:* Se definir 24 horas, o cliente só receberá a saudação novamente se mandar mensagem após um dia inteiro sem interagir.

### Funcionamento Técnico:
- O sistema verifica a coluna `last_greeted_at` na tabela `conversations`.
- Se o campo estiver vazio ou o tempo de cooldown tiver passado, a mensagem é disparada e o campo é atualizado.

---

## 2. Horário de Atendimento (Business Hours)

Permite definir em quais momentos o robô deve responder e enviar uma mensagem de "ausência" fora desses horários.

### Como configurar:
1. No painel **Chatbots**, clique no botão **Horários** (ícone de relógio 🕒).
2. Ative a chave **Habilitar Horário de Atendimento**.
3. Escreva sua **Mensagem de Ausência**.
4. Para cada dia da semana, marque se está aberto ou fechado e defina os horários de início e fim (formato 24h).

### Funcionamento Técnico:
- O robô valida o horário local (conforme o fuso horário configurado) antes de processar qualquer fluxo ou IA.
- Se estiver fora do horário, ele envia a mensagem de ausência e ignora o processamento do fluxo principal para evitar respostas incoerentes.
- Para evitar spam, a mensagem de ausência só é enviada uma vez a cada 24 horas para o mesmo contato.

---

## 3. Integração com Flow Builder

Ambas as funções são processadas pelo **Webhook**. Certifique-se de que o deploy das funções do Supabase está atualizado.

### Deploy das funções:
```bash
supabase functions deploy evolution-webhook
```

---

## Dicas de Boas Práticas:
- **Resete as Saudações**: Se você mudar drasticamente sua mensagem de boas-vindas, use o botão "Resetar Saudações" no modal para que todos os clientes recebam a nova versão imediatamente.
- **Pausar em massa**: Caso precise parar todos os atendimentos rapidamente, use o botão "Pausar Todos" no painel principal.
