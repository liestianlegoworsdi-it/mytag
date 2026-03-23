/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Home, 
  List, 
  PieChart, 
  CheckCircle2, 
  Clock, 
  Hourglass, 
  ArrowUpRight, 
  ArrowDownLeft,
  Search,
  Filter,
  ChevronRight,
  MoreVertical,
  X,
  Calendar,
  Tag,
  User as UserIcon,
  Lock,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { format, parseISO, isAfter, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { Bill, BillStatus, View, User } from './types';

// Configuration for Spreadsheet Integration
const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbxGAeYlUOwLXzaKkDJeu-6Y8EkhdGHpvgu9Ac4LCAcRE6sP0rgjjKLvgqhJGDMMmRns/exec';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#84CC16', '#EAB308', '#0D9488', '#A3E635', '#FDE047'];

const INITIAL_BILLS: Bill[] = [
  {
    id: '1',
    title: 'Listrik PLN',
    amount: 450000,
    status: 'unpaid',
    category: 'Utility',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator'
  },
  {
    id: '2',
    title: 'Internet Indihome',
    amount: 325000,
    status: 'paid',
    category: 'Utility',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
    paidDate: new Date().toISOString(),
    paidBy: 'Administrator'
  },
  {
    id: '3',
    title: 'Cicilan Motor',
    amount: 1200000,
    status: 'unpaid',
    category: 'Installment',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator'
  },
  {
    id: '4',
    title: 'Sewa Apartemen',
    amount: 2500000,
    status: 'paid',
    category: 'Housing',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
    paidDate: new Date().toISOString(),
    paidBy: 'Administrator'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mytag_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('mytag_bills');
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });
  const [currentView, setCurrentView] = useState<View>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      // Only reset to 0 if we were previously at 100% (a new loading session)
      setLoadingProgress(prev => (prev === 100 ? 0 : prev));
      
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.floor(Math.random() * 5) + 1;
        });
      }, 200);
    } else {
      setLoadingProgress(100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | BillStatus>('all');
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);

  // Form state
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [newBill, setNewBill] = useState<Partial<Bill>>({
    title: '',
    amount: 0,
    category: ''
  });

  const hasFetchedRef = React.useRef(false);

  useEffect(() => {
    if (currentUser && GAS_WEBAPP_URL && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBills();
      fetchCategories();
    }
  }, [currentUser]);

  const fetchCategories = async () => {
    if (!GAS_WEBAPP_URL) return;
    try {
      const response = await fetch(`${GAS_WEBAPP_URL}?sheet=kategori`);
      const data = await response.json();
      if (Array.isArray(data)) {
        // Normalize categories to have a 'name' property
        const normalized = data.map((cat: any) => ({
          id: cat.id || Math.random().toString(),
          name: cat.name || cat.kategori || 'Other'
        }));
        setCategories(normalized);
        if (normalized.length > 0 && !newBill.category) {
          setNewBill(prev => ({ ...prev, category: normalized[0].name }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchBills = async (silent = false) => {
    if (!silent && !isLoading) setIsLoading(true);
    else if (silent) setIsRefreshing(true);
    
    try {
      const response = await fetch(`${GAS_WEBAPP_URL}?sheet=tagihan`);
      const data = await response.json();
      
      // Add a small artificial delay to ensure the progress bar is visible and smooth
      await new Promise(resolve => setTimeout(resolve, 800));

      if (Array.isArray(data)) {
        const formatted = data.map((b: any) => ({
          ...b,
          amount: Number(b.amount)
        }));
        setBills(formatted);
        localStorage.setItem('mytag_bills', JSON.stringify(formatted));
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('mytag_bills', JSON.stringify(bills));
  }, [bills]);

  const totalUnpaid = useMemo(() => 
    bills.filter(b => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0),
  [bills]);

  const totalPaid = useMemo(() => 
    bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
  [bills]);

  const filteredBills = useMemo(() => {
    return bills
      .filter(b => {
        const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || b.status === filterStatus;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bills, searchQuery, filterStatus]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    bills.forEach(b => {
      categories[b.category] = (categories[b.category] || 0) + b.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [bills]);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.title || !newBill.amount) return;

    const bill: Bill = {
      id: Math.random().toString(36).substr(2, 9),
      title: newBill.title,
      amount: Number(newBill.amount),
      category: newBill.category || 'Utility',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || currentUser?.username || 'System',
      status: 'unpaid'
    };

    // Optimistic Update
    const previousBills = [...bills];
    setBills([bill, ...bills]);
    setIsAddModalOpen(false);
    setNewBill({ title: '', amount: 0, category: 'Utility' });

    if (GAS_WEBAPP_URL) {
      try {
        await fetch(GAS_WEBAPP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'create', sheet: 'tagihan', data: bill })
        });
        // Sync in background
        fetchBills(true);
      } catch (err) {
        console.error('Failed to add bill:', err);
        setBills(previousBills); // Rollback
      }
    }
  };

  const toggleStatus = async (id: string) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    const paidDate = newStatus === 'paid' ? new Date().toISOString() : '';
    const paidBy = newStatus === 'paid' ? (currentUser?.name || currentUser?.username || 'System') : '';

    // Optimistic Update
    const previousBills = [...bills];
    setBills(bills.map(b => 
      b.id === id ? { ...b, status: newStatus, paidDate: paidDate || undefined, paidBy: paidBy || undefined } : b
    ));

    if (GAS_WEBAPP_URL) {
      try {
        await fetch(GAS_WEBAPP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ 
            action: 'update', 
            sheet: 'tagihan', 
            id, 
            data: { status: newStatus, paidDate, paidBy } 
          })
        });
        // Sync in background
        fetchBills(true);
      } catch (err) {
        console.error('Failed to update bill:', err);
        setBills(previousBills); // Rollback
      }
    }
  };

  const handleMultiPay = async () => {
    if (selectedBillIds.length === 0) return;
    
    // Optimistic Update
    const previousBills = [...bills];
    const updatedBills = bills.map(b => 
      selectedBillIds.includes(b.id) 
        ? { 
            ...b, 
            status: 'paid', 
            paidDate: new Date(paymentDate).toISOString(),
            paidBy: currentUser?.name || currentUser?.username || 'System'
          } 
        : b
    );
    setBills(updatedBills);
    setSelectedBillIds([]);
    setIsPayModalOpen(false);

    if (GAS_WEBAPP_URL) {
      try {
        // We still show a subtle loading for multi-pay as it's multiple requests
        setIsRefreshing(true);
        for (const id of selectedBillIds) {
          await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ 
              action: 'update', 
              sheet: 'tagihan', 
              id, 
              data: { 
                status: 'paid', 
                paidDate: new Date(paymentDate).toISOString(),
                paidBy: currentUser?.name || currentUser?.username || 'System'
              } 
            })
          });
        }
        fetchBills(true);
      } catch (err) {
        console.error('Failed to multi-pay:', err);
        setBills(previousBills); // Rollback
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteBill = async (id: string) => {
    // Optimistic Update
    const previousBills = [...bills];
    setBills(bills.filter(b => b.id !== id));

    if (GAS_WEBAPP_URL) {
      try {
        await fetch(GAS_WEBAPP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'delete', sheet: 'tagihan', id })
        });
        fetchBills(true);
      } catch (err) {
        console.error('Failed to delete bill:', err);
        setBills(previousBills); // Rollback
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mytag_user');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-br from-lime-500 via-teal-700 to-teal-800 text-white p-6 pb-12 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-lg" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  MyTAG <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                </h1>
                <p className="text-teal-50 text-sm font-medium">Halo, {currentUser.name || currentUser.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleLogout}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30"
              >
                <LogOut className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-teal-50 text-xs font-medium uppercase tracking-wider">Total Tagihan Belum Lunas</span>
              <ArrowUpRight className="w-4 h-4 text-yellow-300" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(totalUnpaid)}</div>
            <div className="flex items-center gap-2 text-teal-100 text-xs">
              <span className="bg-yellow-400/30 text-yellow-100 px-2 py-0.5 rounded-full border border-yellow-400/20">
                {bills.filter(b => b.status === 'unpaid').length} Tagihan
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 -mt-10 relative z-20">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-2 bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-50">
                {[
                  { icon: Plus, label: 'Tambah', color: 'bg-lime-100 text-lime-700', onClick: () => setIsAddModalOpen(true) },
                  { icon: Clock, label: 'Jatuh Tempo', color: 'bg-yellow-100 text-yellow-700', onClick: () => { setCurrentView('bills'); setFilterStatus('unpaid'); } },
                  { icon: CheckCircle2, label: 'Lunas', color: 'bg-emerald-100 text-emerald-700', onClick: () => { setCurrentView('bills'); setFilterStatus('paid'); } },
                  { icon: PieChart, label: 'Laporan', color: 'bg-blue-100 text-blue-700', onClick: () => setCurrentView('reports') },
                ].map((action, i) => (
                  <button 
                    key={i} 
                    onClick={action.onClick}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-active:scale-90", action.color)}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent Bills */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    Tagihan Terdekat
                    {isLoading && <span className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />}
                  </h2>
                  <button 
                    onClick={() => setCurrentView('bills')}
                    className="text-teal-600 text-sm font-semibold flex items-center gap-1"
                  >
                    Lihat Semua <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {bills.filter(b => b.status === 'unpaid').slice(0, 3).map(bill => (
                    <motion.div 
                      key={bill.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <BillCard bill={bill} onToggle={toggleStatus} formatCurrency={formatCurrency} />
                    </motion.div>
                  ))}
                  {bills.filter(b => b.status === 'unpaid').length === 0 && (
                    <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-20" />
                      <p className="text-slate-400 text-sm">Semua tagihan sudah lunas!</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10">
                  <div className="text-slate-400 text-xs font-medium mb-1">Total Pengeluaran Bulan Ini</div>
                  <div className="text-2xl font-bold mb-4">{formatCurrency(totalPaid)}</div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-lime-400 to-yellow-400" 
                      style={{ width: `${(totalPaid / (totalPaid + totalUnpaid || 1)) * 100}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold tracking-widest">
                    <span>TERBAYAR</span>
                    <span className="text-lime-400">{Math.round((totalPaid / (totalPaid + totalUnpaid || 1)) * 100)}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'bills' && (
            <motion.div
              key="bills"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <h2 className="text-xl font-bold text-yellow-500 text-center flex items-center gap-2">
                  Daftar Tagihan
                  {(isLoading || isRefreshing) && <span className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />}
                </h2>
                {selectedBillIds.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100"
                  >
                    Terpilih: {formatCurrency(bills.filter(b => selectedBillIds.includes(b.id)).reduce((sum, b) => sum + b.amount, 0))}
                  </motion.div>
                )}
              </div>

              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {['all', 'unpaid', 'paid'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status as any)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                        filterStatus === status 
                          ? "bg-teal-600 text-white shadow-md shadow-teal-200" 
                          : "bg-white text-slate-500 border border-slate-100"
                      )}
                    >
                      {status === 'all' ? 'Semua' : status === 'paid' ? 'Lunas' : 'Belum Lunas'}
                    </button>
                  ))}
                </div>
                {selectedBillIds.length > 0 && (
                  <button 
                    onClick={() => setIsPayModalOpen(true)}
                    className="bg-gradient-to-r from-lime-500 to-teal-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-pulse"
                  >
                    Bayar ({selectedBillIds.length})
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari tagihan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-3">
                {filteredBills.map(bill => (
                  <motion.div 
                    key={bill.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <BillCard 
                      bill={bill} 
                      onToggle={toggleStatus} 
                      onDelete={deleteBill}
                      formatCurrency={formatCurrency}
                      isSelected={selectedBillIds.includes(bill.id)}
                      onSelect={() => toggleSelection(bill.id)}
                    />
                  </motion.div>
                ))}
                {filteredBills.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-sm">Tidak ada tagihan ditemukan</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-teal-600" />
                  Alokasi Pengeluaran
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {chartData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6">Status Pembayaran (Bulan Ini)</h3>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 bg-teal-50 p-4 rounded-2xl border border-teal-100">
                    <div className="text-teal-600 text-[10px] font-bold uppercase mb-1">Lunas</div>
                    <div className="text-lg font-bold text-teal-900">
                      {formatCurrency(
                        bills.filter(b => 
                          b.status === 'paid' && 
                          b.paidDate && 
                          isWithinInterval(parseISO(b.paidDate), {
                            start: startOfMonth(new Date()),
                            end: endOfMonth(new Date())
                          })
                        ).reduce((sum, b) => sum + b.amount, 0)
                      )}
                    </div>
                  </div>
                  <div className="flex-1 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <div className="text-orange-600 text-[10px] font-bold uppercase mb-1">Belum Lunas</div>
                    <div className="text-lg font-bold text-orange-900">
                      {formatCurrency(totalUnpaid)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Pelunasan per Tanggal Bayar
                </h3>
                <div className="space-y-4">
                  {Object.entries(
                    bills
                      .filter(b => b.status === 'paid' && b.paidDate)
                      .reduce((acc, b) => {
                        const date = format(parseISO(b.paidDate!), 'dd MMM yyyy');
                        acc[date] = (acc[date] || 0) + b.amount;
                        return acc;
                      }, {} as Record<string, number>)
                  )
                  .sort((a, b) => {
                    try {
                      return parseISO(b[0]).getTime() - parseISO(a[0]).getTime();
                    } catch {
                      return 0;
                    }
                  })
                  .map(([date, amount]) => (
                    <div key={date} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{date}</span>
                        <span className="text-sm font-bold text-teal-700">{formatCurrency(amount as number)}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedReportDate(date)}
                        className="p-2 bg-white text-slate-400 rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-transform"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {bills.filter(b => b.status === 'paid' && b.paidDate).length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-4">Belum ada data pelunasan</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <footer className="mt-12 mb-8 text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            © 2026 MyTAG Kantin Berkah
          </p>
        </footer>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-40">
        {[
          { id: 'home', icon: Home, label: 'Beranda' },
          { id: 'bills', icon: List, label: 'Tagihan' },
          { id: 'reports', icon: PieChart, label: 'Laporan' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as View)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentView === item.id ? "text-teal-600" : "text-slate-400"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              currentView === item.id ? "bg-teal-50" : "bg-transparent"
            )}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md"
          >
            <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-4 w-64">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-teal-500/10"
                  animate={{ 
                    y: ["100%", "0%"],
                  }}
                  style={{ height: `${loadingProgress}%`, top: 'auto', bottom: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    ease: "linear" 
                  }}
                />
                <Hourglass className="w-8 h-8 text-teal-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-slate-800 font-bold">Sedang diproses</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">Mohon tunggu sebentar</p>
              </div>
              <div className="w-full space-y-2 mt-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                  <span>Progres</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {loadingProgress}%
                  </motion.span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-lime-400 to-teal-500"
                    animate={{ 
                      width: `${loadingProgress}%`,
                    }}
                    transition={{ 
                      duration: 0.5, 
                      ease: "easeOut" 
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReportDate && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center px-4 pb-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReportDate(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Detail Pelunasan</h2>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">{selectedReportDate}</p>
                </div>
                <button onClick={() => setSelectedReportDate(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {bills
                  .filter(b => b.status === 'paid' && b.paidDate && format(parseISO(b.paidDate), 'dd MMM yyyy') === selectedReportDate)
                  .map(bill => (
                    <div key={bill.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm">{bill.title}</h4>
                        <span className="text-xs font-bold text-teal-600">{formatCurrency(bill.amount)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {bill.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {bill.paidBy || 'System'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Terbayar</span>
                <span className="text-lg font-bold text-teal-700">
                  {formatCurrency(
                    bills
                      .filter(b => b.status === 'paid' && b.paidDate && format(parseISO(b.paidDate), 'dd MMM yyyy') === selectedReportDate)
                      .reduce((sum, b) => sum + b.amount, 0)
                  )}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Tambah Tagihan</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddBill} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Tagihan</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Listrik PLN"
                      value={newBill.title}
                      onChange={e => setNewBill({...newBill, title: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah (IDR)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 border border-slate-300 rounded-sm" />
                    <input 
                      type="number" 
                      required
                      placeholder="0"
                      value={newBill.amount || ''}
                      onChange={e => setNewBill({...newBill, amount: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                    <select 
                      value={newBill.category}
                      onChange={e => setNewBill({...newBill, category: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-sm focus:ring-2 focus:ring-teal-500 appearance-none"
                    >
                      {categories.length > 0 ? (
                        categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Utility">Utility</option>
                          <option value="Housing">Housing</option>
                          <option value="Installment">Installment</option>
                          <option value="Subscription">Subscription</option>
                          <option value="Other">Lainnya</option>
                        </>
                      )}
                    </select>
                  </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-lime-500 to-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-lime-100 active:scale-95 transition-transform mt-4"
                >
                  Simpan Tagihan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Payment Modal */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPayModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Pembayaran</h2>
              <p className="text-slate-500 text-sm mb-6">
                Anda akan membayar {selectedBillIds.length} tagihan sekaligus.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Pembayaran</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100">
                  <div className="text-teal-600 text-[10px] font-bold uppercase mb-1">Total yang akan dibayar</div>
                  <div className="text-xl font-bold text-teal-900">
                    {formatCurrency(bills.filter(b => selectedBillIds.includes(b.id)).reduce((sum, b) => sum + b.amount, 0))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsPayModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleMultiPay}
                    className="flex-1 bg-gradient-to-r from-lime-500 to-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-lime-100 active:scale-95 transition-transform"
                  >
                    Bayar Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill from remembered password if available
  useEffect(() => {
    const savedCreds = localStorage.getItem('mytag_remembered');
    if (savedCreds) {
      const { u, p } = JSON.parse(savedCreds);
      setUsername(u);
      setPassword(p);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // If GAS URL is provided, try to login via Spreadsheet
      if (GAS_WEBAPP_URL) {
        console.log('Attempting login to GAS:', GAS_WEBAPP_URL);
        
        const response = await fetch(GAS_WEBAPP_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'login', username, password })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Login result:', result);
        
        if (result.success) {
          finalizeLogin(result.user);
        } else {
          setError(result.message || 'Username atau password salah');
        }
      } else {
        // Fallback to local mock login for demo
        if (username === 'admin' && password === 'admin123') {
          finalizeLogin({ id: '1', username: 'admin', name: 'Administrator', role: 'admin' });
        } else {
          setError('Username atau password salah (admin/admin123)');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeLogin = (user: User) => {
    if (rememberMe) {
      localStorage.setItem('mytag_remembered', JSON.stringify({ u: username, p: password }));
    } else {
      localStorage.removeItem('mytag_remembered');
    }
    
    localStorage.setItem('mytag_user', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 max-w-md mx-auto shadow-2xl">
      <div className="w-full space-y-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-slate-200 mb-6 overflow-hidden border border-slate-100">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">MyTAG</h1>
          <p className="text-slate-500 mt-2">Kelola tagihan Anda dengan mudah</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-[32px] shadow-xl border border-slate-100">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-12 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded-md border-2 transition-all",
                  rememberMe ? "bg-teal-600 border-teal-600" : "border-slate-200"
                )}>
                  {rememberMe && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>
              <span className="text-sm text-slate-600 font-medium">Ingat Saya</span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-lime-500 to-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-lime-100 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isLoading ? "Memproses..." : "Masuk Sekarang"}
          </button>
        </form>

        <p className="text-center text-slate-400 text-xs">
          © 2026 MyTAG Kantin Berkah
        </p>
      </div>
    </div>
  );
}

function BillCard({ 
  bill, 
  onToggle, 
  onDelete,
  formatCurrency,
  isSelected,
  onSelect
}: { 
  bill: Bill, 
  onToggle: (id: string) => void, 
  onDelete?: (id: string) => void,
  formatCurrency: (amount: number) => string,
  isSelected?: boolean,
  onSelect?: () => void
}) {
  return (
    <div 
      className={cn(
        "bg-white p-4 rounded-2xl shadow-sm border transition-all flex items-center gap-4 group relative",
        isSelected ? "border-teal-500 ring-2 ring-teal-500/10" : "border-slate-100"
      )}
    >
      {bill.status === 'unpaid' && onSelect && (
        <button 
          onClick={onSelect}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-lime-500 border-lime-500 text-white" : "border-slate-200 text-transparent"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}

      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
        bill.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-yellow-50 text-yellow-600"
      )}>
        {bill.status === 'paid' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-slate-800 truncate pr-2">{bill.title}</h3>
          <span className="text-sm font-bold text-slate-900">{formatCurrency(bill.amount)}</span>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{bill.category}</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              bill.status === 'paid' ? "text-emerald-500" : "text-orange-500"
            )}>
              {bill.status === 'paid' ? 'Lunas' : 'Belum Lunas'}
            </span>
          </div>
          <div className="text-[9px] text-slate-400">
            Dibuat: {format(parseISO(bill.createdAt), 'dd MMM yyyy')} oleh {bill.createdBy}
          </div>
          {bill.status === 'paid' && bill.paidDate && (
            <div className="text-[9px] text-emerald-500 font-medium">
              Dibayar: {format(parseISO(bill.paidDate), 'dd MMM yyyy')} oleh {bill.paidBy}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={() => onToggle(bill.id)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
            bill.status === 'paid' 
              ? "bg-slate-100 text-slate-500 hover:bg-slate-200" 
              : "bg-gradient-to-r from-lime-500 to-teal-600 text-white hover:opacity-90"
          )}
        >
          {bill.status === 'paid' ? 'Batal' : 'Bayar'}
        </button>
        {onDelete && (
          <button 
            onClick={() => onDelete(bill.id)}
            className="text-slate-300 hover:text-red-500 transition-colors self-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
