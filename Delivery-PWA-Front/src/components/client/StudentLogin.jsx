import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Mail, Lock, ShieldCheck, ArrowRight, ArrowLeft, Phone } from 'lucide-react';
import logoUniBites from '../../assets/logo_unibites.png';

export const StudentLogin = () => {
  const { loginStudent, registerStudent, setShowWelcome } = useApp();
  
  // Vista activa: true para Iniciar Sesión, false para Registro
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Campos del formulario
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  // Mensaje de error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isLoginView) {
      // Flujo de Inicio de Sesión
      if (!email.trim() || !password) {
        setErrorMsg('Por favor completa todos los campos.');
        return;
      }

      const res = await loginStudent(email, password);
      if (!res.success) {
        setErrorMsg(res.message);
      }
    } else {
      // Flujo de Registro
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !phone.trim()) {
        setErrorMsg('Por favor completa todos los campos.');
        return;
      }

      if (password.length < 6) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const res = await registerStudent(firstName, lastName, email, password, phone);
      if (!res.success) {
        setErrorMsg(res.message);
      }
    }
  };

  const handleToggleView = () => {
    setIsLoginView(!isLoginView);
    setErrorMsg('');
  };

  return (
    <div className="flex-1 flex flex-col p-6 justify-center items-center animate-fade-in no-scrollbar overflow-y-auto relative w-full">
      <div className="w-full max-w-[400px] lg:max-w-[650px] flex flex-col justify-center relative">
      
      {/* Botón Volver */}
      <button 
        onClick={() => setShowWelcome(true)}
        className="absolute top-4 left-4 bg-slate-900/60 hover:bg-slate-800 backdrop-blur-xs border border-white/5 text-slate-400 hover:text-white rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 text-[9px] lg:text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 tap-effect z-10 cursor-pointer"
      >
        <ArrowLeft size={11} className="lg:scale-110" />
        Volver
      </button>
      
      {/* Logo e Introducción */}
      <div className="text-center mb-6 lg:mb-10 shrink-0 mt-6 lg:mt-12">
        <div className="flex items-center justify-center mb-4 lg:mb-6">
          <img 
            src={logoUniBites} 
            alt="UniBites Logo" 
            className="w-20 h-20 lg:w-24 lg:h-24 object-contain drop-shadow-[0_4px_8px_rgba(37,99,235,0.15)]" 
          />
        </div>
        <h2 className="text-xl lg:text-3xl font-extrabold text-white">Bienvenido a UniBites</h2>
        <p className="text-xs lg:text-sm text-slate-500 mt-1 lg:mt-3 max-w-[85%] mx-auto leading-relaxed">
          Economía colaborativa para el delivery de alimentos dentro del campus universitario.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-3xl p-5 lg:p-8 shadow-xl flex flex-col gap-4 lg:gap-6">
        <h3 className="text-xs lg:text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2 lg:pb-3.5 flex items-center gap-1.5 lg:gap-2.5">
          <ShieldCheck size={15} className="text-primary-455 lg:scale-125" />
          {isLoginView ? 'Iniciar Sesión Estudiante' : 'Registrar Nuevo Estudiante'}
        </h3>

        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-900 text-rose-455 p-2.5 lg:p-3.5 rounded-xl text-[10px] lg:text-xs font-bold text-center animate-pulse">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Campos adicionales de Registro */}
        {!isLoginView && (
          <div className="flex flex-col gap-3 lg:gap-4.5 animate-fade-in">
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {/* Nombre */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wide">Nombre</label>
                <div className="relative">
                  <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550 lg:scale-125 lg:left-4" />
                  <input 
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Harold"
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl pl-8 lg:pl-11 pr-3 py-2 lg:py-3 text-xs lg:text-sm text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>

              {/* Apellido */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wide">Apellido</label>
                <div className="relative">
                  <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550 lg:scale-125 lg:left-4" />
                  <input 
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Uribe"
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl pl-8 lg:pl-11 pr-3 py-2 lg:py-3 text-xs lg:text-sm text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wide">Número de Teléfono</label>
              <div className="relative">
                <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550 lg:scale-125 lg:left-4" />
                <input 
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 0999999999"
                  className="w-full bg-slate-950/60 border border-white/5 rounded-xl pl-8 lg:pl-11 pr-3 py-2 lg:py-3 text-xs lg:text-sm text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Correo Institucional (Común para ambos) */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Correo Institucional (@uide.edu.ec)
          </label>
          <div className="relative">
            <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550 lg:scale-125 lg:left-4" />
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej. harold@uide.edu.ec"
              className="w-full bg-slate-950/60 border border-white/5 rounded-xl pl-8 lg:pl-11 pr-3 py-2 lg:py-3 text-xs lg:text-sm text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Contraseña (Común para ambos) */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Contraseña
          </label>
          <div className="relative">
            <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-555 lg:scale-125 lg:left-4" />
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950/60 border border-white/5 rounded-xl pl-8 lg:pl-11 pr-3 py-2 lg:py-3 text-xs lg:text-sm text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Botón Submit */}
        <button
          type="submit"
          className="w-full mt-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-2.5 lg:py-3.5 text-xs lg:text-sm font-bold transition-all shadow-md shadow-primary-500/10 tap-effect flex items-center justify-center gap-1.5 lg:gap-2.5 cursor-pointer"
        >
          {isLoginView ? 'Iniciar Sesión' : 'Crear mi Cuenta'}
          <ArrowRight size={13} className="lg:scale-125" />
        </button>

        {/* Enlace alternativo */}
        <button
          type="button"
          onClick={handleToggleView}
          className="text-[10px] lg:text-xs text-primary-400 hover:text-primary-350 font-bold transition-colors text-center mt-1 underline decoration-dotted cursor-pointer"
        >
          {isLoginView 
            ? '¿No tienes una cuenta aún? Regístrate aquí' 
            : '¿Ya tienes cuenta? Inicia sesión aquí'}
        </button>

        <div className="bg-slate-950/40 p-2.5 lg:p-4 rounded-xl border border-white/5 text-[8px] lg:text-[10px] text-slate-500 text-center leading-normal">
          💡 **Validación Institucional**: Para resguardar la seguridad dentro de la universidad, el acceso requiere obligatoriamente tu dirección de correo institucional terminada en <code>@uide.edu.ec</code>.
        </div>
      </form>
      </div>
    </div>
  );
};
