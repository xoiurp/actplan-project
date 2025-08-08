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

# --- Funções Helper Globais ---
def parse_br_currency(value_str):
    """Converte string de moeda BR (com . e ,) para float."""
    if not isinstance(value_str, str):
         value_str = str(value_str) # Garante que é string
    # Remove R$, espaços, e pontos (milhar). Troca vírgula (decimal) por ponto.
    cleaned_str = re.sub(r'[R$\s.]', '', value_str).replace(',', '.')
    if not cleaned_str or not re.match(r'^-?[\d.]+$', cleaned_str):
        print(f"Aviso: Valor monetário inválido ou vazio '{value_str}', retornando 0.0", file=sys.stdout)
        return 0.0
    try:
        return float(cleaned_str)
    except ValueError:
        print(f"Aviso: Falha ao converter valor monetário '{value_str}' para float, retornando 0.0", file=sys.stdout)
        return 0.0

def format_date(date_str):
    """Converte DD/MM/YYYY para YYYY-MM-DD."""
    if not isinstance(date_str, str): return ""
    match = re.match(r'(\d{2})/(\d{2})/(\d{4})', date_str.strip())
    if match:
        return f"{match.group(3)}-{match.group(2)}-{match.group(1)}" # YYYY-MM-DD
    print(f"Aviso: Formato de data inválido '{date_str}', retornando vazio.", file=sys.stdout)
    return ""

def format_periodo(periodo_str):
    """Formata período MM/YYYY, DD/MM/YYYY ou N TRIM/YYYY."""
    if not isinstance(periodo_str, str): return ""
    periodo_str = periodo_str.strip()
    # Match DD/MM/YYYY
    match_dia = re.match(r'(\d{2}/\d{2}/\d{4})', periodo_str)
    if match_dia:
        return match_dia.group(1)
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
# -----------------------------

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

