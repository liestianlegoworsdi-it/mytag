export type BillStatus = 'paid' | 'unpaid' | 'partial';

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  paidBy: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  category: string;
  createdAt: string;
  createdBy: string;
  payments?: PaymentRecord[];
  status: BillStatus;
  paidDate?: string;
  paidBy?: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: string;
}

export type View = 'home' | 'bills' | 'reports';
