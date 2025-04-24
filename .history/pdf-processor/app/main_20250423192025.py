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
Você é um extrator de dados fiscais brasileiro. Dado o texto extraído de um PDF de situação fiscal, extraia e retorne um JSON estruturado com os campos exatamente conforme o schema e exemplos abaixo.

O texto pode conter múltiplas seções, cada uma iniciada por um cabeçalho como "Pendência - Débito (SIEF)", "Débito com Exigibilidade Suspensa (SIEF)", "Parcelamento com Exigibilidade Suspensa (SIEFPAR)", "Inscrição com Exigibilidade Suspensa (SIDA)", etc. 
Procure e extraia todas as seções relevantes, mesmo que estejam separadas por outras informações, rodapés, cabeçalhos ou paginação. 
Se uma seção aparecer mais de uma vez, una todos os dados dessa seção no array correspondente do JSON.

Ignore textos de rodapé, cabeçalho, paginação e qualquer informação que não pertença às tabelas/seções fiscais.

O JSON de saída deve conter todas as chaves do schema, mesmo que algumas estejam vazias ([]).

Exemplo de estrutura esperada (pode haver múltiplos itens em cada seção):

{
  "debitosExigSuspensaSief": [...],
  "parcelamentosSipade": [...],
  "pendenciasDebito": [...],
  "processosFiscais": [...],
  "parcelamentosSiefpar": [...],
  "debitosSicob": [...],
  "pendenciasInscricao": [...]
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
        # Salva o texto completo em arquivo de log
        with open("openrouter_payload.log", "a", encoding="utf-8") as logf:
            logf.write("\n\n=== NOVA REQUISIÇÃO ===\n")
            logf.write("Texto COMPLETO enviado à OpenRouter:\n")
            logf.write(text)
            logf.write("\n")

        # Envia o texto completo para a IA (sem chunking)
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "openai/gpt-4.1",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text}
                ],
                "max_tokens": 30000,
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
            # Salva o payload enviado à OpenRouter no mesmo arquivo de log
            with open("openrouter_payload.log", "a", encoding="utf-8") as logf:
                import json as pyjson
                logf.write("Payload enviado à OpenRouter:\n")
                logf.write(pyjson.dumps(data, ensure_ascii=False, indent=2))
                logf.write("\n")
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
