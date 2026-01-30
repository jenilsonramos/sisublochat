# Guia de Instalação Passo a Passo - SisUbloChat (Ubuntu 24.04)

Este guia foi feito para você **copiar e colar** os comandos na sua VPS. Ele vai instalar tudo automaticamente para o domínio **ublochat.com.br**.

## O que será instalado?
1. **Docker**: O motor que fará o sistema rodar isolado e seguro.
2. **Git**: Para baixar os arquivos do seu repositório `sisublochat`.
3. **Caddy**: Para gerar o cadeado SSL (HTTPS) automaticamente para seus domínios.
4. **SisUbloChat**: O seu sistema completo.

---

## 1. Atualizar o Servidor
Primeiro, vamos garantir que seu Ubuntu está com as últimas atualizações de segurança.

Copie e cole:
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 2. Instalar Docker e Git
Vamos instalar o Docker (versão oficial) e o Git.

Copie e cole todo o bloco abaixo de uma vez:
```bash
# Instalar pacotes necessários
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Baixar a chave de segurança do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar o repositório do Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar o Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Iniciar o Docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 3. Baixar o Sistema (Clone)
Vamos baixar o seu sistema do GitHub para a pasta `sisublochat`.

Copie e cole:
```bash
cd ~
git clone https://github.com/jenilsonramos/sisublochat.git sisublochat
cd sisublochat
```

---

## 4. Configurar SSL (HTTPS) Automático
Vamos criar o arquivo de configuração do Caddy com seus domínios corretos (`ublochat.com.br`). Não precisa editar nada, o comando abaixo cria o arquivo pronto.

Copie e cole todo o bloco:
```bash
cat <<EOF > Caddyfile
ublochat.com.br {
    reverse_proxy 127.0.0.1:3000
}

api.ublochat.com.br {
    reverse_proxy 127.0.0.1:3001
}

banco.ublochat.com.br {
    reverse_proxy 127.0.0.1:8000
}
EOF
```

---

## 5. Iniciar o Sistema
Agora vamos ligar tudo. Este comando vai baixar as "imagens" do sistema e iniciar os serviços.

Copie e cole:
```bash
sudo docker compose up -d --build
```
*Aguarde alguns minutos até finalizar.*

---

## 6. Configurar Banco de Dados e Admin
Agora que o sistema está rodando, vamos criar as tabelas e o seu usuário administrador.

Copie e cole:
```bash
sudo docker compose exec server npm run migrate
```
**O que isso faz?** Cria seu usuário admin com o email `jenilson@outlook.com.br`.

---

## 7. Ativar o SSL (Cadeado de Segurança)
Por último, vamos iniciar o Caddy para gerenciar seus certificados SSL.

Copie e cole:
```bash
sudo docker run -d \
    --name caddy \
    --restart unless-stopped \
    --network host \
    -v \$(pwd)/Caddyfile:/etc/caddy/Caddyfile \
    -v caddy_data:/data \
    caddy
```

---

## ✅ Pronto!
Seu sistema deve estar acessível em:
- **Site**: https://ublochat.com.br
- **API**: https://api.ublochat.com.br
- **Banco**: https://banco.ublochat.com.br

**Dados de Acesso Admin:**
- **Email**: `jenilson@outlook.com.br`
- **Senha**: `125714Ab#`
