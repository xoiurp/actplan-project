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
import sys # Importar sys
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

# Função de extração de PDF simplificada para diagnóstico
def extract_pdf_text(pdf_bytes):
    text = ""
    try:
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        print(f"PDF aberto com {len(pdf)} páginas.", file=sys.stdout)
        for i, page in enumerate(pdf):
            try:
                page_text = page.get_text()
                if page_text:
                    # Tira o replace de dentro da f-string para evitar SyntaxError
                    log_text = page_text[:100].replace('\n', ' ') 
                    print(f"Texto extraído da página {i+1} (primeiros 100 chars): {log_text}", file=sys.stdout)
                    text += page_text + "\n"
                else:
                    print(f"Nenhum texto extraído da página {i+1}.", file=sys.stdout)
            except Exception as page_error:
                print(f"Erro ao extrair texto da página {i+1}: {page_error}", file=sys.stdout)
        pdf.close()
    except Exception as open_error:
        print(f"Erro crítico ao abrir ou processar PDF com fitz: {open_error}", file=sys.stdout)
        # Retorna vazio em caso de erro crítico na abertura/processamento geral
        return "" 
    
    if not text:
        print("AVISO: NENHUM TEXTO FOI EXTRAÍDO DO PDF.", file=sys.stdout)
    return text

