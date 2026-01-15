
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
    <div className="h-full flex flex-col lg:flex-row gap-6 overflow-hidden">
      
      {/* LEFT COLUMN: ENTRY & SETTLEMENT CART */}
      <div className="w-full lg:w-[65%] flex flex-col space-y-4 no-print overflow-hidden h-full">
        
        {/* Fast Billing Entry */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-cyan-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1.5 bg-cyan-100 rounded-lg"><Keyboard size={16} /></div> Entry Terminal
            </h3>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-6">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Service / Product Description</label>
              <input 
                id="manual-item-input"
                type="text" 
                placeholder="Type service name..." 
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-cyan-500 focus:bg-white outline-none text-sm transition-all shadow-inner" 
                value={manualName} 
                onChange={(e) => setManualName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
              />
            </div>
            <div className="col-span-4 xl:col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 text-center">Qty</label>
              <input 
                type="number" 
                placeholder="1" 
                className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-center focus:border-cyan-500 focus:bg-white outline-none text-sm transition-all shadow-inner" 
                value={manualQty} 
                onChange={(e) => setManualQty(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
              />
            </div>
            <div className="col-span-5 xl:col-span-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Rate (LKR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">Rs.</span>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-center focus:border-cyan-500 focus:bg-white outline-none text-sm transition-all shadow-inner" 
                  value={manualPrice} 
                  onChange={(e) => setManualPrice(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
                />
              </div>
            </div>
            <div className="col-span-3 xl:col-span-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block opacity-0">Add</label>
              <button 
                onClick={addManualItem} 
                className="w-full h-[46px] bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-lg active:scale-95 flex items-center justify-center transition-all group"
              >
                <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* SETTLEMENT CART - RESPONSIVE HEIGHT */}
        <div className="flex-1 bg-white rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col overflow-hidden relative min-h-0">
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Settlement Cart</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Hash size={10} className="text-cyan-600"/> {cart.length} Rows
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setCart([])} 
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 border border-transparent shadow-sm"
            >
              <Trash2 size={14}/> Reset
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/20">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 opacity-20">
                <ShoppingCart size={80} strokeWidth={0.5} className="text-slate-300" />
                <p className="font-black text-slate-400 uppercase tracking-[0.4em] text-sm mt-4">Terminal Standby</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-5 bg-white border border-slate-100 p-5 rounded-[1.5rem] hover:shadow-lg hover:border-cyan-500 transition-all group animate-in slide-in-from-left-4 duration-300 shadow-sm" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-300 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-base text-slate-900 uppercase leading-none truncate group-hover:text-cyan-800 transition-colors tracking-tight">{item.name}</h4>
                    <div className="flex items-center gap-4 mt-1.5">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded">Rate: {item.price.toFixed(0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                    <button 
                      onClick={() => {
                        const newQty = Math.max(0, item.quantity - 1);
                        if(newQty === 0) setCart(cart.filter(i => i.id !== item.id));
                        else setCart(cart.map(i => i.id === item.id ? {...i, quantity: newQty} : i));
                      }} 
                      className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                      <Minus size={16}/>
                    </button>
                    <span className="text-lg font-black min-w-[30px] text-center font-mono tracking-tighter">{item.quantity}</span>
                    <button 
                      onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} 
                      className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-green-500 hover:text-white transition-all active:scale-90"
                    >
                      <Plus size={16}/>
                    </button>
                  </div>
                  
                  <div className="text-right min-w-[100px]">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</p>
                    <p className="font-black text-slate-900 text-xl font-mono tracking-tighter">Rs.{(item.price * item.quantity).toFixed(0)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: IDENTITY & FINANCIAL SETTLEMENT - ADJUSTED FOR FULL SCREEN */}
      <div className="w-full lg:w-[35%] flex flex-col space-y-4 no-print overflow-hidden h-full">
        
        {/* CUSTOMER IDENTITY PANEL */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-5 shrink-0">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                 <UserCircle size={20}/>
               </div>
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Client Identity</h3>
             </div>
             <button 
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-md active:scale-95 flex items-center gap-2"
             >
               <Users size={12}/> Database
             </button>
           </div>

           <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest absolute left-4 top-2 z-10">Client Name</label>
                <input 
                  type="text" 
                  placeholder="Walk-in Customer"
                  className="w-full pl-4 pr-10 pt-5 pb-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-sm"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                {selectedCustomer && (
                  <button onClick={handleClearCustomer} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"><X size={16}/></button>
                )}
              </div>
              <div className="relative">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest absolute left-4 top-2 z-10">Contact Number</label>
                <div className="absolute left-4 bottom-2 text-slate-300">
                  <Smartphone size={14} />
                </div>
                <input 
                  type="text" 
                  placeholder="07XXXXXXXX"
                  className="w-full pl-9 pr-4 pt-5 pb-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-sm"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
           </div>

           {/* Customer Search Overlay */}
           {showCustomerSearch && (
              <div className="absolute top-[320px] left-8 right-8 lg:left-auto lg:right-10 lg:w-[32%] bg-white border-2 border-slate-200 rounded-[1.5rem] shadow-2xl z-[100] overflow-hidden animate-in zoom-in-95 origin-top">
                  <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
                      <Search size={18} className="text-cyan-600"/>
                      <input 
                          autoFocus
                          type="text" 
                          placeholder="Search records..." 
                          className="w-full p-2 bg-transparent border-none rounded-xl text-sm outline-none font-bold"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      <button onClick={() => setShowCustomerSearch(false)} className="p-2 text-slate-400 hover:text-red-500"><X size={20}/></button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {filteredCustomers.length === 0 ? (
                          <div className="p-10 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">No matching records</div>
                      ) : (
                          filteredCustomers.map(c => (
                              <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-4 hover:bg-cyan-50 cursor-pointer border-b last:border-0 transition-all flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black text-white">{c.name.charAt(0)}</div>
                                    <div>
                                      <div className="font-black text-slate-900 uppercase text-[10px]">{c.name}</div>
                                      <div className="text-[9px] text-slate-400 font-bold font-mono">{c.phone}</div>
                                    </div>
                                  </div>
                                  <ArrowRight size={14} className="text-slate-200 group-hover:text-cyan-600 group-hover:translate-x-2 transition-all" />
                              </div>
                          ))
                      )}
                  </div>
              </div>
           )}
        </div>

        {/* FINANCIAL SETTLEMENT PANEL - OPTIMIZED FOR HEIGHT */}
        <div className="flex-1 bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl flex flex-col space-y-4 border-4 border-slate-800 overflow-y-auto custom-scrollbar min-h-0">
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Discount Adjust</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-black text-xs">Rs.</span>
                <input 
                  type="number" 
                  className="w-full pl-9 pr-3 py-3 bg-slate-800/80 border-2 border-slate-700 rounded-xl text-amber-400 font-black text-base outline-none focus:border-amber-500 transition-all shadow-inner" 
                  value={discountAmount} 
                  onChange={(e) => setDiscountAmount(Number(e.target.value))} 
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Cash Tendered</label>
              <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-black text-xs">Rs.</span>
                 <input 
                  type="number" 
                  className="w-full pl-9 pr-3 py-3 bg-slate-800/80 border-2 border-slate-700 rounded-xl text-green-400 font-black text-base outline-none focus:border-green-500 transition-all shadow-inner" 
                  value={paidAmount} 
                  onChange={(e) => setPaidAmount(e.target.value)} 
                  placeholder="0" 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center py-4 border-y border-slate-800/50 space-y-4 shrink-0">
             <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">
                <span>Gross Value</span>
                <span className="font-mono text-slate-400">Rs.{subtotal.toFixed(0)}</span>
             </div>
             <div className="flex justify-between items-end px-1">
                <div>
                  <span className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em] block mb-1">Final Total</span>
                  <span className="text-4xl lg:text-5xl font-black text-white font-mono tracking-tighter">Rs.{total.toFixed(0)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Balance</span>
                  <span className={`text-2xl font-black font-mono tracking-tighter ${change >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                    Rs.{Math.abs(change).toFixed(0)}
                  </span>
                </div>
             </div>
          </div>

          <div className="space-y-4 shrink-0">
             <div className="grid grid-cols-4 gap-2">
               {(['Cash', 'Card', 'Online', 'Credit'] as const).map(m => (
                 <button 
                    key={m} 
                    onClick={() => setPaymentMethod(m)} 
                    className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 shadow-sm ${paymentMethod === m ? (m === 'Credit' ? 'bg-red-600 border-red-400 text-white' : 'bg-cyan-600 border-cyan-400 text-white') : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:border-slate-600'}`}
                >
                    {m === 'Cash' && <Banknote size={16}/>}
                    {m === 'Card' && <CreditCard size={16}/>}
                    {m === 'Online' && <Globe size={16}/>}
                    {m === 'Credit' && <Users size={16}/>}
                    {m}
                </button>
               ))}
             </div>
             
             <button 
                onClick={handleCheckout} 
                disabled={cart.length === 0 || isProcessing} 
                className={`w-full py-5 rounded-[1.5rem] font-black uppercase text-xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden ${paymentMethod === 'Credit' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
             >
                {isProcessing ? (
                  <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"/>
                ) : (
                  <>
                    <CheckCircle size={28} /> 
                    <span>{paymentMethod === 'Credit' ? 'Submit Credit' : 'Submit Sale'}</span>
                  </>
                )}
             </button>
          </div>
        </div>
      </div>

      {/* INVOICE MODAL */}
      {showPreview && lastInvoice && (
        <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto modal-overlay">
             <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl flex flex-col h-[95vh] animate-in zoom-in-95 duration-500">
                <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center no-print bg-slate-50 gap-4 rounded-t-[2rem]">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500 text-white rounded-2xl shadow-lg">
                        <ShieldCheck size={24}/>
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Sale Verified</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ref: {lastInvoice.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md active:scale-95"><Printer size={16}/> Print</button>
                        <button onClick={handleShare} disabled={isSharing} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                          {isSharing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Share2 size={16}/>} Share
                        </button>
                        <button onClick={handleDownloadPDF} className="bg-cyan-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-cyan-700 transition-all shadow-md active:scale-95"><Download size={16}/> PDF</button>
                        <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-all ml-2"><X size={24}/></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 bg-slate-200/50 flex justify-center">
                    <div id="invoice-preview" className="bg-white p-12 w-[210mm] min-h-[297mm] shadow-2xl flex flex-col border border-slate-100 relative mb-8">
                         <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                            <h1 className="text-[140px] font-black rotate-[-35deg] uppercase whitespace-nowrap">{shopProfile.name}</h1>
                         </div>

                         <div className="flex justify-between items-start border-b-[12px] border-slate-900 pb-10 mb-10 gap-8 relative z-10">
                            <div className="flex items-center gap-8">
                                {shopProfile.logo ? (
                                  <img src={shopProfile.logo} className="w-32 h-32 object-contain" alt="Logo" />
                                ) : (
                                  <div className="w-32 h-32 bg-slate-900 text-white flex items-center justify-center rounded-[1.5rem] shadow-xl">
                                    <Store size={64}/>
                                  </div>
                                )}
                                <div>
                                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none text-slate-900">{shopProfile.name}</h1>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.5em] mt-3 italic">Professional Production</p>
                                    <div className="mt-6 grid grid-cols-1 gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                        <p className="flex items-center gap-2"><MapPin size={12} className="text-cyan-600"/> {shopProfile.address}</p>
                                        <p className="flex items-center gap-2"><Phone size={12} className="text-cyan-600"/> {shopProfile.phone}</p>
                                        <p className="flex items-center gap-2"><Mail size={12} className="text-cyan-600"/> {shopProfile.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right min-w-[200px]">
                                <h2 className="text-6xl font-black text-slate-100 uppercase select-none tracking-widest leading-none mb-4">INVOICE</h2>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref Number</p>
                                    <p className="text-xl font-black font-mono text-slate-900">#{lastInvoice.id.slice(-6).toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Date</p>
                                    <p className="text-base font-bold text-slate-800">{new Date(lastInvoice.date).toLocaleDateString('en-GB')}</p>
                                  </div>
                                </div>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-10 mb-16 relative z-10">
                            <div className="bg-slate-50 p-8 rounded-[2rem] border-l-[10px] border-cyan-500 shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Client Detail</h3>
                                <p className="text-2xl font-black text-slate-900 uppercase leading-tight mb-2">{lastInvoice.customerName}</p>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-500 flex items-center gap-2"><Phone size={14}/> {lastInvoice.customerContact || 'Direct Counter'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center items-end text-right px-6">
                                <div className="space-y-4">
                                  <div className="bg-slate-900 px-4 py-2 rounded-xl">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Method</p>
                                    <span className="text-white text-xs font-black uppercase">{lastInvoice.paymentMethod}</span>
                                  </div>
                                </div>
                            </div>
                         </div>

                         <div className="flex-1 relative z-10">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-4 border-slate-900 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
                                        <th className="py-6 pl-4">Description</th>
                                        <th className="py-6 text-center w-24">Qty</th>
                                        <th className="py-6 text-right w-36">Rate</th>
                                        <th className="py-6 text-right w-44 pr-4">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-base font-bold text-slate-700">
                                    {lastInvoice.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-6 pl-4 uppercase text-slate-900 font-black tracking-tight">{item.name}</td>
                                            <td className="py-6 text-center text-slate-400 font-mono">{item.quantity}</td>
                                            <td className="py-6 text-right text-slate-400 font-mono">Rs.{item.price.toFixed(0)}</td>
                                            <td className="py-6 text-right font-black text-slate-900 pr-4 font-mono text-xl">Rs.{(item.price * item.quantity).toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>

                         <div className="mt-16 flex flex-col sm:flex-row justify-between items-end gap-12 relative z-10">
                            <div className="w-full sm:w-1/2 space-y-8">
                                <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Official Payment Details</h4>
                                    <div className="space-y-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                        <div className="flex justify-between border-b border-slate-200 pb-2"><span>Bank:</span><span className="text-slate-900">Commercial Bank</span></div>
                                        <div className="flex justify-between"><span>Number:</span><span className="text-slate-900 font-mono">8002345671</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-[380px] space-y-4 bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                                    <span>Subtotal Aggregate</span>
                                    <span className="font-mono">Rs.{lastInvoice.subtotal.toFixed(0)}</span>
                                </div>
                                {lastInvoice.discount > 0 && (
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-amber-500">
                                        <span>Discount Adjustment</span>
                                        <span className="font-mono">- Rs.{lastInvoice.discount.toFixed(0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-8 mt-4 border-t border-slate-800">
                                    <span className="text-2xl font-black uppercase tracking-tighter text-cyan-400">Net Payable</span>
                                    <span className="text-5xl font-black font-mono tracking-tighter">Rs.{lastInvoice.total.toFixed(0)}</span>
                                </div>
                            </div>
                         </div>

                         <div className="mt-24 pt-10 border-t border-slate-100 relative z-10 flex flex-col sm:flex-row justify-between items-center gap-12 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-48 h-0.5 bg-slate-200 mb-4" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Signature</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-slate-900 uppercase tracking-[0.4em] mb-2">{shopProfile.footerNote || 'AR PRINTERS'}</p>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[1em] italic">Official Confirmation</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-48 h-0.5 bg-slate-900 mb-4" />
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature</p>
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
