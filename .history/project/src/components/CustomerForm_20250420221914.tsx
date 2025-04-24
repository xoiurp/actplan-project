import React, { useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { uploadCertificate } from '../lib/api';
import toast from 'react-hot-toast';

interface CustomerFormProps {
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    razao_social: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    numero: string;
    complemento: string;
    nome_responsavel: string;
    sobrenome_responsavel: string;
    whatsapp_responsavel: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEdit?: boolean;
  customerId?: string;
  onCertificateUpload?: () => void;
}

export function CustomerForm({ 
  onSubmit, 
  formData, 
  onInputChange, 
  isEdit = false, 
  customerId,
  onCertificateUpload 
}: CustomerFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!customerId) return;

    try {
      await uploadCertificate(file, customerId);
      toast.success('Certificado enviado com sucesso');
      onCertificateUpload?.();
    } catch (error) {
      toast.error('Erro ao enviar certificado');
    }
  };

  const validateFile = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith('.pfx')) {
      toast.error('Apenas arquivos .pfx são permitidos');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error('O arquivo deve ter menos de 10MB');
      return false;
    }
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      handleFileUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      handleFileUpload(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="razao_social" className="block text-sm font-medium text-gray-700">
          Razão Social
        </label>
        <input
          type="text"
          id="razao_social"
          name="razao_social"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.razao_social}
          onChange={onInputChange}
        />
      </div>

      <div>
        <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
          CNPJ
        </label>
        <input
          type="text"
          id="cnpj"
          name="cnpj"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.cnpj}
          onChange={onInputChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="nome_responsavel" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            type="text"
            id="nome_responsavel"
            name="nome_responsavel"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.nome_responsavel}
            onChange={onInputChange}
          />
        </div>

        <div>
          <label htmlFor="sobrenome_responsavel" className="block text-sm font-medium text-gray-700">
            Sobrenome
          </label>
          <input
            type="text"
            id="sobrenome_responsavel"
            name="sobrenome_responsavel"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.sobrenome_responsavel}
            onChange={onInputChange}
          />
        </div>
      </div>

      <div>
        <label htmlFor="whatsapp_responsavel" className="block text-sm font-medium text-gray-700">
          WhatsApp
        </label>
        <input
          type="tel"
          id="whatsapp_responsavel"
          name="whatsapp_responsavel"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.whatsapp_responsavel}
          onChange={onInputChange}
        />
      </div>

      <div>
        <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
          Endereço
        </label>
        <input
          type="text"
          id="endereco"
          name="endereco"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.endereco}
          onChange={onInputChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
            Número
          </label>
          <input
            type="text"
            id="numero"
            name="numero"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.numero}
            onChange={onInputChange}
          />
        </div>

        <div>
          <label htmlFor="complemento" className="block text-sm font-medium text-gray-700">
            Complemento
          </label>
          <input
            type="text"
            id="complemento"
            name="complemento"
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.complemento}
            onChange={onInputChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
            Cidade
          </label>
          <input
            type="text"
            id="cidade"
            name="cidade"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.cidade}
            onChange={onInputChange}
          />
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <input
            type="text"
            id="estado"
            name="estado"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.estado}
            onChange={onInputChange}
          />
        </div>

        <div>
          <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
            CEP
          </label>
          <input
            type="text"
            id="cep"
            name="cep"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.cep}
            onChange={onInputChange}
          />
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload de Certificado
          </label>
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-shadow-dark border-dashed rounded-md hover:border-primary transition-colors duration-200"
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="certificate"
                  className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                >
                  <span>Enviar arquivo</span>
                  <input
                    id="certificate"
                    name="certificate"
                    type="file"
                    className="sr-only"
                    accept=".pfx"
                    ref={fileInputRef}
                    onChange={handleInputChange}
                  />
                </label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-gray-500">Arquivos PFX até 10MB</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isEdit ? 'Atualizar Cliente' : 'Criar Cliente'}
        </button>
      </div>
    </form>
  );
}