# Função específica para extrair "Pendência - Débito (SIEF)" (lógica alternativa com split - v2)
def extract_pendencias_debito(text):
    result = []
    # Identificar a seção de pendências
    pattern = r"Pendência - Débito \(SIEF\)(.*?)(?=\n\s*\n\s*\n|\Z)" # Procura por duas linhas em branco ou fim do texto
    matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
    
    # Função helper para converter moeda BR para float
    def parse_br_currency(value_str):
        cleaned_str = re.sub(r'[R$\s]', '', value_str)
        if not cleaned_str or not re.match(r'^[\d.,]+$', cleaned_str):
            return 0.0 
        return float(cleaned_str.replace(".", "").replace(",", "."))

    for match in matches:
        section_text = match.group(1)
        lines = section_text.strip().split('\n')
        
        current_cnpj = ""
        header_skipped = False 
        
        for line in lines:
            line = line.strip()
            if not line: continue

            # Tenta encontrar CNPJ
            cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
            if cnpj_match:
                current_cnpj = cnpj_match.group(1)
                header_skipped = False 
                print(f"CNPJ encontrado: {current_cnpj}", file=sys.stdout)
                continue

            # Pula a linha de cabeçalho
            if not header_skipped and ("Receita" in line and ("PA/Exerc" in line or "PA Exerc" in line) and "Vcto" in line):
                print(f"Linha de cabeçalho pulada: '{line}'", file=sys.stdout)
                header_skipped = True
                continue
                
            if not current_cnpj or not header_skipped:
                 print(f"Linha pulada (sem CNPJ ou header não pulado): '{line}'", file=sys.stdout)
                 continue

            # Tenta parsear a linha como dados
            try:
                # Regex para capturar os campos principais, mais tolerante a espaços
                # 1: Receita (começa com 4d-2d, captura até antes do período)
                # 2: Período (MM/YYYY ou N TRIM/YYYY)
                # 3: Vencimento (DD/MM/YYYY)
                # 4..8: Valores (VlOrig, SdoDev, Multa, Juros, SdoCons)
                # 9: Situação (o resto da linha)
                data_match = re.match(
                    r"(\d{4}-\d{2}\s+-\s+.*?)\s+"  # 1: Receita
                    r"((?:\d{1,2}(?:º|o|ª|\s)?\s*TRIM|\d{2})/\d{4})\s+"  # 2: Período
                    r"(\d{2}/\d{2}/\d{4})\s+"  # 3: Vencimento
                    r"([\d.,]+)\s+"  # 4: Valor Original
                    r"([\d.,]+)\s+"  # 5: Saldo Devedor
                    r"([\d.,]+)\s+"  # 6: Multa
                    r"([\d.,]+)\s+"  # 7: Juros
                    r"([\d.,]+)\s+"  # 8: Saldo Consolidado
                    r"(.*)",  # 9: Situação
                    line, re.IGNORECASE
                )

                if data_match:
                    receita = data_match.group(1).strip()
                    periodo = data_match.group(2).strip()
                    vencimento = data_match.group(3).strip()
                    val_orig_str = data_match.group(4)
                    saldo_dev_str = data_match.group(5)
                    multa_str = data_match.group(6)
                    juros_str = data_match.group(7)
                    saldo_cons_str = data_match.group(8)
                    situacao = data_match.group(9).strip()

                    result.append({
                        "cnpj": current_cnpj,
                        "receita": receita,
                        "periodo_apuracao": periodo,
                        "vencimento": vencimento,
                        "valor_original": parse_br_currency(val_orig_str),
                        "saldo_devedor": parse_br_currency(saldo_dev_str),
                        "multa": parse_br_currency(multa_str),
                        "juros": parse_br_currency(juros_str),
                        "saldo_devedor_consolidado": parse_br_currency(saldo_cons_str),
                        "situacao": situacao
                    })
                    print(f"Item extraído (Regex Match): {result[-1]}", file=sys.stdout)
                else:
                    # Fallback para split se a regex falhar (menos preciso)
                    parts = re.split(r'\s{2,}', line)
                    if len(parts) >= 6 and re.match(r"^\d{4}-\d{2}", parts[0]):
                         # Tenta extrair heuristicamente como antes
                         receita = parts[0]
                         periodo = ""
                         vencimento = ""
                         val_orig_str = ""
                         saldo_dev_str = ""
                         multa_str = "0"
                         juros_str = "0"
                         saldo_cons_str = "0"
                         situacao = ""
                         
                         date_match = re.search(r"((?:\d{1,2}(?:º|o|ª|\s)?\s*TRIM|\d{2})/\d{4})\s+(\d{2}/\d{2}/\d{4})", line)
                         if date_match:
                             periodo = date_match.group(1)
                             vencimento = date_match.group(2)

                         currency_values = [p for p in parts if re.match(r'^[\d.,]+$', p) and ',' in p]
                         if len(currency_values) >= 2:
                             val_orig_str = currency_values[0]
                             saldo_dev_str = currency_values[1]
                             if len(currency_values) > 2: multa_str = currency_values[2]
                             if len(currency_values) > 3: juros_str = currency_values[3]
                             if len(currency_values) > 4: saldo_cons_str = currency_values[4]
                         
                         if parts:
                             last_part = parts[-1]
                             if last_part not in [val_orig_str, saldo_dev_str, multa_str, juros_str, saldo_cons_str]:
                                 situacao = last_part

                         if current_cnpj and receita and periodo and vencimento and val_orig_str and saldo_dev_str:
                             result.append({
                                "cnpj": current_cnpj, "receita": receita.strip(), "periodo_apuracao": periodo.strip(), "vencimento": vencimento.strip(),
                                "valor_original": parse_br_currency(val_orig_str), "saldo_devedor": parse_br_currency(saldo_dev_str),
                                "multa": parse_br_currency(multa_str), "juros": parse_br_currency(juros_str),
                                "saldo_devedor_consolidado": parse_br_currency(saldo_cons_str), "situacao": situacao.strip()
                             })
                             print(f"Item extraído (Split Fallback): {result[-1]}", file=sys.stdout)
                         else:
                              print(f"Falha no fallback split para linha: '{line}'", file=sys.stdout)
                    else:
                        print(f"Linha não correspondeu à regex nem ao fallback split: '{line}'", file=sys.stdout)

            except Exception as e:
                print(f"Erro ao processar linha: '{line}'. Erro: {e}", file=sys.stdout)
                
    if not result:
         print("Nenhum item de débito parseado com sucesso.", file=sys.stdout)

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
    allow_origins=["https://app.actplanconsultoria.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"]
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
        print("Texto extraído (completo):", extracted_text, file=sys.stdout)
        print("\n---\n", file=sys.stdout)

        # Pré-processa o texto extraído
        cleaned_text = preprocess_text(extracted_text)
        print("Texto pré-processado (completo):", cleaned_text, file=sys.stdout)
        print("\n---\n", file=sys.stdout)

        # Procura por padrões específicos
        print("Procurando por padrões...", file=sys.stdout)
        pattern = r"(?:Pendência|Pendencia|PENDÊNCIA|PENDENCIA)[\s-]*(?:Débito|Debito|DÉBITO|DEBITO)[\s-]*(?:\(SIEF\)|\(sief\))"
        matches = re.finditer(pattern, cleaned_text, re.DOTALL | re.IGNORECASE | re.UNICODE)
        match_count = sum(1 for _ in matches)
        print(f"Encontradas {match_count} ocorrências do padrão 'Pendência - Débito (SIEF)'", file=sys.stdout)

        # Chama a função específica para extrair pendências de débito
        pendencias_debito_data = extract_pendencias_debito(cleaned_text)
        print(f"Dados extraídos (Pendências Débito): {len(pendencias_debito_data)} itens", file=sys.stdout)
        if len(pendencias_debito_data) == 0:
            print("Nenhum item encontrado. Texto pode estar em formato diferente do esperado.", file=sys.stdout)

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
