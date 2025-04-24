import React, { useState, useCallback, useRef } from 'react'; // Import useRef
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer, uploadCertificate } from '../lib/api'; // Import uploadCertificate
import { CustomerForm } from '@/components/CustomerForm';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Customer } from '@/types';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [certificateFile, setCertificateFile] = useState<File | null>(null); // State for the certificate file
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
    senha_certificado: '', // Add certificate password field to state
    user_id: '', // Will be handled by API
  });

  // Ref to track if upload is happening after creation
  const isUploadingCertificate = useRef(false);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'created_at' | 'certificado' | 'updated_at'>) => createCustomer(data),
    onSuccess: async (createdCustomer) => { // Receive created customer data
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente criado com sucesso');

      // Upload certificate if one was selected
      if (certificateFile && createdCustomer?.id) {
        isUploadingCertificate.current = true; // Indicate upload is starting
        try {
          await uploadCertificate(certificateFile, createdCustomer.id);
          toast.success('Certificado enviado com sucesso');
        } catch (uploadError) {
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Add updated_at: null to match the expected type in api.ts
    createMutation.mutate({
      ...formData,
      updated_at: null, 
    });
  }, [formData, createMutation]);

  const headerActions = (
    <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Cancelar
    </Button>
  );

  return (
    <>
      <Header title="Novo Cliente" actions={headerActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg">
        <CustomerForm 
          onSubmit={handleSubmit} 
          formData={formData}
          onInputChange={handleInputChange}
          isSubmitting={createMutation.isPending} // Pass submitting state
        />
        {/* Optionally add a submit button here if not inside CustomerForm */}
        {/* <div className="flex justify-end mt-6">
          <Button 
            type="submit" 
            form="customer-form" // Assuming CustomerForm has id="customer-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Cliente'
            )}
          </Button>
        </div> */}
      </div>
    </>
  );
}