# Função específica para extrair "Pendência - Débito (SIEF)" - Lógica v5 (Flexível por Conteúdo)
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

    print("\n--- Iniciando busca pela seção 'Pendência - Débito (SIEF)' (v5 - Flexível) ---", file=sys.stdout)

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Verifica se entramos na seção correta
        if not in_section and re.search(start_pattern, line, re.IGNORECASE):
            in_section = True
            current_cnpj = ""
            print(f"Seção 'Pendência - Débito (SIEF)' encontrada na linha {i+1}: '{line}'", file=sys.stdout)
            i += 1
            continue

        if not in_section:
            i += 1
            continue

        # Verifica se saímos da seção
        if any(re.search(ep, line, re.IGNORECASE) for ep in end_patterns):
            print(f"Fim da seção 'Pendência - Débito (SIEF)' detectado na linha {i+1}: '{line}'", file=sys.stdout)
            in_section = False
            break

        if not line:
            i += 1
            continue

        # Tenta encontrar CNPJ
        cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
        if cnpj_match:
            current_cnpj = cnpj_match.group(1)
            print(f"CNPJ definido para: {current_cnpj}", file=sys.stdout)
            i += 1
            continue

        # Ignora linhas de cabeçalho
        if "Receita" in line and "PA/Exerc" in line and "Vcto" in line:
             print(f"Linha de cabeçalho pulada: '{line}'", file=sys.stdout)
             i += 1
             continue
        if line in ["Dt. Vcto", "Vl. Original", "Sdo. Devedor", "Multa", "Juros", "Sdo. Dev. Cons.", "Situação"]:
             print(f"Linha de título de campo pulada: '{line}'", file=sys.stdout)
             i += 1
             continue

        # Verifica se a linha começa com um código de receita (XXXX-XX - ...) ou "SIMPLES NAC." ou itens sem código
        receita_match = re.match(r"(\d{4}-\d{2}\s+-\s+.*|SIMPLES\s+NAC\..*)", line, re.IGNORECASE)
        
        # Também verifica se pode ser um item sem código mas com valores monetários
        no_code_item_match = None
        if not receita_match and current_cnpj:
            # Procura por linhas que começam diretamente com período ou valores, indicando item sem código
            no_code_patterns = [
                r"^(\d{2}/\d{2}/\d{4}|\d{2}/\d{4}|\d{1,2}(?:º|o|ª|\s)?\s*TRIM/\d{4})\s+",  # Começa com período
                r"^([A-Z\s]+)\s+(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})\s+",  # Descrição + período
            ]
            for pattern in no_code_patterns:
                no_code_item_match = re.match(pattern, line, re.IGNORECASE)
                if no_code_item_match:
                    print(f"🔍 Possível item sem código detectado: '{line}'", file=sys.stdout)
                    break
        
        if (receita_match or no_code_item_match) and current_cnpj:
            print(f"\nInício de registro de débito encontrado: '{line}'", file=sys.stdout)
            
            if receita_match:
                receita_text = receita_match.group(1).strip()
                # Se for "SIMPLES NAC.", a linha inteira é a receita.
                if "SIMPLES NAC" in receita_text.upper():
                    # Nova lógica com Regex para SIMPLES NAC., mais robusta a espaçamentos
                    simples_pattern = re.compile(
                        r"SIMPLES\s+NAC\.\s+"  # Literal
                        r"([\d/]+)\s+"          # 1: Período
                        r"([\d/]+)\s+"          # 2: Vencimento
                        r"([\d.,]+)\s+"         # 3: Valor Original
                        r"([\d.,]+)\s+"         # 4: Saldo Devedor
                        r"([\d.,]+)\s+"         # 5: Multa
                        r"([\d.,]+)\s+"         # 6: Juros
                        r"([\d.,]+)\s+"         # 7: Saldo Consolidado
                        r"(.*)",                # 8: Situação
                        re.IGNORECASE
                    )
                    match = simples_pattern.search(line)
                    if match:
                        debito_data = {
                            "cnpj": current_cnpj,
                            "receita": "SIMPLES NAC.",
                            "periodo_apuracao": format_periodo(match.group(1)),
                            "vencimento": format_date(match.group(2)),
                            "valor_original": parse_br_currency(match.group(3)),
                            "saldo_devedor": parse_br_currency(match.group(4)),
                            "multa": parse_br_currency(match.group(5)),
                            "juros": parse_br_currency(match.group(6)),
                            "saldo_devedor_consolidado": parse_br_currency(match.group(7)),
                            "situacao": match.group(8).strip() or "DEVEDOR"
                        }
                        result.append(debito_data)
                        print(f"✅ Item SIMPLES NAC. extraído (Regex): {debito_data}", file=sys.stdout)
                        i += 1
                        continue
                    else:
                        print(f"❌ Linha SIMPLES NAC. com formato inesperado (Regex falhou), tentando extração flexível: '{line}'", file=sys.stdout)
                        # Fallback para extração flexível
                        debito_data = {"cnpj": current_cnpj, "receita": "SIMPLES NAC."}
                else:
                     # Lógica original para outros débitos
                     debito_data = {"cnpj": current_cnpj, "receita": receita_text}
            else:
                # Item sem código detectado
                print(f"🔧 Processando item sem código: '{line}'", file=sys.stdout)
                debito_data = {"cnpj": current_cnpj, "receita": "SEM CÓDIGO"}
            
            # Coleta as próximas linhas até encontrar outro código de receita ou fim da seção
            j = i + 1
            collected_lines = []
            
            # Coleta linhas até encontrar próximo registro ou fim
            while j < len(lines):
                next_line = lines[j].strip()
                
                # Para se encontrar outro código de receita (início de novo registro)
                if re.match(r"(\d{4}-\d{2}\s+-\s+.*)", next_line):
                    print(f"Próximo registro encontrado na linha {j+1}, parando coleta", file=sys.stdout)
                    break
                    
                # Para se encontrar fim da seção
                if any(re.search(ep, next_line, re.IGNORECASE) for ep in end_patterns):
                    print(f"Fim da seção encontrado na linha {j+1}, parando coleta", file=sys.stdout)
                    break
                    
                # Para se encontrar CNPJ (novo grupo)
                if re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", next_line):
                    print(f"Novo CNPJ encontrado na linha {j+1}, parando coleta", file=sys.stdout)
                    break
                
                # Para se encontrar cabeçalho
                if "Receita" in next_line and "PA/Exerc" in next_line:
                    print(f"Cabeçalho encontrado na linha {j+1}, parando coleta", file=sys.stdout)
                    break
                
                if next_line:  # Só adiciona linhas não vazias
                    collected_lines.append(next_line)
                    print(f"Coletada linha {j+1}: '{next_line}'", file=sys.stdout)
                
                j += 1
            
            # --- Pré-processamento para juntar linhas de período trimestral ---
            processed_lines = []
            k = 0
            while k < len(collected_lines):
                current_line = collected_lines[k]
                # Verifica se a linha termina com 'º' e a próxima começa com 'TRIM'
                if k + 1 < len(collected_lines) and \
                   (current_line.endswith('º') or current_line.endswith('ª') or current_line.endswith('o')) and \
                   collected_lines[k+1].upper().startswith('TRIM'):
                    
                    merged_line = f"{current_line} {collected_lines[k+1]}"
                    processed_lines.append(merged_line)
                    print(f"Linhas de período trimestral unidas: '{merged_line}'", file=sys.stdout)
                    k += 2 # Pula a linha atual e a próxima
                else:
                    processed_lines.append(current_line)
                    k += 1
            # --- Fim do pré-processamento ---

            # Agora analisa as linhas coletadas por tipo de conteúdo
            print(f"Analisando {len(processed_lines)} linhas processadas para o registro", file=sys.stdout)
            
            # Inicializa campos opcionais
            debito_data.update({
                "periodo_apuracao": "",
                "vencimento": "",
                "valor_original": 0.0,
                "saldo_devedor": 0.0,
                "multa": 0.0,
                "juros": 0.0,
                "saldo_devedor_consolidado": 0.0,
                "situacao": ""
            })
            
            for line_content in processed_lines:
                # Identifica PERÍODO (DD/MM/YYYY, MM/YYYY ou N TRIM/YYYY)
                periodo_match_ddmmyyyy = re.match(r'(\d{2}/\d{2}/\d{4})', line_content)
                periodo_match_mmyyyy = re.match(r'(\d{2})/(\d{4})', line_content)
                periodo_match_trim = re.match(r'(\d{1,2})(?:º|o|ª|\s)?\s*TRIM/(\d{4})', line_content, re.IGNORECASE)

                if periodo_match_ddmmyyyy or periodo_match_mmyyyy or periodo_match_trim:
                     if not debito_data["periodo_apuracao"]:  # Só pega o primeiro
                        debito_data["periodo_apuracao"] = format_periodo(line_content)
                        print(f"✅ Período identificado: '{line_content}' -> '{debito_data['periodo_apuracao']}'", file=sys.stdout)
                        continue # Pula para a próxima linha após identificar o período

                # Identifica DATA de VENCIMENTO (DD/MM/YYYY) - mas só se não for um período
                if re.match(r'(\d{2})/(\d{2})/(\d{4})', line_content) and not debito_data["vencimento"]:
                    debito_data["vencimento"] = format_date(line_content)
                    print(f"✅ Vencimento identificado: '{line_content}' -> '{debito_data['vencimento']}'", file=sys.stdout)
                    continue # Pula para a próxima linha

                # Identifica VALORES MONETÁRIOS (números com vírgula/ponto)
                elif re.match(r'^[\d.,]+$', line_content) and (',' in line_content or '.' in line_content):
                    valor = parse_br_currency(line_content)
                    if valor > 0:
                        # A ordem dos valores no PDF é: Vl. Original, Sdo. Devedor, Multa, Juros, Sdo. Dev. Cons.
                        if debito_data.get("valor_original", 0.0) == 0.0:
                            debito_data["valor_original"] = valor
                            print(f"✅ Valor Original identificado: '{line_content}' -> {valor}", file=sys.stdout)
                        elif debito_data.get("saldo_devedor", 0.0) == 0.0:
                            debito_data["saldo_devedor"] = valor
                            print(f"✅ Saldo Devedor identificado: '{line_content}' -> {valor}", file=sys.stdout)
                        elif debito_data.get("multa", 0.0) == 0.0:
                            debito_data["multa"] = valor
                            print(f"✅ Multa identificada: '{line_content}' -> {valor}", file=sys.stdout)
                        elif debito_data.get("juros", 0.0) == 0.0:
                            debito_data["juros"] = valor
                            print(f"✅ Juros identificados: '{line_content}' -> {valor}", file=sys.stdout)
                        elif debito_data.get("saldo_devedor_consolidado", 0.0) == 0.0:
                            debito_data["saldo_devedor_consolidado"] = valor
                            print(f"✅ Saldo Consolidado identificado: '{line_content}' -> {valor}", file=sys.stdout)
                        else:
                            print(f"⚠️ Valor monetário extra ignorado: '{line_content}' -> {valor}", file=sys.stdout)
                
                # Identifica SITUAÇÃO (texto que não é data, nem valor, nem notificação)
                else:
                    if not debito_data["situacao"] and line_content and "notificação de lançamento" not in line_content.lower():
                        # Ignora textos que parecem ser códigos de receita ou períodos mal formatados
                        if not re.match(r'\d{4}-\d{2}', line_content) and not re.match(r'\d{2}/\d{4}', line_content):
                            debito_data["situacao"] = line_content
                            print(f"✅ Situação identificada: '{line_content}'", file=sys.stdout)
            
            # Validação: precisa pelo menos de receita, período e vencimento
            if debito_data["receita"] and debito_data["periodo_apuracao"] and debito_data["vencimento"]:
                result.append(debito_data)
                print(f"✅ Item extraído com sucesso (v5 flexível): {debito_data}", file=sys.stdout)
                i = j  # Continua da linha onde parou a coleta
            else:
                print(f"❌ Falha na validação dos campos obrigatórios para '{debito_data['receita']}'. Dados: {debito_data}", file=sys.stdout)
                i += 1

        else:
            # Se a linha não é CNPJ, cabeçalho ou início de receita, apenas pula
            print(f"Linha ignorada (não reconhecida como início de débito): '{line}'", file=sys.stdout)
            i += 1

    if not result:
         print("Nenhum item de débito SIEF parseado com sucesso na função.", file=sys.stdout)

    return result

