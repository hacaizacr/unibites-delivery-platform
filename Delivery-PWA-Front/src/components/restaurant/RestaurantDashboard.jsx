import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MenuManager } from './MenuManager';
import { 
  ClipboardList, ChefHat, CheckCircle2, DollarSign, 
  Store, ChevronRight, Clock, MapPin, Play, Check, 
  PlusCircle, LogOut, ArrowRight, ShieldCheck, Lock, User, X
} from 'lucide-react';

export const RestaurantDashboard = () => {
  const { 
    orders, restaurants, changeOrderStatus, 
    activeRestaurantId, loginRestaurant, registerRestaurant, logoutRestaurant,
    fetchRestaurantOrders, archiveOrder
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'menu'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');

  // Campos para login
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Campos para registro
  const [regName, setRegName] = useState('');
  const [regBuilding, setRegBuilding] = useState('');
  const [regEspecialidades, setRegEspecialidades] = useState([]);
  const [regDescription, setRegDescription] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');

  const currentRestaurant = restaurants.find(r => r.id === activeRestaurantId);

  // Carga inicial al activar restaurante (el polling global se encarga del refresco periódico)
  useEffect(() => {
    if (activeRestaurantId && fetchRestaurantOrders) {
      fetchRestaurantOrders(activeRestaurantId);
    }
  }, [activeRestaurantId, fetchRestaurantOrders]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUser || !loginPass) return;

    const res = await loginRestaurant(loginUser, loginPass);
    if (!res.success) {
      setAuthError(res.message);
    } else {
      setLoginUser('');
      setLoginPass('');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!regName || !regBuilding || !regUser || !regPass) return;

    if (regEspecialidades.length === 0) {
      setAuthError('Por favor selecciona al menos una especialidad.');
      return;
    }

    const res = await registerRestaurant(regName, regBuilding, regEspecialidades, regDescription, regUser, regPass);
    if (!res.success) {
      setAuthError(res.message);
    } else {
      setRegName('');
      setRegBuilding('');
      setRegEspecialidades([]);
      setRegDescription('');
      setRegUser('');
      setRegPass('');
      setActiveTab('orders');
    }
  };

  // --- VISTA DE LOGIN Y REGISTRO (Si no ha iniciado sesión) ---
  if (!activeRestaurantId) {
    return (
      <div className="flex-1 flex flex-col p-4 pb-20 items-center justify-center animate-fade-in no-scrollbar overflow-y-auto w-full">
        <div className="w-full max-w-[400px] flex flex-col">
        <div className="text-center my-4 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-secondary-500 to-amber-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-secondary-500/20">
            <Store size={28} />
          </div>
          <h2 className="text-base font-extrabold text-white">Comedores de la U</h2>
          <p className="text-[10px] text-slate-550 mt-1 max-w-[85%] mx-auto leading-relaxed">
            Administración segura de pedidos y gestión del menú en tiempo real.
          </p>
        </div>

        {/* Selector de modo: Iniciar Sesión / Registro */}
        <div className="flex bg-slate-900/40 backdrop-blur-xs border border-white/5 p-1 rounded-xl mb-4 shrink-0">
          <button
            onClick={() => {
              setAuthMode('login');
              setAuthError('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              authMode === 'login'
                ? 'bg-secondary-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setAuthError('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              authMode === 'register'
                ? 'bg-secondary-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Registrar Local
          </button>
        </div>

        {authError && (
          <div className="mb-4 bg-rose-950/40 border border-rose-900 text-rose-450 p-2.5 rounded-xl text-[10px] font-bold text-center animate-pulse">
            ⚠️ {authError}
          </div>
        )}

        {authMode === 'login' ? (
          /* FORMULARIO DE INICIO DE SESIÓN */
          <form onSubmit={handleLoginSubmit} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col gap-4 animate-fade-in">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Lock size={14} className="text-secondary-400" />
              Ingreso de Administrador
            </h3>

            {/* Usuario */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                Usuario del Local
              </label>
              <div className="relative">
                <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Ej. fing (o comedor, ciencias, snacks)"
                  className="w-full bg-slate-955/60 border border-white/5 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-secondary-500 transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Ej. fing123 (o comedor123, etc.)"
                  className="w-full bg-slate-955/60 border border-white/5 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-secondary-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-secondary-500 hover:bg-secondary-600 text-slate-950 rounded-xl py-2.5 text-xs font-extrabold transition-all shadow-md shadow-secondary-500/10 tap-effect"
            >
              Autenticar e Ingresar
            </button>
            
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-[8px] text-slate-500 text-center leading-normal">
              💡 <strong>Credenciales demo para pruebas rápidas:</strong><br />
              El Rincón de la FING: <code>fing</code> / <code>fing123</code><br />
              Comedor Central: <code>comedor</code> / <code>comedor123</code><br />
              Cafetería Ciencias: <code>ciencias</code> / <code>ciencias123</code>
            </div>
          </form>
        ) : (
          /* FORMULARIO DE REGISTRO */
          <form onSubmit={handleRegisterSubmit} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col gap-3 animate-slide-up">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <PlusCircle size={15} className="text-secondary-400" />
              Dar de Alta Local y Administrador
            </h3>

            {/* Nombre del local */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nombre del Local</label>
              <input 
                type="text" required value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ej. Comedor de Medicina"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-secondary-500 transition-all"
              />
            </div>

            {/* Ubicación */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ubicación exacta en Campus</label>
              <input 
                type="text" required value={regBuilding}
                onChange={(e) => setRegBuilding(e.target.value)}
                placeholder="Ej. Pabellón de Salud - Piso 1"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-secondary-500 transition-all"
              />
            </div>

            {/* Especialidades (Selección Múltiple) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Especialidades (Selección Múltiple)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Almuerzos', 'Bebidas', 'Snacks', 'Cafetería'].map(spec => {
                  const isSelected = regEspecialidades.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setRegEspecialidades(regEspecialidades.filter(s => s !== spec));
                        } else {
                          setRegEspecialidades([...regEspecialidades, spec]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected 
                          ? 'bg-secondary-500 text-slate-950 border-secondary-500 shadow-md shadow-secondary-500/10' 
                          : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                      }`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credenciales de Acceso */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-2.5 mt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nuevo Usuario</label>
                <input 
                  type="text" required value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  placeholder="Usuario"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-750 focus:outline-none focus:border-secondary-500 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nueva Contraseña</label>
                <input 
                  type="password" required value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Clave"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-750 focus:outline-none focus:border-secondary-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-secondary-500 hover:bg-secondary-600 text-slate-950 rounded-xl py-2.5 text-xs font-extrabold transition-all shadow-md shadow-secondary-500/10 tap-effect"
            >
              Registrar y Autologin
            </button>
          </form>
        )}
        </div>
      </div>
    );
  }

  // --- VISTA DE DASHBOARD DE COCINA ACTIVO (PRIVADA PARA EL RESTAURANTE AUTENTICADO) ---
  // Filtrar pedidos que pertenecen a este restaurante específico
  const restaurantOrders = orders.filter(o => o.restaurantId === activeRestaurantId);

  // Separar pedidos por columnas de estado (con normalización robusta)
  const pendingOrders = restaurantOrders.filter(o => {
    const status = o.status?.toLowerCase().trim();
    return status === 'pendiente_restaurante' || status === 'pendiente';
  });
  const preparingOrders = restaurantOrders.filter(o => o.status?.toLowerCase().trim() === 'en_preparacion');
  const readyOrders = restaurantOrders.filter(o => {
    const status = o.status?.toLowerCase().trim();
    return status === 'listo_para_retirar' || status === 'listo_para_recoger' || status === 'esperando_entrega_restaurante';
  });
  const transitOrders = restaurantOrders.filter(o => {
    const status = o.status?.toLowerCase().trim();
    return status === 'en_camino' || status === 'entregado_repartidor' || status === 'entregado';
  });
  const completedOrders = restaurantOrders.filter(o => o.status?.toLowerCase().trim() === 'finalizado_confirmado');

  // Calcular ingresos del día
  const dailyEarnings = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 animate-fade-in no-scrollbar overflow-y-auto">
      
      {/* Cabecera del Comedor Autenticado */}
      <div className="mb-4 bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-secondary-950 border border-secondary-800 flex items-center justify-center text-secondary-400">
            <Store size={16} />
          </div>
          <div>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold block mb-0.5">
              Sesión de Local Activa
            </span>
            <span className="text-xs font-bold text-white block -mt-0.5">
              {currentRestaurant?.name}
            </span>
          </div>
        </div>
        
        {/* Botón Salir / Logout */}
        <button
          onClick={logoutRestaurant}
          className="p-1.5 rounded-lg bg-slate-950 border border-white/5 text-slate-400 hover:text-rose-400 transition-colors tap-effect flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider cursor-pointer"
        >
          <LogOut size={12} />
          Salir
        </button>
      </div>

      {/* Grid de Estadísticas (Privadas) */}
      <div className="grid grid-cols-3 gap-2.5 mb-5 shrink-0">
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2.5 shadow-sm text-center">
          <span className="text-[8px] text-slate-500 uppercase tracking-wider block mb-0.5">Mis Ingresos</span>
          <span className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-0.5">
            <DollarSign size={10} />
            {dailyEarnings.toFixed(2)}
          </span>
        </div>
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2.5 shadow-sm text-center">
          <span className="text-[8px] text-slate-500 uppercase tracking-wider block mb-0.5">Activos</span>
          <span className="text-xs font-extrabold text-primary-400">
            {pendingOrders.length + preparingOrders.length + readyOrders.length}
          </span>
        </div>
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2.5 shadow-sm text-center">
          <span className="text-[8px] text-slate-500 uppercase tracking-wider block mb-0.5">Listos</span>
          <span className="text-xs font-extrabold text-amber-400">
            {readyOrders.length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/55 p-1 rounded-xl border border-white/5 mb-5 shrink-0">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-secondary-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList size={14} />
          Pedidos Activos
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-secondary-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ChefHat size={14} />
          Gestionar Menú
        </button>
      </div>

      {/* Contenido Condicional del Tab */}
      {activeTab === 'orders' ? (
        <div className="flex flex-col gap-6 w-full">
          {/* Fila superior: Columnas de Cocina Activas (Kanban) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* SECCIÓN 1: PENDIENTES */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Nuevos Pedidos ({pendingOrders.length})
            </h3>
            
            <div className="flex flex-col gap-3">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <div key={order.id} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{order.id}</span>
                      <span className="text-[9px] bg-rose-950 border border-rose-900 px-2 py-0.5 rounded-md text-rose-400 font-bold uppercase">
                        Pendiente Restaurante
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-450 border-y border-slate-800/60 py-2">
                      <p className="font-extrabold text-slate-300 mb-1">Items:</p>
                      <ul className="list-disc list-inside flex flex-col gap-1 pl-1 text-slate-400">
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity}x {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-primary-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{order.clientSpot.split('-')[0].trim()}</span>
                      </div>
                      <span className="font-bold text-white">${order.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => changeOrderStatus(order.id, 'en_preparacion')}
                        className="flex-1 bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 tap-effect"
                      >
                        <Play size={12} fill="currentColor" />
                        Aceptar y Preparar
                      </button>
                      <button
                        onClick={() => changeOrderStatus(order.id, 'rechazado_restaurante')}
                        className="bg-slate-950 hover:bg-rose-950/40 border border-rose-900/60 text-rose-500 rounded-xl px-3 py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1 tap-effect"
                        title="Rechazar Pedido"
                      >
                        <X size={12} />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <p className="text-[10px] text-slate-650 font-bold">Sin nuevos pedidos pendientes.</p>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: EN PREPARACIÓN */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce-subtle"></span>
              En Preparación ({preparingOrders.length})
            </h3>
            
            <div className="flex flex-col gap-3">
              {preparingOrders.length > 0 ? (
                preparingOrders.map(order => (
                  <div key={order.id} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{order.id}</span>
                      <span className="text-[9px] bg-primary-950 border border-primary-900 px-2 py-0.5 rounded-md text-primary-400 font-bold uppercase animate-pulse">
                        Cocinando
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-450 border-y border-slate-800/60 py-2">
                      <p className="font-extrabold text-slate-300 mb-1">Items:</p>
                      <ul className="list-disc list-inside flex flex-col gap-1 pl-1 text-slate-400">
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity}x {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-primary-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{order.clientSpot.split('-')[0].trim()}</span>
                      </div>
                      <span className="font-bold text-white">${order.subtotal.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => changeOrderStatus(order.id, 'listo_para_retirar')}
                      className="w-full mt-1 bg-secondary-500 hover:bg-secondary-650 text-slate-950 rounded-xl py-2 text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 tap-effect"
                    >
                      <Check size={12} strokeWidth={2.5} />
                      Marcar como Listo para Retiro
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <p className="text-[10px] text-slate-650 font-bold">No hay pedidos cocinándose en este momento.</p>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: LISTOS / HANDSHAKE */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Listos para Retirar ({readyOrders.length})
            </h3>
            
            <div className="flex flex-col gap-3">
              {readyOrders.length > 0 ? (
                readyOrders.map(order => (
                  <div key={order.id} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{order.id}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        order.status?.toLowerCase().trim() === 'esperando_entrega_restaurante'
                          ? 'bg-amber-950 border border-amber-900 text-amber-400 animate-pulse'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}>
                        {order.status?.toLowerCase().trim() === 'esperando_entrega_restaurante' ? 'Solicitado / Arribó' : 'Listo p/ Retiro'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      <p className="font-extrabold text-slate-300">Entregar en:</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{order.clientSpot}</p>
                    </div>

                    {order.delivererName ? (
                      <div className="mt-1 bg-slate-950 border border-slate-850 rounded-xl p-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-emerald-400" />
                          <div>
                            <p className="text-[9px] font-bold text-white leading-none">Repartidor: {order.delivererName}</p>
                            <p className="text-[7px] text-slate-550 font-medium">Estudiante asignado</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 bg-slate-950/60 border border-slate-900/60 rounded-xl p-2 text-center">
                        <p className="text-[8.5px] text-slate-550 font-bold">
                          🕒 Asignando repartidor...
                        </p>
                      </div>
                    )}

                    {(order.status?.toLowerCase().trim() === 'listo_para_retirar' || order.status?.toLowerCase().trim() === 'listo_para_recoger') && (
                      <button
                        disabled={!order.delivererId}
                        onClick={() => changeOrderStatus(order.id, 'en_camino')}
                        className={`w-full mt-2 rounded-xl py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                          order.delivererId
                            ? 'bg-primary-500 hover:bg-primary-600 text-white tap-effect cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Check size={12} strokeWidth={2.5} />
                        {order.delivererId ? 'Entregar Pedido al Repartidor' : 'Esperando Repartidor Colaborativo...'}
                      </button>
                    )}

                    {order.status?.toLowerCase().trim() === 'esperando_entrega_restaurante' && (
                      <button
                        onClick={() => changeOrderStatus(order.id, 'en_camino')}
                        className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl py-2 text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 tap-effect"
                      >
                        <Check size={12} strokeWidth={2.5} />
                        Entregar al Repartidor
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <p className="text-[10px] text-slate-650 font-bold">No hay pedidos listos esperando retiro.</p>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Fila inferior: Tránsito (Radar) e Historial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-850 pt-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              En Tránsito / Pendientes de Confirmación ({transitOrders.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {transitOrders.length > 0 ? (
                transitOrders.map(order => (
                  <div key={order.id} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm opacity-80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{order.id}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        order.status?.toLowerCase().trim() === 'entregado_repartidor' || order.status?.toLowerCase().trim() === 'entregado'
                          ? 'bg-blue-950 border border-blue-900 text-blue-400'
                          : 'bg-emerald-950 border border-emerald-900 text-emerald-400'
                      }`}>
                        {order.status?.toLowerCase().trim() === 'entregado_repartidor' || order.status?.toLowerCase().trim() === 'entregado' ? 'Entregado (Espera Cliente)' : 'En Camino'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-455 border-y border-slate-800/60 py-2">
                      <p className="font-extrabold text-slate-300 mb-1">Detalles:</p>
                      <p className="text-slate-400 text-[10px]">Cliente: <span className="text-slate-300 font-bold">{order.clientName}</span></p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Repartidor: <span className="text-slate-300 font-bold">{order.delivererName} ({order.delivererVehicle})</span></p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Destino: <span className="text-slate-350">{order.clientSpot}</span></p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Total Comida:</span>
                      <span className="font-bold text-white">${order.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 col-span-full">
                  <p className="text-[10px] text-slate-650 font-bold">No hay pedidos en tránsito en este momento.</p>
                </div>
              )}
            </div>
          </div>

          {/* Historial de Pedidos Finalizados */}
          <div className="mt-4 border-t border-slate-850 pt-5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Historial de Pedidos Finalizados ({completedOrders.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedOrders.length > 0 ? (
                completedOrders.map(order => (
                  <div key={order.id} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex flex-col gap-2 shadow-sm opacity-90">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{order.id}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-slate-800 border border-slate-700 text-slate-400">
                        Finalizado
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      <p className="text-slate-450">Cliente: <span className="text-slate-300 font-bold">{order.clientName}</span></p>
                      <p className="text-slate-455 mt-0.5">Total: <span className="text-emerald-400 font-extrabold">${order.total.toFixed(2)}</span></p>
                    </div>

                    <button
                      onClick={async () => {
                        await archiveOrder(order.id);
                      }}
                      className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 tap-effect"
                    >
                      Archivar Pedido
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 col-span-full">
                  <p className="text-[10px] text-slate-650 font-bold">No hay pedidos finalizados para archivar.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <MenuManager restaurantId={activeRestaurantId} />
      )}

    </div>
  );
};
