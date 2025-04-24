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

# Parar containers existentes
docker-compose -f docker-compose.vps.yml down

# Iniciar os serviços
docker-compose -f docker-compose.vps.yml up -d

echo "Serviços iniciados com sucesso!"
echo "Para visualizar os logs, execute: docker-compose -f docker-compose.vps.yml logs -f"
