#!/bin/bash

# Criar diretórios necessários
mkdir -p certbot/conf
mkdir -p certbot/www

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Instalar Certbot
echo "Instalando Certbot..."
sudo apt-get update
sudo apt-get install -y certbot

# Parar containers existentes
docker-compose -f docker-compose.vps.yml down

# Gerar certificado SSL usando Let's Encrypt
echo "Gerando certificado SSL com Let's Encrypt..."
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@actplanconsultoria.com \
    -d api.actplanconsultoria.com \
    --http-01-port=80

# Copiar certificados para o diretório do Certbot
mkdir -p certbot/conf/live/api.actplanconsultoria.com
sudo cp /etc/letsencrypt/live/api.actplanconsultoria.com/privkey.pem certbot/conf/live/api.actplanconsultoria.com/
sudo cp /etc/letsencrypt/live/api.actplanconsultoria.com/fullchain.pem certbot/conf/live/api.actplanconsultoria.com/
sudo chown -R $USER:$USER certbot/conf/live/api.actplanconsultoria.com/

# Iniciar os serviços
docker-compose -f docker-compose.vps.yml up -d

echo "Serviços iniciados com sucesso!"
echo "Para visualizar os logs, execute: docker-compose -f docker-compose.vps.yml logs -f"
