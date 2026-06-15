import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AvailableOrders } from './AvailableOrders';
import { ActiveDelivery } from './ActiveDelivery';
import { 
  Bike, DollarSign, Power, ToggleLeft, ToggleRight,
  ClipboardList, Navigation, Award, User, ShoppingBag, 
  ArrowLeft, Compass
} from 'lucide-react';

export const DelivererDashboard = () => {
  const { 
    orders, currentStudent, setActiveRole,
    toggleDelivererOnline, updateDelivererVehicle 
  } = useApp();

  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'active'

  // Si no está registrado como estudiante, mostrar aviso de bloqueo (por seguridad)
  if (!currentStudent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-3">🔒</span>
        <h3 className="text-sm font-bold text-white mb-1">Acceso Restringido</h3>
        <p className="text-[10px] text-slate-500 max-w-[80%] leading-relaxed mb-5">
          Inicia sesión primero como estudiante con tu correo institucional de la UIDE para habilitar el modo reparto.
        </p>
        <button 
          onClick={() => setActiveRole('client')}
          className="bg-primary-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg tap-effect"
        >
          Ir a Vista Estudiante
        </button>
      </div>
    );
  }

  // Buscar si este estudiante logueado tiene una orden activa aceptada
  const activeOrder = orders.find(o => 
    (o.delivererId === currentStudent.email || o.delivererId === currentStudent.id) && 
    !o.archivado
  );

  // Si acepta una orden, abrir automáticamente la pestaña "Mi Entrega"
  useEffect(() => {
    if (activeOrder) {
      setActiveTab('active');
    }
  }, [activeOrder]);

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 animate-fade-in no-scrollbar overflow-y-auto">
      
      {/* Tarjeta de Perfil del Repartidor (Faceta del Estudiante) */}
      <div className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-4 mb-4 shadow-md flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
              <img 
                src={currentStudent.avatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80"} 
                alt={currentStudent.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white leading-none">
                  {currentStudent.name}
                </h3>
                <span className="text-[7px] bg-slate-950/60 border border-white/5 text-slate-400 font-extrabold px-1 rounded uppercase tracking-wider">
                  Modo Reparto
                </span>
              </div>
              <p className="text-[8px] text-slate-500 font-medium truncate mt-0.5 max-w-[130px]">
                {currentStudent.email}
              </p>
              
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  currentStudent.isOnline ? 'bg-emerald-500 pulse-green' : 'bg-slate-500'
                }`}></span>
                <span className={`text-[8px] font-extrabold uppercase tracking-wider ${
                  currentStudent.isOnline ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {currentStudent.isOnline ? 'Disponible' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>

          {/* Interruptor Disponibilidad Online/Offline */}
          <button 
            onClick={toggleDelivererOnline}
            className="flex items-center gap-1 tap-effect"
          >
            {currentStudent.isOnline ? (
              <ToggleRight size={32} className="text-emerald-400 cursor-pointer" />
            ) : (
              <ToggleLeft size={32} className="text-slate-600 cursor-pointer" />
            )}
          </button>
        </div>

        {/* Desglose de Ganancias */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-1 px-1">
          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold">
            Mis Ganancias Universitarias
          </span>
          <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-0.5">
            <DollarSign size={13} strokeWidth={2.5} />
            {(currentStudent.earnings || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/40 backdrop-blur-xs border border-white/5 p-1 rounded-xl mb-5 shrink-0">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'available'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList size={14} />
          Pedidos Campus
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all relative ${
            activeTab === 'active'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Navigation size={14} />
          Mi Entrega
          {activeOrder && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      {/* Flujo de Conectividad Desconectado */}
      {!currentStudent.isOnline ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center py-14">
          <span className="text-4xl mb-3">😴</span>
          <h3 className="text-sm font-bold text-white mb-1">Estás Desconectado</h3>
          <p className="text-[10px] text-slate-500 max-w-[80%] leading-relaxed mb-5">
            Ponte "Disponible" para empezar a ver los pedidos listos en los comedores y ganar comisiones por entregas.
          </p>
          <button 
            onClick={toggleDelivererOnline}
            className="bg-emerald-500 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 transition-all tap-effect"
          >
            Ponerse Disponible
          </button>
        </div>
      ) : activeTab === 'available' ? (
        <AvailableOrders />
      ) : (
        <ActiveDelivery activeOrder={activeOrder} />
      )}

      {/* Botón flotante para regresar a modo compras */}
      <button 
        onClick={() => setActiveRole('client')}
        className="w-full mt-4 bg-slate-900/60 hover:bg-slate-800 backdrop-blur-xs border border-white/5 text-slate-355 hover:text-white rounded-2xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 tap-effect"
      >
        <Compass size={14} className="text-primary-400 animate-spin-slow" />
        Volver a Modo Estudiante (Compras)
      </button>

    </div>
  );
};
