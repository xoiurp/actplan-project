from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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

# Adicionar middleware CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    Endpoint to process a 'Situação Fiscal' PDF using Docling.
    Returns structured data extracted from the PDF.
    """
    logger.info(f"Received file for Situação Fiscal processing: {file.filename} ({file.content_type})")
    
    # Aceitar qualquer tipo de conteúdo, já que alguns clientes podem não enviar o content-type correto
    if file.content_type and file.content_type != "application/pdf" and not file.content_type.startswith("multipart/"):
        logger.warning(f"Potentially invalid file type received: {file.content_type}")
        # Não bloquear, apenas avisar
    
    # Create a temporary file to save the upload
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            start_time = time.time()
            content = await file.read()
            temp_file.write(content)
            temp_file_path = Path(temp_file.name)
            logger.info(f"File saved temporarily to: {temp_file_path}")

            # Configure Docling pipeline options optimized for Situação Fiscal
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True # Enable OCR
            pipeline_options.do_table_structure = True # Enable table detection
            pipeline_options.table_structure_options.do_cell_matching = True
            
            # Configurar idioma para português (se disponível)
            try:
                # EasyOCR suporta 'pt' mas não 'por'
                pipeline_options.ocr_options.lang = ["pt"] # Português
            except Exception as lang_error:
                logger.warning(f"Não foi possível configurar idioma português: {lang_error}")
                # Usar configuração padrão se não for possível configurar o idioma
                logger.warning("Usando configuração padrão de idioma")
            
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
            
            # Log some information about the extracted data
            if "pages" in extracted_data_dict:
                num_pages = len(extracted_data_dict["pages"])
                logger.info(f"Extracted {num_pages} pages from document")
                
                # Log information about tables
                total_tables = 0
                for page_idx, page in enumerate(extracted_data_dict["pages"]):
                    if "tables" in page:
                        page_tables = len(page["tables"])
                        total_tables += page_tables
                        logger.info(f"Page {page_idx+1}: Found {page_tables} tables")
                        
                        # Log table details
                        for table_idx, table in enumerate(page["tables"]):
                            if "rows" in table:
                                logger.info(f"  Table {table_idx+1}: {len(table['rows'])} rows")
                
                logger.info(f"Total tables found: {total_tables}")
            
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
    Endpoint to process a DARF PDF using Docling.
    Returns structured data extracted from the PDF.
    """
    logger.info(f"Received file for DARF processing: {file.filename} ({file.content_type})")
    
    # Aceitar qualquer tipo de conteúdo, já que alguns clientes podem não enviar o content-type correto
    if file.content_type and file.content_type != "application/pdf" and not file.content_type.startswith("multipart/"):
        logger.warning(f"Potentially invalid file type received: {file.content_type}")
        # Não bloquear, apenas avisar

    # Create a temporary file to save the upload
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            start_time = time.time()
            content = await file.read()
            temp_file.write(content)
            temp_file_path = Path(temp_file.name)
            logger.info(f"File saved temporarily to: {temp_file_path}")

            # Configure Docling pipeline options optimized for DARF
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True # Enable OCR
            pipeline_options.do_table_structure = True # Enable table detection
            pipeline_options.table_structure_options.do_cell_matching = True
            
            # Configurar idioma para português (se disponível)
            try:
                # EasyOCR suporta 'pt' mas não 'por'
                pipeline_options.ocr_options.lang = ["pt"] # Português
            except Exception as lang_error:
                logger.warning(f"Não foi possível configurar idioma português: {lang_error}")
                # Usar configuração padrão se não for possível configurar o idioma
                logger.warning("Usando configuração padrão de idioma")
            
            # Configurações específicas para DARF
            # DARFs geralmente têm campos de formulário, então vamos habilitar a detecção de formulários
            try:
                pipeline_options.do_form_extraction = True
            except Exception as form_error:
                logger.warning(f"Não foi possível habilitar extração de formulários: {form_error}")
            
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
            
            # Log some information about the extracted data
            if "pages" in extracted_data_dict:
                num_pages = len(extracted_data_dict["pages"])
                logger.info(f"Extracted {num_pages} pages from document")
                
                # Log information about form fields if available
                total_fields = 0
                for page_idx, page in enumerate(extracted_data_dict["pages"]):
                    if "form_fields" in page:
                        page_fields = len(page["form_fields"])
                        total_fields += page_fields
                        logger.info(f"Page {page_idx+1}: Found {page_fields} form fields")
                
                logger.info(f"Total form fields found: {total_fields}")
            
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
