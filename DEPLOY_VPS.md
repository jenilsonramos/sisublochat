# Instalação Rápida - SisUbloChat

Como o banco de dados já está configurado, você só precisa colocar o sistema no ar.

## Passo 1: Preparar a VPS (Se for nova)
Copie e cole este bloco para instalar Docker e Git:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Git e Curl
sudo apt install -y git curl

# Instalar Docker (Script Oficial Automático)
curl -fsSL https://get.docker.com | sh
```

## Passo 2: Baixar e Rodar
Copie e cole este bloco para baixar o sistema e colocar tudo no ar (com SSL automático):

```bash
# 1. Baixar o sistema
cd ~
git clone https://github.com/jenilsonramos/sisublochat.git sisublochat
cd sisublochat

# Configurar SSL (Apenas ublochat.com.br)
cat <<EOF > Caddyfile
ublochat.com.br {
    # Backend (API)
    handle_path /api/* {
        reverse_proxy app_backend:3001
    }
    
    # WebSocket (Socket.io)
    handle /socket.io/* {
        reverse_proxy app_backend:3001
    }

    # Frontend (Site)
    handle {
        reverse_proxy app_frontend:80
    }
}
EOF

# 3. Iniciar o sistema
sudo docker compose up -d --build
```

**Pronto!** O sistema estará funcionando em `https://ublochat.com.br`.

## Comandos Úteis (Manutenção)

Ver se está rodando:
```bash
sudo docker ps
```

Ver logs do sistema (Backend):
```bash
sudo docker logs -f ublochat_backend
```

Parar tudo:
```bash
sudo docker compose down
```
