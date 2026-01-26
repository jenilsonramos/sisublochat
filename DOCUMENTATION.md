# Documentação de Integração API - Local (Sistema)

Esta documentação descreve como sistemas externos podem gerenciar saudações e horários através da API do próprio Sistema (Ublochat), utilizando o padrão de autenticação do painel.

---

## 1. Autenticação

Todas as requisições devem incluir o token JWT do sistema no cabeçalho `Authorization`.

```bash
--header 'Authorization: Bearer SEU_TOKEN_JWT'
```

---

## 2. Horário de Atendimento

### Recuperar Configuração (GET)
```bash
curl --location --request GET 'https://api.ublochat.com.br/config/business-hours' \
--header 'Authorization: Bearer SEU_TOKEN_JWT'
```

### Atualizar Configuração (POST)
```bash
curl --location --request POST 'https://api.ublochat.com.br/config/business-hours' \
--header 'Authorization: Bearer SEU_TOKEN_JWT' \
--header 'Content-Type: application/json' \
--data-raw '{
  "enabled": true,
  "timezone": "America/Sao_Paulo",
  "away_message": "Estamos fora do horário comercial.",
  "monday_enabled": true,
  "monday_start": "08:00:00",
  "monday_end": "18:00:00"
}'
```

---

## 3. Saudações Automáticas

### Recuperar Saudação (GET)
```bash
curl --location --request GET 'https://api.ublochat.com.br/config/greeting' \
--header 'Authorization: Bearer SEU_TOKEN_JWT'
```

### Atualizar Saudação e Mensagens (POST)
```bash
curl --location --request POST 'https://api.ublochat.com.br/config/greeting' \
--header 'Authorization: Bearer SEU_TOKEN_JWT' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Saudação API",
  "status": "ACTIVE",
  "trigger": "cooldown:24",
  "steps": [
    {
      "type": "text",
      "content": "Olá {{primeiro_nome}}, bem-vindo!",
      "delay": 2,
      "order": 1
    }
  ]
}'
```

---

## 4. Comandos Úteis

### Resetar Saudações (POST)
Reseta o contador para que todos os contatos recebam a saudação novamente na próxima mensagem.
```bash
curl --location --request POST 'https://api.ublochat.com.br/config/reset-greeting' \
--header 'Authorization: Bearer SEU_TOKEN_JWT'
```
