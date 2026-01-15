
import React, { useMemo, useState } from 'react';
import { User, Phone, Calendar, CheckCircle, Search, ChevronRight, ArrowLeft, History, Filter, FileText } from 'lucide-react';
import { Sale, Customer } from '../types';
import { db } from '../services/db';

interface CreditViewProps {
  sales: Sale[];
  customers: Customer[];
  onUpdate: () => void;
}

export const CreditView: React.FC<CreditViewProps> = ({ sales, customers, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const ledgerData = useMemo(() => {
    return customers.map(customer => {
      const customerSales = sales.filter(s => s.customerId === customer.id || (s.customerName === customer.name && s.customerContact === customer.phone));
      const totalCredit = customerSales.reduce((acc, s) => acc + s.total, 0);
      const totalPaid = customerSales.filter(s => s.paymentStatus === 'Paid').reduce((acc, s) => acc + s.total, 0);
      const outstanding = totalCredit - totalPaid;
      const lastTransaction = customerSales.length > 0 ? customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null;

      return {
        ...customer,
        totalCredit,
        totalPaid,
        outstanding,
        lastTransaction
      };
    })
    .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm))
    .sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, sales, searchTerm]);

  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales
      .filter(s => s.customerId === selectedCustomer.id || (s.customerName === selectedCustomer.name && s.customerContact === selectedCustomer.phone))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, selectedCustomer]);

  const handleSettle = async (sale: Sale) => {
    if (window.confirm(`Mark Bill #${sale.id.slice(-6)} as Settled?`)) {
      await db.updateSale({ 
        ...sale, 
        paymentStatus: 'Paid',
        paymentMethod: 'Cash'
      });
      onUpdate();
    }
  };

  if (!selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Credit Ledger</h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Real-time Outstanding Receivables</p>
          </div>
          <div className="bg-red-50 border-2 border-red-100 px-8 py-4 rounded-3xl flex flex-col items-end">
              <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em]">Total Outstanding</span>
              <span className="text-3xl font-black text-red-700 tracking-tighter font-mono">Rs.{ledgerData.reduce((acc, l) => acc + l.outstanding, 0).toFixed(0)}</span>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b bg-slate-50/30">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Find client ledger..." className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl focus:border-cyan-500 outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  <th className="px-8 py-6">Client Profile</th>
                  <th className="px-8 py-6 text-right">Total Credit</th>
                  <th className="px-8 py-6 text-right">Total Paid</th>
                  <th className="px-8 py-6 text-right text-red-600">Outstanding</th>
                  <th className="px-8 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ledgerData.filter(l => l.outstanding > 0).map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/50 group transition-colors cursor-pointer" onClick={() => setSelectedCustomer(l)}>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{l.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 font-mono mt-1">{l.phone}</p>
                    </td>
                    <td className="px-8 py-6 text-right font-bold text-slate-400 font-mono">Rs.{l.totalCredit.toFixed(0)}</td>
                    <td className="px-8 py-6 text-right font-bold text-green-600 font-mono">Rs.{l.totalPaid.toFixed(0)}</td>
                    <td className="px-8 py-6 text-right font-black text-red-600 text-xl font-mono">Rs.{l.outstanding.toFixed(0)}</td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center"><ChevronRight size={24} className="text-slate-200 group-hover:text-cyan-600 transition-colors" /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <button onClick={() => setSelectedCustomer(null)} className="p-3 bg-white shadow-sm rounded-full text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"><ArrowLeft size={24} /></button>
        <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedCustomer.name}</h2>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-1">Client Statement & Payment History</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-600 p-8 rounded-[2rem] text-white shadow-xl">
              <p className="text-[10px] font-black text-red-100 uppercase tracking-widest mb-2">Current Debt</p>
              <p className="text-4xl font-black font-mono tracking-tighter">Rs.{(customerHistory.filter(s => s.paymentStatus === 'Pending').reduce((acc, s) => acc + s.total, 0)).toFixed(0)}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Lifetime Billing</p>
              <p className="text-4xl font-black font-mono text-slate-900 tracking-tighter">Rs.{(customerHistory.reduce((acc, s) => acc + s.total, 0)).toFixed(0)}</p>
          </div>
          <div className="bg-cyan-600 p-8 rounded-[2rem] text-white shadow-xl">
              <p className="text-[10px] font-black text-cyan-100 uppercase tracking-widest mb-2">Payment Completion</p>
              <p className="text-4xl font-black font-mono tracking-tighter">{((customerHistory.filter(s => s.paymentStatus === 'Paid').length / customerHistory.length) * 100).toFixed(0)}%</p>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2"><History size={16} className="text-cyan-600" /> Transaction Timeline</h3>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"><FileText size={14} /> Export Statement</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b">
                    <tr>
                        <th className="px-8 py-6">Date</th>
                        <th className="px-8 py-6">Invoice #</th>
                        <th className="px-8 py-6">Items Summary</th>
                        <th className="px-8 py-6 text-right">Amount</th>
                        <th className="px-8 py-6 text-center">Status</th>
                        <th className="px-8 py-6 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {customerHistory.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6 font-bold text-slate-500">{new Date(sale.date).toLocaleDateString()}</td>
                            <td className="px-8 py-6 font-mono font-bold text-slate-900 text-sm">#{sale.id.slice(-6).toUpperCase()}</td>
                            <td className="px-8 py-6 font-bold text-slate-400 text-xs truncate max-w-xs">{sale.items.map(i => i.name).join(', ')}</td>
                            <td className="px-8 py-6 text-right font-black text-slate-900 font-mono text-lg">Rs.{sale.total.toFixed(0)}</td>
                            <td className="px-8 py-6 text-center">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {sale.paymentStatus}
                                </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                                {sale.paymentStatus === 'Pending' && (
                                    <button onClick={() => handleSettle(sale)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 ml-auto">
                                        <CheckCircle size={14} /> Settle
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
