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
import re # Importar re
import pandas as pd # Importar pandas

# Função de pré-processamento sugerida
def preprocess_text(text):
    # Remove cabeçalhos e rodapés repetitivos
    lines = text.split('\n')
    cleaned_lines = []
    
    skip_patterns = [
        "MINISTÉRIO DA FAZENDA",
        "Por meio do e-CAC",
        "SECRETARIA ESPECIAL",
        "PROCURADORIA-GERAL",
        "Página:",
        "INFORMAÇÕES DE APOIO"
    ]
    
    for line in lines:
        if not any(pattern in line for pattern in skip_patterns):
            cleaned_lines.append(line)
    
    # Remove linhas vazias consecutivas
    result_lines = []
    prev_empty = False
    for line in cleaned_lines:
        if not line.strip():
            if not prev_empty:
                result_lines.append(line)
            prev_empty = True
        else:
            result_lines.append(line)
            prev_empty = False
    
    return '\n'.join(result_lines)

# Função de extração de PDF aprimorada
def extract_pdf_text(pdf_bytes):
    pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    
    for page in pdf:
        # Tente extrair como tabela para preservar estrutura
        tables = page.find_tables()
        if tables:
            for table in tables:
                try:
                    # Tenta converter para pandas, pode falhar se a tabela for mal formada
                    df = table.to_pandas()
                    # Converte para CSV com separador '|' para clareza
                    text += df.to_csv(sep="|", index=False, header=True) + "\n\n" 
                except Exception as e:
                    print(f"Aviso: Falha ao converter tabela para pandas na página {page.number + 1}: {e}")
                    # Fallback para extração de texto simples da área da tabela se a conversão falhar
                    table_text = page.get_textbox(table.bbox)
                    text += f"TABELA_NAO_CONVERTIDA:\n{table_text}\n\n"
        else:
            # Se não encontrar tabelas, use extração de blocos de texto
            blocks = page.get_text("blocks")
            for block in blocks:
                # block[4] contém o texto do bloco
                text += block[4] + "\n" 
    
    pdf.close()
    return text

