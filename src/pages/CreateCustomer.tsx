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
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateExpiryDate, setCertificateExpiryDate] = useState<string | null>(null);
  const [isCertificateValid, setIsCertificateValid] = useState(false);
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
    senha_certificado: '',
    user_id: '',
  });

  // Ref to track if upload is happening after creation
  const isUploadingCertificate = useRef(false);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'created_at' | 'certificado'>) => createCustomer(data),
    onSuccess: async (createdCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente criado com sucesso');

      if (certificateFile && createdCustomer?.id) {
        isUploadingCertificate.current = true;
        try {
          await uploadCertificate(certificateFile, createdCustomer.id);
          toast.success('Certificado enviado com sucesso');
        } catch (uploadError) {
          toast.error(`Erro ao enviar certificado: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
        } finally {
          isUploadingCertificate.current = false;
        }
      }

      navigate('/customers');
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

  const handleFileChange = useCallback((file: File | null) => {
    setCertificateFile(file);
    setIsCertificateValid(false); // Reset validation state when file changes
  }, []);

  const handleCertificateValidated = useCallback((info: any) => {
    // Log para debug
    console.log('Received certificate info in CreateCustomer:', info);

    // Preencher formulário com informações do certificado
    setFormData(prev => {
      const newFormData = {
        ...prev,
        cnpj: info.cnpj || prev.cnpj,
        razao_social: info.razao_social || prev.razao_social,
        endereco: info.endereco || prev.endereco,
        cep: info.cep || prev.cep,
        cidade: info.cidade || prev.cidade,
        estado: info.estado || prev.estado,
      };

      // Log para debug
      console.log('Updated form data:', newFormData);

      return newFormData;
    });

    setIsCertificateValid(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se o certificado foi validado
    if (certificateFile && !isCertificateValid) {
      toast.error('Por favor, valide o certificado antes de criar o cliente.');
      return;
    }

    let formattedExpiryDate: string | null = null;

    // Se o certificado foi validado, podemos prosseguir com a criação
    if (certificateFile && formData.senha_certificado) {
      isUploadingCertificate.current = true;
      try {
        const validationResult = await validateCertificateApi(certificateFile, formData.senha_certificado);
        if (!validationResult.isValid) {
          toast.error(validationResult.error || 'Certificado inválido ou expirado.');
          isUploadingCertificate.current = false;
          return;
        }

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
    }
    
    isUploadingCertificate.current = false;
    createMutation.mutate({
      ...formData,
      certificado_validade: formattedExpiryDate ?? undefined,
      updated_at: null,
    });
  }, [formData, certificateFile, createMutation, isCertificateValid]);

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
          setFormData={setFormData}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          isSubmitting={createMutation.isPending || isUploadingCertificate.current}
          onCertificateValidated={handleCertificateValidated}
        />
      </div>
    </>
  );
}
