# Documentação de Integração API - Ublochat

Esta documentação descreve como sistemas externos podem gerenciar saudações e horários via requisições cURL.

---

## 1. Horário de Atendimento

### Atualizar Configurações (cURL)
```bash
curl --location --request POST 'https://<SEU_PROJETO>.supabase.co/rest/v1/business_hours' \
--header 'apikey: SEU_TOKEN_AQUI' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--header 'Content-Type: application/json' \
--header 'Prefer: resolution=merge-duplicates' \
--data-raw '{
  "user_id": "UUID_DO_USUARIO",
  "enabled": true,
  "timezone": "America/Sao_Paulo",
  "away_message": "Estamos fora do horário comercial.",
  "monday_enabled": true,
  "monday_start": "08:00:00",
  "monday_end": "18:00:00"
}'
```

---

## 2. Saudações Automáticas

As saudações são configuradas na tabela `chatbots`.

### Passo 1: Criar/Atualizar Robô de Saudação (cURL)
```bash
curl --location --request POST 'https://<SEU_PROJETO>.supabase.co/rest/v1/chatbots' \
--header 'apikey: SEU_TOKEN_AQUI' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--header 'Content-Type: application/json' \
--header 'Prefer: resolution=merge-duplicates' \
--data-raw '{
  "user_id": "UUID_DO_USUARIO",
  "name": "Saudação Integrada",
  "type": "GREETING",
  "status": "ACTIVE",
  "trigger": "cooldown:24"
}'
```

### Passo 2: Configurar Mensagem (Steps)
```bash
curl --location --request POST 'https://<SEU_PROJETO>.supabase.co/rest/v1/chatbot_steps' \
--header 'apikey: SEU_TOKEN_AQUI' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--header 'Content-Type: application/json' \
--data-raw '{
  "chatbot_id": "UUID_DO_ROBO",
  "type": "text",
  "content": "Olá {{primeiro_nome}}, como posso ajudar?",
  "order": 1,
  "delay": 2
}'
```

---

## 3. Comandos Úteis

### Resetar Saudação para um Contato
```bash
curl --location --request PATCH 'https://<SEU_PROJETO>.supabase.co/rest/v1/conversations?remote_jid=eq.5511999999999@s.whatsapp.net' \
--header 'apikey: SEU_TOKEN_AQUI' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--header 'Content-Type: application/json' \
--data-raw '{
  "last_greeted_at": null
}'
```