# Função para extrair "Débito com Exigibilidade Suspensa (SIEF)"
def extract_debitos_exig_suspensa_sief(text):
    result = []
    lines = text.split('\n')
    in_section = False
    current_cnpj = ""
    current_cno = "" # Adicionado para capturar CNO

    start_pattern = r"Débito\s+com\s+Exigibilidade\s+Suspensa\s+\(SIEF\)"
    end_patterns = [
        r"^(?:Pendência|Pendencia|Parcelamento|Processo|Inscrição|Débito\s+com\s+Exigibilidade)", # Início de outra seção SIEF/PGFN
        r"Final\s+do\s+Relatório",
        r"^\s*_{10,}\s*$", # Linha de underscores
        r"Diagnóstico\s+Fiscal\s+na\s+Procuradoria-Geral" # Fim da parte da Receita
    ]

    # Funções helper agora são globais

    print("\n--- Iniciando busca pela seção 'Débito com Exigibilidade Suspensa (SIEF)' ---", file=sys.stdout)

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Verifica se entramos na seção correta
        if not in_section and re.search(start_pattern, line, re.IGNORECASE):
            in_section = True
            current_cnpj = ""
            current_cno = ""
            print(f"Seção 'Débito com Exigibilidade Suspensa (SIEF)' encontrada na linha {i+1}: '{line}'", file=sys.stdout)
            i += 1
            continue

        if not in_section:
            i += 1
            continue

        # Verifica se saímos da seção
        if any(re.search(ep, line, re.IGNORECASE) for ep in end_patterns):
            print(f"Fim da seção 'Débito com Exigibilidade Suspensa (SIEF)' detectado na linha {i+1}: '{line}'", file=sys.stdout)
            in_section = False
            break

        if not line:
            i += 1
            continue

        # Tenta encontrar CNPJ
        cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
        if cnpj_match:
            current_cnpj = cnpj_match.group(1)
            print(f"CNPJ definido para (Exig Suspensa): {current_cnpj}", file=sys.stdout)
            i += 1
            continue

        # Tenta encontrar CNO (pode aparecer antes da linha do débito)
        cno_match = re.search(r"CNO:\s*([\d./-]+)", line)
        if cno_match:
            current_cno = cno_match.group(1)
            print(f"CNO definido para (Exig Suspensa): {current_cno}", file=sys.stdout)
            # Não incrementa i aqui, pois o CNO pode estar na mesma "unidade" do débito
            # A linha do débito virá a seguir

        # Ignora linhas de cabeçalho
        if "Receita" in line and "PA/Exerc" in line and "Vcto" in line and "Situação" in line:
             print(f"Linha de cabeçalho pulada (Exig Suspensa): '{line}'", file=sys.stdout)
             i += 1
             continue
        if line in ["Dt. Vcto", "Vl.Original", "Sdo.Devedor", "Situação"]:
             print(f"Linha de título de campo pulada (Exig Suspensa): '{line}'", file=sys.stdout)
             i += 1
             continue

        # Verifica se a linha começa com um código de receita
        receita_match = re.match(r"(\d{4}-\d{2}\s+-\s+.*)", line)
        if receita_match and current_cnpj:
            print(f"\nInício de registro de débito Exig Suspensa encontrado: '{line}'", file=sys.stdout)
            debito_data = {"cnpj": current_cnpj, "cno": current_cno if current_cno else ""} # Inclui CNO se encontrado
            debito_data["receita"] = receita_match.group(1).strip()

            # Reset CNO após usá-lo para este débito
            # current_cno = ""

            # Espera-se 5 campos nas próximas linhas: Período, Vencimento, Vl.Original, Sdo.Devedor, Situação
            expected_fields_count = 5
            data_lines = lines[i+1 : i+1+expected_fields_count]
            print(f"Tentando ler {expected_fields_count} campos (Exig Suspensa) nas próximas {len(data_lines)} linhas.", file=sys.stdout)

            if len(data_lines) == expected_fields_count:
                try:
                    temp_data = {}
                    temp_data["periodo_apuracao"] = format_periodo(data_lines[0])
                    temp_data["vencimento"] = format_date(data_lines[1])
                    temp_data["valor_original"] = parse_br_currency(data_lines[2])
                    temp_data["saldo_devedor"] = parse_br_currency(data_lines[3])
                    temp_data["situacao"] = data_lines[4].strip()

                    # Validação mínima
                    if debito_data["receita"] and temp_data.get("periodo_apuracao") and temp_data.get("vencimento"):
                        debito_data.update(temp_data)
                        result.append(debito_data)
                        print(f"Item Exig Suspensa extraído: {debito_data}", file=sys.stdout)
                        i += 1 + expected_fields_count
                        current_cno = "" # Reseta CNO após extrair o item associado
                    else:
                        print(f"Falha na validação (Exig Suspensa) para receita '{debito_data['receita']}'. Dados: {temp_data}", file=sys.stdout)
                        i += 1
                except IndexError:
                     print(f"Erro Index (Exig Suspensa) para receita '{debito_data['receita']}'.", file=sys.stdout)
                     i += 1
                except Exception as e:
                     print(f"Erro processando (Exig Suspensa) para receita '{debito_data['receita']}': {e}. Linhas: {data_lines}", file=sys.stdout)
                     i += 1
            else:
                print(f"Número incorreto de linhas ({len(data_lines)}) (Exig Suspensa) para receita '{debito_data['receita']}'. Esperado {expected_fields_count}.", file=sys.stdout)
                i += 1
        else:
            # Se não for CNPJ, CNO, cabeçalho ou receita, ignora
             if not cno_match: # Só ignora se não for uma linha CNO que acabamos de processar
                 print(f"Linha ignorada (Exig Suspensa): '{line}'", file=sys.stdout)
             i += 1

    if not result:
         print("Nenhum item de Débito com Exigibilidade Suspensa (SIEF) parseado.", file=sys.stdout)

    return result

