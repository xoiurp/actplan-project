from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import io
import requests
import os
import re
import asyncio
import re # Importar re
import pandas as pd # Importar pandas
# httpx não é mais necessário se não chamarmos a OpenRouter

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

# Função específica para extrair "Pendência - Débito (SIEF)"
def extract_pendencias_debito(text):
    result = []
    # Identificar a seção de pendências
    # Usamos re.IGNORECASE para flexibilidade com maiúsculas/minúsculas no título
    pattern = r"Pendência - Débito \(SIEF\)(.*?)(?=\n\s*\n\s*\n|\Z)" # Procura por duas linhas em branco ou fim do texto
    matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        section_text = match.group(1)
        lines = section_text.strip().split('\n')
        
        current_cnpj = "" # Armazena o CNPJ atual encontrado
        for line in lines:
            line = line.strip()
            if not line: # Pula linhas vazias dentro da seção
                continue

            # Tenta encontrar CNPJ na linha
            cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
            if cnpj_match:
                current_cnpj = cnpj_match.group(1)
                continue # Passa para a próxima linha após encontrar CNPJ

            # Verifica se a linha parece ser uma linha de dados de débito
            # (Começa com código, tem múltiplos valores numéricos separados por espaço)
            # Ajuste na regex para ser mais flexível com espaços e formatos
            data_line_match = re.match(r"(\d{4}-\d{2}\s+-\s+.*?)\s+(\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(.*)", line)
            
            if data_line_match and current_cnpj: # Precisa ter um CNPJ associado
                try:
                    # Função helper para converter moeda BR para float
                    def parse_br_currency(value_str):
                        return float(value_str.replace(".", "").replace(",", "."))

                    result.append({
                        "cnpj": current_cnpj,
                        "receita": data_line_match.group(1).strip(),
                        "periodo_apuracao": data_line_match.group(2).strip(),
                        "vencimento": data_line_match.group(3).strip(),
                        "valor_original": parse_br_currency(data_line_match.group(4)),
                        "saldo_devedor": parse_br_currency(data_line_match.group(5)),
                        "multa": parse_br_currency(data_line_match.group(6)),
                        "juros": parse_br_currency(data_line_match.group(7)),
                        "saldo_devedor_consolidado": parse_br_currency(data_line_match.group(8)),
                        "situacao": data_line_match.group(9).strip()
                    })
                except Exception as e:
                    print(f"Aviso: Falha ao parsear linha de débito: '{line}'. Erro: {e}")
                    continue # Pula linha mal formada

    return result

# --- Placeholder para outras funções extratoras ---
# def extract_debitos_exig_suspensa_sief(text): return []
# def extract_parcelamentos_sipade(text): return []
# def extract_processos_fiscais(text): return []
# def extract_parcelamentos_siefpar(text): return []
# def extract_debitos_sicob(text): return []
# def extract_pendencias_inscricao(text): return []
# -------------------------------------------------


app = FastAPI()

# CORS middleware deve ser aplicado logo após a criação do app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://app.actplanconsultoria.com",
        "https://actplan-consult.netlify.app",
        "https://185.213.26.203"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Removido OPENROUTER_API_KEY, OPENROUTER_URL, SYSTEM_PROMPT, fiscal_schema pois não são mais usados

@app.post("/api/extraction/extract")
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

        # Chama a função específica para extrair pendências de débito
        pendencias_debito_data = extract_pendencias_debito(cleaned_text)
        print(f"Dados extraídos (Pendências Débito): {len(pendencias_debito_data)} itens", file=sys.stdout)

        # --- Chamar outras funções extratoras aqui ---
        # debitos_exig_suspensa_data = extract_debitos_exig_suspensa_sief(cleaned_text)
        # parcelamentos_sipade_data = extract_parcelamentos_sipade(cleaned_text)
        # ... etc ...
        # ---------------------------------------------

        # Monta o dicionário final com os dados extraídos (e placeholders vazios)
        resposta_final = {
            "debitosExigSuspensaSief": [], # Placeholder
            "parcelamentosSipade": [], # Placeholder
            "pendenciasDebito": pendencias_debito_data, # Dados reais
            "processosFiscais": [], # Placeholder
            "parcelamentosSiefpar": [], # Placeholder
            "debitosSicob": [], # Placeholder
            "pendenciasInscricao": [] # Placeholder
            # Adicionar os resultados das outras funções extratoras quando implementadas
        }

        print("Extração local concluída.", file=sys.stdout)
        return JSONResponse(content=resposta_final)

    except Exception as e:
        import traceback # Para log mais detalhado
        print(f"Erro no endpoint /extract: {e}\n{traceback.format_exc()}", file=sys.stdout)
        return JSONResponse(content={"error": f"Erro interno no servidor ao processar PDF: {e}"}, status_code=500)
