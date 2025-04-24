import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, deleteCustomer } from '../lib/api'; // Remove updateCustomer
import { Plus, FileText, Trash2, Eye } from 'lucide-react'; // Add Eye icon
import toast from 'react-hot-toast';
import { fireConfetti } from '@/lib/confetti';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Modal } from '@/components/ui/modal'; // Keep for New Customer
import { CustomerForm } from '@/components/CustomerForm';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button'; // Import Button
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Customer } from '@/types';

export default function Customers() {
  const navigate = useNavigate(); // Initialize navigate
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  // Remove edit modal state:
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  // Keep formData for the New Customer modal, but simplify if not needed for edit
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    // Keep other fields needed for creation
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    numero: '',
    complemento: '',
    nome_responsavel: '',
    sobrenome_responsavel: '',
    whatsapp_responsavel: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    numero: '',
    complemento: '',
    nome_responsavel: '',
    sobrenome_responsavel: '',
    whatsapp_responsavel: '',
    user_id: '', // Will be filled on creation
    // updated_at is not needed for creation form
  });

  const queryClient = useQueryClient();
  
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 30000, // Keep staleTime if desired
  });

  const createMutation = useMutation({
    // Ensure the type matches the simplified formData if needed
    mutationFn: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'certificado'>) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsNewModalOpen(false);
      resetForm();
      toast.success('Cliente criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar cliente');
    },
  });

  // Remove updateMutation
  // const updateMutation = useMutation({ ... });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id), // Keep delete mutation
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToDelete(null);
      toast.success('Cliente excluído com sucesso');
      fireConfetti();
    },
    onError: () => {
      toast.error('Erro ao excluir cliente');
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      razao_social: '',
      cnpj: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      numero: '',
      complemento: '',
      nome_responsavel: '',
      sobrenome_responsavel: '',
      whatsapp_responsavel: '',
      // Only reset fields needed for creation
      user_id: '',
      // updated_at: null, // Not needed
    });
  }, []);

  const handleNewCustomerClick = useCallback(() => {
    resetForm();
    setIsNewModalOpen(true);
  }, [resetForm]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Adiciona o user_id atual e updated_at antes de criar
    const now = new Date().toISOString();
    // Remove user_id and updated_at if not needed directly from form
    createMutation.mutate({
      ...formData,
      // user_id should be set by the backend or API function
    });
  }, [formData, createMutation]);

  // Remove handleUpdate
  // const handleUpdate = useCallback((e: React.FormEvent) => { ... });

  // Remove handleCustomerClick (modal trigger)
  // const handleCustomerClick = useCallback((customer: Customer) => { ... });

  // Keep handleInputChange for the New Customer modal
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleCertificateUpload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  }, [queryClient]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id);
    }
  }, [customerToDelete, deleteMutation]);

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <>
      <Header title="Clientes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg overflow-hidden">
        <div className="flex justify-end">
          <button
            onClick={handleNewCustomerClick}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Novo Cliente
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Certificado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((customer) => (
                <TableRow
                  key={customer.id}
                  // Remove direct row click handler or change it to navigate
                  className="hover:bg-shadow" 
                  // onClick={() => navigate(`/customers/${customer.id}`)} // Option 1: Navigate on row click
                >
                  <TableCell className="font-medium">{customer.razao_social}</TableCell>
                  <TableCell>{customer.cnpj}</TableCell>
                  <TableCell>
                    {customer.nome_responsavel} {customer.sobrenome_responsavel}
                  </TableCell>
                  <TableCell>{customer.whatsapp_responsavel}</TableCell>
                  <TableCell>{customer.cidade}</TableCell>
                  <TableCell>{customer.estado}</TableCell>
                  <TableCell>
                    {customer.certificado?.url ? (
                      <a
                        href={customer.certificado.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center text-primary hover:text-primary-hover"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="ml-1 text-sm">Ver</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">Sem certificado</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1"> 
                    {/* Add View Details Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click if enabled
                        navigate(`/customers/${customer.id}`);
                      }}
                      title="Ver Detalhes"
                      className="text-primary hover:text-primary-hover hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Keep Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, customer)}
                      title="Excluir Cliente"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Novo Cliente"
        >
          <CustomerForm 
            onSubmit={handleSubmit} 
            formData={formData}
            onInputChange={handleInputChange}
          />
        </Modal>

        {/* Remove Edit Modal */}
        {/* <Modal isOpen={isEditModalOpen} ... > ... </Modal> */}

        {/* Keep Delete Confirmation Dialog */}
        <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
                {customerToDelete && ` "${customerToDelete.razao_social}"`} e todos os dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