# Função para extrair "Parcelamento com Exigibilidade Suspensa (SIEFPAR)"
def extract_parcelamentos_siefpar(text):
    result = []
    lines = text.split('\n')
    in_section = False
    current_cnpj = ""

    start_pattern = r"Parcelamento\s+com\s+Exigibilidade\s+Suspensa\s+\(SIEFPAR\)"
    # Padrões de fim ajustados para NÃO incluir "Parcelamento" como fim dentro desta seção
    end_patterns = [
        r"^(?:Pendência|Pendencia|Processo|Inscrição|Débito\s+com\s+Exigibilidade)", # Removido Parcelamento daqui
        r"Final\s+do\s+Relatório",
        r"^\s*_{10,}\s*$",
        r"Diagnóstico\s+Fiscal\s+na\s+Procuradoria-Geral"
    ]

    print("\n--- Iniciando busca pela seção 'Parcelamento com Exigibilidade Suspensa (SIEFPAR)' ---", file=sys.stdout)

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Verifica se entramos na seção correta
        if not in_section and re.search(start_pattern, line, re.IGNORECASE):
            in_section = True
            current_cnpj = ""
            print(f"Seção 'Parcelamento SIEFPAR' encontrada na linha {i+1}: '{line}'", file=sys.stdout)
            i += 1
            continue

        if not in_section:
            i += 1
            continue

        # Verifica se saímos da seção
        if any(re.search(ep, line, re.IGNORECASE) for ep in end_patterns):
            print(f"Fim da seção 'Parcelamento SIEFPAR' detectado na linha {i+1}: '{line}'", file=sys.stdout)
            in_section = False
            break

        if not line:
            i += 1
            continue

        # Tenta encontrar CNPJ
        cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
        if cnpj_match:
            current_cnpj = cnpj_match.group(1)
            print(f"CNPJ definido para (SIEFPAR): {current_cnpj}", file=sys.stdout)
            i += 1
            continue

        # Tenta encontrar um registro de parcelamento SIEFPAR (3 linhas)
        parcelamento_match = re.match(r"Parcelamento:\s*(\d+)", line, re.IGNORECASE)
        if parcelamento_match and current_cnpj:
            parcelamento_num = parcelamento_match.group(1).strip()
            print(f"\nPossível início de registro SIEFPAR encontrado: '{line}'", file=sys.stdout)

            # Verifica as próximas duas linhas
            if i + 2 < len(lines):
                linha_valor = lines[i+1].strip()
                linha_modalidade = lines[i+2].strip()

                valor_match = re.match(r"Valor Suspenso:\s*([\d.,]+)", linha_valor, re.IGNORECASE)
                # Modalidade pode ou não ter o prefixo "Modalidade:"
                modalidade_texto = linha_modalidade.replace("Modalidade:", "").strip()

                if valor_match: # Apenas valida se encontrou o valor
                    valor_suspenso = parse_br_currency(valor_match.group(1))
                    modalidade = modalidade_texto # Pega o que estiver na linha

                    parcelamento_data = {
                        "cnpj": current_cnpj,
                        "parcelamento": parcelamento_num,
                        "valor_suspenso": valor_suspenso,
                        "modalidade": modalidade
                    }
                    result.append(parcelamento_data)
                    print(f"Item SIEFPAR extraído: {parcelamento_data}", file=sys.stdout)
                    i += 3 # Pula as 3 linhas processadas
                    continue # Volta para o início do loop while
                else:
                    print(f"Linhas seguintes não correspondem ao padrão Valor/Modalidade. Linha Valor: '{linha_valor}', Linha Modalidade: '{linha_modalidade}'", file=sys.stdout)
            else:
                print("Não há linhas suficientes após 'Parcelamento:' para Valor e Modalidade.", file=sys.stdout)

        # Se não deu match ou falhou em encontrar as linhas seguintes, ignora a linha atual e avança
        print(f"Linha ignorada (SIEFPAR): '{line}'", file=sys.stdout)
        i += 1

    if not result:
         print("Nenhum item de Parcelamento SIEFPAR parseado.", file=sys.stdout)

    return result

