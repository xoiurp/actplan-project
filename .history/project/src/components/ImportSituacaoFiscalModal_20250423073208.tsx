import React, { useState } from 'react';
import { Modal } from './ui/modal';
import { Dropzone } from './ui/dropzone';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
// URL do novo microserviço de extração de PDF (lida da variável de ambiente)
const EXTRACTION_API_URL = import.meta.env.VITE_EXTRACTION_API_URL || 'http://localhost:8001';

interface ImportSituacaoFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  // A função onImport agora receberá os dados extraídos no formato do microserviço
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
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${EXTRACTION_API_URL}/extract/situacao-fiscal`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Falha ao processar o arquivo no serviço de extração.');
      }

      const result = await response.json();

      if (!result.data || result.data.length === 0) {
        throw new Error('Nenhum item ou tabela encontrada no arquivo.');
      }

      // tabula-py retorna uma lista de listas de dicionários (uma lista por tabela)
      // Vamos achatar essa estrutura para uma única lista de itens
      const flattenedItems = result.data.flat();

      setExtractedItems(flattenedItems);

    } catch (error: any) {
      console.error('Erro no processamento:', error);
      setError(`Falha ao processar o arquivo: ${error.message}`);
      toast.error(`Falha ao processar arquivo: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedFile || extractedItems.length === 0) return;
    // Passa os itens extraídos (já no formato processado pelo microserviço)
    onImport(extractedItems, selectedFile);
    onClose();
    handleReset(); // Resetar o estado após a importação
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
                      // Usar um identificador único se disponível, caso contrário, usar index
                      <tr key={item.id || index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* Acessar campos com base no mapeamento feito no backend */}
                          {item.code || item.receita || item.inscricao || item.parcelamento || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {/* Exibir tipo de tributo ou tipo de parcelamento */}
                          {item.taxType || item.tipo || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* Exibir período de apuração ou data de inscrição */}
                          {item.periodo_apuracao || item.data_inscricao || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.vencimento || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* Exibir valor original ou valor suspenso */}
                          {formatCurrency(item.valor_original || item.valor_suspenso || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.saldo_devedor || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.situacao || 'N/A'}
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
