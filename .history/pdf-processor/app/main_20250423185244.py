from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import io
import requests
import os
import re
import asyncio
import httpx

app = FastAPI()

# CORS middleware deve ser aplicado logo após a criação do app
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
  "debitosExigSuspensaSief": [
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
  "parcelamentosSipade": [],
  "pendenciasDebito": [],
  "processosFiscais": [],
  "parcelamentosSiefpar": [],
  "debitosSicob": [],
  "pendenciasInscricao": []
}

Retorne apenas o JSON, sem explicações, comentários ou texto adicional.
"""

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

# Função para dividir o texto em chunks por seção
def dividir_texto_em_chunks(texto: str):
    # Regex para identificar inícios de seções relevantes
    padroes = [
        r"Pend[êe]ncia\s*-\s*D[ée]bito\s*\(SIEF\)",
        r"Débito com Exigibilidade Suspensa\s*\(SIEF\)",
        r"Parcelamento com Exigibilidade Suspensa\s*\(SIPADE\)",
        r"Processo Fiscal com Exigibilidade Suspensa\s*\(SIEF\)",
        r"Parcelamento com Exigibilidade Suspensa\s*\(SIEFPAR\)",
        r"Débito com Exigibilidade Suspensa\s*\(SICOB\)",
        r"Pend[êe]ncia\s*-\s*Inscri[cç][aã]o\s*\(SIDA\)",
        r"Pend[êe]ncia\s*-\s*Parcelamento\s*\(SISPAR\)"
    ]
    regex = "|".join(padroes)
    # Divide o texto em blocos a partir dos títulos das seções
    blocos = re.split(f"({regex})", texto, flags=re.IGNORECASE)
    # Junta o título da seção ao seu conteúdo
    chunks = []
    i = 1
    while i < len(blocos):
        titulo = blocos[i]
        conteudo = blocos[i+1] if i+1 < len(blocos) else ""
        chunks.append(titulo + conteudo)
        i += 2
    return chunks if chunks else [texto]

# Função assíncrona para processar um chunk
async def process_chunk(chunk_text, client, schema, prompt):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "anthropic/claude-3.7-sonnet",
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": chunk_text}
        ],
        "max_tokens": 90000,
        "temperature": 0.0,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "fiscal_data",
                "strict": True,
                "schema": schema
            }
        }
    }
    resp = await client.post(OPENROUTER_URL, headers=headers, json=data, timeout=60)
    resp.raise_for_status()
    import json as pyjson
    content = resp.json()["choices"][0]["message"]["content"]
    return pyjson.loads(content)

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

        # Envia o texto completo para a IA (sem chunking)
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "anthropic/claude-3.7-sonnet",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text}
                ],
                "max_tokens": 90000,
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
            resp = await client.post(OPENROUTER_URL, headers=headers, json=data, timeout=120)
            resp.raise_for_status()
            import json as pyjson
            content = resp.json()["choices"][0]["message"]["content"]
            resposta_final = pyjson.loads(content)

        print("Resposta final da IA recebida.", file=sys.stdout)
        return JSONResponse(content=resposta_final)
    except Exception as e:
        print("Erro no endpoint /extract:", e, file=sys.stdout)
        return JSONResponse(content={"error": str(e)}, status_code=500)
