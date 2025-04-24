import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const DEBUG = true;
// URL do serviço de processamento de PDF
// Em desenvolvimento, usamos localhost, mas em produção com Docker, usamos o nome do serviço
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'http://pdf-processor:8000';

export async function processSituacaoFiscalPDF(file: File): Promise<any> {
  try {
    console.log('=== Enviando PDF para processamento com Docling ===');

    // Tenta usar o backend com Docling
    const result = await processSituacaoFiscalWithDocling(file);

    if (result) {
      console.log('=== Processamento com Docling bem-sucedido ===');
      return result; // Return raw result
    } else {
      console.log('=== Processamento com Docling falhou ===');
      throw new Error('Falha no processamento do PDF com Docling.');
    }
  } catch (error) {
    console.error('Erro no processamento do PDF:', error);
    throw error; // Re-throw the error
  }
}

async function processSituacaoFiscalWithDocling(file: File): Promise<any | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/process/situacao-fiscal`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.data) {
      throw new Error('Resposta da API não contém dados');
    }

    console.log('Dados recebidos do Docling:', result.data);

    return result.data; // Return raw data
  } catch (error) {
    console.error('Erro ao processar com Docling:', error);
    return null;
  }
}
