# Função aprimorada para extrair "Inscrição com Exigibilidade Suspensa (SIDA)"
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