# Função para extrair "Inscrição com Exigibilidade Suspensa (SIDA)" - Lógica v5 (Correção Cabeçalho)
def extract_pendencias_inscricao_sida(text):
    result = []
    lines = text.split('\n')
    in_section = False
    current_cnpj = "" # Embora a seção seja PGFN, o CNPJ pode ser útil se aparecer

    start_pattern = r"Inscrição\s+com\s+Exigibilidade\s+Suspensa\s+\(SIDA\)"
    # Padrões de fim (outras seções PGFN ou fim do relatório)
    end_patterns = [
        r"Pendência\s+-\s+Parcelamento\s+\(SISPAR\)",
        r"Parcelamento\s+com\s+Exigibilidade\s+Suspensa\s+\(SISPAR\)",
        r"Final\s+do\s+Relatório",
        r"^\s*_{10,}\s*$"
    ]

    print("\n--- Iniciando busca pela seção 'Inscrição com Exigibilidade Suspensa (SIDA)' ---", file=sys.stdout)

    i = 0
    current_inscricao_data = {}

    while i < len(lines):
        line = lines[i].strip()

        # Verifica se entramos na seção correta
        if not in_section and re.search(start_pattern, line, re.IGNORECASE):
            in_section = True
            current_cnpj = "" # Reseta CNPJ
            current_inscricao_data = {} # Reseta dados do registro atual
            print(f"Seção 'Inscrição SIDA' encontrada na linha {i+1}: '{line}'", file=sys.stdout)
            i += 1
            continue

        if not in_section:
            i += 1
            continue

        # Verifica se saímos da seção
        if any(re.search(ep, line, re.IGNORECASE) for ep in end_patterns):
            print(f"Fim da seção 'Inscrição SIDA' detectado na linha {i+1}: '{line}'", file=sys.stdout)
            in_section = False
            # Salva o último registro antes de sair
            if current_inscricao_data.get("inscricao") and current_inscricao_data.get("receita") and current_inscricao_data.get("inscrito_em"):
                result.append(current_inscricao_data)
                print(f"Item SIDA extraído (fim da seção): {current_inscricao_data}", file=sys.stdout)
            elif current_inscricao_data.get("inscricao"):
                 print(f"AVISO: Dados SIDA incompletos descartados no fim da seção: {current_inscricao_data}", file=sys.stdout)
            current_inscricao_data = {}
            break

        if not line:
            i += 1
            continue

        # Tenta encontrar CNPJ (pode aparecer no meio)
        cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
        if cnpj_match:
            current_cnpj = cnpj_match.group(1)
            print(f"CNPJ definido para (SIDA): {current_cnpj}", file=sys.stdout)
            i += 1
            continue

        # Pula linhas de título de coluna individuais
        header_titles = ["Inscrição", "Receita", "Inscrito em", "Ajuizado em", "Processo", "Tipo de Devedor"]
        if line in header_titles:
             print(f"Linha de título de coluna SIDA pulada: '{line}'", file=sys.stdout)
             i+=1
             continue

        # Tenta identificar o início de um registro pela Inscrição (formato XX.X.XX.XXXXXX-XX)
        inscricao_match = re.match(r"(\d{2}\.\d{1}\.\d{2}\.\d{6}-\d{2})", line)
        if inscricao_match:
            # Salva o registro anterior se existir e for válido
            if current_inscricao_data.get("inscricao"):
                 if current_inscricao_data.get("receita") and current_inscricao_data.get("inscrito_em"):
                     result.append(current_inscricao_data)
                     print(f"Item SIDA extraído (fim por nova inscrição): {current_inscricao_data}", file=sys.stdout)
                 else:
                      print(f"AVISO: Dados SIDA incompletos descartados (antes de nova inscrição): {current_inscricao_data}", file=sys.stdout)

            # Inicia novo registro
            current_inscricao_data = {"cnpj": current_cnpj} # Usa o último CNPJ encontrado
            current_inscricao_data["inscricao"] = inscricao_match.group(1)
            print(f"\nInício de registro SIDA encontrado: '{line}'", file=sys.stdout)

            # Procura por Receita, Inscrito em, Ajuizado em, Tipo Devedor na mesma linha, sequencialmente
            remaining_line = line[inscricao_match.end():]

            # Receita
            receita_match = re.search(r"\s+(\d{4}-[\w\s]+)", remaining_line)
            current_inscricao_data["receita"] = receita_match.group(1).strip() if receita_match else ""
            if receita_match: remaining_line = remaining_line[receita_match.end():]

            # Inscrito em
            inscrito_em_match = re.search(r"\s+(\d{2}/\d{2}/\d{4})", remaining_line)
            current_inscricao_data["inscrito_em"] = format_date(inscrito_em_match.group(1)) if inscrito_em_match else ""
            if inscrito_em_match: remaining_line = remaining_line[inscrito_em_match.end():]

            # Ajuizado em (pode ser data ou '-')
            ajuizado_em_match = re.search(r"\s+(\d{2}/\d{2}/\d{4}|-)\s*", remaining_line)
            current_inscricao_data["ajuizado_em"] = format_date(ajuizado_em_match.group(1)) if ajuizado_em_match and ajuizado_em_match.group(1) != '-' else ""
            if ajuizado_em_match: remaining_line = remaining_line[ajuizado_em_match.end():]

            # Log completo da linha para depuração
            print(f"Linha completa para análise de Tipo Devedor: '{line}'", file=sys.stdout)
            
            # Verificação especial para DEVEDOR PRINCIPAL - tentativa mais agressiva de encontrar
            if "DEVEDOR PRINCIPAL" in line:
                current_inscricao_data["tipo_devedor"] = "DEVEDOR PRINCIPAL"
                current_inscricao_data["devedor_principal"] = "DEVEDOR PRINCIPAL"
                print(f"[DETECTADO] Tipo DEVEDOR PRINCIPAL encontrado na linha!", file=sys.stdout)
            elif "CORRESPONSÁVEL" in line:
                current_inscricao_data["tipo_devedor"] = "CORRESPONSÁVEL"
                current_inscricao_data["devedor_principal"] = ""
                print(f"[DETECTADO] Tipo CORRESPONSÁVEL encontrado na linha!", file=sys.stdout)
            else:
                # Tipo Devedor (DEVEDOR PRINCIPAL ou CORRESPONSÁVEL) - busca com expressão regular
                tipo_devedor_match = re.search(r"\s*(DEVEDOR\s+PRINCIPAL|CORRESPONSÁVEL)\s*", remaining_line, re.IGNORECASE)
                if tipo_devedor_match:
                    current_inscricao_data["tipo_devedor"] = tipo_devedor_match.group(1).strip().upper()
                    print(f"Tipo de Devedor definido na linha principal via regex: '{current_inscricao_data['tipo_devedor']}'", file=sys.stdout)
                    
                    # Se for DEVEDOR PRINCIPAL, também coloca isso no campo devedor_principal para exibição na tabela
                    if "PRINCIPAL" in current_inscricao_data["tipo_devedor"]:
                        current_inscricao_data["devedor_principal"] = "DEVEDOR PRINCIPAL"
                        print(f"Devedor Principal preenchido com 'DEVEDOR PRINCIPAL' para melhor visualização", file=sys.stdout)
                    else:
                        # Se for CORRESPONSÁVEL, o devedor_principal será encontrado nas próximas linhas
                        current_inscricao_data["devedor_principal"] = ""
                else:
                    # Último recurso: busca uma versão simplificada
                    if "PRINCIPAL" in line.upper():
                        current_inscricao_data["tipo_devedor"] = "DEVEDOR PRINCIPAL"
                        current_inscricao_data["devedor_principal"] = "DEVEDOR PRINCIPAL"
                        print(f"[ÚLTIMO RECURSO] Detectado PRINCIPAL na linha, definindo como DEVEDOR PRINCIPAL", file=sys.stdout)
                    else:
                        current_inscricao_data["tipo_devedor"] = ""
                        current_inscricao_data["devedor_principal"] = ""
                        print(f"[AVISO] Não foi possível encontrar o tipo de devedor na linha", file=sys.stdout)

            # --- LÓGICA MELHORADA PARA PROCURAR PROCESSO NAS PRÓXIMAS LINHAS ---
            current_inscricao_data["processo"] = "" # Inicializa o campo processo
            search_lines_limit = 5 # Limita a busca às próximas 5 linhas
            j = i + 1 # Começa a procurar na próxima linha

            while j < len(lines) and (j - (i + 1)) < search_lines_limit:
                next_line = lines[j].strip()
                
                # Ignora linhas vazias ou cabeçalhos de colunas
                header_titles_sida = ["Inscrição", "Receita", "Inscrito em", "Ajuizado em", "Processo", "Tipo de Devedor"]
                if not next_line or next_line in header_titles_sida or re.search(r"Situação:", next_line, re.IGNORECASE) or re.search(r"Devedor Principal:", next_line, re.IGNORECASE):
                    j += 1
                    continue
                
                # Se a linha parece ser o início de um novo registro de inscrição, para a busca
                if re.match(r"(\d{2}\.\d{1}\.\d{2}\.\d{6}-\d{2})", next_line):
                    print(f"Próxima linha parece ser nova inscrição, parando busca por processo na linha {j+1}.", file=sys.stdout)
                    break
                
                # Verifica se a linha parece ser um número de processo (mas não um código de receita ou inscrição)
                # Ignora linhas que começam com padrão de receita (XXXX-XX)
                if not re.match(r"^\d{4}-\d{2}", next_line):
                    # Verifica o padrão de processo mas sem presumir formato fixo
                    processo_match_next = re.match(r"^([0-9][0-9./-]+)$", next_line)
                    if processo_match_next:
                        processo_candidato = processo_match_next.group(1).strip()
                        # Verifica se não é uma data (para não confundir com data de inscrição/ajuizamento)
                        if not re.match(r"\d{2}/\d{2}/\d{4}", processo_candidato):
                            current_inscricao_data["processo"] = processo_candidato
                            print(f"Processo SIDA encontrado na linha {j+1}: '{current_inscricao_data['processo']}'", file=sys.stdout)
                            break
                
                # Se a linha não corresponde a um padrão conhecido, avança
                j += 1
            # --- FIM DA LÓGICA MELHORADA ---


            # A lógica para capturar Situação e Devedor Principal em linhas seguintes permanece
            # (linhas 623-637 na versão completa do arquivo)

            print(f"Dados parciais SIDA (linha inscrição - regex sequencial): {current_inscricao_data}", file=sys.stdout)
            i += 1
            continue

        # Se estamos coletando dados de uma inscrição, procura por campos faltantes nas linhas seguintes
        if current_inscricao_data.get("inscricao"):
            # Procura por Situação
            situacao_match = re.match(r"Situação:\s*(.*)", line, re.IGNORECASE)
            if situacao_match:
                current_inscricao_data["situacao"] = situacao_match.group(1).strip()
                print(f"Situação SIDA encontrada: '{current_inscricao_data['situacao']}'", file=sys.stdout)
                # Não salva ainda, espera o próximo registro ou fim da seção
                i += 1
                continue

            # Procura por Devedor Principal
            devedor_match = re.match(r"Devedor Principal:\s*(.*)", line, re.IGNORECASE)
            if devedor_match:
                 current_inscricao_data["devedor_principal"] = devedor_match.group(1).strip()
                 print(f"Devedor Principal SIDA encontrado: '{current_inscricao_data['devedor_principal']}'", file=sys.stdout)
                 
                 # Se encontramos um Devedor Principal e o tipo de devedor não está definido,
                 # podemos assumir que é CORRESPONSÁVEL (já que Devedor Principal só aparece para esse tipo)
                 if not current_inscricao_data.get("tipo_devedor"):
                      current_inscricao_data["tipo_devedor"] = "CORRESPONSÁVEL"
                      print(f"Tipo de Devedor definido como CORRESPONSÁVEL baseado na presença de Devedor Principal", file=sys.stdout)
                 
                 i += 1
                 continue

            # Tenta capturar campos que podem ter ficado na linha seguinte (se ainda não preenchidos)
            if not current_inscricao_data.get("receita") and re.match(r'\d{4}-', line):
                 current_inscricao_data["receita"] = line
                 print(f"Receita SIDA encontrada (linha seguinte): '{line}'", file=sys.stdout)
                 i += 1
                 continue
            if not current_inscricao_data.get("inscrito_em") and re.match(r'\d{2}/\d{2}/\d{4}', line):
                 current_inscricao_data["inscrito_em"] = format_date(line)
                 print(f"Inscrito em SIDA encontrado (linha seguinte): '{line}'", file=sys.stdout)
                 i += 1
                 continue
            # Adicionar mais lógicas se necessário para outros campos como Ajuizado, Processo, Tipo Devedor

            # Verifica se a linha contém "DEVEDOR PRINCIPAL" - isso pode aparecer em uma linha separada
            if "DEVEDOR PRINCIPAL" in line.upper():
                current_inscricao_data["tipo_devedor"] = "DEVEDOR PRINCIPAL"
                current_inscricao_data["devedor_principal"] = "DEVEDOR PRINCIPAL"
                print(f"[DETECTADO] Tipo DEVEDOR PRINCIPAL encontrado em linha separada: '{line}'", file=sys.stdout)
                i += 1
                continue
            
            print(f"Linha ignorada (SIDA - dentro de registro, não reconhecida): '{line}'", file=sys.stdout)
            i += 1
            continue

        # Se não está na seção, não é CNPJ, não é cabeçalho, não é início de inscrição, ignora
        print(f"Linha ignorada (SIDA - geral): '{line}'", file=sys.stdout)
        i += 1

    # Salva o último registro se houver dados pendentes ao sair do loop
    if current_inscricao_data.get("inscricao"):
        if current_inscricao_data.get("receita") and current_inscricao_data.get("inscrito_em"):
            result.append(current_inscricao_data)
            print(f"Item SIDA extraído (fim do loop): {current_inscricao_data}", file=sys.stdout)
        else:
             print(f"AVISO: Dados SIDA incompletos descartados no fim do loop: {current_inscricao_data}", file=sys.stdout)


    if not result:
         print("Nenhum item de Inscrição SIDA parseado.", file=sys.stdout)

    return result

