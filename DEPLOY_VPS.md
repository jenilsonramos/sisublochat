# Guia de Instalação na VPS (Ubuntu 24.04)

Este guia contém o passo a passo completo para configurar um servidor Ubuntu 24.04 do zero e colocar o sistema **SisUbloChat** no ar com SSL.

## 1. Acesso e Atualização do Sistema
Acesse sua VPS via SSH e execute os comandos abaixo para garantir que o sistema está atualizado.

```bash
# Atualizar lista de pacotes e o sistema
sudo apt update && sudo apt upgrade -y
```

## 2. Instalar Docker e Git
O sistema roda em containers, então precisamos do Docker.

```bash
# Instalar utilitários essenciais
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Adicionar repositório oficial do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker e Docker Compose (Plugin)
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar se instalou corretamente
docker compose version
```

## 3. Instalar e Configurar o Projeto

Vamos baixar o código e preparar o ambiente.

```bash
# 1. Navegar para a pasta home (ou outra de sua preferência)
cd ~

# 2. Clonar o repositório
git clone https://github.com/jenilsonramos/sisublochat.git evolutionapi

# 3. Entrar na pasta do projeto
cd evolutionapi

# 4. Verificar se o arquivo .env está correto (OPCIONAL, apenas para conferência)
# Os arquivos já foram enviados configurados, mas confira se necessário:
cat server/.env
```

## 4. Iniciar o Sistema

Agora vamos subir os containers (Backend, Frontend e Banco de Dados, se aplicável).

```bash
# Iniciar em modo 'detach' (segundo plano) e reconstruir as imagens se necessário
sudo docker compose up -d --build
```

### Verificar se subiu tudo
```bash
sudo docker compose ps
```
Você deve ver containers como `server`, `web` (ou similar) com status `Up`.

## 5. Migrações do Banco de Dados

Para criar as tabelas e o usuário administrador:

```bash
# Execute o comando de migração dentro do container do servidor
sudo docker compose exec server npm run migrate
```

Isso irá criar o administrador:
- **Email**: `jenilson@outlook.com.br`
- **Senha**: `125714Ab#`

## 6. Configurar SSL (HTTPS) com Caddy

A maneira mais fácil de ter HTTPS automático é usando o **Caddy**.

### Opção A: Rodar Caddy via Docker (Recomendado)

1. **Criar o arquivo Caddyfile** na raiz do projeto (`~/evolutionapi`):

```bash
nano Caddyfile
```

2. **Colar o seguinte conteúdo** (Ctrl+Shift+V para colar):

```caddyfile
ublochat.com.br {
    reverse_proxy 127.0.0.1:3000
}

api.ublochat.com.br {
    reverse_proxy 127.0.0.1:3001
}

# Se você estiver rodando o banco/supabase viewer publicamente (cuidado com segurança)
banco.ublochat.com.br {
    reverse_proxy 127.0.0.1:8000
}
```
*Salve com `Ctrl+O`, `Enter` e saia com `Ctrl+X`.*

> **Atenção**: Certifique-se que o Firewall da VPS (portas 80 e 443) está liberado.

3. **Iniciar o Caddy**:

```bash
sudo docker run -d \
    --name caddy \
    --restart unless-stopped \
    --network host \
    -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile \
    -v caddy_data:/data \
    caddy
```

Agora acesse **https://ublochat.com.br**. O SSL deve estar ativo.

---

## Comandos Úteis para Manutenção

- **Ver logs do servidor**:
  ```bash
  sudo docker compose logs -f server
  ```
- **Parar o sistema**:
  ```bash
  sudo docker compose down
  ```
- **Atualizar o sistema** (quando você fizer push de novidades):
  ```bash
  git pull origin main
  sudo docker compose up -d --build
  ```
