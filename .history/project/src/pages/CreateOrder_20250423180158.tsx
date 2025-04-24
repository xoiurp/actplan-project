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
import { DatePicker } from '@/components/ui/date-picker';
import { format as formatDateFn } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../components/ui/textarea'; // Corrigido o caminho do import

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

  // Corrected handler type to include Select elements until replaced
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper for Shadcn Select components
  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
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
    // Merge defaults with newItemData, ensuring newItemData overrides defaults
    const completeNewItem: OrderItem = {
      id: `temp-${Date.now()}-${Math.random()}`, // Temporary client-side ID
      order_id: '', // Will be set after order creation
      code: '',
      tax_type: '',
      start_period: '',
      end_period: '',
      due_date: '',
      original_value: 0,
      current_balance: 0,
      fine: 0,
      interest: 0,
      status: 'pending', // Default status
      created_at: new Date().toISOString(), // Set creation time
      updated_at: new Date().toISOString(), // Set update time
      ...newItemData, // Spread newItemData to override defaults and add optional fields like cno
    };
    // Ensure current_balance defaults to original_value if not provided or nullish in newItemData
    if (completeNewItem.current_balance == null) {
       completeNewItem.current_balance = completeNewItem.original_value ?? 0;
    }
    
    // Remove the tax type based ID logic as we use a temp ID now
    // completeNewItem.id = taxTypeIds[completeNewItem.tax_type] || completeNewItem.tax_type; 
    
    setItensPedido(prev => [...prev, completeNewItem]);
  };

  const handleImportDarf = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSituacaoFiscal = () => {
    setIsSituacaoFiscalModalOpen(true);
  };

  const handleDarfImport = (items: OrderItem[], file: File) => {
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

    // Atualiza os itens existentes com os dados do DARF
    const updatedItems = itens_pedido.map(item => {
      const matchingDarfItem = items.find(darfItem => 
        darfItem.code === item.code && 
        (darfItem.cno ? darfItem.cno === item.cno : true)
      );

      if (matchingDarfItem) {
        return {
          ...item,
          fine: matchingDarfItem.fine,
          interest: matchingDarfItem.interest,
          current_balance: matchingDarfItem.current_balance,
          ...(matchingDarfItem.cno && { original_value: matchingDarfItem.original_value }) // Atualiza valor original apenas para itens com CNO
        };
      }

      return item;
    });

    setItensPedido(updatedItems);
    toast.success(`Dados do DARF importados com sucesso`);
    setIsImportModalOpen(false);
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

    // Os itens já devem vir com as chaves corretas (snake_case) do pdfProcessor
    const newItems = importedItems.map(item => ({
      ...item,
      // Create ID based on tax type and code
      id: taxTypeIds[item.tax_type] || item.tax_type
    }));
    
    // console.log('--- CreateOrder: Dados ANTES de setItensPedido ---'); // Log removido
    // console.log(JSON.stringify(newItems, null, 2)); // Log removido
    
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
            <div className="space-y-1"> {/* Added wrapper for Label + Select */}
              <Label htmlFor="customer">Cliente</Label>
              <Select
                value={formData.customer}
                onValueChange={handleSelectChange('customer')}
              >
                <SelectTrigger id="customer" className="w-full">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1"> {/* Added wrapper for Label + DatePicker */}
              <Label htmlFor="orderDate">Data do Pedido</Label> {/* Ensured closing tag */}
              {/* Use DatePicker for orderDate */}
              <DatePicker
                date={formData.orderDate}
                setDate={(date) => setFormData(prev => ({ ...prev, orderDate: date }))}
                placeholder="Selecione a data do pedido"
                className="mt-1"
              />
            </div>

            <div className="space-y-1"> {/* Added wrapper for Label + Select */}
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleSelectChange('status')}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Selecione o status..." />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="commission">Comissão (%)</Label>
                  <Input
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="reduction">Redução (%)</Label>
                  <Input
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="supplier">Fornecedor</Label> 
                  <Select
                    value={formData.supplier}
                    onValueChange={handleSelectChange('supplier')}
                  >
                    <SelectTrigger id="supplier" className="w-full">
                      <SelectValue placeholder="Selecione o fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="dueDate">Vencimento</Label> {/* Corrected closing tag */}
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
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="principal">Valor Principal</Label>
                <Input
                  type="number"
                  id="principal"
                  name="principal"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="fine">Multa</Label>
                <Input
                  type="number"
                  id="fine"
                  name="fine"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="interest">Juros</Label>
                <Input
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
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1" // Use default Shadcn styling, remove specific classes if needed
                  placeholder="Adicione observações sobre o pedido..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium mb-4">Itens do Pedido</h3>
        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={handleImportSituacaoFiscal}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Importar Situação Fiscal
          </button>
          <button
            type="button"
            onClick={handleImportDarf}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Importar DARF
          </button>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Adicionar Item
          </button>
        </div>
        {/* Agrupamento por tax_type */}
        {(() => {
          const grouped = itens_pedido.reduce((acc, item) => {
            const key = item.tax_type || 'OUTROS';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {} as Record<string, typeof itens_pedido>);
          const friendlyTitles: Record<string, string> = {
            'DEBITO': 'Débitos SIEF',
            'DEBITO_EXIG_SUSPENSA_SIEF': 'Débitos Exig. Suspensa',
            // Adicione outros tipos conforme necessário
            'OUTROS': 'Outros'
          };
          return Object.entries(grouped).length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhum item adicionado ainda.</p>
          ) : (
            Object.entries(grouped).map(([taxType, items]) => (
              <div
                key={taxType}
                className="border border-gray-400 rounded-lg p-2 mb-6 bg-white"
              >
                <h4 className="text-md font-semibold mb-2">{friendlyTitles[taxType] || taxType}</h4>
                <OrderItemsTable
                  itens_pedido={items}
                  onAddItem={() => {}}
                  onImportDarf={() => {}}
                  onImportSituacaoFiscal={() => {}}
                  isEditing={false}
                />
              </div>
            ))
          );
        })()}
      </div>

    </div>
  );
}
