import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer, uploadCertificate, validateCertificateApi } from '../lib/api'; // Import validateCertificateApi
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
  const [certificateExpiryDate, setCertificateExpiryDate] = useState<string | null>(null); // State for expiry date YYYY-MM-DD
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
    // Revert mutationFn type to match api.ts (expects updated_at)
    mutationFn: (data: Omit<Customer, 'id' | 'created_at' | 'certificado'>) => createCustomer(data),
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
          toast.error(`Erro ao enviar certificado: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
        } finally {
          isUploadingCertificate.current = false; // Reset flag
        }
      }

      navigate('/customers'); // Navigate back to the list after creation (and potential upload)
    },
    onError: (error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Handler for file changes from CustomerForm
  const handleFileChange = useCallback((file: File | null) => {
    setCertificateFile(file);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    let formattedExpiryDate: string | null = null; // Variable to hold expiry date within this scope

    // 1. Validate certificate if present
    if (certificateFile && formData.senha_certificado) {
      isUploadingCertificate.current = true; // Use the ref to indicate validation is in progress
      try {
        const validationResult = await validateCertificateApi(certificateFile, formData.senha_certificado);
        if (!validationResult.isValid) {
          toast.error(validationResult.error || 'Certificado inválido ou expirado.');
          isUploadingCertificate.current = false; // Reset flag on validation failure
          return; // Stop submission
        }
        // Store the formatted expiration date directly if valid
        if (validationResult.expirationDate) {
            const expiry = new Date(validationResult.expirationDate);
            formattedExpiryDate = expiry.toISOString().split('T')[0]; // Assign to local variable
            // We can still set the state if needed elsewhere, but don't rely on it for the mutation below
            setCertificateExpiryDate(formattedExpiryDate); 
        } else {
             setCertificateExpiryDate(null); // Clear state if no date returned
        }
        // Optional: Show success or expiration date if needed
        // toast.success(`Certificado válido até: ${new Date(validationResult.expirationDate!).toLocaleDateString()}`);
      } catch (validationError) {
        toast.error(`Erro ao validar certificado: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        isUploadingCertificate.current = false; // Reset flag on validation error
        return; // Stop submission
      } finally {
         // Reset flag if validation passed but we don't proceed immediately (though we do here)
         // isUploadingCertificate.current = false; 
      }
    } else if (certificateFile && !formData.senha_certificado) {
        toast.error('Por favor, insira a senha do certificado para validação.');
        return; // Stop submission if file exists but password doesn't
    }
    
    // 2. Proceed with customer creation if validation passed or wasn't needed
    isUploadingCertificate.current = false; // Ensure flag is false before mutation starts
    // Include the locally captured expiry date when mutating
    createMutation.mutate({
      ...formData,
      certificado_validade: formattedExpiryDate ?? undefined, // Pass the local variable (or undefined)
      updated_at: null, // Add updated_at here as expected by createCustomer
    });
  }, [formData, certificateFile, createMutation]); // Remove certificateExpiryDate from dependencies as we use a local var now

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
          onFileChange={handleFileChange} // Pass file change handler
          isSubmitting={createMutation.isPending || isUploadingCertificate.current} // Disable form if creating or uploading
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
