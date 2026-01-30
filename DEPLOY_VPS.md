# Instalação Rápida - SisUbloChat

Como o banco de dados já está configurado, você só precisa colocar o sistema no ar.

## Passo 1: Preparar a VPS (Se for nova)
Copie e cole este bloco para instalar Docker e Git:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin git
```

## Passo 2: Baixar e Rodar
Copie e cole este bloco para baixar o sistema e colocar tudo no ar (com SSL automático):

```bash
# 1. Baixar o sistema
cd ~
git clone https://github.com/jenilsonramos/sisublochat.git sisublochat
cd sisublochat

# 2. Configurar domínios (SSL)
cat <<EOF > Caddyfile
ublochat.com.br {
    reverse_proxy 127.0.0.1:3000
}
api.ublochat.com.br {
    reverse_proxy 127.0.0.1:3001
}
EOF

# 3. Iniciar o sistema
sudo docker compose up -d --build
```

**Pronto!** O sistema estará funcionando em `https://ublochat.com.br`.
