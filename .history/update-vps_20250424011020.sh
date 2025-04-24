#!/bin/bash

# Copiar arquivos de configuração
scp docker-compose.vps.yml root@185.213.26.203:/root/
scp nginx-vps.conf root@185.213.26.203:/root/
scp -r pdf-processor root@185.213.26.203:/root/

# Comandos para executar na VPS
ssh root@185.213.26.203 << 'EOF'
# Parar containers existentes
docker-compose -f docker-compose.vps.yml down

# Remover imagens antigas
docker rmi root-pdf-extractor-service -f
docker rmi root-pdf-processor -f

# Reconstruir e iniciar os serviços
docker-compose -f docker-compose.vps.yml up -d --build

# Mostrar status dos containers
docker-compose -f docker-compose.vps.yml ps
EOF
