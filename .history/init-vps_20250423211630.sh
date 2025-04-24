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

# Gerar certificado SSL temporário auto-assinado
echo "Gerando certificado SSL temporário..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout certbot/conf/privkey.pem \
    -out certbot/conf/fullchain.pem \
    -subj "/CN=185.213.26.203"

# Copiar certificado temporário
mkdir -p certbot/conf/live/185.213.26.203
cp certbot/conf/privkey.pem certbot/conf/live/185.213.26.203/
cp certbot/conf/fullchain.pem certbot/conf/live/185.213.26.203/

# Atualizar nginx-vps.conf com o IP correto
sed -i 's/your-domain/185.213.26.203/g' nginx-vps.conf

# Parar containers existentes
docker-compose -f docker-compose.vps.yml down

# Iniciar os serviços
docker-compose -f docker-compose.vps.yml up -d

echo "Serviços iniciados com sucesso!"
echo "Para visualizar os logs, execute: docker-compose -f docker-compose.vps.yml logs -f"
