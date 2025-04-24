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
    import sys
    print("Enviando texto para Openrouter...", file=sys.stderr)
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    # JSON Schema para Structured Outputs
    fiscal_schema = {
        "type": "object",
        "properties": {
            "debitosExigSuspensaSief": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "receita": {"type": "string", "description": "Receita"},
                        "periodo_apuracao": {"type": "string", "description": "Período de apuração"},
                        "vencimento": {"type": "string", "description": "Data de vencimento"},
                        "valor_original": {"type": "number", "description": "Valor original"},
                        "saldo_devedor": {"type": "number", "description": "Saldo devedor"},
                        "multa": {"type": "number", "description": "Multa"},
                        "juros": {"type": "number", "description": "Juros"},
                        "saldo_devedor_consolidado": {"type": "number", "description": "Saldo devedor consolidado"},
                        "situacao": {"type": "string", "description": "Situação"},
                    },
                    "required": [
                        "cnpj", "receita", "periodo_apuracao", "vencimento",
                        "valor_original", "saldo_devedor", "multa", "juros",
                        "saldo_devedor_consolidado", "situacao"
                    ],
                    "additionalProperties": False
                }
            },
            "parcelamentosSipade": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "processo": {"type": "string", "description": "Número do processo"},
                        "receita": {"type": "string", "description": "Receita"},
                        "situacao": {"type": "string", "description": "Situação"}
                    },
                    "required": ["cnpj", "processo", "receita", "situacao"],
                    "additionalProperties": False
                }
            },
            "pendenciasDebito": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "receita": {"type": "string", "description": "Receita"},
                        "periodo_apuracao": {"type": "string", "description": "Período de apuração"},
                        "vencimento": {"type": "string", "description": "Data de vencimento"},
                        "valor_original": {"type": "number", "description": "Valor original"},
                        "saldo_devedor": {"type": "number", "description": "Saldo devedor"},
                        "multa": {"type": "number", "description": "Multa"},
                        "juros": {"type": "number", "description": "Juros"},
                        "saldo_devedor_consolidado": {"type": "number", "description": "Saldo devedor consolidado"},
                        "situacao": {"type": "string", "description": "Situação"},
                    },
                    "required": [
                        "cnpj", "receita", "periodo_apuracao", "vencimento",
                        "valor_original", "saldo_devedor", "multa", "juros",
                        "saldo_devedor_consolidado", "situacao"
                    ],
                    "additionalProperties": False
                }
            },
            "processosFiscais": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "processo": {"type": "string", "description": "Número do processo"},
                        "situacao": {"type": "string", "description": "Situação"},
                        "localizacao": {"type": "string", "description": "Localização"}
                    },
                    "required": ["cnpj", "processo", "situacao", "localizacao"],
                    "additionalProperties": False
                }
            },
            "parcelamentosSiefpar": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "parcelamento": {"type": "string", "description": "Número do parcelamento"},
                        "valor_suspenso": {"type": "number", "description": "Valor suspenso"},
                        "tipo": {"type": "string", "description": "Tipo de parcelamento"}
                    },
                    "required": ["cnpj", "parcelamento", "valor_suspenso", "tipo"],
                    "additionalProperties": False
                }
            },
            "debitosSicob": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "parcelamento": {"type": "string", "description": "Número do parcelamento"},
                        "situacao": {"type": "string", "description": "Situação"},
                        "tipo": {"type": "string", "description": "Tipo"}
                    },
                    "required": ["cnpj", "parcelamento", "situacao", "tipo"],
                    "additionalProperties": False
                }
            },
            "pendenciasInscricao": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "cnpj": {"type": "string", "description": "CNPJ do contribuinte"},
                        "inscricao": {"type": "string", "description": "Número da inscrição"},
                        "receita": {"type": "string", "description": "Receita"},
                        "data_inscricao": {"type": "string", "description": "Data da inscrição"},
                        "processo": {"type": "string", "description": "Número do processo"},
                        "tipo_devedor": {"type": "string", "description": "Tipo de devedor"},
                        "situacao": {"type": "string", "description": "Situação"}
                    },
                    "required": [
                        "cnpj", "inscricao", "receita", "data_inscricao",
                        "processo", "tipo_devedor", "situacao"
                    ],
                    "additionalProperties": False
                }
            }
        },
        "required": [
            "debitosExigSuspensaSief",
            "parcelamentosSipade", "pendenciasDebito", "processosFiscais",
            "parcelamentosSiefpar", "debitosSicob", "pendenciasInscricao"
        ],
        "additionalProperties": False
    }

    data = {
        "model": "openai/gpt-4o",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": texto_pdf}
        ],
        "max_tokens": 20000,
        "temperature": 0.0,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "fiscal_data",
                "strict": True,
                "schema": fiscal_schema
            }
        }
    }
    response = requests.post(OPENROUTER_URL, headers=headers, json=data, timeout=60)
    print(f"Status Openrouter: {response.status_code}", file=sys.stderr)
    print(f"Resposta Openrouter: {response.text[:1000]}", file=sys.stderr)
    response.raise_for_status()
    # Extrai apenas o conteúdo do JSON retornado pelo modelo
    import json as pyjson
    content = response.json()["choices"][0]["message"]["content"]
    try:
        return pyjson.loads(content)
    except Exception as e:
        print("Erro ao fazer loads do JSON estruturado:", e, file=sys.stderr)
        return {}

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    import sys
    try:
        print("Recebido PDF para extração", file=sys.stdout)
        contents = await file.read()
        pdf = fitz.open(stream=contents, filetype="pdf")
        text = ""
        for page in pdf:
            text += page.get_text()
        pdf.close()
        print("Texto extraído do PDF (primeiros 500 caracteres):", text[:500], file=sys.stdout)

        # Chama a IA para estruturar os dados
        print("Chamando a IA para estruturar os dados...", file=sys.stdout)
        ia_result = call_openrouter_api(text)
        print("Resposta da IA recebida.", file=sys.stdout)

        return JSONResponse(content=ia_result)
    except Exception as e:
        print("Erro no endpoint /extract:", e, file=sys.stdout)
        return JSONResponse(content={"error": str(e)}, status_code=500)