# Função para extrair "Pendência - Parcelamento (SISPAR)"
def extract_pendencias_parcelamento_sispar(text):
    result = []
    lines = text.split('\n')
    in_section = False
    current_cnpj = ""

    start_pattern = r"Pendência\s+-\s+Parcelamento\s+\(SISPAR\)"
    # Padrões de fim (outras seções PGFN ou fim do relatório)
    end_patterns = [
        r"Inscrição\s+com\s+Exigibilidade\s+Suspensa\s+\(SIDA\)", # Outra seção PGFN
        r"Parcelamento\s+com\s+Exigibilidade\s+Suspensa\s+\(SISPAR\)", # Outra seção PGFN
        r"Final\s+do\s+Relatório",
        r"^\s*_{10,}\s*$"
    ]

    print("\n--- Iniciando busca pela seção 'Pendência - Parcelamento (SISPAR)' ---", file=sys.stdout)

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Verifica se entramos na seção correta
        if not in_section and re.search(start_pattern, line, re.IGNORECASE):
            in_section = True
            current_cnpj = "" # Reseta CNPJ
            print(f"Seção 'Pendência SISPAR' encontrada na linha {i+1}: '{line}'", file=sys.stdout)
            i += 1
            continue

        if not in_section:
            i += 1
            continue

        # Verifica se saímos da seção
        if any(re.search(ep, line, re.IGNORECASE) for ep in end_patterns):
            print(f"Fim da seção 'Pendência SISPAR' detectado na linha {i+1}: '{line}'", file=sys.stdout)
            in_section = False
            break

        if not line:
            i += 1
            continue

        # Tenta encontrar CNPJ
        cnpj_match = re.search(r"CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", line)
        if cnpj_match:
            current_cnpj = cnpj_match.group(1)
            print(f"CNPJ definido para (SISPAR): {current_cnpj}", file=sys.stdout)
            i += 1
            continue

        # Ignora a linha de cabeçalho "Conta"
        if line.lower() == "conta":
            print(f"Linha de cabeçalho 'Conta' pulada (SISPAR): '{line}'", file=sys.stdout)
            i += 1
            continue

        # Tenta encontrar a linha da Conta (apenas números)
        conta_match = re.match(r"^(\d+)$", line)
        if conta_match and current_cnpj:
            conta = conta_match.group(1)
            print(f"\nLinha da Conta SISPAR encontrada: '{conta}'", file=sys.stdout)

            # Procura a linha de Descrição na linha seguinte
            if i + 1 < len(lines):
                descricao_line = lines[i+1].strip()
                # Assume que a linha seguinte é a descrição se não for vazia e não for a modalidade
                if descricao_line and not re.match(r"Modalidade:", descricao_line, re.IGNORECASE):
                    descricao = descricao_line
                    print(f"Linha da Descrição SISPAR encontrada: '{descricao}'", file=sys.stdout)

                    # Procura a linha de Modalidade na linha seguinte à descrição
                    if i + 2 < len(lines):
                        modalidade_line = lines[i+2].strip()
                        modalidade_match = re.match(r"Modalidade:\s*(.*)", modalidade_line, re.IGNORECASE)
                        if modalidade_match:
                            modalidade = modalidade_match.group(1).strip()
                            print(f"Modalidade SISPAR encontrada: '{modalidade}'", file=sys.stdout)

                            sispar_data = {
                                "cnpj": current_cnpj,
                                "conta": conta,
                                "descricao": descricao,
                                "modalidade": modalidade
                            }
                            result.append(sispar_data)
                            print(f"Item SISPAR extraído: {sispar_data}", file=sys.stdout)
                            i += 3 # Pula as 3 linhas (conta, descrição, modalidade)
                            continue # Volta para o início do loop
                        else:
                            print(f"AVISO: Linha após descrição não continha 'Modalidade:'. Linha: '{modalidade_line}'", file=sys.stdout)
                            # Poderia salvar sem modalidade aqui se necessário
                    else:
                        print("AVISO: Fim do arquivo/seção atingido antes de encontrar a linha de Modalidade.", file=sys.stdout)
                        # Poderia salvar sem modalidade aqui se necessário
                else:
                    print(f"AVISO: Linha após conta não parece ser descrição válida. Linha: '{descricao_line}'", file=sys.stdout)
            else:
                print("AVISO: Fim do arquivo/seção atingido antes de encontrar a linha de Descrição.", file=sys.stdout)

        # Se não for CNPJ, cabeçalho ou linha de conta válida, ignora e avança
        # A verificação de conta_match garante que só avançamos se a linha não for uma conta válida
        if not conta_match:
            print(f"Linha ignorada (SISPAR): '{line}'", file=sys.stdout)
        i += 1 # Avança para a próxima linha em todos os casos onde não houve 'continue'

    if not result:
         print("Nenhum item de Pendência SISPAR parseado.", file=sys.stdout)

    return result


# def extract_parcelamentos_sipade(text): return []
# def extract_processos_fiscais(text): return []
# def extract_debitos_sicob(text): return [] # Implementar
# def extract_parcelamentos_sipade(text): return [] # Implementar
# def extract_parcelamentos_sipade(text): return [] # Implementar
# def extract_processos_fiscais(text): return [] # Implementar
# -------------------------------------------------

