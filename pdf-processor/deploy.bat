@echo off
echo ========================================
echo   DEPLOY PDF PROCESSOR - GOOGLE CLOUD RUN
echo ========================================
echo.

echo [1/4] Verificando Google Cloud CLI...
gcloud --version
if %errorlevel% neq 0 (
    echo ERRO: Google Cloud CLI nao encontrado!
    echo Instale em: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo.
echo [2/4] Configurando projeto...
set PROJECT_ID=pdf-processor-193066072273
set SERVICE_NAME=pdf-processor
set REGION=us-central1

echo Projeto: %PROJECT_ID%
echo Servico: %SERVICE_NAME%
echo Regiao: %REGION%

echo.
echo [3/4] Fazendo build e deploy...
gcloud run deploy %SERVICE_NAME% ^
    --source . ^
    --project %PROJECT_ID% ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --memory 2Gi ^
    --cpu 2 ^
    --timeout 300 ^
    --max-instances 10

if %errorlevel% neq 0 (
    echo ERRO no deploy!
    pause
    exit /b 1
)

echo.
echo [4/4] Deploy concluido com sucesso!
echo Nova URL da API sera exibida acima.
echo.
pause
