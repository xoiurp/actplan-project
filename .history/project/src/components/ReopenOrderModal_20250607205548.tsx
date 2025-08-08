import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ReopenOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentStatus: string;
}

export function ReopenOrderModal({ isOpen, onClose, orderId, currentStatus }: ReopenOrderModalProps) {
  const [reason, setReason] = useState('');
  const [newStatus, setNewStatus] = useState('processing');
  const queryClient = useQueryClient();

  const reopenMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('reopen_order', {
        p_order_id: orderId,
        p_reason: reason,
        p_new_status: newStatus
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pedido reaberto com sucesso');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao reabrir pedido: ' + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Por favor, informe o motivo da reabertura');
      return;
    }
    reopenMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir Pedido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentStatus">Status Atual</Label>
            <div className="text-sm text-muted-foreground">
              {currentStatus === 'completed' ? 'Concluído' : 'Cancelado'}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStatus">Novo Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Reabertura</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da reabertura do pedido..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={reopenMutation.isPending}
            >
              {reopenMutation.isPending ? 'Reabrindo...' : 'Reabrir Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 