import { supabase } from '@/lib/supabase';
import { LedgerTransaction } from '@/types';
import { logger } from '@/lib/logger';

export const LEDGER_COLUMNS =
  'id, store_id, transaction_date, description, reference_type, reference_id, debit, credit, running_balance, payment_mode, notes, created_at' as const;

export const ledgerService = {
  async getStoreLedger(storeId: string): Promise<LedgerTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select(LEDGER_COLUMNS)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.warn('Ledger fetch error:', error);
        return [];
      }
      return (data || []) as LedgerTransaction[];
    } catch {
      return [];
    }
  },

  async recordPayment(params: {
    storeId: string;
    amount: number;
    paymentMode: string;
    referenceNumber?: string;
    notes?: string;
    salespersonId?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; data?: LedgerTransaction; error?: string }> {
    try {
      if (!params.amount || params.amount <= 0) {
        return { success: false, error: 'Payment amount must be greater than zero.' };
      }

      const { data, error } = await supabase.rpc('record_payment', {
        p_store_id: params.storeId,
        p_amount: params.amount,
        p_payment_mode: params.paymentMode,
        p_reference_number: params.referenceNumber || null,
        p_notes: params.notes || null,
        p_idempotency_key: params.idempotencyKey || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as unknown as LedgerTransaction };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record payment.';
      return { success: false, error: message };
    }
  },
};
