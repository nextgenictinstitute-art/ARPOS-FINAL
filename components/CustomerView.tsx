
import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, UserPlus, Phone, Mail, MapPin, Trash2, X, Save } from 'lucide-react';
import { Customer } from '../types';
import { db } from '../services/db';

interface CustomerViewProps {
  customers: Customer[];
  onUpdate: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({ customers, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({
    name: '', phone: '', email: '', address: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    if (editingId) {
      await db.updateCustomer({ ...form, id: editingId } as Customer);
    } else {
      await db.addCustomer({
        ...form,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      } as Customer);
    }

    setIsAdding(false);
    setEditingId(null);
    setForm({ name: '', phone: '', email: '', address: '' });
    onUpdate();
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm(c);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure? This will not delete their purchase history but removes them from the active database.")) {
      await db.deleteCustomer(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Customer Database</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Manage client profiles and communications</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-cyan-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-black uppercase text-xs tracking-widest shadow-lg hover:bg-cyan-700 transition-all active:scale-95"
        >
          <UserPlus size={18} /> Add New Client
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone number..." 
              className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl focus:border-cyan-500 outline-none font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-300 font-black uppercase text-xl opacity-20">
              No Client Records Found
            </div>
          ) : (
            filteredCustomers.map(c => (
              <div key={c.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:border-cyan-500 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => startEdit(c)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-cyan-600 hover:text-white transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={16} /></button>
                </div>

                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-4">
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                
                <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter leading-none mb-4">{c.name}</h3>
                
                <div className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <p className="flex items-center gap-3"><Phone size={14} className="text-cyan-600" /> {c.phone}</p>
                  {c.email && <p className="flex items-center gap-3"><Mail size={14} className="text-cyan-600" /> {c.email}</p>}
                  {c.address && <p className="flex items-center gap-3"><MapPin size={14} className="text-cyan-600" /> {c.address}</p>}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Client Since {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{editingId ? 'Update Record' : 'Create Client Profile'}</h3>
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">Fill in the official details</p>
              </div>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Client Name *</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-cyan-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Asarudeen" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contact Phone *</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-cyan-500 outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="07XXXXXXXX" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-cyan-500 outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="mail@example.com" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Physical Address</label>
                <textarea rows={3} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-cyan-500 outline-none resize-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street, City..." />
              </div>
              <button type="submit" className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase text-lg shadow-xl hover:bg-cyan-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4">
                <Save size={20} /> {editingId ? 'Apply Changes' : 'Confirm Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