# Cria a instância do FastAPI ANTES de usá-la
app = FastAPI()

# CORS middleware deve ser aplicado logo após a criação do app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.actplanconsultoria.com",  # Produção
        "http://localhost:5173",  # Desenvolvimento - Vite
        "http://localhost:3000",  # Desenvolvimento - Create React App (se usar)
        "http://127.0.0.1:5173",  # Variação de localhost
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"]
)

# Removido OPENROUTER_API_KEY, OPENROUTER_URL, SYSTEM_PROMPT, fiscal_schema pois não são mais usados

@app.post("/api/extraction/extract")
async def extract_pdf(file: UploadFile = File(...)):
    import sys
    import traceback # Para log mais detalhado
    response_to_send = None # Inicializa a variável de resposta
    try:
        print(">>> Endpoint /api/extraction/extract INICIADO <<<", file=sys.stdout)
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

        # --- Chamar funções extratoras ---
        pendencias_debito_data = extract_pendencias_debito(cleaned_text)
        debitos_exig_suspensa_data = extract_debitos_exig_suspensa_sief(cleaned_text)
        parcelamentos_siefpar_data = extract_parcelamentos_siefpar(cleaned_text)
        pendencias_inscricao_data = extract_pendencias_inscricao_sida(cleaned_text)
        pendencias_parcelamento_sispar_data = extract_pendencias_parcelamento_sispar(cleaned_text) # Nova função
        # --- Placeholders para funções futuras ---
        parcelamentos_sipade_data = []
        processos_fiscais_data = []
        debitos_sicob_data = []
        # --------------------------------

        print(f"Dados extraídos FINAL (Pendências Débito SIEF): {len(pendencias_debito_data)} itens", file=sys.stdout)
        print(f"Dados extraídos FINAL (Débitos Exig. Suspensa SIEF): {len(debitos_exig_suspensa_data)} itens", file=sys.stdout)
        print(f"Dados extraídos FINAL (Parcelamentos SIEFPAR): {len(parcelamentos_siefpar_data)} itens", file=sys.stdout)
        print(f"Dados extraídos FINAL (Pendências Inscrição SIDA): {len(pendencias_inscricao_data)} itens", file=sys.stdout)
        print(f"Dados extraídos FINAL (Pendências Parcelamento SISPAR): {len(pendencias_parcelamento_sispar_data)} itens", file=sys.stdout) # Novo log
        # Adicionar logs para outras seções quando implementadas

        # Monta o dicionário final com os dados extraídos
        resposta_final = {
            "debitosExigSuspensaSief": debitos_exig_suspensa_data,
            "parcelamentosSipade": parcelamentos_sipade_data, # Usando placeholder
            "pendenciasDebito": pendencias_debito_data,
            "processosFiscais": processos_fiscais_data, # Usando placeholder
            "parcelamentosSiefpar": parcelamentos_siefpar_data,
            "debitosSicob": debitos_sicob_data, # Usando placeholder
            "pendenciasInscricao": pendencias_inscricao_data,
            "pendenciasParcelamentoSispar": pendencias_parcelamento_sispar_data # Novo campo
        }

        response_to_send = JSONResponse(content=resposta_final)

    except Exception as e:
        print(f"Erro GERAL no endpoint /extract: {e}\n{traceback.format_exc()}", file=sys.stdout)
        # Retorna erro mesmo se a extração parcial funcionou
        response_to_send = JSONResponse(content={"error": f"Erro interno GRAVE no servidor ao processar PDF: {e}"}, status_code=500)
    finally:
        # Este log deve aparecer mesmo se houver erro antes do return
        print("Finalizando processamento do endpoint /extract.", file=sys.stdout)
        # Garante que a resposta definida no try ou except seja retornada
        # (Se response_to_send não foi definido por um erro antes do try, isso causaria outro erro)
        # Para segurança, podemos definir um padrão aqui, mas o ideal é que o try/except cubra.
        if 'response_to_send' not in locals():
             response_to_send = JSONResponse(content={"error": "Erro inesperado antes de gerar resposta."}, status_code=500)

    return response_to_send

