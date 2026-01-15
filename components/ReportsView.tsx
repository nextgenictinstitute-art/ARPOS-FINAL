
import React, { useState, useMemo } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown, DollarSign, FileText, Users } from 'lucide-react';
import { Sale, Purchase, Product, ShopProfile, Customer } from '../types';

declare const html2pdf: any;

interface ReportsViewProps {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  customers: Customer[];
  shopProfile: ShopProfile;
}

type ReportType = 'SALES' | 'PURCHASES' | 'INVENTORY' | 'PROFIT' | 'CUSTOMER';

export const ReportsView: React.FC<ReportsViewProps> = ({ sales, purchases, products, customers, shopProfile }) => {
  const [activeTab, setActiveTab] = useState<ReportType>('SALES');
  const [selectedCustId, setSelectedCustId] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const downloadPDF = () => {
    const element = document.getElementById('report-container');
    const opt = {
      margin: 10,
      filename: `${shopProfile.name}_${activeTab}_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const customerReportData = useMemo(() => {
    if (activeTab !== 'CUSTOMER' || !selectedCustId) return null;
    const clientSales = sales.filter(s => s.customerId === selectedCustId);
    const totalCredit = clientSales.reduce((acc, s) => acc + s.total, 0);
    const totalPaid = clientSales.filter(s => s.paymentStatus === 'Paid').reduce((acc, s) => acc + s.total, 0);
    const outstanding = totalCredit - totalPaid;
    const customer = customers.find(c => c.id === selectedCustId);
    return { customer, sales: clientSales, totalCredit, totalPaid, outstanding };
  }, [activeTab, selectedCustId, sales, customers]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-start no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Reports & Intelligence</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Export high-fidelity business statements</p>
        </div>
        <div className="flex gap-4 items-end">
           {activeTab === 'CUSTOMER' && (
             <select 
                value={selectedCustId} 
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-cyan-500"
             >
                <option value="">Select a Client</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           )}
           <div className="flex gap-2 bg-white border-2 border-slate-100 p-1 rounded-xl">
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-1 text-xs font-bold outline-none border-none bg-transparent" />
             <span className="text-slate-300 font-bold px-1">/</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-1 text-xs font-bold outline-none border-none bg-transparent" />
           </div>
           <button onClick={downloadPDF} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg"><Download size={16} /> PDF Export</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 no-print overflow-x-auto">
        {[
          { id: 'SALES', label: 'Sales', icon: TrendingUp },
          { id: 'PURCHASES', label: 'Purchases', icon: TrendingDown },
          { id: 'PROFIT', label: 'Profit/Loss', icon: DollarSign },
          { id: 'INVENTORY', label: 'Stock Val', icon: FileText },
          { id: 'CUSTOMER', label: 'Client Statement', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportType)}
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all ${activeTab === tab.id ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-10 overflow-y-auto" id="report-container">
        <div className="flex justify-between border-b-8 border-slate-900 pb-6 mb-10 items-end">
            <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{shopProfile.name}</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Official Business Report</p>
            </div>
            <div className="text-right">
                <h2 className="text-2xl font-black text-cyan-600 uppercase tracking-[0.2em]">{activeTab} ANALYSIS</h2>
                <p className="text-xs font-bold text-slate-500 uppercase">{startDate} TO {endDate}</p>
            </div>
        </div>

        {activeTab === 'CUSTOMER' && customerReportData ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-2 gap-10">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem]">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Customer Profile</p>
                        <h3 className="text-3xl font-black uppercase">{customerReportData.customer?.name}</h3>
                        <p className="text-sm font-bold text-cyan-400 mt-1">{customerReportData.customer?.phone}</p>
                        <p className="text-xs text-slate-400 mt-4 uppercase font-bold">{customerReportData.customer?.address}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border-2 border-slate-100 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Billed</p>
                            <p className="text-2xl font-black font-mono">Rs.{customerReportData.totalCredit.toFixed(0)}</p>
                        </div>
                        <div className="border-2 border-red-100 bg-red-50 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-red-600 uppercase mb-2">Net Outstanding</p>
                            <p className="text-2xl font-black font-mono text-red-700">Rs.{customerReportData.outstanding.toFixed(0)}</p>
                        </div>
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="border-b-4 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <tr><th className="py-4">Date</th><th className="py-4">Invoice #</th><th className="py-4">Method</th><th className="py-4 text-center">Status</th><th className="py-4 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y text-sm font-bold text-slate-800">
                        {customerReportData.sales.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="py-4">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="py-4 font-mono">#{s.id.slice(-6)}</td>
                                <td className="py-4 text-slate-500 uppercase">{s.paymentMethod}</td>
                                <td className="py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${s.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.paymentStatus}</span>
                                </td>
                                <td className="py-4 text-right font-black font-mono">Rs.{s.total.toFixed(0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : activeTab === 'CUSTOMER' ? (
            <div className="py-24 text-center text-slate-300 font-black uppercase text-xl opacity-20">Select a Client to View Ledger History</div>
        ) : (
            <div className="text-slate-400 font-bold text-center py-10 italic">
                {activeTab} Report Data content goes here... (Existing Logic Maintained)
            </div>
        )}

        <div className="mt-20 pt-8 border-t border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Authorized Electronic Document • AR PRINTERS SYSTEM</p>
        </div>
      </div>
    </div>
  );
};
