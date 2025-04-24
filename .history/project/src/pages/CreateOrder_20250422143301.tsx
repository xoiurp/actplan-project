import React, { useState } from 'react';
import { FileText } from 'lucide-react'; // Remove CalendarIcon
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderItemsTable } from '../components/OrderItemsTable';
import { AddOrderItemModal } from '../components/AddOrderItemModal';
import { ImportSituacaoFiscalModal } from '../components/ImportSituacaoFiscalModal';
import { getCustomers, createOrder } from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { BillingCalculationsTable } from '../components/BillingCalculationsTable';
import { ImportDarfModal } from '../components/ImportDarfModal';
import { Header } from '@/components/Header';
import { Order, OrderItem } from '@/types';
import toast from 'react-hot-toast';
import { processDarfPDF } from '../lib/darfProcessor';
import { DatePicker } from '@/components/ui/date-picker'; // Import DatePicker
import { format as formatDateFn } from 'date-fns'; // Import date-fns format

interface FormData {
  customer: string;
  orderDate: Date | undefined; // Changed type
  status: string;
  commission: string;
  reduction: string;
  supplier: string;
  dueDate: Date | undefined; // Changed type
  notes: string;
  documentos: Order['documentos'];
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const [itens_pedido, setItensPedido] = useState<OrderItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSituacaoFiscalModalOpen, setIsSituacaoFiscalModalOpen] = useState(false);
  // Update initial state for dates
  const [formData, setFormData] = useState<FormData>({
    customer: '',
    orderDate: undefined, // Changed initial value
    status: '',
    commission: '',
    reduction: '',
    supplier: '',
    dueDate: undefined, // Changed initial value
    notes: '',
    documentos: undefined
  });

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success('Pedido criado com sucesso');
      navigate('/orders');
    },
    onError: (error) => {
      toast.error('Erro ao criar pedido: ' + error.message);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.customer) {
      toast.error('Selecione um cliente');
      return;
    }

    if (!formData.orderDate) {
      toast.error('Selecione a data do pedido');
      return;
    }

    if (!formData.status) {
      toast.error('Selecione o status');
      return;
    }

    if (itens_pedido.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    // Format dates before submitting
    const formattedOrderDate = formData.orderDate ? formatDateFn(formData.orderDate, 'yyyy-MM-dd') : '';
    const formattedDueDate = formData.dueDate ? formatDateFn(formData.dueDate, 'yyyy-MM-dd') : '';

    if (!formattedOrderDate) {
      toast.error('Selecione a data do pedido');
      return;
    }
    // Optional: Add validation for dueDate if needed

    const orderData = {
      customer_id: formData.customer,
      data_pedido: formattedOrderDate, // Use formatted date
      status: formData.status,
      comissaoPercentage: formData.commission || '0',
      reducaoPercentage: formData.reduction || '0',
      fornecedor: formData.supplier,
      vencimento: formattedDueDate, // Use formatted date
      notas: formData.notes,
      itens_pedido: itens_pedido, // Ensure OrderItem type matches expected structure
      documentos: formData.documentos
    };

    createOrderMutation.mutate(orderData);
  };

  const suppliers = [
    { id: 'supplier1', name: 'Supplier 1' },
    { id: 'supplier2', name: 'Supplier 2' },
    { id: 'supplier3', name: 'Supplier 3' },
  ];

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  const orderStatuses = [
    { id: 'pending', label: 'Pendente' },
    { id: 'processing', label: 'Processando' },
    { id: 'completed', label: 'Concluído' },
    { id: 'cancelled', label: 'Cancelado' },
  ];

  const handleAddItem = () => {
    setIsAddItemModalOpen(true);
  };

  // Construct a more complete OrderItem, handle potential missing fields from modal
  const handleItemAdd = (newItemData: Partial<OrderItem>) => { 
    // Map tax types to their numeric IDs
    const taxTypeIds: Record<string, string> = {
      'PIS': '9',
      'PASEP': '9',
      'COFINS': '10',
      'IRPJ': '11',
      'CSLL': '12',
      'CP-TERCEIROS': '13',
      'CP-PATRONAL': '14',
      'IRRF': '15'
    };

    // Create a more complete item, providing defaults for required fields
    const completeNewItem: OrderItem = {
      id: `temp-${Date.now()}-${Math.random()}`, // Temporary client-side ID
      order_id: '', // Will be set after order creation
      code: newItemData.code || '',
      tax_type: newItemData.tax_type || '',
      start_period: newItemData.start_period || '',
      end_period: newItemData.end_period || '',
      due_date: newItemData.due_date || '',
      original_value: newItemData.original_value || 0,
      current_balance: newItemData.current_balance || newItemData.original_value || 0,
      fine: newItemData.fine || 0,
      interest: newItemData.interest || 0,
      status: newItemData.status || 'pending', // Default status
      cno: newItemData.cno,
      created_at: new Date().toISOString(), // Set creation time
      updated_at: new Date().toISOString(), // Set update time
      // Ensure all required fields from OrderItem type are present
      ...(newItemData as OrderItem) // Spread remaining optional fields if provided
    };

    // Add the tax type based ID logic if still needed, otherwise remove
    // completeNewItem.id = taxTypeIds[completeNewItem.tax_type] || completeNewItem.tax_type; 
    
    setItensPedido(prev => [...prev, completeNewItem]);
  };

  const handleImportDarf = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSituacaoFiscal = () => {
    setIsSituacaoFiscalModalOpen(true);
  };

  const handleDarfImport = async (file: File) => {
    try {
      const darfItems = await processDarfPDF(file);
      if (!darfItems || darfItems.length === 0) {
        toast.error('Falha ao extrair dados do DARF');
        return;
      }

      // Store file info in form state
      setFormData(prev => ({
        ...prev,
        documentos: {
          ...prev.documentos,
          darf: {
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file)
          }
        }
      }));

      // Processa cada item do DARF
      let updatedCount = 0;
      const updatedItems = [...itens_pedido];

      for (const darfData of darfItems) {
        // Encontra todos os itens com o mesmo código base (removendo sufixos)
        const matchingCodeItems = itens_pedido.filter((item: OrderItem) => {
          const itemBaseCode = item.code.split('-')[0];
          const darfBaseCode = darfData.code.split('-')[0];
          return itemBaseCode === darfBaseCode;
        });

        if (matchingCodeItems.length === 0) {
          console.log(`Nenhum item encontrado para código ${darfData.code}`);
          continue;
        }

        // Para CP-PATRONAL, usa CNO como chave de correspondência
        let matchingItem: OrderItem | undefined;
        if (darfData.code === '1646' && darfData.cno) {
          matchingItem = matchingCodeItems.find((item: OrderItem) => 
            item.cno === darfData.cno && 
            item.start_period.includes(darfData.period)
          );
          
          if (!matchingItem) {
            console.log(`Nenhum item CP-PATRONAL encontrado com CNO ${darfData.cno} e período ${darfData.period}`);
            continue;
          }

          // Para CP-PATRONAL, atualiza também o valor original
          const itemIndex = updatedItems.findIndex((item: OrderItem) => item.id === matchingItem!.id);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...matchingItem,
              original_value: darfData.principal, // Atualiza o valor original
              fine: darfData.fine,
              interest: darfData.interest,
              current_balance: darfData.totalValue
            };
            updatedCount++;
            console.log(`Item CP-PATRONAL atualizado: CNO ${darfData.cno}, período ${darfData.period}`);
          }
        } else {
          // Para outros tipos, usa o valor principal
          matchingItem = matchingCodeItems.find((item: OrderItem) => 
            Math.abs(item.current_balance - darfData.principal) < 0.01
          );

          if (!matchingItem) {
            console.log(`Nenhum item encontrado com valor ${darfData.principal} para código ${darfData.code}`);
            continue;
          }

          // Para outros tipos, mantém o valor original e atualiza apenas multa, juros e total
          const itemIndex = updatedItems.findIndex((item: OrderItem) => item.id === matchingItem!.id);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...matchingItem,
              fine: darfData.fine,
              interest: darfData.interest,
              current_balance: darfData.totalValue
            };
            updatedCount++;
            console.log(`Item atualizado: código ${darfData.code}, valor ${darfData.principal}`);
          }
        }
      }

      if (updatedCount === 0) {
        toast.error('Nenhum débito correspondente encontrado para os itens do DARF');
        return;
      }

      setItensPedido(updatedItems);
      toast.success(`${updatedCount} item(s) atualizado(s) com sucesso`);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Erro ao processar DARF:', error);
      toast.error('Falha ao importar DARF');
    }
  };

  const handleSituacaoFiscalImport = (importedItems: OrderItem[], file: File) => {
    // Store file info in form state
    setFormData(prev => ({
      ...prev,
      documentos: {
        ...prev.documentos,
        situacaoFiscal: {
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        }
      }
    }));

    // Map tax types to their numeric IDs
    const taxTypeIds: Record<string, string> = {
      'PIS': '9',
      'PASEP': '9',
      'COFINS': '10',
      'IRPJ': '11',
      'CSLL': '12',
      'CP-TERCEIROS': '13',
      'CP-PATRONAL': '14',
      'IRRF': '15'
    };

    const newItems = importedItems.map(item => ({
      ...item,
      // Create ID based on tax type and code
      id: taxTypeIds[item.tax_type] || item.tax_type
    }));
    
    // Add imported items to the existing items list
    setItensPedido(prevItems => [...prevItems, ...newItems]);
    toast.success(`${importedItems.length} itens importados com sucesso`);
  };

  return (
    <div className="space-y-6">
      <AddOrderItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onAdd={handleItemAdd}
      />
      <ImportDarfModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleDarfImport}
      />
      <ImportSituacaoFiscalModal
        isOpen={isSituacaoFiscalModalOpen}
        onClose={() => setIsSituacaoFiscalModalOpen(false)}
        onImport={handleSituacaoFiscalImport}
      />

      <Header
        title="Cadastrar Pedido"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Criar Cobranças
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {createOrderMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Informações do Cliente</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                Cliente
              </label>
              <select
                id="customer"
                name="customer"
                value={formData.customer}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              >
                <option value="">Selecione um cliente...</option>
                {customers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700">
                Data do Pedido
              </label>
              {/* Use DatePicker for orderDate */}
              <DatePicker
                date={formData.orderDate}
                setDate={(date) => setFormData(prev => ({ ...prev, orderDate: date }))}
                placeholder="Selecione a data do pedido"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              >
                <option value="">Selecione o status...</option>
                {orderStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Detalhes de Cobrança</h2>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="summary">Resumo do Pedido</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
              <TabsTrigger value="notes">Observações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="commission" className="block text-sm font-medium text-gray-700">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    id="commission"
                    name="commission"
                    value={formData.commission}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="reduction" className="block text-sm font-medium text-gray-700">
                    Redução (%)
                  </label>
                  <input
                    type="number"
                    id="reduction"
                    name="reduction"
                    value={formData.reduction}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                    Fornecedor
                  </label>
                  <select
                    id="supplier"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                    Vencimento
                  </label>
                   {/* Use DatePicker for dueDate */}
                  <DatePicker
                    date={formData.dueDate}
                    setDate={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    placeholder="Selecione a data de vencimento"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <BillingCalculationsTable calculations={calculations} />
            </TabsContent>
            
            <TabsContent value="attachments" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-shadow-dark rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">Situação Fiscal</h3>
                      <button
                        type="button"
                        onClick={() => setIsSituacaoFiscalModalOpen(true)}
                        className="text-sm text-primary hover:text-primary-hover"
                      >
                        Importar
                      </button>
                    </div>
                    {formData.documentos?.situacaoFiscal ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formData.documentos.situacaoFiscal.name}
                          </span>
                        </div>
                        <a
                          href={formData.documentos.situacaoFiscal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-hover"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Nenhum arquivo importado
                      </p>
                    )}
                  </div>

                  <div className="p-4 border border-shadow-dark rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">DARF</h3>
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-sm text-primary hover:text-primary-hover"
                      >
                        Importar
                      </button>
                    </div>
                    {formData.documentos?.darf ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formData.documentos.darf.name}
                          </span>
                        </div>
                        <a
                          href={formData.documentos.darf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-hover"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Nenhum arquivo importado
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <div>
                <label htmlFor="principal" className="block text-sm font-medium text-gray-700">
                  Valor Principal
                </label>
                <input
                  type="number"
                  id="principal"
                  name="principal"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="fine" className="block text-sm font-medium text-gray-700">
                  Multa
                </label>
                <input
                  type="number"
                  id="fine"
                  name="fine"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="interest" className="block text-sm font-medium text-gray-700">
                  Juros
                </label>
                <input
                  type="number"
                  id="interest"
                  name="interest"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={6}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="Adicione observações sobre o pedido..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <OrderItemsTable
          itens_pedido={itens_pedido}
          onAddItem={handleAddItem}
          onImportDarf={handleImportDarf}
          onImportSituacaoFiscal={handleImportSituacaoFiscal}
        />
      </div>

    </div>
  );
}
