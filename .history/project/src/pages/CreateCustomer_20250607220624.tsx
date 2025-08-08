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
    
    let formattedExpiryDate: string | null = null;

    // 1. Validate certificate if present
    if (certificateFile && formData.senha_certificado) {
      isUploadingCertificate.current = true;
      try {
        const validationResult = await validateCertificateApi(certificateFile, formData.senha_certificado);
        if (!validationResult.isValid) {
          toast.error(validationResult.error || 'Certificado inválido ou expirado.');
          isUploadingCertificate.current = false;
          return;
        }

        // Preencher formulário com informações do certificado
        if (validationResult.certificateInfo) {
          const { cnpj, razao_social, nome_fantasia, endereco, cep, cidade, estado } = validationResult.certificateInfo;
          
          // Atualizar formData com as informações do certificado
          setFormData(prev => ({
            ...prev,
            cnpj: cnpj || prev.cnpj,
            razao_social: razao_social || prev.razao_social,
            endereco: endereco || prev.endereco,
            cep: cep || prev.cep,
            cidade: cidade || prev.cidade,
            estado: estado || prev.estado,
          }));

          // Mostrar mensagem de sucesso com as informações preenchidas
          toast.success('Informações do certificado preenchidas automaticamente');
        }

        // Store the formatted expiration date directly if valid
        if (validationResult.expirationDate) {
            const expiry = new Date(validationResult.expirationDate);
            formattedExpiryDate = expiry.toISOString().split('T')[0];
            setCertificateExpiryDate(formattedExpiryDate);
        } else {
             setCertificateExpiryDate(null);
        }
      } catch (validationError) {
        toast.error(`Erro ao validar certificado: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        isUploadingCertificate.current = false;
        return;
      }
    } else if (certificateFile && !formData.senha_certificado) {
        toast.error('Por favor, insira a senha do certificado para validação.');
        return;
    }
    
    // 2. Proceed with customer creation if validation passed or wasn't needed
    isUploadingCertificate.current = false;
    createMutation.mutate({
      ...formData,
      certificado_validade: formattedExpiryDate ?? undefined,
      updated_at: null,
    });
  }, [formData, certificateFile, createMutation]);

  const headerActions = (
    <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Cancelar
    </Button>
  );

  return (
    <>
      <Header title="Novo Cliente" actions={headerActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg mt-6">
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
