from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tabula
import pandas as pd
import io

app = FastAPI()

@app.post("/extract/situacao-fiscal")
async def extract_situacao_fiscal(file: UploadFile = File(...)):
    """
    Recebe um arquivo PDF, extrai tabelas usando tabula-py e retorna os dados.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Por favor, envie um PDF.")

    try:
        # Ler o conteúdo do PDF
        pdf_content = await file.read()

        # Usar tabula-py para extrair tabelas
        # pages='all' tenta extrair de todas as páginas
        # multiple_tables=True tenta extrair múltiplas tabelas por página
        tables = tabula.read_pdf(io.BytesIO(pdf_content), pages='all', multiple_tables=True, stream=True)

        # Processar as tabelas extraídas
        extracted_items = []
        for table in tables:
            # tabula-py retorna um DataFrame. Vamos processá-lo.
            # Assumimos que a primeira linha é o cabeçalho
            if not table.empty:
                # Mapear nomes de colunas (pode precisar de ajustes dependendo do PDF real)
                # Esta é uma tentativa inicial de mapeamento baseado na descrição fornecida
                column_mapping = {
                    'Código': 'code',
                    'Tipo de Tributo': 'taxType',
                    'Período de Apuração': 'periodo_apuracao',
                    'Vencimento': 'vencimento',
                    'Valor Original': 'valor_original',
                    'Saldo Devedor': 'saldo_devedor',
                    'Multa': 'multa',
                    'Juros': 'juros',
                    'Parcelamento': 'parcelamento',
                    'Valor Suspenso': 'valor_suspenso',
                    'Situação': 'situacao',
                    'Receita': 'receita', # Adicionado para Pendência - Inscrição (SIDA)
                    'Inscrição': 'inscricao', # Adicionado para Pendência - Inscrição (SIDA)
                    'Data Inscrição': 'inscrito_em', # Adicionado para Pendência - Inscrição (SIDA)
                    'Processo': 'processo', # Adicionado para Processo Fiscal (SIEF) e Pendência - Inscrição (SIDA)
                    'Tipo': 'tipo' # Adicionado para Parcelamento (SIEFPAR) e Débito (SICOB)
                }

                # Renomear colunas do DataFrame
                table = table.rename(columns=column_mapping)

                # Iterar sobre as linhas da tabela e extrair os dados
                for index, row in table.iterrows():
                    item = {}
                    for key, value in row.items():
                        # Limpar e converter valores conforme necessário
                        if isinstance(value, str):
                            value = value.strip()
                            # Tentar converter valores monetários para float
                            if key in ['valor_original', 'saldo_devedor', 'multa', 'juros', 'valor_suspenso']:
                                try:
                                    # Remover pontos de milhar e substituir vírgula por ponto decimal
                                    value = float(value.replace('.', '').replace(',', '.'))
                                except ValueError:
                                    value = 0.0 # Valor padrão se a conversão falhar
                        item[key] = value

                    # Adicionar o item extraído à lista
                    # Adicionar um ID temporário para o frontend, se necessário
                    item['id'] = f"{item.get('code', '')}-{item.get('periodo_apuracao', '')}-{item.get('vencimento', '')}-{index}"
                    extracted_items.append(item)

        return JSONResponse(content={"data": extracted_items})

    except Exception as e:
        print(f"Erro ao processar PDF: {e}")
        # Retornar uma resposta de erro mais detalhada em caso de falha
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o PDF: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) # Porta 8001 para evitar conflito com o Docling (8000)