# Função para extrair dados do DARF - Versão Multi-página
def extract_darf_data(text):
    result = []
    lines = text.split('\n')
    
    print("\n--- Iniciando extração de dados do DARF (Multi-página) ---", file=sys.stdout)
    
    # Procura por TODAS as seções "Composição do Documento de Arrecadação"
    start_pattern = r"Composição\s+do\s+Documento\s+de\s+Arrecadação"
    header_pattern = r"Código\s+Denominação\s+Principal\s+Multa\s+Juros\s+Total"
    
    # Encontra todas as seções de composição
    composition_sections = []
    for i, line in enumerate(lines):
        if re.search(start_pattern, line.strip(), re.IGNORECASE):
            composition_sections.append(i)
            print(f"Seção de composição encontrada na linha {i+1}: '{line.strip()}'", file=sys.stdout)
    
    print(f"Total de seções de composição encontradas: {len(composition_sections)}", file=sys.stdout)
    
    # Processa cada seção de composição
    for section_idx, section_start in enumerate(composition_sections):
        print(f"\n--- Processando seção {section_idx + 1} (linha {section_start + 1}) ---", file=sys.stdout)
        
        # Define o fim da seção atual (início da próxima seção ou fim do texto)
        if section_idx < len(composition_sections) - 1:
            section_end = composition_sections[section_idx + 1]
        else:
            section_end = len(lines)
        
        # Processa apenas as linhas desta seção
        in_composition_section = False
        i = section_start
        
        while i < section_end:
            line = lines[i].strip()
            
            # Ativa a seção quando encontra o padrão
            if not in_composition_section and re.search(start_pattern, line, re.IGNORECASE):
                in_composition_section = True
                print(f"Seção {section_idx + 1} ativada na linha {i+1}", file=sys.stdout)
                i += 1
                continue
                
            if not in_composition_section:
                i += 1
                continue
                
            # Pula linha de cabeçalho da tabela
            if re.search(header_pattern, line, re.IGNORECASE):
                print(f"Cabeçalho da tabela encontrado na linha {i+1}: '{line}'", file=sys.stdout)
                i += 1
                continue
                
            # Para se chegar ao fim desta seção (mas não para a extração global)
            if not line or line.startswith("Total do Documento") or line.startswith("VENCIMENTO") or line.startswith("AUTENTICAÇÃO"):
                print(f"Fim da seção {section_idx + 1} detectado na linha {i+1}: '{line}'", file=sys.stdout)
                break
                
            # Tenta detectar início de item DARF por dois padrões diferentes
            
            # Padrão 1: linha só com 4 dígitos (formato original)
            codigo_only_match = re.match(r"^(\d{4})$", line)
            
            # Padrão 2: código + denominação + valores na mesma linha
            codigo_inline_match = re.match(r"^(\d{4})\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$", line)
            
            if codigo_only_match:
                # FORMATO 1: Código sozinho
                codigo = codigo_only_match.group(1)
                print(f"\n🎯 Código DARF (Formato 1) encontrado: {codigo} na linha {i+1} (Seção {section_idx + 1})", file=sys.stdout)
                
                # Verifica se temos linhas suficientes para um item completo dentro desta seção
                if i + 7 >= section_end:
                    print(f"❌ Não há linhas suficientes após código {codigo} na seção {section_idx + 1}", file=sys.stdout)
                    i += 1
                    continue
                
                # Extrai dados nas próximas linhas conforme o padrão observado
                denominacao = lines[i+1].strip()  # denominação
                principal_str = lines[i+2].strip()  # principal
                multa_str = lines[i+3].strip()      # multa
                juros_str = lines[i+4].strip()      # juros
                total_str = lines[i+5].strip()      # total
                descricao_completa = lines[i+6].strip()  # descrição completa
                periodo_vencimento = lines[i+7].strip()  # PA + vencimento
                
                print(f"Denominação: '{denominacao}'", file=sys.stdout)
                print(f"Valores: {principal_str}, {multa_str}, {juros_str}, {total_str}", file=sys.stdout)
                print(f"Período/Vencimento: '{periodo_vencimento}'", file=sys.stdout)
                
                # Converte valores monetários
                try:
                    principal = parse_br_currency(principal_str)
                    multa = parse_br_currency(multa_str)
                    juros = parse_br_currency(juros_str)
                    total = parse_br_currency(total_str)
                except Exception as e:
                    print(f"❌ Erro ao converter valores monetários: {e}", file=sys.stdout)
                    i += 1
                    continue
                
                # Extrai período de apuração (formato pode ser DD/MM/YYYY ou MM/YYYY)
                periodo_match = re.search(r"PA\s+(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})", periodo_vencimento)
                periodo = periodo_match.group(1) if periodo_match else ""
                
                # Extrai data de vencimento
                vencimento_match = re.search(r"Vencimento\s+(\d{2}/\d{2}/\d{4})", periodo_vencimento)
                vencimento = vencimento_match.group(1) if vencimento_match else ""
                
                print(f"Período extraído: '{periodo}'", file=sys.stdout)
                print(f"Vencimento extraído: '{vencimento}'", file=sys.stdout)
                
                # Validação básica
                if not denominacao or not periodo or not vencimento:
                    print(f"❌ Dados incompletos para código {codigo} na seção {section_idx + 1}", file=sys.stdout)
                    i += 1
                    continue
                
                darf_item = {
                    "codigo": codigo,
                    "denominacao": denominacao,
                    "periodo_apuracao": periodo,
                    "vencimento": vencimento,
                    "principal": principal,
                    "multa": multa,
                    "juros": juros,
                    "total": total
                }
                
                result.append(darf_item)
                print(f"✅ Item DARF (Formato 1) extraído da seção {section_idx + 1}: {darf_item}", file=sys.stdout)
                
                # Pula para depois das 8 linhas processadas (código + 7 linhas de dados)
                i += 8
                continue
                
            elif codigo_inline_match:
                # FORMATO 2: Código + denominação + valores na mesma linha
                codigo = codigo_inline_match.group(1)
                denominacao = codigo_inline_match.group(2).strip()
                principal_str = codigo_inline_match.group(3)
                multa_str = codigo_inline_match.group(4)
                juros_str = codigo_inline_match.group(5)
                total_str = codigo_inline_match.group(6)
                
                print(f"\n🎯 Código DARF (Formato 2) encontrado: {codigo} na linha {i+1} (Seção {section_idx + 1})", file=sys.stdout)
                print(f"Denominação: '{denominacao}'", file=sys.stdout)
                print(f"Valores: {principal_str}, {multa_str}, {juros_str}, {total_str}", file=sys.stdout)
                
                # Verifica se temos linhas suficientes para descrição e período
                if i + 2 >= section_end:
                    print(f"❌ Não há linhas suficientes após código {codigo} na seção {section_idx + 1}", file=sys.stdout)
                    i += 1
                    continue
                
                # Próximas linhas contêm descrição e período/vencimento
                descricao_completa = lines[i+1].strip()  # descrição completa
                periodo_vencimento = lines[i+2].strip()  # PA + vencimento
                
                print(f"Período/Vencimento: '{periodo_vencimento}'", file=sys.stdout)
                
                # Converte valores monetários
                try:
                    principal = parse_br_currency(principal_str)
                    multa = parse_br_currency(multa_str)
                    juros = parse_br_currency(juros_str)
                    total = parse_br_currency(total_str)
                except Exception as e:
                    print(f"❌ Erro ao converter valores monetários: {e}", file=sys.stdout)
                    i += 1
                    continue
                
                # Extrai período de apuração (formato pode ser DD/MM/YYYY ou MM/YYYY)
                periodo_match = re.search(r"PA\s+(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})", periodo_vencimento)
                periodo = periodo_match.group(1) if periodo_match else ""
                
                # Extrai data de vencimento
                vencimento_match = re.search(r"Vencimento\s+(\d{2}/\d{2}/\d{4})", periodo_vencimento)
                vencimento = vencimento_match.group(1) if vencimento_match else ""
                
                print(f"Período extraído: '{periodo}'", file=sys.stdout)
                print(f"Vencimento extraído: '{vencimento}'", file=sys.stdout)
                
                # Validação básica
                if not denominacao or not periodo or not vencimento:
                    print(f"❌ Dados incompletos para código {codigo} na seção {section_idx + 1}", file=sys.stdout)
                    i += 1
                    continue
                
                darf_item = {
                    "codigo": codigo,
                    "denominacao": denominacao,
                    "periodo_apuracao": periodo,
                    "vencimento": vencimento,
                    "principal": principal,
                    "multa": multa,
                    "juros": juros,
                    "total": total
                }
                
                result.append(darf_item)
                print(f"✅ Item DARF (Formato 2) extraído da seção {section_idx + 1}: {darf_item}", file=sys.stdout)
                
                # Pula 3 linhas (linha atual + descrição + período)
                i += 3
                continue
            
            i += 1
    
    print(f"Extração DARF finalizada. {len(result)} itens encontrados em {len(composition_sections)} seções.", file=sys.stdout)
    return result

@app.post("/api/extraction/extract-darf")
async def extract_darf_pdf(file: UploadFile = File(...)):
    import sys
    import traceback
    response_to_send = None
    try:
        print(">>> Endpoint /api/extraction/extract-darf INICIADO <<<", file=sys.stdout)
        print("Recebido PDF DARF para extração", file=sys.stdout)
        contents = await file.read()

        # Usa a função de extração de texto existente
        extracted_text = extract_pdf_text(contents)
        print("\n---\nTexto extraído do DARF (primeiros 1000 chars):", extracted_text[:1000].replace('\n', ' '), file=sys.stdout)

        # Pré-processa o texto
        cleaned_text = preprocess_text(extracted_text)

        # Extrai dados do DARF
        darf_data = extract_darf_data(cleaned_text)
        
        print(f"Dados DARF extraídos: {len(darf_data)} itens", file=sys.stdout)

        response_to_send = JSONResponse(content={"data": darf_data})

    except Exception as e:
        print(f"Erro no endpoint /extract-darf: {e}\n{traceback.format_exc()}", file=sys.stdout)
        response_to_send = JSONResponse(content={"error": f"Erro ao processar DARF: {e}"}, status_code=500)
    finally:
        print("Finalizando processamento do endpoint /extract-darf.", file=sys.stdout)
        if 'response_to_send' not in locals():
             response_to_send = JSONResponse(content={"error": "Erro inesperado no processamento DARF."}, status_code=500)

    return response_to_send
