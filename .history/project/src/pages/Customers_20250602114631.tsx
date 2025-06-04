import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, deleteCustomer } from '../lib/api'; // Remove updateCustomer
import { Plus, FileText, Trash2, Eye, Pencil } from 'lucide-react'; // Add Eye and Pencil icons
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
// Remove Modal import if no longer needed
// import { Modal } from '@/components/ui/modal'; 
// Remove CustomerForm import if no longer needed here
// import { CustomerForm } from '@/components/CustomerForm'; 
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
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
  // Remove new modal state:
  // const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  // Remove edit modal state:
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null); // Keep only one declaration
  // Remove formData state if only used for the modal
  // const [formData, setFormData] = useState({ ... });

  const queryClient = useQueryClient();
  
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'], // Keep query for fetching list
    queryFn: getCustomers,
    staleTime: 30000,
  });

  // Remove createMutation (moved to CreateCustomer.tsx)
  // const createMutation = useMutation({ ... });

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

  // Remove resetForm (moved to CreateCustomer.tsx)
  // const resetForm = useCallback(() => { ... });

  // Remove handleNewCustomerClick (now navigates)
  // const handleNewCustomerClick = useCallback(() => { ... });

  // Remove handleSubmit (moved to CreateCustomer.tsx)
  // const handleSubmit = useCallback((e: React.FormEvent) => { ... });

  // Remove handleUpdate
  // const handleUpdate = useCallback((e: React.FormEvent) => { ... });

  // Remove handleCustomerClick (modal trigger)
  // const handleCustomerClick = useCallback((customer: Customer) => { ... });

  // Remove handleInputChange (moved to CreateCustomer.tsx)
  // const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { ... });

  // Remove handleCertificateUpload if only used in edit modal
  // const handleCertificateUpload = useCallback(() => { ... });

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

  const customerActions = (
    <Button
      size="sm" // Added size="sm"
      onClick={() => navigate('/customers/new')} 
      className="inline-flex items-center"
    >
      <Plus className="-ml-1 mr-2 h-5 w-5" />
      Novo Cliente
    </Button>
  );

  return (
    <>
      <Header title="Clientes" actions={customerActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg overflow-hidden">
        {/* Button moved to Header actions */}
        {/* <div className="flex justify-end"> ... </div> */}

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
                    {/* Add Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click if enabled
                        navigate(`/customers/edit/${customer.id}`);
                      }}
                      title="Editar Cliente"
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <Pencil className="h-4 w-4" />
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

        {/* Remove New Customer Modal */}
        {/* <Modal isOpen={isNewModalOpen} ... > ... </Modal> */}

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
