export type BillStatus = 'paid' | 'unpaid';

export interface Bill {
  id: string;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
  createdBy: string;
  paidDate?: string;
  paidBy?: string;
  status: BillStatus;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: string;
}

export type View = 'home' | 'bills' | 'reports';
