# Deploy PDF Processor para Google Cloud Run

## Pré-requisitos

1. **Google Cloud CLI instalado**
   ```bash
   # Baixe e instale em: https://cloud.google.com/sdk/docs/install
   ```

2. **Autenticação no Google Cloud**
   ```bash
   gcloud auth login
   gcloud config set project pdf-processor-193066072273
   ```

## Opções de Deploy

### Opção 1: Script Automático (Windows)
```bash
cd pdf-processor
./deploy.bat
```

### Opção 2: Comandos Manuais

1. **Navegar para o diretório**
   ```bash
   cd sistema_actplan2/pdf-processor
   ```

2. **Fazer deploy**
   ```bash
   gcloud run deploy pdf-processor \
     --source . \
     --project pdf-processor-193066072273 \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 300 \
     --max-instances 10
   ```

### Opção 3: Deploy via Console Web

1. Acesse: https://console.cloud.google.com/run
2. Selecione o projeto: `pdf-processor-193066072273`
3. Clique em "Create Service"
4. Selecione "Deploy from source code"
5. Conecte o repositório GitHub
6. Configure:
   - **Source**: `sistema_actplan2/pdf-processor`
   - **Build Type**: Dockerfile
   - **Region**: us-central1
   - **Memory**: 2 GiB
   - **CPU**: 2
   - **Timeout**: 300s
   - **Authentication**: Allow unauthenticated

## Verificação Pós-Deploy

Após o deploy, teste a nova API:

```bash
curl -X POST "https://pdf-processor-193066072273.us-central1.run.app/api/extraction/extract" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@seu_arquivo.pdf"
```

## Estrutura do Projeto

```
pdf-processor/
├── Dockerfile          # Configuração do container
├── requirements.txt    # Dependências Python
├── app/
│   └── main.py        # Aplicação FastAPI com correções
└── deploy.bat         # Script de deploy
```

## Correções Incluídas

✅ **Extração de itens IRPJ corrigida**
✅ **Ordem das colunas multa/juros/saldo consolidado corrigida**
✅ **Validação especial para impostos importantes**
✅ **Logs detalhados para debugging**
