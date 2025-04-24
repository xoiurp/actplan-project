from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
import tempfile
import os
from pathlib import Path
import time # Added for timing

# Import Docling classes
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat

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
    logger.info(f"Received file for Situação Fiscal processing: {file.filename} ({file.content_type})")
    if file.content_type != "application/pdf":
        logger.warning(f"Invalid file type received: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is allowed.")

    # Create a temporary file to save the upload
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            start_time = time.time()
            content = await file.read()
            temp_file.write(content)
            temp_file_path = Path(temp_file.name)
            logger.info(f"File saved temporarily to: {temp_file_path}")

            # Configure Docling pipeline options (adjust as needed)
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True # Enable OCR
            pipeline_options.do_table_structure = True # Enable table detection
            pipeline_options.table_structure_options.do_cell_matching = True
            # Add other options like language if needed: pipeline_options.ocr_options.lang = ["pt"]

            # Initialize DocumentConverter
            doc_converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )

            # Process the document
            logger.info(f"Starting Docling conversion for {temp_file_path}...")
            conv_result = doc_converter.convert(temp_file_path)
            processing_time = time.time() - start_time
            logger.info(f"Docling conversion finished in {processing_time:.2f} seconds.")

            # Export result to dictionary
            extracted_data_dict = conv_result.document.export_to_dict()

            # Optionally, you might want to simplify or restructure the dict before sending
            # For now, sending the full dictionary
            
            logger.info(f"Successfully processed: {file.filename}")
            return JSONResponse(content={"data": extracted_data_dict})

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        # Clean up the temporary file
        if 'temp_file_path' in locals() and temp_file_path.exists():
            try:
                os.unlink(temp_file_path)
                logger.info(f"Temporary file deleted: {temp_file_path}")
            except Exception as unlink_error:
                logger.error(f"Error deleting temporary file {temp_file_path}: {unlink_error}")

@app.post("/process/darf", summary="Process DARF PDF", tags=["Processing"])
async def process_darf(file: UploadFile = File(...)):
    """
    Endpoint to process a DARF PDF.
    (Implementation using Docling to be added later)
    """
    logger.info(f"Received file for DARF processing: {file.filename} ({file.content_type})")
    if file.content_type != "application/pdf":
        logger.warning(f"Invalid file type received: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is allowed.")

    # Create a temporary file to save the upload
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            start_time = time.time()
            content = await file.read()
            temp_file.write(content)
            temp_file_path = Path(temp_file.name)
            logger.info(f"File saved temporarily to: {temp_file_path}")

            # Configure Docling pipeline options (potentially different for DARF)
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True # Enable OCR
            pipeline_options.do_table_structure = True # Enable table detection
            pipeline_options.table_structure_options.do_cell_matching = True
            # Add other options like language if needed: pipeline_options.ocr_options.lang = ["pt"]

            # Initialize DocumentConverter
            doc_converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )

            # Process the document
            logger.info(f"Starting Docling conversion for {temp_file_path}...")
            conv_result = doc_converter.convert(temp_file_path)
            processing_time = time.time() - start_time
            logger.info(f"Docling conversion finished in {processing_time:.2f} seconds.")

            # Export result to dictionary
            extracted_data_dict = conv_result.document.export_to_dict()

            # Optionally, you might want to simplify or restructure the dict before sending
            # For now, sending the full dictionary
            
            logger.info(f"Successfully processed: {file.filename}")
            return JSONResponse(content={"data": extracted_data_dict})

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        # Clean up the temporary file
        if 'temp_file_path' in locals() and temp_file_path.exists():
            try:
                os.unlink(temp_file_path)
                logger.info(f"Temporary file deleted: {temp_file_path}")
            except Exception as unlink_error:
                logger.error(f"Error deleting temporary file {temp_file_path}: {unlink_error}")

# Add other endpoints as needed

if __name__ == "__main__":
    import uvicorn
    # This block is for local development/debugging without Docker
    uvicorn.run(app, host="0.0.0.0", port=8000)
