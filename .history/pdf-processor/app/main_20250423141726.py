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

# ... (API KEY, SYSTEM_PROMPT, fiscal_schema permanecem iguais)

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
        "model": "openai/gpt-4o",
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": chunk_text}
        ],
        "max_tokens": 20000,
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

        # Divide o texto em chunks por seção
        chunks = dividir_texto_em_chunks(text)
        print(f"Total de chunks para IA: {len(chunks)}", file=sys.stdout)

        # Processa os chunks em paralelo
        async with httpx.AsyncClient() as client:
            tasks = [process_chunk(chunk, client, fiscal_schema, SYSTEM_PROMPT) for chunk in chunks]
            results = await asyncio.gather(*tasks)

        # Unifica os resultados (concatena arrays de cada seção)
        def concat_arrays(key):
            arr = []
            for r in results:
                if key in r and isinstance(r[key], list):
                    arr.extend(r[key])
            return arr

        resposta_final = {
            "debitosExigSuspensaSief": concat_arrays("debitosExigSuspensaSief"),
            "parcelamentosSipade": concat_arrays("parcelamentosSipade"),
            "pendenciasDebito": concat_arrays("pendenciasDebito"),
            "processosFiscais": concat_arrays("processosFiscais"),
            "parcelamentosSiefpar": concat_arrays("parcelamentosSiefpar"),
            "debitosSicob": concat_arrays("debitosSicob"),
            "pendenciasInscricao": concat_arrays("pendenciasInscricao"),
        }

        print("Resposta final unificada da IA.", file=sys.stdout)
        return JSONResponse(content=resposta_final)
    except Exception as e:
        print("Erro no endpoint /extract:", e, file=sys.stdout)
        return JSONResponse(content={"error": str(e)}, status_code=500)
