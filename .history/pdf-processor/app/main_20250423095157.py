from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import io

app = FastAPI()

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf = fitz.open(stream=contents, filetype="pdf")
        text = ""
        for page in pdf:
            text += page.get_text()
        pdf.close()
        return JSONResponse(content={"text": text})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
