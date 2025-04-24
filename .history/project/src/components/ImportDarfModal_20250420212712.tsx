import React, { useState } from 'react';
import { Modal } from './ui/modal';
import { Dropzone } from './ui/dropzone';
import { Loader2 } from 'lucide-react';

interface ImportDarfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function ImportDarfModal({ isOpen, onClose, onImport }: ImportDarfModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      await onImport(selectedFile);
      onClose();
    } catch (error) {
      console.error('Failed to import DARF:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar DARF"
    >
      <div className="space-y-4">
        <Dropzone
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
        />

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedFile || isProcessing}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Importar'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}