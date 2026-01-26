# Documentação de Integração API - Ublochat

Esta documentação descreve como sistemas externos (CRMs, ERPs, etc.) podem integrar e gerenciar as funcionalidades de saudação e horário de atendimento via API.

---

## 1. Horário de Atendimento (Gestão via API)

O controle do horário de atendimento é baseado no banco de dados. Para alterar configurações externamente, use a API do Supabase (PostgREST).

### Dados Técnicos
*   **Tabela**: `public.business_hours`
*   **Endpoint**: `https://<seu-projeto>.supabase.co/rest/v1/business_hours`

### Exemplo de Payload (Atualizar horários)
```json
{
  "user_id": "UUID_DO_USUARIO",
  "enabled": true,
  "timezone": "America/Sao_Paulo",
  "away_message": "Olá! Estamos fora do horário comercial. Retornaremos em breve.",
  "monday_enabled": true,
  "monday_start": "08:00:00",
  "monday_end": "18:00:00",
  "saturday_enabled": false
}
```

### Fluxo de Funcionamento
1. A mensagem chega ao webhook do Evolution.
2. O servidor consulta a tabela `business_hours` do usuário dono da instância.
3. Se o horário atual (baseado no `timezone`) não estiver dentro do intervalo permitido, a `away_message` é enviada.

---

## 2. Saudações Automáticas (Gestão via API)

As saudações são tratadas como um robô do tipo `GREETING` com passos de mensagem vinculados.

### Passo 1: Criar o Robô de Saudação
*   **Tabela**: `public.chatbots`
*   **Configuração**:
    ```json
    {
      "user_id": "UUID_DO_USUARIO",
      "name": "Saudação API",
      "type": "GREETING",
      "status": "ACTIVE",
      "trigger": "cooldown:24"
    }
    ```
    *   *Nota*: O campo `trigger` define o tempo em horas que o sistema deve esperar para saudar o mesmo contato novamente.

### Passo 2: Configurar a Mensagem (Steps)
*   **Tabela**: `public.chatbot_steps`
*   **Exemplo de Mensagem**:
    ```json
    {
      "chatbot_id": "UUID_DO_ROBO_CRIADO",
      "type": "text",
      "content": "Olá {{primeiro_nome}}, como posso ajudar?",
      "order": 1,
      "delay": 2
    }
    ```

### Variáveis Suportadas no Conteúdo:
- `{{nome}}`: Nome completo do contato.
- `{{primeiro_nome}}`: Apenas o primeiro nome.
- `{{telefone}}`: Número de telefone do contato.

---

## 3. Comandos Úteis Extras

### Resetar Saudação para um contato via API
Se você deseja que um contato específico receba a saudação na próxima mensagem, mesmo que ele já tenha recebido recentemente:
1. Localize a conversa na tabela `public.conversations`.
2. Defina o campo `last_greeted_at = NULL`.

### Encaminhar para um Agente via API
Para pausar o robô e atribuir a um atendente humano:
1. Atualize a tabela `public.conversations`.
2. Campo `assigned_agent_id = "UUID_DO_AGENTE"`.
3. Campo `assigned_at = "NOW()"`.
