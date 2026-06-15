import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Compass, ShoppingBag, ClipboardList, ChefHat, Bike, 
  User, Wifi, Battery, Menu, Bell, ShieldCheck, RefreshCw,
  Store, LogOut, ArrowLeft, ArrowRight
} from 'lucide-react';
import logoUniBites from '../../assets/logo_unibites.png';

export const Layout = ({ children }) => {
  const { activeRole, setActiveRole, cart, orders, currentStudent, logoutStudent, setShowWelcome } = useApp();
  const [time, setTime] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Actualizar hora simulada de la barra de estado móvil
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      let minutes = date.getMinutes();
      minutes = minutes < 10 ? '0' + minutes : minutes;
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Controladores y eventos de instalación de PWA (Concepto 3)
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = localStorage.getItem('unibites_install_dismissed');
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isDismissed = localStorage.getItem('unibites_install_dismissed');
    if (!isStandalone && !isDismissed) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: Outcome of installation prompt: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      alert("Para instalar UniBites en iOS, abre Safari, presiona 'Compartir' (el icono de la caja con la flecha hacia arriba) y selecciona 'Agregar a Inicio'.");
    }
    setShowInstallBanner(false);
  };

  const handleDismissInstall = () => {
    localStorage.setItem('unibites_install_dismissed', 'true');
    setShowInstallBanner(false);
  };

  // Calcular contadores útiles
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'finalizado_confirmado').length;

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col overflow-hidden">
      
      {/* CABECERA DE LA APLICACIÓN (Top Bar) */}
      <div className="h-16 bg-slate-900/95 backdrop-blur-md border-b border-white/5 px-4 md:px-6 z-30 shrink-0 flex items-center">
        <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={logoUniBites} 
              alt="UniBites Logo" 
              className="w-10 h-10 object-contain drop-shadow-[0_2px_5px_rgba(37,99,235,0.15)]" 
            />
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5 font-sans">
                UniBites
                <span className="text-[9px] bg-slate-800 text-slate-400 font-normal px-1 rounded uppercase tracking-widest">
                  PWA
                </span>
              </h1>
              <p className="text-[9.5px] text-slate-400 -mt-0.5 tracking-wide font-sans">Campus Delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeRole === 'client' && currentStudent && (
              <div 
                onClick={() => setShowNotifications(true)}
                className="relative p-1.5 text-slate-400 hover:text-white cursor-pointer transition-colors mr-1 tap-effect"
              >
                <Bell size={18} />
                {activeOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                    {activeOrdersCount}
                  </span>
                )}
              </div>
            )}
            
            {activeRole === 'restaurant' && (
              <div className="flex items-center gap-1.5 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800 text-secondary-400">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-bold tracking-wider uppercase">Local U</span>
              </div>
            )}

            {activeRole === 'deliverer' && (
              <div className="flex items-center gap-1.5 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900 text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-bold tracking-wider uppercase">Repartidor</span>
              </div>
            )}

            {/* Botón rápido para volver a vista Estudiante desde otros roles */}
            {activeRole !== 'client' && (
              <button 
                onClick={() => {
                  setActiveRole('client');
                  if (!currentStudent) {
                    setShowWelcome(true);
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-755 px-3 py-1.5 rounded-lg border border-slate-750 text-[9px] font-extrabold text-slate-300 uppercase tracking-wide transition-colors tap-effect"
                title="Volver a Vista Estudiante"
              >
                <Compass size={12} className="text-primary-400" />
                Estudiante
              </button>
            )}
            
            {/* Botón de Perfil / Sidebar */}
            <div 
              onClick={() => setIsSidebarOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-750 transition-colors tap-effect"
            >
              <User size={18} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL SCROLLABLE */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 relative flex flex-col w-full">
        <div className="w-full max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-[1200px] mx-auto flex-1 flex flex-col px-4 md:px-8 py-6 transition-all duration-300">
          {children}
        </div>
      </div>

      {/* SIDEBAR DRAWER PREMIUM */}
      {isSidebarOpen && (
        <>
          {/* Fondo opaco del sidebar */}
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 animate-fade-in"
          ></div>
          
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-64 bg-slate-900 border-l border-slate-850 shadow-2xl z-50 flex flex-col p-5 animate-slide-left justify-between">
            <div>
              {/* Cabecera del Sidebar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                    <User size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {currentStudent ? currentStudent.name : 'Invitado'}
                    </h4>
                    <p className="text-[8px] text-slate-550 font-medium truncate max-w-[140px]">
                      {currentStudent ? currentStudent.email : 'sin-sesion@universidad.edu'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-850 text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center tap-effect"
                >
                  ✕
                </button>
              </div>
              
              {/* Listado de Opciones Nativas del Campus */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] text-slate-550 font-extrabold uppercase tracking-wider mb-1 block pl-2">
                  Mi Cuenta
                </span>
                
                <button 
                  onClick={() => {
                    setActiveRole('client');
                    if (!currentStudent) {
                      setShowWelcome(true);
                    }
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left tap-effect ${
                    activeRole === 'client' 
                      ? 'bg-primary-950/40 border border-primary-900/30 text-primary-400' 
                      : 'text-slate-350 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Compass size={14} />
                    Inicio (Estudiante)
                  </span>
                  <ArrowRight size={11} className="opacity-40" />
                </button>
                
                {/* Cambiar a Modo Repartidor (Estilo Switch Llamativo) */}
                {activeRole === 'client' && currentStudent && (
                  <button 
                    onClick={() => {
                      setActiveRole('deliverer');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left tap-effect text-emerald-400 hover:text-emerald-350 hover:bg-emerald-950/20 border border-emerald-900/20 bg-emerald-950/10"
                  >
                    <span className="flex items-center gap-2.5">
                      <Bike size={14} className="animate-bounce-subtle" />
                      Cambiar a Modo Repartidor
                    </span>
                    <ArrowRight size={11} className="opacity-60 animate-pulse" />
                  </button>
                )}

                {/* Volver a Modo Estudiante (Desde el menú lateral del Repartidor) */}
                {activeRole === 'deliverer' && (
                  <button 
                    onClick={() => {
                      setActiveRole('client');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left tap-effect text-primary-400 hover:text-primary-350 hover:bg-primary-950/20 border border-primary-900/20 bg-primary-950/10"
                  >
                    <span className="flex items-center gap-2.5">
                      <Compass size={14} />
                      Volver a Modo Estudiante
                    </span>
                    <ArrowRight size={11} className="opacity-60" />
                  </button>
                )}

                {/* Cerrar Sesión del Estudiante */}
                {currentStudent && (
                  <button 
                    onClick={() => {
                      logoutStudent();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full mt-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-350 hover:bg-slate-850 transition-all text-left tap-effect border border-rose-900/20 bg-rose-950/10"
                  >
                    <LogOut size={14} />
                    Cerrar Sesión Estudiante
                  </button>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-slate-800/80 pt-3 text-center text-[7.5px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
              UniBites v1.2.0 • PWA
            </div>
          </div>
        </>
      )}

      {/* MODAL DE NOTIFICACIONES PREMIUM */}
      {showNotifications && (
        <>
          {/* Overlay de fondo */}
          <div 
            onClick={() => setShowNotifications(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 animate-fade-in"
          ></div>
          
          {/* Contenedor del Modal */}
          <div className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-2xl z-50 flex flex-col gap-4 animate-slide-up max-h-[80%] overflow-y-auto md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-1/2 md:translate-y-1/2 md:rounded-[32px] md:border">
            {/* Indicador de arrastre superior */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-1"></div>
            
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                Notificaciones (2)
              </h3>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Recientes
              </span>
            </div>
            
            {/* Lista de Notificaciones */}
            <div className="flex flex-col gap-3 my-2">
              {/* Notificación 1 */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 flex gap-3 shadow-inner card-hover transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 flex items-center justify-center text-sm shrink-0">
                  🔔
                </div>
                <div>
                  <p className="text-[10px] text-white font-bold leading-normal text-left">
                    Tu pedido ha sido aceptado por el repartidor!
                  </p>
                  <span className="text-[8px] text-slate-550 font-bold block mt-1 uppercase tracking-wide text-left">
                    Hace 2 min
                  </span>
                </div>
              </div>
              
              {/* Notificación 2 */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 flex gap-3 shadow-inner card-hover transition-all">
                <div className="w-8 h-8 rounded-xl bg-primary-950/60 border border-primary-900/40 text-primary-400 flex items-center justify-center text-sm shrink-0">
                  🔔
                </div>
                <div>
                  <p className="text-[10px] text-white font-bold leading-normal text-left">
                    ¡Nuevo local disponible en tu facultad!
                  </p>
                  <span className="text-[8px] text-slate-550 font-bold block mt-1 uppercase tracking-wide text-left">
                    Hace 1 hora
                  </span>
                </div>
              </div>
            </div>
            
            {/* Botón de Cerrar */}
            <button 
              onClick={() => setShowNotifications(false)}
              className="w-full bg-slate-800 hover:bg-slate-750 text-white rounded-xl py-3 text-xs font-bold transition-all tap-effect border border-slate-750 mt-2"
            >
              Cerrar
            </button>
          </div>
        </>
      )}

      {/* BANNER FLOTANTE DE INSTALACIÓN PWA (Concepto 3) */}
      {showInstallBanner && (
        <div className="fixed bottom-20 inset-x-4 md:bottom-6 md:right-6 md:left-auto md:w-96 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-45 animate-slide-up flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <img 
              src={logoUniBites} 
              alt="UniBites Logo" 
              className="w-12 h-12 object-contain drop-shadow-[0_4px_10px_rgba(37,99,235,0.2)] shrink-0" 
            />
            <div className="flex-1">
              <h4 className="text-xs font-extrabold text-white">Instalar UniBites</h4>
              <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                Disfruta de la mejor experiencia de delivery en tu campus agregando la app a tu pantalla de inicio.
              </p>
            </div>
            <button 
              onClick={handleDismissInstall}
              className="text-slate-500 hover:text-white text-xs p-0.5"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={handleDismissInstall}
              className="px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              Quizás luego
            </button>
            <button 
              onClick={handleInstallClick}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-extrabold shadow-md shadow-primary-500/15 transition-colors tap-effect"
            >
              Instalar App
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
