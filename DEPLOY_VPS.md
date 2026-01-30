# Deploy na VPS - SisUbloChat

Este guia contém as instruções para implantar o sistema na sua VPS e configurar o SSL.

## Pré-requisitos na VPS
- **Docker** e **Docker Compose** instalados.
- **Git** instalado.

## Passo a Passo

1. **Clonar/Atualizar o Repositório**
   Acesse sua VPS via SSH e navegue até a pasta onde deseja instalar (ou atualize se já existir).
   ```bash
   # Se for primeira instalação:
   git clone https://github.com/jenilsonramos/sisublochat.git evolutionapi
   cd evolutionapi
   
   # Se já existir:
   cd evolutionapi
   git pull origin main
   ```

2. **Verificar Configurações**
   Certifique-se de que o arquivo `.env` (ou `server/.env`) está com as credenciais corretas que acabamos de configurar.
   Caso precise editar na VPS:
   ```bash
   nano server/.env
   # Salve com Ctrl+O e Saia com Ctrl+X
   ```
   *Nota: O `DB_HOST` está configurado como `supabase_db` assumindo que o banco roda no mesmo docker-compose. Se o banco for externo ou rodar direto na máquina, ajuste para o IP correto.*

3. **Subir os Containers**
   Na pasta raiz do projeto, execute:
   ```bash
   docker-compose up -d --build
   ```
   Isso irá construir as imagens e iniciar o sistema.

4. **Rodar Migrações do Banco**
   Para garantir que o banco tenha todas as tabelas e o usuário admin:
   ```bash
   # Opção 1: Se houver script via container
   docker-compose exec server npm run migrate
   
   # Opção 2: Rodar manualmente conectando no banco (necessário cliente psql ou usar a interface do Supabase Studio se disponível)
   # O sistema deve rodar as migrações ao iniciar se estiver configurado para tal.
   ```

## Configuração de SSL do Domínio (ublochat.com.br)

Para ativar o SSL no domínio `ublochat.com.br` e `api.ublochat.com.br`, recomendamos usar o **Caddy** ou **Nginx** como Proxy Reverso.

### Exemplo com Caddy (Mais fácil - Automático)

1. Crie ou edite o arquivo `Caddyfile` na raiz (se estiver usando Docker para o Caddy):
   ```caddyfile
   ublochat.com.br {
       reverse_proxy 127.0.0.1:3000
   }

   api.ublochat.com.br {
       reverse_proxy 127.0.0.1:3001
   }
   
   banco.ublochat.com.br {
       reverse_proxy 127.0.0.1:8000
   }
   ```
   *Ajuste as portas (3000, 3001, 8000) conforme o que estiver rodando no seu docker-compose.*

2. Suba o Caddy:
   ```bash
   docker run -d --name caddy --network host -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile -v caddy_data:/data caddy
   ```

### Verificação
Acesse https://ublochat.com.br e verifique se o sistema carrega e se o cadeado SSL aparece.

## Admin
**Email**: jenilson@outlook.com.br
**Senha**: 125714Ab#
