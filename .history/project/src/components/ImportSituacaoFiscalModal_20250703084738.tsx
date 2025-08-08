import React, { useState } from 'react';
import { Modal } from './ui/modal';
import { Dropzone } from './ui/dropzone';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { processSituacaoFiscalPDF, convertToOrderItems } from '@/lib/pdfProcessor';
import type { SituacaoFiscalData } from '@/lib/pdfProcessor';
import type { OrderItem } from '@/types';

interface ImportSituacaoFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: OrderItem[], file: File, rawData: SituacaoFiscalData) => void;
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

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
    }
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
    
    try {
      const orderItems = convertToOrderItems(extractedData);
      
      // Validação mais flexível para aceitar itens do Simples Nacional e outros sem código
      const validItems = orderItems.filter(item => {
        // Verifica se tem dados reais (não apenas valores padrão)
        const hasRealPeriod = item.start_period && item.start_period !== "N/A" && item.start_period.trim() !== "";
        const hasRealDueDate = item.due_date && item.due_date !== "N/A" && item.due_date.trim() !== "";
        const hasRealValues = item.original_value > 0 || item.current_balance > 0;
        const hasRealCode = item.code && item.code !== "ITEM-N/A" && !item.code.startsWith("ITEM-00");
        const hasRealStatus = item.status && item.status.trim() !== "";
        
        // Para itens do Simples Nacional, aceita se tiver QUALQUER dado útil
        const isSimples = (item.tax_type || "").includes('SIMPLES') || 
                         (item.code || "").includes('SIMPLES') ||
                         (item.tax_type === "SIMPLES_NACIONAL");
        
        // Para itens de inscrição (SIDA), aceita se tiver inscrição válida
        const isInscricao = item.tax_type === "PENDENCIA_INSCRICAO_SIDA" && 
                           item.code && item.code.trim() !== "";
        
        // Para itens de parcelamento, aceita se tiver código/conta
        const isParcelamento = (item.tax_type === "PARCELAMENTO_SIEFPAR" || 
                               item.tax_type === "PENDENCIA_PARCELAMENTO_SISPAR") && 
                              item.code && item.code.trim() !== "";
        
        // Para débitos com exigibilidade suspensa
        const isDebitoSuspenso = item.tax_type === "DEBITO_EXIG_SUSPENSA_SIEF" && 
                                (hasRealCode || hasRealPeriod || hasRealValues);
        
        // Aceita o item se:
        // 1. For Simples Nacional, aceita se tiver qualquer dado útil
        // 2. For inscrição/parcelamento com código válido
        // 3. For débito suspenso com dados básicos
        // 4. Tiver dados reais mínimos (período OU vencimento OU valores OU código)
        const hasMinimalData = hasRealPeriod || hasRealDueDate || hasRealValues || hasRealCode || hasRealStatus;
        
        if (isSimples) {
          // Para Simples Nacional, aceita se tiver qualquer dado útil
          const hasAnySimpleData = hasMinimalData || item.tax_type === "SIMPLES_NACIONAL";
          if (!hasAnySimpleData) {
            console.warn('Item Simples Nacional sem dados úteis ignorado:', item);
            return false;
          }
          return true;
        } else if (isInscricao || isParcelamento || isDebitoSuspenso) {
          // Para outros tipos específicos, usa validação específica
          return true;
        } else if (hasMinimalData) {
          // Para outros itens, precisa ter dados mínimos
          return true;
        }
        
        console.warn('Item sem dados reais suficientes ignorado:', item);
        return false;
      });
      
      if (validItems.length === 0) {
        toast.error('Nenhum item válido encontrado no arquivo');
        return;
      }
      
      if (validItems.length < orderItems.length) {
        const ignoredCount = orderItems.length - validItems.length;
        toast(`${ignoredCount} itens sem dados suficientes foram ignorados`, {
          icon: '⚠️',
          duration: 4000,
        });
      }
      
      console.log(`🎯 Situação Fiscal: ${validItems.length} itens válidos de ${orderItems.length} processados`, validItems);
      
      onImport(validItems, selectedFile, extractedData);
      onClose();
      handleReset();
    } catch (error: any) {
      console.error('Erro ao processar itens da situação fiscal:', error);
      toast.error(`Erro ao processar dados: ${error.message}`);
    }
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
            onDrop={handleFileSelect}
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
              <h3 className="text-sm font-medium mb-4">Dados Extraídos</h3>
              <div className="max-h-[400px] overflow-y-auto space-y-6">
                {/* Pendências de Débito */}
                {extractedData.pendenciasDebito.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pendências - Débito (SIEF)</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Receita</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Período</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vencimento</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Vl. Original</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Sdo. Devedor</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.pendenciasDebito.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.receita}</td>
                            <td className="px-3 py-2 text-sm">{item.periodo_apuracao}</td>
                            <td className="px-3 py-2 text-sm">{item.vencimento}</td>
                            <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.valor_original)}</td>
                            <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.saldo_devedor)}</td>
                            <td className="px-3 py-2 text-sm">{item.situacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Parcelamentos SIPADE */}
                {extractedData.parcelamentosSipade.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Parcelamentos com Exigibilidade Suspensa (SIPADE)</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Processo</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Receita</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.parcelamentosSipade.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.processo}</td>
                            <td className="px-3 py-2 text-sm">{item.receita}</td>
                            <td className="px-3 py-2 text-sm">{item.situacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Processos Fiscais */}
                {extractedData.processosFiscais.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Processos Fiscais com Exigibilidade Suspensa (SIEF)</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Processo</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Situação</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Localização</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.processosFiscais.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.processo}</td>
                            <td className="px-3 py-2 text-sm">{item.situacao}</td>
                            <td className="px-3 py-2 text-sm">{item.localizacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Parcelamentos SIEFPAR */}
                {extractedData.parcelamentosSiefpar.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Parcelamentos com Exigibilidade Suspensa (SIEFPAR)</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Parcelamento</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor Suspenso</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.parcelamentosSiefpar.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.parcelamento}</td>
                            <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.valor_suspenso)}</td>
                            <td className="px-3 py-2 text-sm">{item.tipo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Débitos SICOB */}
                {extractedData.debitosSicob.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Débitos com Exigibilidade Suspensa (SICOB)</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Parcelamento</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Situação</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.debitosSicob.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.parcelamento}</td>
                            <td className="px-3 py-2 text-sm">{item.situacao}</td>
                            <td className="px-3 py-2 text-sm">{item.tipo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pendências de Inscrição */}
                {extractedData.pendenciasInscricao.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pendências - Inscrição (SIDA)</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">CNPJ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Inscrição</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Receita</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Inscrito em</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ajuizado em</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Processo</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tipo Devedor</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Devedor Principal</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.pendenciasInscricao.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.cnpj}</td>
                            <td className="px-3 py-2 text-sm">{item.inscricao}</td>
                            <td className="px-3 py-2 text-sm">{item.receita}</td>
                            <td className="px-3 py-2 text-sm">{item.inscrito_em}</td>
                            <td className="px-3 py-2 text-sm">{item.ajuizado_em || '-'}</td>
                            <td className="px-3 py-2 text-sm">{item.processo}</td>
                            <td className="px-3 py-2 text-sm">{item.tipo_devedor}</td>
                            <td className="px-3 py-2 text-sm">{item.devedor_principal || '-'}</td>
                            <td className="px-3 py-2 text-sm">{item.situacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
