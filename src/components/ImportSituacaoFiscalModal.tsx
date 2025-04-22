import React, { useState } from 'react';
import { Modal } from './ui/modal';
import { Dropzone } from './ui/dropzone';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { processSituacaoFiscalPDF } from '@/lib/pdfProcessor';
import { formatCurrency } from '@/lib/utils';

interface ImportSituacaoFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: any[], file: File) => void;
}

export function ImportSituacaoFiscalModal({ 
  isOpen, 
  onClose, 
  onImport 
}: ImportSituacaoFiscalModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setExtractedItems([]);
    
    try {
      const items = await processSituacaoFiscalPDF(selectedFile);
      
      if (items.length === 0) {
        throw new Error('Nenhum item encontrado no arquivo');
      }
      
      setExtractedItems(items);
    } catch (error) {
      setError('Falha ao processar o arquivo. Por favor, tente novamente.');
      toast.error('Falha ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedFile) return;
    onImport(extractedItems, selectedFile);
    onClose();
    setSelectedFile(null);
    setExtractedItems([]);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedItems([]);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Situação Fiscal"
    >
      <div className="space-y-4">
        {!extractedItems.length && (
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

        {extractedItems.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-shadow-dark p-4">
              <h3 className="text-sm font-medium mb-2">
                {extractedItems.length} itens encontrados
              </h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vencimento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vl. Original
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sdo. Devedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {extractedItems.map((item, index) => (
                      <tr key={`${item.code}-${item.startPeriod}-${item.dueDate}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.taxType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.startPeriod} - {item.endPeriod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.originalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.currentBalance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          {selectedFile && !extractedItems.length && !isProcessing && (
            <button
              type="button"
              onClick={handleProcess}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Processar
            </button>
          )}
          {extractedItems.length > 0 && (
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