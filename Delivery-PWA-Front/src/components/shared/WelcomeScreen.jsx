import React from 'react';
import { useApp } from '../../context/AppContext';
import { GraduationCap, Store, ArrowRight, Sparkles } from 'lucide-react';
import logoUniBites from '../../assets/logo_unibites.png';

export const WelcomeScreen = () => {
  const { setActiveRole, setShowWelcome } = useApp();

  const handleStudentAccess = () => {
    setActiveRole('client');
    setShowWelcome(false);
  };

  const handleRestaurantAccess = () => {
    setActiveRole('restaurant');
    setShowWelcome(false);
  };

  return (
    <div className="flex-1 flex flex-col p-6 justify-center items-center animate-fade-in no-scrollbar overflow-y-auto w-full">
      <div className="w-full max-w-[400px] lg:max-w-[650px] flex flex-col justify-center">
        {/* Header Premium */}
        <div className="text-center mb-8 lg:mb-12 shrink-0">
          <div className="flex items-center justify-center mb-4 lg:mb-6">
            <img 
              src={logoUniBites} 
              alt="UniBites Logo" 
              className="w-28 h-28 lg:w-32 lg:h-32 object-contain drop-shadow-[0_4px_10px_rgba(37,99,235,0.2)] animate-bounce-subtle" 
            />
          </div>
          <h2 className="text-xl lg:text-3xl font-black text-white tracking-tight">UniBites</h2>
          <div className="flex items-center justify-center gap-1 mt-1.5 lg:mt-2.5">
            <span className="h-px w-6 lg:w-10 bg-slate-800"></span>
            <span className="text-[9px] lg:text-[11px] text-primary-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={9} className="text-amber-400 lg:scale-125" />
              Campus Delivery
            </span>
            <span className="h-px w-6 lg:w-10 bg-slate-800"></span>
          </div>
          <p className="text-[10px] lg:text-sm text-slate-500 mt-2 lg:mt-4 max-w-[85%] mx-auto leading-relaxed">
            La red colaborativa exclusiva para estudiantes y comedores de la UIDE.
          </p>
        </div>

        {/* Opciones de Acceso */}
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Opción 1: Estudiante */}
          <button
            onClick={handleStudentAccess}
            className="group text-left bg-slate-900/40 backdrop-blur-xs border border-white/5 hover:border-primary-500/30 rounded-3xl p-5 lg:p-7 shadow-lg transition-all duration-300 card-hover flex items-center justify-between gap-4 lg:gap-6 cursor-pointer hover:shadow-primary-500/5"
          >
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-primary-500/10 shrink-0">
                <GraduationCap size={22} className="lg:scale-125" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-bold text-white group-hover:text-primary-400 transition-colors">
                  Ingreso de Estudiante
                </h3>
                <p className="text-[9px] lg:text-xs text-slate-550 mt-0.5 lg:mt-1.5 leading-relaxed max-w-[180px] lg:max-w-[350px]">
                  Ordena comida, haz seguimiento en tiempo real y activa el modo repartidor.
                </p>
              </div>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-950/60 border border-white/5 flex items-center justify-center text-slate-450 group-hover:text-white group-hover:border-primary-500/30 transition-all shrink-0">
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform lg:scale-125" />
            </div>
          </button>

          {/* Opción 2: Restaurante */}
          <button
            onClick={handleRestaurantAccess}
            className="group text-left bg-slate-900/40 backdrop-blur-xs border border-white/5 hover:border-secondary-500/30 rounded-3xl p-5 lg:p-7 shadow-lg transition-all duration-300 card-hover flex items-center justify-between gap-4 lg:gap-6 cursor-pointer hover:shadow-secondary-500/5"
          >
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl bg-gradient-to-tr from-secondary-500 to-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-secondary-500/10 shrink-0">
                <Store size={22} className="lg:scale-125" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-bold text-white group-hover:text-secondary-400 transition-colors">
                  Acceso de Restaurante
                </h3>
                <p className="text-[9px] lg:text-xs text-slate-550 mt-0.5 lg:mt-1.5 leading-relaxed max-w-[180px] lg:max-w-[350px]">
                  Administra tu menú, controla pedidos activos y visualiza tus ingresos del día.
                </p>
              </div>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-950/60 border border-white/5 flex items-center justify-center text-slate-450 group-hover:text-white group-hover:border-secondary-500/30 transition-all shrink-0">
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform lg:scale-125" />
            </div>
          </button>
        </div>

        {/* Footer / Nota de Seguridad */}
        <div className="mt-8 lg:mt-12 text-center bg-slate-950/40 border border-white/5 rounded-2xl p-3 lg:p-4 shrink-0">
          <p className="text-[8px] lg:text-xs text-slate-550 leading-normal font-medium">
            🔐 Acceso exclusivo para la comunidad universitaria de la <strong>UIDE</strong>. Se requiere validación de credenciales institucionales.
          </p>
        </div>
      </div>
    </div>
  );
};
