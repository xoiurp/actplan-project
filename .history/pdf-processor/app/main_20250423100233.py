from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import io

app = FastAPI()

# Configuração de CORS para permitir acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf = fitz.open(stream=contents, filetype="pdf")
        text = ""
        for page in pdf:
            text += page.get_text()
        pdf.close()

        # Exemplo de parsing simples para Pendência - Débito (SIEF)
        # (Ajuste os padrões conforme necessário para outros tipos)
        import re
        pendencias_debito = []
        # Regex para capturar blocos de Pendência - Débito
        blocos = re.split(r"Pend[êe]ncia\s*-\s*D[ée]bito\s*\(SIEF\)", text, flags=re.IGNORECASE)
        for bloco in blocos[1:]:
            cnpj = re.search(r"CNPJ[:\s]*([\d\./-]+)", bloco)
            receita = re.search(r"(\d{4}-\d{2} ?-? ?[A-Z]*)", bloco)
            periodo = re.search(r"(\d{2}/\d{4})", bloco)
            vencimento = re.search(r"(\d{2}/\d{2}/\d{4})", bloco)
            valor_original = re.search(r"Valor Original[:\s]*([\d\.,]+)", bloco)
            saldo_devedor = re.search(r"Saldo Devedor[:\s]*([\d\.,]+)", bloco)
            multa = re.search(r"Multa[:\s]*([\d\.,]+)", bloco)
            juros = re.search(r"Juros[:\s]*([\d\.,]+)", bloco)
            saldo_consolidado = re.search(r"Saldo Devedor Consolidado[:\s]*([\d\.,]+)", bloco)
            situacao = re.search(r"Situa[çc][aã]o[:\s]*([A-Z/ ]+)", bloco)

            pendencias_debito.append({
                "cnpj": cnpj.group(1) if cnpj else "",
                "receita": receita.group(1) if receita else "",
                "periodo_apuracao": periodo.group(1) if periodo else "",
                "vencimento": vencimento.group(1) if vencimento else "",
                "valor_original": valor_original.group(1) if valor_original else "",
                "saldo_devedor": saldo_devedor.group(1) if saldo_devedor else "",
                "multa": multa.group(1) if multa else "",
                "juros": juros.group(1) if juros else "",
                "saldo_devedor_consolidado": saldo_consolidado.group(1) if saldo_consolidado else "",
                "situacao": situacao.group(1) if situacao else "",
            })

        return JSONResponse(content={
            "pendenciasDebito": pendencias_debito,
            "texto": text
        })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
