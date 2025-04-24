import React, { useState } from 'react';
import { Modal } from './ui/modal';
import { Dropzone } from './ui/dropzone';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { processSituacaoFiscalPDF } from '@/lib/pdfProcessor';
import type { SituacaoFiscalData } from '@/lib/pdfProcessor';

interface ImportSituacaoFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: SituacaoFiscalData, file: File) => void;
}

export function ImportSituacaoFiscalModal({ 
  isOpen, 
  onClose, 
  onImport 
}: ImportSituacaoFiscalModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<SituacaoFiscalData | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setExtractedData(null);

    try {
      const data = await processSituacaoFiscalPDF(selectedFile);
      setExtractedData(data);
    } catch (error: any) {
      console.error('Erro no processamento:', error);
      setError(`Falha ao processar o arquivo: ${error.message}`);
      toast.error(`Falha ao processar arquivo: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedFile || !extractedData) return;
    onImport(extractedData, selectedFile);
    onClose();
    handleReset();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Situação Fiscal"
    >
      <div className="space-y-4">
        {!extractedData && (
          <Dropzone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            accept="application/pdf"
            maxSize={5 * 1024 * 1024}
          />
        )}

        {isProcessing && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={handleReset}
              className="text-sm text-primary hover:text-primary-hover"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-shadow-dark p-4">
              <h3 className="text-sm font-medium mb-2">
                Dados Extraídos
              </h3>
              <div className="max-h-60 overflow-y-auto">
                {/* Aqui será implementada a visualização dos dados extraídos */}
                <p className="text-sm text-gray-500">
                  Dados extraídos com sucesso. Clique em Confirmar Importação para continuar.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancelar
          </button>
          {selectedFile && !extractedData && !isProcessing && (
            <button
              type="button"
              onClick={handleProcess}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Processar
            </button>
          )}
          {extractedData && (
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Confirmar Importação
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
