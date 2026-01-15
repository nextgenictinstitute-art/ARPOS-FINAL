
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, Printer, CheckCircle, ShoppingCart, 
  User, Download, X, MessageCircle, Share2, Store, Keyboard, 
  Tag, Users, Trash2, ChevronDown, Calendar, CreditCard, 
  ShieldCheck, Banknote, Mail, Phone, Globe, MapPin, SearchCode, 
  Info, ArrowRight, ListOrdered, UserCheck, Smartphone, UserCircle,
  Hash
} from 'lucide-react';
import { Product, CartItem, Sale, ShopProfile, Customer } from '../types';
import { db } from '../services/db';
import { useDebounce } from '../hooks/useDebounce';

declare const html2pdf: any;

interface BillingViewProps {
  products: Product[];
  shopProfile: ShopProfile;
  customers: Customer[];
  onSaleComplete: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ products, shopProfile, customers, onSaleComplete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Credit'>('Cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>(''); 
  
  const [lastInvoice, setLastInvoice] = useState<Sale | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 5);
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setShowCustomerSearch(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
  };

  const addManualItem = () => {
    if (!manualName.trim() || !manualPrice) return;
    const priceNum = parseFloat(manualPrice);
    const qtyNum = parseInt(manualQty) || 1;
    if (isNaN(priceNum)) return;
    setCart(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      category: 'Service',
      price: priceNum,
      cost: 0,
      stock: 0,
      minStockLevel: 0,
      quantity: qtyNum
    }]);
    setManualName(''); setManualPrice(''); setManualQty('1');
    const nameInput = document.getElementById('manual-item-input');
    if (nameInput) nameInput.focus();
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal - discountAmount;
    const change = paidAmount ? parseFloat(paidAmount) - total : 0;
    return { subtotal, total, change };
  };

  const { subtotal, total, change } = calculateTotals();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Credit' && !selectedCustomer) {
        alert("A registered customer from the database is required for Credit transactions.");
        setShowCustomerSearch(true);
        return;
    }

    setIsProcessing(true);
    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      customerId: selectedCustomer?.id,
      customerName: customerName,
      customerContact: customerPhone,
      items: [...cart],
      subtotal,
      tax: 0,
      discount: discountAmount,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'Credit' ? 'Pending' : 'Paid'
    };

    try {
        await db.saveSale(newSale);
        setLastInvoice(newSale);
        setShowPreview(true);
        setCart([]);
        handleClearCustomer();
        setCustomerSearch('');
        setPaymentMethod('Cash');
        setDiscountAmount(0);
        setPaidAmount('');
        onSaleComplete();
    } catch (error) {
        console.error(error);
        alert("Sale failed. Check connectivity or local database.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('invoice-preview');
    if (!element || !lastInvoice) return;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `INV-${lastInvoice.id.slice(-6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleShare = async () => {
    if (!lastInvoice) return;
    setIsSharing(true);
    const element = document.getElementById('invoice-preview');
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `INV-${lastInvoice.id.slice(-6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const file = new File([pdfBlob], `Invoice_${lastInvoice.id.slice(-6)}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${lastInvoice.id.slice(-6)}`,
          text: `AR Printers - Invoice for ${lastInvoice.customerName}`
        });
      } else {
        alert("Share API not available on this browser.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 overflow-hidden">
      
      {/* LEFT COLUMN: ENTRY & SETTLEMENT CART - WIDER FOR DESKTOP */}
      <div className="w-full lg:w-[68%] flex flex-col space-y-6 no-print overflow-hidden">
        
        {/* Fast Billing Entry - Enlarged for Desktop */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-cyan-600 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg"><Keyboard size={20} /></div> Fast Entry Console
            </h3>
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Service Description / Item Name</label>
              <input 
                id="manual-item-input"
                type="text" 
                placeholder="What are we billing today?" 
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-cyan-500 focus:bg-white outline-none text-base transition-all shadow-inner" 
                value={manualName} 
                onChange={(e) => setManualName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
              />
            </div>
            <div className="col-span-4 xl:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 text-center">Qty</label>
              <input 
                type="number" 
                placeholder="1" 
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center focus:border-cyan-500 focus:bg-white outline-none text-base transition-all shadow-inner" 
                value={manualQty} 
                onChange={(e) => setManualQty(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
              />
            </div>
            <div className="col-span-5 xl:col-span-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Unit Price (LKR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">Rs.</span>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center focus:border-cyan-500 focus:bg-white outline-none text-base transition-all shadow-inner" 
                  value={manualPrice} 
                  onChange={(e) => setManualPrice(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
                />
              </div>
            </div>
            <div className="col-span-3 xl:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block opacity-0">Add</label>
              <button 
                onClick={addManualItem} 
                className="w-full h-[60px] bg-cyan-600 text-white rounded-2xl hover:bg-cyan-700 shadow-lg active:scale-95 flex items-center justify-center transition-all group"
              >
                <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* SETTLEMENT CART - EXPANDED DESKTOP VIEW */}
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
           <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-slate-900 text-white rounded-[1.25rem] shadow-xl">
                <ShoppingCart size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Settlement Cart</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Hash size={12} className="text-cyan-600"/> {cart.length} Active Rows
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={12} className="text-cyan-600"/> {customerName}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setCart([])} 
              className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 border-2 border-transparent hover:border-red-700 shadow-sm"
            >
              <Trash2 size={18}/> Reset Cart
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar bg-slate-50/20">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-cyan-100 rounded-full blur-3xl opacity-30 animate-pulse" />
                  <ShoppingCart size={140} strokeWidth={0.5} className="text-slate-200 relative z-10" />
                </div>
                <p className="font-black text-slate-300 uppercase tracking-[0.8em] text-2xl">Terminal Ready</p>
                <p className="text-base font-bold text-slate-400 mt-4 tracking-wide">Add services or products to begin high-speed billing</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-8 bg-white border border-slate-100 p-8 rounded-[2.5rem] hover:shadow-2xl hover:border-cyan-500 transition-all group animate-in slide-in-from-left-6 duration-300 shadow-sm" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 flex items-center justify-center text-xl font-black text-slate-300 group-hover:bg-cyan-600 group-hover:text-white transition-all group-hover:scale-110 shadow-inner">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-2xl text-slate-900 uppercase leading-none truncate group-hover:text-cyan-800 transition-colors tracking-tight">{item.name}</h4>
                    <div className="flex items-center gap-6 mt-3">
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">Rate: Rs.{item.price.toFixed(2)}</span>
                       <span className="text-[11px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-1.5"><Tag size={12}/> {item.category}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-slate-50 rounded-[1.5rem] p-2.5 border-2 border-slate-100 shadow-sm">
                    <button 
                      onClick={() => {
                        const newQty = Math.max(0, item.quantity - 1);
                        if(newQty === 0) setCart(cart.filter(i => i.id !== item.id));
                        else setCart(cart.map(i => i.id === item.id ? {...i, quantity: newQty} : i));
                      }} 
                      className="p-3 bg-white rounded-xl shadow-md hover:bg-red-600 hover:text-white transition-all active:scale-90"
                    >
                      <Minus size={24}/>
                    </button>
                    <span className="text-3xl font-black min-w-[60px] text-center font-mono tracking-tighter">{item.quantity}</span>
                    <button 
                      onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} 
                      className="p-3 bg-white rounded-xl shadow-md hover:bg-green-600 hover:text-white transition-all active:scale-90"
                    >
                      <Plus size={24}/>
                    </button>
                  </div>
                  
                  <div className="text-right min-w-[180px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Line Subtotal</p>
                    <p className="font-black text-slate-900 text-3xl font-mono tracking-tighter">Rs.{(item.price * item.quantity).toFixed(0)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Persistent Desktop Footer Overlay */}
          <div className="p-6 bg-slate-900 flex justify-between items-center no-print">
             <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-600 rounded-lg animate-pulse">
                  <Globe size={16} className="text-white"/>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">AR PRINTERS POS INFRASTRUCTURE • SECURE CONNECTION</span>
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Cart Integrity Verified</span>
                <ShieldCheck size={18} className="text-green-500"/>
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: IDENTITY & FINANCIAL SETTLEMENT - OPTIMIZED FOR DESKTOP */}
      <div className="w-full lg:w-[32%] flex flex-col space-y-6 no-print overflow-hidden">
        
        {/* CUSTOMER IDENTITY PANEL */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 flex flex-col space-y-6">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl shadow-inner">
                 <UserCircle size={28}/>
               </div>
               <div>
                 <h3 className="text-base font-black text-slate-800 uppercase tracking-widest leading-none">Identity</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Client Profile Management</p>
               </div>
             </div>
             <button 
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              className="bg-slate-900 text-white px-5 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-xl active:scale-95 flex items-center gap-2 group"
             >
               <Users size={16} className="group-hover:scale-110 transition-transform"/> DB Lookup
             </button>
           </div>

           <div className="space-y-5">
              <div className="relative group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] absolute left-5 top-3 z-10 group-focus-within:text-cyan-600 transition-colors">Recipient Name</label>
                <input 
                  type="text" 
                  placeholder="Walk-in Customer"
                  className="w-full pl-5 pr-14 pt-8 pb-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black uppercase outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-sm"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                {selectedCustomer && (
                  <button onClick={handleClearCustomer} className="absolute right-5 top-[60%] -translate-y-1/2 text-slate-300 hover:text-red-500 transition-all"><X size={22}/></button>
                )}
              </div>
              <div className="relative group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] absolute left-5 top-3 z-10 group-focus-within:text-cyan-600 transition-colors">Mobile Number</label>
                <div className="absolute left-5 bottom-4 text-slate-300 group-focus-within:text-cyan-500 transition-colors">
                  <Smartphone size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="07XXXXXXXX"
                  className="w-full pl-12 pr-5 pt-8 pb-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black uppercase outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-sm"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
           </div>

           {/* Search Dropdown Panel (Desktop Optimization) */}
           {showCustomerSearch && (
              <div className="absolute top-[340px] left-8 right-8 xl:left-auto xl:right-10 xl:w-[30%] bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] z-[100] overflow-hidden animate-in zoom-in-95 origin-top">
                  <div className="p-6 border-b bg-slate-50 flex items-center gap-4">
                      <Search size={24} className="text-cyan-600"/>
                      <input 
                          autoFocus
                          type="text" 
                          placeholder="Search database records..." 
                          className="w-full p-3 bg-transparent border-none rounded-xl text-lg outline-none font-bold"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      <button onClick={() => setShowCustomerSearch(false)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {filteredCustomers.length === 0 ? (
                          <div className="p-16 text-center text-slate-400 text-sm font-black uppercase tracking-widest opacity-50">No matching records found</div>
                      ) : (
                          filteredCustomers.map(c => (
                              <div 
                                  key={c.id} 
                                  onClick={() => handleSelectCustomer(c)}
                                  className="p-6 hover:bg-cyan-50 cursor-pointer border-b last:border-0 transition-all flex items-center justify-between group"
                              >
                                  <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-base font-black text-white group-hover:bg-cyan-600 group-hover:scale-105 transition-all shadow-lg">
                                      {c.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-black text-slate-900 uppercase text-sm group-hover:text-cyan-700 transition-colors">{c.name}</div>
                                      <div className="text-[10px] text-slate-400 font-bold font-mono group-hover:text-slate-500 mt-0.5">{c.phone}</div>
                                    </div>
                                  </div>
                                  <ArrowRight size={20} className="text-slate-200 group-hover:text-cyan-600 group-hover:translate-x-3 transition-all" />
                              </div>
                          ))
                      )}
                  </div>
              </div>
           )}
        </div>

        {/* SETTLEMENT PANEL - ENLARGED FINANCIALS */}
        <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col space-y-8 border-4 border-slate-800 relative overflow-hidden">
          {/* Subtle Glow Backdrop */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3 px-1">Discount Adjust</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500 font-black text-xl italic">Rs.</span>
                <input 
                  type="number" 
                  className="w-full pl-14 pr-5 py-5 bg-slate-800/80 border-2 border-slate-700 rounded-[1.5rem] text-amber-400 font-black text-2xl outline-none focus:border-amber-500 transition-all shadow-inner" 
                  value={discountAmount} 
                  onChange={(e) => setDiscountAmount(Number(e.target.value))} 
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3 px-1">Tendered Cash</label>
              <div className="relative">
                 <span className="absolute left-5 top-1/2 -translate-y-1/2 text-green-500 font-black text-xl italic">Rs.</span>
                 <input 
                  type="number" 
                  className="w-full pl-14 pr-5 py-5 bg-slate-800/80 border-2 border-slate-700 rounded-[1.5rem] text-green-400 font-black text-2xl outline-none focus:border-green-500 transition-all shadow-inner" 
                  value={paidAmount} 
                  onChange={(e) => setPaidAmount(e.target.value)} 
                  placeholder="0.00" 
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center py-8 border-y border-slate-800/50 space-y-8 relative z-10">
             <div className="flex justify-between items-center bg-slate-800/20 p-4 rounded-2xl">
                <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Gross Subtotal</span>
                <span className="text-2xl font-black font-mono text-slate-400">Rs.{subtotal.toFixed(0)}</span>
             </div>
             
             <div className="flex justify-between items-end px-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                    <span className="text-[11px] font-black text-cyan-600 uppercase tracking-[0.3em] block">Net Amount</span>
                  </div>
                  <span className="text-6xl font-black text-white font-mono tracking-tighter shadow-sm">Rs.{total.toFixed(0)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Balance Due</span>
                  <span className={`text-4xl font-black font-mono tracking-tighter ${change >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                    {change >= 0 ? 'Rs.' : '-Rs.'}{Math.abs(change).toFixed(0)}
                  </span>
                </div>
             </div>
          </div>

          <div className="space-y-6 pt-2 relative z-10">
             <div className="grid grid-cols-4 gap-3">
               {(['Cash', 'Card', 'Online', 'Credit'] as const).map(m => (
                 <button 
                    key={m} 
                    onClick={() => setPaymentMethod(m)} 
                    className={`py-5 rounded-[1.5rem] border-2 font-black text-[11px] uppercase tracking-widest transition-all flex flex-col items-center gap-2 shadow-sm ${paymentMethod === m ? (m === 'Credit' ? 'bg-red-600 border-red-500 text-white scale-105 shadow-red-900/50' : 'bg-cyan-600 border-cyan-500 text-white scale-105 shadow-cyan-900/50') : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:border-slate-600'}`}
                >
                    {m === 'Cash' && <Banknote size={22}/>}
                    {m === 'Card' && <CreditCard size={22}/>}
                    {m === 'Online' && <Globe size={22}/>}
                    {m === 'Credit' && <Users size={22}/>}
                    {m}
                </button>
               ))}
             </div>
             
             <button 
                onClick={handleCheckout} 
                disabled={cart.length === 0 || isProcessing} 
                className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-3xl flex items-center justify-center gap-5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden ${paymentMethod === 'Credit' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
             >
                {/* Glow sweep effect */}
                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12" />
                
                {isProcessing ? (
                  <div className="animate-spin h-10 w-10 border-[6px] border-white border-t-transparent rounded-full"/>
                ) : (
                  <>
                    <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <CheckCircle size={36} /> 
                    </div>
                    <span>{paymentMethod === 'Credit' ? 'Log Credit' : 'Submit Sale'}</span>
                  </>
                )}
             </button>
          </div>
        </div>
      </div>

      {/* INVOICE MODAL - MAINTAINED */}
      {showPreview && lastInvoice && (
        <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto modal-overlay">
             <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl flex flex-col h-[92vh] animate-in zoom-in-95 duration-500">
                <div className="p-8 border-b flex flex-col sm:flex-row justify-between items-center no-print bg-slate-50 gap-6 rounded-t-[3rem]">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-green-500 text-white rounded-[1.5rem] shadow-xl animate-bounce">
                        <ShieldCheck size={36}/>
                      </div>
                      <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Transaction Finalized</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Ref ID: {lastInvoice.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-lg active:scale-95"><Printer size={20}/> Print Order</button>
                        <button onClick={handleShare} disabled={isSharing} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                          {isSharing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Share2 size={20}/>} Share Digital
                        </button>
                        <button onClick={handleDownloadPDF} className="bg-cyan-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-cyan-700 transition-all shadow-lg active:scale-95"><Download size={20}/> Export PDF</button>
                        <button onClick={() => setShowPreview(false)} className="p-4 text-slate-400 hover:bg-slate-200 rounded-full transition-all ml-4"><X size={36}/></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 bg-slate-200/50 flex justify-center">
                    <div id="invoice-preview" className="bg-white p-20 w-[210mm] min-h-[297mm] shadow-2xl flex flex-col border border-slate-100 relative mb-12">
                         {/* Watermark */}
                         <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none overflow-hidden">
                            <h1 className="text-[180px] font-black rotate-[-35deg] uppercase whitespace-nowrap">{shopProfile.name}</h1>
                         </div>

                         <div className="flex justify-between items-start border-b-[16px] border-slate-900 pb-12 mb-12 gap-10 relative z-10">
                            <div className="flex items-center gap-10">
                                {shopProfile.logo ? (
                                  <img src={shopProfile.logo} className="w-40 h-40 object-contain" alt="Logo" />
                                ) : (
                                  <div className="w-40 h-40 bg-slate-900 text-white flex items-center justify-center rounded-[2rem] shadow-2xl">
                                    <Store size={80}/>
                                  </div>
                                )}
                                <div>
                                    <h1 className="text-6xl font-black uppercase tracking-tighter leading-none text-slate-900">{shopProfile.name}</h1>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.6em] mt-4 italic">High-Precision Production Hub</p>
                                    <div className="mt-8 grid grid-cols-1 gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                                        <p className="flex items-center gap-3"><MapPin size={14} className="text-cyan-600"/> {shopProfile.address}</p>
                                        <p className="flex items-center gap-3"><Phone size={14} className="text-cyan-600"/> {shopProfile.phone}</p>
                                        <p className="flex items-center gap-3"><Mail size={14} className="text-cyan-600"/> {shopProfile.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right min-w-[240px]">
                                <h2 className="text-8xl font-black text-slate-100 uppercase select-none tracking-[0.2em] leading-none mb-6">TAX INVOICE</h2>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Document Ref.</p>
                                    <p className="text-3xl font-black font-mono text-slate-900">#{lastInvoice.id.slice(-6).toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Execution Date</p>
                                    <p className="text-lg font-bold text-slate-800">{new Date(lastInvoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                  </div>
                                </div>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-12 mb-20 relative z-10">
                            <div className="bg-slate-50 p-10 rounded-[3rem] border-l-[12px] border-cyan-500 shadow-sm">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-6">Invoiced To</h3>
                                <p className="text-4xl font-black text-slate-900 uppercase leading-tight mb-3">{lastInvoice.customerName}</p>
                                <div className="space-y-2">
                                  <p className="text-base font-bold text-slate-500 flex items-center gap-3"><Phone size={16} className="text-cyan-600"/> {lastInvoice.customerContact || 'Direct Counter Customer'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center items-end text-right px-8">
                                <div className="space-y-6">
                                  <div className="bg-slate-900 px-6 py-3 rounded-2xl shadow-xl">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Billing Channel</p>
                                    <span className="text-white text-base font-black uppercase tracking-[0.3em]">{lastInvoice.paymentMethod} SETTLEMENT</span>
                                  </div>
                                </div>
                            </div>
                         </div>

                         <div className="flex-1 relative z-10">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-4 border-slate-900 text-[12px] font-black uppercase tracking-[0.4em] text-slate-500">
                                        <th className="py-8 pl-6">Production/Service Description</th>
                                        <th className="py-8 text-center w-32">Units</th>
                                        <th className="py-8 text-right w-44">Unit Rate</th>
                                        <th className="py-8 text-right w-52 pr-6">Total Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-lg font-bold text-slate-700">
                                    {lastInvoice.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-8 pl-6">
                                              <p className="uppercase text-slate-900 font-black tracking-tight">{item.name}</p>
                                            </td>
                                            <td className="py-8 text-center text-slate-400 font-mono text-xl">{item.quantity}</td>
                                            <td className="py-8 text-right text-slate-400 font-mono">Rs.{item.price.toFixed(2)}</td>
                                            <td className="py-8 text-right font-black text-slate-900 pr-6 font-mono text-2xl">Rs.{(item.price * item.quantity).toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>

                         <div className="mt-20 flex flex-col sm:flex-row justify-between items-end gap-16 relative z-10">
                            <div className="w-full sm:w-1/2 space-y-10">
                                <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Payment Directives</h4>
                                    <div className="space-y-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
                                        <div className="flex justify-between border-b border-slate-200 pb-3"><span>Bank:</span><span className="text-slate-900 font-black">Commercial Bank</span></div>
                                        <div className="flex justify-between border-b border-slate-200 pb-3"><span>Acc:</span><span className="text-slate-900 font-black">AR PRINTERS</span></div>
                                        <div className="flex justify-between"><span>Number:</span><span className="text-slate-900 font-black font-mono">8002345671</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-[460px] space-y-5 bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute -left-20 -top-20 opacity-[0.03] text-white pointer-events-none">
                                  <ShoppingCart size={300} />
                                </div>
                                
                                <div className="flex justify-between items-center text-[13px] font-black uppercase tracking-[0.3em] text-slate-500">
                                    <span>Gross Aggregate</span>
                                    <span className="font-mono">Rs.{lastInvoice.subtotal.toFixed(0)}</span>
                                </div>
                                {lastInvoice.discount > 0 && (
                                    <div className="flex justify-between items-center text-[13px] font-black uppercase tracking-[0.3em] text-amber-500">
                                        <span>Discount / Credit</span>
                                        <span className="font-mono">- Rs.{lastInvoice.discount.toFixed(0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-10 mt-6 border-t border-slate-800">
                                    <span className="text-3xl font-black uppercase tracking-tighter text-cyan-400">Total Payable</span>
                                    <span className="text-6xl font-black font-mono tracking-tighter">Rs.{lastInvoice.total.toFixed(0)}</span>
                                </div>
                            </div>
                         </div>

                         <div className="mt-32 pt-16 border-t border-slate-100 relative z-10 flex flex-col sm:flex-row justify-between items-center gap-16 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-64 h-1 bg-slate-200 mb-6" />
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Recipient Signature</p>
                            </div>
                            
                            <div className="text-center">
                                <p className="text-3xl font-black text-slate-900 uppercase tracking-[0.5em] mb-4">{shopProfile.footerNote || 'AR PRINTERS'}</p>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[1.2em] italic">Official Tax Clearance</p>
                            </div>

                            <div className="flex flex-col items-center">
                              <div className="w-64 h-1 bg-slate-900 mb-6" />
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">Official Signature</p>
                            </div>
                         </div>
                    </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