# Função para extrair seções específicas
def extract_sections(text):
    sections = {
        "debitosExigSuspensaSief": [],
        "parcelamentosSipade": [],
        "pendenciasDebito": [],
        "processosFiscais": [],
        "parcelamentosSiefpar": [],
        "debitosSicob": [],
        "pendenciasInscricao": []
    }
    
    # Regex para encontrar seções. O padrão busca o título da seção e captura tudo até a próxima linha em branco ou o fim do texto.
    # Usamos re.DOTALL para que '.' corresponda a novas linhas e re.IGNORECASE para flexibilidade.
    # Usamos non-greedy '.*?' para evitar capturar múltiplas seções de uma vez.
    
    # Pendência - Débito (SIEF)
    pendencia_debito = re.findall(r"Pendência - Débito \(SIEF\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if pendencia_debito:
        sections["pendenciasDebito"] = [section.strip() for section in pendencia_debito]

    # Débito com Exigibilidade Suspensa (SIEF)
    debito_exig_suspensa_sief = re.findall(r"Débito com Exigibilidade Suspensa \(SIEF\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if debito_exig_suspensa_sief:
        sections["debitosExigSuspensaSief"] = [section.strip() for section in debito_exig_suspensa_sief]

    # Parcelamento com Exigibilidade Suspensa (SIPADE)
    parcelamentos_sipade = re.findall(r"Parcelamento com Exigibilidade Suspensa \(SIPADE\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if parcelamentos_sipade:
        sections["parcelamentosSipade"] = [section.strip() for section in parcelamentos_sipade]

    # Processo Fiscal com Exigibilidade Suspensa (SIEF)
    processos_fiscais = re.findall(r"Processo Fiscal com Exigibilidade Suspensa \(SIEF\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if processos_fiscais:
        sections["processosFiscais"] = [section.strip() for section in processos_fiscais]

    # Parcelamento com Exigibilidade Suspensa (SIEFPAR)
    parcelamentos_siefpar = re.findall(r"Parcelamento com Exigibilidade Suspensa \(SIEFPAR\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if parcelamentos_siefpar:
        sections["parcelamentosSiefpar"] = [section.strip() for section in parcelamentos_siefpar]

    # Débito com Exigibilidade Suspensa (SICOB)
    debitos_sicob = re.findall(r"Débito com Exigibilidade Suspensa \(SICOB\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if debitos_sicob:
        sections["debitosSicob"] = [section.strip() for section in debitos_sicob]

    # Pendência - Inscrição (SIDA)
    pendencias_inscricao = re.findall(r"Pendência - Inscrição \(SIDA\).*?(?=\n\s*\n|$)", text, re.DOTALL | re.IGNORECASE)
    if pendencias_inscricao:
        sections["pendenciasInscricao"] = [section.strip() for section in pendencias_inscricao]

    return sections


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
Você é um extrator de dados fiscais brasileiro. Você receberá blocos de texto correspondentes a seções específicas pré-extraídas de um relatório de situação fiscal. Sua tarefa é analisar CADA bloco de texto e extrair as informações relevantes, estruturando-as em um único JSON conforme o schema fornecido.

As seções fornecidas podem incluir: "Pendência - Débito (SIEF)", "Débito com Exigibilidade Suspensa (SIEF)", "Parcelamento com Exigibilidade Suspensa (SIPADE)", "Processo Fiscal com Exigibilidade Suspensa (SIEF)", "Parcelamento com Exigibilidade Suspensa (SIEFPAR)", "Débito com Exigibilidade Suspensa (SICOB)", "Pendência - Inscrição (SIDA)".

Processe todos os blocos de texto fornecidos e agrupe os dados extraídos nos arrays correspondentes dentro do JSON final. O JSON de saída deve conter todas as chaves do schema, mesmo que algumas seções não tenham sido encontradas no texto original (nesse caso, o array correspondente ficará vazio []).

Exemplo de estrutura esperada (pode haver múltiplos itens em cada seção):

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
        
        # Usa a nova função de extração aprimorada
        extracted_text = extract_pdf_text(contents)
        print("Texto extraído (aprimorado, primeiros 500 caracteres):", extracted_text[:500], file=sys.stdout)

        # Pré-processa o texto extraído (aprimorado)
        cleaned_text = preprocess_text(extracted_text)
        print("Texto pré-processado (após extração aprimorada, primeiros 500 caracteres):", cleaned_text[:500], file=sys.stdout)

        # Extrai seções específicas do texto limpo
        extracted_sections = extract_sections(cleaned_text)
        
        # Formata as seções extraídas para enviar à IA
        sections_text_for_ai = ""
        for key, section_list in extracted_sections.items():
            if section_list: # Apenas inclui seções que foram encontradas
                sections_text_for_ai += f"--- SEÇÃO: {key} ---\n"
                sections_text_for_ai += "\n\n".join(section_list) # Junta múltiplos blocos da mesma seção
                sections_text_for_ai += f"\n--- FIM SEÇÃO: {key} ---\n\n"
        
        print("Seções extraídas enviadas para a IA (primeiros 500 caracteres):", sections_text_for_ai[:500], file=sys.stdout)

        # Salva as seções extraídas no arquivo de log
        with open("openrouter_payload.log", "a", encoding="utf-8") as logf:
            logf.write("\n\n=== NOVA REQUISIÇÃO ===\n")
            logf.write("SEÇÕES EXTRAÍDAS enviadas à OpenRouter:\n")
            logf.write(sections_text_for_ai) # Usa as seções extraídas
            logf.write("\n")

        # Envia as seções extraídas para a IA
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "openai/gpt-4.1",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": sections_text_for_ai} # Usa as seções extraídas
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
