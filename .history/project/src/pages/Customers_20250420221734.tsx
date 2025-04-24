import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../lib/api';
import { Plus, FileText, Trash2 } from 'lucide-react';
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
import { Modal } from '@/components/ui/modal';
import { CustomerForm } from '@/components/CustomerForm';
import { Header } from '@/components/Header';
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
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
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
  });

  const queryClient = useQueryClient();
  
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsNewModalOpen(false);
      resetForm();
      toast.success('Customer created successfully');
    },
    onError: () => {
      toast.error('Failed to create customer');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) => 
      updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      toast.success('Customer updated successfully');
    },
    onError: () => {
      toast.error('Failed to update customer');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToDelete(null);
      toast.success('Customer deleted successfully');
      fireConfetti();
    },
    onError: () => {
      toast.error('Failed to delete customer');
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
    });
  }, []);

  const handleNewCustomerClick = useCallback(() => {
    resetForm();
    setIsNewModalOpen(true);
  }, [resetForm]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  }, [formData, createMutation]);

  const handleUpdate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      updateMutation.mutate({
        id: selectedCustomer.id,
        data: formData,
      });
    }
  }, [selectedCustomer, formData, updateMutation]);

  const handleCustomerClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      razao_social: customer.razao_social,
      cnpj: customer.cnpj,
      endereco: customer.endereco,
      cidade: customer.cidade,
      estado: customer.estado,
      cep: customer.cep,
      numero: customer.numero,
      complemento: customer.complemento,
      nome_responsavel: customer.nome_responsavel,
      sobrenome_responsavel: customer.sobrenome_responsavel,
      whatsapp_responsavel: customer.whatsapp_responsavel,
    });
    setIsEditModalOpen(true);
  }, []);

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
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <>
      <Header title="Clientes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
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
                  className="cursor-pointer hover:bg-shadow"
                  onClick={() => handleCustomerClick(customer)}
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
                  <TableCell>
                    <button
                      onClick={(e) => handleDeleteClick(e, customer)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Editar Cliente"
        >
          <CustomerForm 
            onSubmit={handleUpdate} 
            isEdit 
            formData={formData}
            onInputChange={handleInputChange}
            customerId={selectedCustomer?.id}
            onCertificateUpload={handleCertificateUpload}
          />
        </Modal>

        <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer
                {customerToDelete && ` "${customerToDelete.razao_social}"`} and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}