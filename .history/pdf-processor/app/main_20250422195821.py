from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Processor API",
    description="API for extracting data from PDF documents using Docling.",
    version="0.1.0",
)

@app.get("/health", summary="Health Check", tags=["Status"])
async def health_check():
    """
    Simple health check endpoint to confirm the service is running.
    """
    logger.info("Health check endpoint called.")
    return JSONResponse(content={"status": "ok"})

@app.post("/process/situacao-fiscal", summary="Process Situacao Fiscal PDF", tags=["Processing"])
async def process_situacao_fiscal(file: UploadFile = File(...)):
    """
    Endpoint to process a 'Situação Fiscal' PDF.
    (Implementation using Docling to be added later)
    """
    logger.info(f"Received file for Situação Fiscal processing: {file.filename}")
    if file.content_type != "application/pdf":
        logger.warning(f"Invalid file type received: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is allowed.")

    try:
        # --- Placeholder for Docling processing ---
        # 1. Save the uploaded file temporarily (or process in memory if possible)
        # 2. Initialize Docling pipeline/converter
        # 3. Define the extraction schema for Situação Fiscal
        # 4. Call Docling to process the file with the schema
        # 5. Format the extracted data as needed
        # --- End Placeholder ---

        # Dummy response for now
        extracted_data = [
            {"message": "Processing logic for Situação Fiscal not yet implemented.", "filename": file.filename}
        ]
        logger.info(f"Dummy processing complete for: {file.filename}")
        return JSONResponse(content={"data": extracted_data})

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {e}")

@app.post("/process/darf", summary="Process DARF PDF", tags=["Processing"])
async def process_darf(file: UploadFile = File(...)):
    """
    Endpoint to process a DARF PDF.
    (Implementation using Docling to be added later)
    """
    logger.info(f"Received file for DARF processing: {file.filename}")
    if file.content_type != "application/pdf":
        logger.warning(f"Invalid file type received: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is allowed.")

    try:
        # --- Placeholder for Docling processing ---
        # Similar steps as above, but with DARF-specific schema/logic
        # --- End Placeholder ---

        # Dummy response for now
        extracted_data = [
            {"message": "Processing logic for DARF not yet implemented.", "filename": file.filename}
        ]
        logger.info(f"Dummy processing complete for: {file.filename}")
        return JSONResponse(content={"data": extracted_data})

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {e}")

# Add other endpoints as needed

if __name__ == "__main__":
    import uvicorn
    # This block is for local development/debugging without Docker
    uvicorn.run(app, host="0.0.0.0", port=8000)
