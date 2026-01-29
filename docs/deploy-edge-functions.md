# Deploy das Edge Functions no Supabase Self-Hosted

Este guia explica como fazer o deploy das Edge Functions no seu Supabase Self-Hosted.

## Pré-requisitos

- Acesso SSH ao servidor onde o Supabase está rodando
- O Supabase deve estar instalado via Docker Compose

## Método 1: Via SSH (Recomendado)

### 1. Conectar ao servidor

```bash
ssh seu-usuario@banco.ublochat.com.br
```

### 2. Navegar até o diretório do Supabase

```bash
cd /caminho/para/supabase  # Geralmente /root/supabase ou /opt/supabase
```

### 3. Criar diretório das funções

```bash
mkdir -p volumes/functions/evolution-webhook
```

### 4. Copiar o código da função

Crie o arquivo `index.ts` dentro do diretório da função:

```bash
nano volumes/functions/evolution-webhook/index.ts
```

Cole o conteúdo do arquivo `supabase/functions/evolution-webhook/index.ts` do projeto.

### 5. Reiniciar o Edge Runtime

```bash
docker compose restart edge-runtime
# ou
docker restart supabase_edge_runtime
```

### 6. Verificar o deploy

```bash
curl -X POST https://banco.ublochat.com.br/functions/v1/evolution-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Método 2: Via SFTP/SCP

### 1. Copiar os arquivos localmente

Do seu computador Windows, use um cliente SFTP (FileZilla, WinSCP) ou SCP:

```powershell
# PowerShell
scp -r supabase/functions/evolution-webhook usuario@banco.ublochat.com.br:/caminho/para/supabase/volumes/functions/
```

### 2. Conectar via SSH e reiniciar

```bash
ssh usuario@banco.ublochat.com.br
cd /caminho/para/supabase
docker compose restart edge-runtime
```

---

## Método 3: Configuração do docker-compose.yml

Se você tiver acesso ao `docker-compose.yml` do Supabase, pode montar o volume diretamente:

```yaml
edge-runtime:
  # ... outras configurações
  volumes:
    - ./volumes/functions:/home/deno/functions:ro
```

---

## Variáveis de Ambiente Necessárias

As Edge Functions usam essas variáveis que são automaticamente injetadas pelo Supabase:

- `SUPABASE_URL`: URL do seu Supabase (https://banco.ublochat.com.br)
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase

---

## Configuração do Webhook na Evolution API

Após o deploy da função, configure o webhook na Evolution API para apontar para:

```
https://banco.ublochat.com.br/functions/v1/evolution-webhook
```

**Eventos recomendados:**
- `MESSAGES_UPSERT`
- `MESSAGES_UPDATE`
- `CONNECTION_UPDATE`
- `INSTANCE_DELETE`

---

## Alternativa: Usar o Servidor Backend

Se você tiver dificuldades com as Edge Functions, pode usar o servidor backend como alternativa:

1. Inicie o servidor backend:
```bash
cd server
npm install
node index.js
```

2. Configure o webhook para apontar para:
```
http://seu-servidor:3001/webhook/evolution
```

3. Atualize a variável no `.env.local`:
```env
VITE_WEBHOOK_URL=http://seu-servidor:3001/webhook/evolution
```

---

## Verificando o Funcionamento

1. Abra o sistema em `http://localhost:3000`
2. Crie uma nova instância do WhatsApp
3. Verifique no console do navegador se o webhook foi configurado
4. Envie uma mensagem de teste e verifique se aparece no sistema
