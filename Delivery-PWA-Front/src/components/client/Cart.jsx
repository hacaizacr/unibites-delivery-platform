import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { campusSpots } from '../../data/mockData';
import { ArrowLeft, Trash2, Plus, Minus, MapPin, Clipboard, CheckCircle } from 'lucide-react';

export const Cart = ({ onBack, onOrderPlaced }) => {
  const { cart, updateCartQuantity, clearCart, placeOrder, currentStudent } = useApp();
  const [selectedSpot, setSelectedSpot] = useState(campusSpots[0].name);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [studentName, setStudentName] = useState(
    currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : 'Harold (Estudiante)'
  );
  const [isPlacing, setIsPlacing] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 1.20; // Comisión fija para el estudiante-repartidor
  const finalTotal = cartTotal + deliveryFee;

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setIsPlacing(true);
    
    const res = await placeOrder(selectedSpot, deliveryNotes, studentName);
    setIsPlacing(false);
    if (res && res.success && res.order) {
      onOrderPlaced(res.order.id);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in no-scrollbar">
        <span className="text-5xl mb-4">🛒</span>
        <h3 className="text-sm font-bold text-white mb-1">Tu carrito está vacío</h3>
        <p className="text-[10px] text-slate-500 max-w-[80%] leading-relaxed mb-6">
          Explora los restaurantes universitarios y agrega platos deliciosos a tu orden.
        </p>
        <button 
          onClick={onBack}
          className="bg-primary-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary-500/10 hover:bg-primary-600 transition-all tap-effect"
        >
          Explorar Locales
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 pb-28 animate-fade-in no-scrollbar overflow-y-auto">
      
      {/* Botón Volver */}
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-slate-900/60 hover:bg-slate-800 backdrop-blur-xs border border-white/5 text-white flex items-center justify-center tap-effect"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-sm font-extrabold text-white">Revisar tu Carrito</h2>
          <p className="text-[9px] text-slate-400">Entrega rápida colaborativa dentro de la U</p>
        </div>
      </div>

      {/* Contenedor responsivo en grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Columna izquierda: Productos */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Lista de productos */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Productos Seleccionados
              </span>
              <button 
                onClick={clearCart}
                className="text-[10px] text-slate-505 hover:text-rose-450 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={11} />
                Vaciar todo
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2.5">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-white mb-0.5">{item.name}</h4>
                    <span className="text-[10px] font-bold text-primary-400">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center bg-slate-950 border border-white/5 rounded-xl p-1 shrink-0">
                    <button 
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg text-slate-400 hover:text-white flex items-center justify-center tap-effect hover:bg-slate-900"
                    >
                      <Minus size={12} strokeWidth={2.5} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg text-slate-400 hover:text-white flex items-center justify-center tap-effect hover:bg-slate-900"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: Detalles de Envío y Resumen */}
        <div className="md:col-span-1 flex flex-col gap-5">
          {/* Detalles de Entrega */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4.5 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2">
              Detalles del Envío en Campus
            </h3>
            
            {/* Nombre del estudiante */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <Clipboard size={12} className="text-primary-400" />
                Nombre del Cliente
              </label>
              <input 
                type="text" 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ingresa tu nombre para el repartidor"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500/30 focus:ring-1 focus:ring-primary-500/10 transition-all"
              />
            </div>

            {/* Punto de entrega */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <MapPin size={12} className="text-primary-400" />
                Lugar de Entrega (Campus)
              </label>
              <div className="relative">
                <select
                  value={selectedSpot}
                  onChange={(e) => setSelectedSpot(e.target.value)}
                  className="w-full appearance-none bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500/30 focus:ring-1 focus:ring-primary-500/10 transition-all cursor-pointer"
                >
                  {campusSpots.map(spot => (
                    <option key={spot.id} value={spot.name}>
                      {spot.name} ({spot.floor})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400"></div>
              </div>
            </div>

            {/* Notas adicionales */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400">
                Instrucciones para el Repartidor (Opcional)
              </label>
              <textarea
                rows="2"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ej. De polera verde, sentado al fondo del laboratorio..."
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/30 focus:ring-1 focus:ring-primary-500/10 transition-all resize-none"
              ></textarea>
            </div>
          </div>

          {/* Resumen Financiero */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Subtotal comida</span>
              <span className="font-semibold text-white">${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                Tarifa de envío (Colaborativa)
                <span className="text-[9px] bg-emerald-950 text-emerald-400 font-bold px-1 py-0.5 rounded leading-none">
                  80% Repartidor
                </span>
              </span>
              <span className="font-semibold text-white">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 my-1"></div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-white">Total a pagar (Simulado)</span>
              <span className="font-extrabold text-primary-400 text-base">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Botón de Confirmación */}
          <button 
            onClick={handleConfirmOrder}
            disabled={isPlacing}
            className="w-full bg-primary-500 text-white rounded-2xl py-3.5 text-xs font-bold transition-all shadow-lg shadow-primary-500/10 hover:bg-primary-600 flex items-center justify-center gap-2 tap-effect disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPlacing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enviando pedido al comedor...
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                Confirmar Pedido Universitario
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
