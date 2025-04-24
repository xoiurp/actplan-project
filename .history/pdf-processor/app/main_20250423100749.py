from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import io
import requests
import os

app = FastAPI()

# Configuração de CORS para permitir acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """
Você é um extrator de dados fiscais brasileiro. Dado o texto extraído de um PDF de situação fiscal, extraia e retorne um JSON estruturado com os campos exatamente conforme os exemplos abaixo. 
Siga rigorosamente o padrão de campos e tipos, mesmo que o texto do PDF varie em layout ou ordem. 
Se algum campo não estiver presente, retorne-o como string vazia ou valor zero.

Exemplo de estrutura esperada (pode haver múltiplos itens em cada seção):

{
  "parcelamentosSipade": [
    {
      "cnpj": "03.367.118/0001-40",
      "processo": "10675.725.438/2022-39",
      "receita": "7500-OUTROS",
      "situacao": "ATIVO"
    }
  ],
  "pendenciasDebito": [
    {
      "cnpj": "03.367.118/0001-40",
      "receita": "8109-02 - PIS",
      "periodo_apuracao": "01/2025",
      "vencimento": "25/02/2025",
      "valor_original": 42739.17,
      "saldo_devedor": 42739.17,
      "multa": 7051.96,
      "juros": 837.68,
      "saldo_devedor_consolidado": 50628.81,
      "situacao": "DEVEDOR"
    }
  ],
  "processosFiscais": [
    {
      "cnpj": "03.367.118/0001-40",
      "processo": "17227.738.910/2024-92",
      "situacao": "SUSPENSO-JULGAMENTO DA IMPUGNACAO",
      "localizacao": "CENTRO NAC GESTAO DE PROCESSO-DRJ-RPO-SP"
    }
  ],
  "parcelamentosSiefpar": [
    {
      "cnpj": "03.367.118/0001-40",
      "parcelamento": "02110001200427120172473",
      "valor_suspenso": 100483.71,
      "tipo": "Parcelamento Simplificado"
    }
  ],
  "debitosSicob": [
    {
      "cnpj": "03.367.118/0001-40",
      "parcelamento": "64254196-5",
      "situacao": "ATIVO/EM DIA",
      "tipo": "RFB LEI 10522/02 - SIMP. EMPRESA GERAL"
    }
  ],
  "pendenciasInscricao": [
    {
      "cnpj": "03.367.118/0001-40",
      "inscricao": "60.2.23.018921-50",
      "receita": "3551-IRPJ",
      "data_inscricao": "27/09/2023",
      "processo": "19414.106.645/2019-30",
      "tipo_devedor": "PRINCIPAL",
      "situacao": "ATIVA A SER AJUIZADA"
    }
  ]
}

Retorne apenas o JSON, sem explicações, comentários ou texto adicional.
"""

def call_openrouter_api(texto_pdf: str):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "openai/gpt-4o",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": texto_pdf}
        ],
        "max_tokens": 2048,
        "temperature": 0.0
    }
    response = requests.post(OPENROUTER_URL, headers=headers, json=data, timeout=60)
    response.raise_for_status()
    # Extrai apenas o conteúdo do JSON retornado pelo modelo
    import json as pyjson
    content = response.json()["choices"][0]["message"]["content"]
    # Garante que só o JSON será retornado (remove texto extra se houver)
    try:
        first_brace = content.index("{")
        last_brace = content.rindex("}")
        json_str = content[first_brace:last_brace+1]
        return pyjson.loads(json_str)
    except Exception:
        return {}

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf = fitz.open(stream=contents, filetype="pdf")
        text = ""
        for page in pdf:
            text += page.get_text()
        pdf.close()

        # Chama a IA para estruturar os dados
        ia_result = call_openrouter_api(text)

        return JSONResponse(content=ia_result)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
