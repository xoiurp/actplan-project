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

# Função específica para extrair "Pendência - Débito (SIEF)" - Lógica v4 (Iteração por Linhas)
def extract_pendencias_debito(text):
    result = []
    lines = text.split('\n')
    in_section = False
    current_cnpj = ""
    
    # Padrões para identificar o início e fim da seção relevante
    start_pattern = r"(?:Pendência|Pendencia|PENDÊNCIA|PENDENCIA)[\s-]*(?:Débito|Debito|DÉBITO|DEBITO)[\s-]*(?:\(SIEF\)|\(sief\))"
    # Padrões que indicam o fim da seção SIEF e início de outra
    end_patterns = [
        r"^(?:Pendência|Pendencia|Parcelamento|Processo|Inscrição|Débito\s+com\s+Exigibilidade)",
        r"Final\s+do\s+Relatório",
        r"^\s*_{10,}\s*$" # Linha de underscores
    ]

    # Função helper para converter moeda BR para float
    def parse_br_currency(value_str):
        if not isinstance(value_str, str):
             value_str = str(value_str) # Garante que é string
        cleaned_str = re.sub(r'[R$\s.]', '', value_str).replace(',', '.')
        if not cleaned_str or not re.match(r'^-?[\d.]+$', cleaned_str):
            print(f"Aviso: Valor monetário inválido ou vazio '{value_str}', retornando 0.0", file=sys.stdout)
            return 0.0
        try:
            return float(cleaned_str)
        except ValueError:
            print(f"Aviso: Falha ao converter valor monetário '{value_str}' para float, retornando 0.0", file=sys.stdout)
            return 0.0

    # Função helper para validar e formatar datas
    def format_date(date_str):
         if not isinstance(date_str, str): return ""
         match = re.match(r'(\d{2})/(\d{2})/(\d{4})', date_str.strip())
         if match:
             return f"{match.group(3)}-{match.group(2)}-{match.group(1)}" # YYYY-MM-DD
         print(f"Aviso: Formato de data inválido '{date_str}', retornando vazio.", file=sys.stdout)
         return ""

    # Função helper para validar e formatar período
    def format_periodo(periodo_str):
        if not isinstance(periodo_str, str): return ""
        periodo_str = periodo_str.strip()
        # Match MM/YYYY
        match_mes = re.match(r'(\d{2})/(\d{4})', periodo_str)
        if match_mes:
            return f"{match_mes.group(1)}/{match_mes.group(2)}"
        # Match N TRIM/YYYY (com ou sem º/ª/o)
        match_trim = re.match(r'(\d{1,2})(?:º|o|ª|\s)?\s*TRIM/(\d{4})', periodo_str, re.IGNORECASE)
        if match_trim:
            return f"{match_trim.group(1)} TRIM/{match_trim.group(2)}"
        print(f"Aviso: Formato de período inválido '{periodo_str}', retornando vazio.", file=sys.stdout)
        return ""

    print("\n--- Iniciando busca pela seção 'Pendência - Débito (SIEF)' ---", file=sys.stdout)
    
    i = 0
    # O loop agora itera diretamente sobre as linhas do texto completo
    while i < len(lines): 
        line = lines[i].strip()

        # Verifica se entramos na seção correta
        if not in_section and re.search(start_pattern, line, re.IGNORECASE):
            in_section = True
            current_cnpj = "" # Reseta CNPJ ao entrar na seção
            print(f"Seção 'Pendência - Débito (SIEF)' encontrada na linha {i+1}: '{line}'", file=sys.stdout)
            i += 1
            continue

        # Se não estamos na seção, apenas avança
        if not in_section:
            i += 1
            continue

        # Verifica se saímos da seção
        if any(re.search(ep, line, re.IGNORECASE) for ep in end_patterns):
            print(f"Fim da seção 'Pendência - Débito (SIEF)' detectado na linha {i+1}: '{line}'", file=sys.stdout)
            in_section = False
            break # Sai do loop principal ao encontrar o fim da seção

        # Dentro da seção, processa a linha
        if not line: # Pula linhas vazias
            i += 1
            continue

        # Tenta encontrar CNPJ
        cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
        if cnpj_match:
            current_cnpj = cnpj_match.group(1)
            print(f"CNPJ definido para: {current_cnpj}", file=sys.stdout)
            i += 1
            continue

        # Ignora linhas de cabeçalho explícitas (agora mais simples)
        if "Receita" in line and "PA/Exerc" in line and "Vcto" in line:
             print(f"Linha de cabeçalho pulada: '{line}'", file=sys.stdout)
             i += 1
             continue
        # Pula linhas que são apenas os títulos dos campos
        if line in ["Dt. Vcto", "Vl. Original", "Sdo. Devedor", "Multa", "Juros", "Sdo. Dev. Cons.", "Situação"]:
             print(f"Linha de título de campo pulada: '{line}'", file=sys.stdout)
             i += 1
             continue

        # Verifica se a linha começa com um código de receita (XXXX-XX - ...)
        receita_match = re.match(r"(\d{4}-\d{2}\s+-\s+.*)", line)
        if receita_match and current_cnpj:
            print(f"\nInício de registro de débito encontrado: '{line}'", file=sys.stdout)
            debito_data = {"cnpj": current_cnpj, "receita": receita_match.group(1).strip()}
            campos_encontrados = 0
            linhas_consumidas = 0
            
            # Tenta ler os próximos campos linha a linha
            j = i + 1 
            temp_data = {}
            
            # 1. Período (pode ocupar 1 ou 2 linhas)
            if j < len(lines):
                periodo_str = lines[j]
                # Verifica se a próxima linha também faz parte do período (TRIM/YYYY)
                if j + 1 < len(lines) and re.match(r'TRIM/\d{4}', lines[j+1], re.IGNORECASE):
                    periodo_str += " " + lines[j+1]
                    linhas_consumidas = 2
                    print(f"Período detectado em 2 linhas: '{lines[j]}' e '{lines[j+1]}'", file=sys.stdout)
                else:
                    linhas_consumidas = 1
                    print(f"Período detectado em 1 linha: '{lines[j]}'", file=sys.stdout)
                    
                temp_data["periodo_apuracao"] = format_periodo(periodo_str)
                if temp_data["periodo_apuracao"]: campos_encontrados += 1
                j += linhas_consumidas
            
            # 2. Vencimento (1 linha)
            if j < len(lines):
                print(f"Tentando ler Vencimento na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["vencimento"] = format_date(lines[j])
                if temp_data["vencimento"]: campos_encontrados += 1
                j += 1
            
            # 3. Valor Original (1 linha)
            if j < len(lines):
                print(f"Tentando ler Valor Original na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["valor_original"] = parse_br_currency(lines[j])
                campos_encontrados += 1 # Assume que sempre existe, mesmo que 0.0
                j += 1

            # 4. Saldo Devedor (1 linha)
            if j < len(lines):
                print(f"Tentando ler Saldo Devedor na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["saldo_devedor"] = parse_br_currency(lines[j])
                campos_encontrados += 1
                j += 1

            # 5. Multa (1 linha)
            if j < len(lines):
                print(f"Tentando ler Multa na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["multa"] = parse_br_currency(lines[j])
                campos_encontrados += 1
                j += 1
                
            # 6. Juros (1 linha)
            if j < len(lines):
                print(f"Tentando ler Juros na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["juros"] = parse_br_currency(lines[j])
                campos_encontrados += 1
                j += 1

            # 7. Saldo Devedor Consolidado (1 linha)
            if j < len(lines):
                print(f"Tentando ler Saldo Consolidado na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["saldo_devedor_consolidado"] = parse_br_currency(lines[j])
                campos_encontrados += 1
                j += 1

            # 8. Situação (1 linha)
            if j < len(lines):
                print(f"Tentando ler Situação na linha: '{lines[j]}'", file=sys.stdout)
                temp_data["situacao"] = lines[j].strip()
                campos_encontrados += 1
                j += 1
            
            # Validação: Precisamos pelo menos de receita, período e vencimento válidos
            if debito_data["receita"] and temp_data.get("periodo_apuracao") and temp_data.get("vencimento"):
                debito_data.update(temp_data) # Adiciona os campos lidos
                result.append(debito_data)
                print(f"Item extraído com sucesso (lógica v4): {debito_data}", file=sys.stdout)
                i = j # Atualiza o índice principal para continuar após os campos lidos
            else:
                print(f"Falha na validação dos campos obrigatórios (receita, período, vencimento) para a receita '{debito_data['receita']}'. Dados lidos: {temp_data}", file=sys.stdout)
                i += 1 # Avança apenas uma linha (a da receita) e tenta novamente
        
        else:
            # Se a linha não é CNPJ, cabeçalho ou início de receita, apenas pula
            print(f"Linha ignorada (não reconhecida como início de débito ou cabeçalho): '{line}'", file=sys.stdout)
            i += 1

    if not result:
         print("Nenhum item de débito SIEF parseado com sucesso na função.", file=sys.stdout)

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
    import traceback # Para log mais detalhado
    try:
        print("Recebido PDF para extração", file=sys.stdout)
        contents = await file.read()

        # Usa a nova função de extração aprimorada
        extracted_text = extract_pdf_text(contents)
        # print("Texto extraído (completo):", extracted_text, file=sys.stdout) # Log muito verboso, comentado
        print("\n---\nTexto extraído (primeiros 1000 chars):", extracted_text[:1000].replace('\n', ' '), file=sys.stdout)
        print("\n---\n", file=sys.stdout)

        # Pré-processa o texto extraído
        cleaned_text = preprocess_text(extracted_text)
        # print("Texto pré-processado (completo):", cleaned_text, file=sys.stdout) # Log muito verboso, comentado
        print("\n---\nTexto pré-processado (primeiros 1000 chars):", cleaned_text[:1000].replace('\n', ' '), file=sys.stdout)
        print("\n---\n", file=sys.stdout)

        # Procura por padrões específicos (apenas para log)
        print("Procurando por padrões de título...", file=sys.stdout)
        pattern_sief = r"(?:Pendência|Pendencia|PENDÊNCIA|PENDENCIA)[\s-]*(?:Débito|Debito|DÉBITO|DEBITO)[\s-]*(?:\(SIEF\)|\(sief\))"
        matches_sief = re.finditer(pattern_sief, cleaned_text, re.DOTALL | re.IGNORECASE | re.UNICODE)
        match_count_sief = sum(1 for _ in matches_sief)
        print(f"Encontradas {match_count_sief} ocorrências do padrão 'Pendência - Débito (SIEF)'", file=sys.stdout)
        # Adicionar logs para outros padrões se necessário

        # Chama a função específica para extrair pendências de débito
        pendencias_debito_data = extract_pendencias_debito(cleaned_text)
        print(f"Dados extraídos (Pendências Débito SIEF): {len(pendencias_debito_data)} itens", file=sys.stdout)
        if len(pendencias_debito_data) == 0 and match_count_sief > 0:
             print("AVISO: Seção 'Pendência - Débito (SIEF)' encontrada, mas nenhum item foi parseado.", file=sys.stdout)
        elif len(pendencias_debito_data) == 0:
             print("Seção 'Pendência - Débito (SIEF)' não encontrada ou vazia.", file=sys.stdout)


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
        print(f"Erro GERAL no endpoint /extract: {e}\n{traceback.format_exc()}", file=sys.stdout)
        return JSONResponse(content={"error": f"Erro interno GRAVE no servidor ao processar PDF: {e}"}, status_code=500)
