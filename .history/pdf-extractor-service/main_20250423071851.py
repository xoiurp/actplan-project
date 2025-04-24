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

        # Converter DataFrames para formato JSON (lista de dicionários)
        extracted_data = []
        for table in tables:
            # tabula-py retorna uma lista de DataFrames. Convertemos cada um para JSON.
            extracted_data.append(table.to_dict(orient='records'))

        return JSONResponse(content={"data": extracted_data})

    except Exception as e:
        print(f"Erro ao processar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o PDF: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) # Porta 8001 para evitar conflito com o Docling (8000)