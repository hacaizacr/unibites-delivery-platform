import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CHAT_WS, CHAT_API } from '../../services/apiConfig';
import { 
  MapPin, CheckCircle2, ChevronRight, Navigation, 
  MessageSquare, User, Package, Award, Sparkles, Send, X
} from 'lucide-react';

export const ActiveDelivery = ({ activeOrder }) => {
  const { completeOrder, currentStudent, changeOrderStatus, archiveOrder, fetchOrderDetails } = useApp();
  const isPickedUp = activeOrder?.status === 'en_camino' || activeOrder?.status === 'entregado_repartidor';
  const [showCompletionSplash, setShowCompletionSplash] = useState(false);
  const [completedOrderFee, setCompletedOrderFee] = useState(0);
  
  // Estados para el Chat del Repartidor
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'system', text: 'Esperando conexión...', time: '' }
  ]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const wsRef = useRef(null);
  const socketAttemptsRef = useRef(0);

  // 1. CARGAR HISTORIAL DE CHAT DESDE POSTGRESQL (Go Fallback)
  useEffect(() => {
    if (!activeOrder?.id) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${CHAT_API}/api/chat/${activeOrder.id}/historial?token=${currentStudent?.token}`);
        if (res.ok) {
          const history = await res.json();
          const mappedMessages = history.map(msg => ({
            sender: msg.id_remitente === currentStudent?.email ? 'me' : 'client',
            text: msg.contenido,
            time: new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          
          if (mappedMessages.length > 0) {
            setChatMessages([
              { sender: 'system', text: 'Chat iniciado.', time: '' },
              ...mappedMessages
            ]);
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar el historial de chat en el repartidor:", err);
      }
    };

    fetchHistory();
  }, [activeOrder?.id, currentStudent?.token]);

  // 2. CONEXIÓN WEB SOCKET PARA EL REPARTIDOR CON GPS EN SEGUNDO PLANO
  useEffect(() => {
    if (!activeOrder?.id || !currentStudent) return;
    if (activeOrder?.status === 'finalizado_confirmado') return;
    if (socketAttemptsRef.current >= 5) return;

    let isUnmounted = false;
    let ws = null;
    let reconnectTimer = null;
    let watchId = null;

    const connect = () => {
      if (isUnmounted) return;
      if (socketAttemptsRef.current >= 5) {
        console.warn("WebSocket: Límite máximo de reintentos alcanzado (5). Silenciando chat del repartidor.");
        return;
      }

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      const wsUrl = `${CHAT_WS}/chat/${activeOrder.id}/${currentStudent.email}?token=${currentStudent.token}`;
      console.log(`Conectando WebSocket de repartidor (Intento ${socketAttemptsRef.current + 1}/5):`, wsUrl);
      
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) {
            ws.close();
            return;
          }
          console.log("WebSocket de repartidor conectado con éxito.");
          setIsSocketConnected(true);
          socketAttemptsRef.current = 0; // Resetear intentos al conectar con éxito

          // Activar geolocalización oculta si el pedido está en camino
          if (activeOrder.status === 'en_camino' && navigator.geolocation) {
            console.log("Iniciando watchPosition oculto en segundo plano...");
            
            // Emitir coordenadas iniciales de forma inmediata al conectar
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  const payload = {
                    id_pedido: activeOrder.id,
                    id_remitente: currentStudent.email,
                    contenido: "location_update",
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  ws.send(JSON.stringify(payload));
                  console.log("GPS Oculto: Coordenadas iniciales emitidas:", payload);
                }
              },
              (err) => {
                console.warn("GPS Error Inicial:", err);
              },
              { enableHighAccuracy: true }
            );

            watchId = navigator.geolocation.watchPosition(
              (position) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  const payload = {
                    id_pedido: activeOrder.id,
                    id_remitente: currentStudent.email,
                    contenido: "location_update",
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  ws.send(JSON.stringify(payload));
                  console.log("GPS Oculto: Coordenadas emitidas:", payload);
                }
              },
              (err) => {
                console.error("GPS Error:", err);
              },
              {
                enableHighAccuracy: true,
                maximumAge: 3000,
                timeout: 10000
              }
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.id_remitente === 'sistema') {
              setChatMessages(prev => [
                ...prev,
                {
                  sender: 'system',
                  text: msg.contenido.startsWith('estado:')
                    ? `El estado del pedido cambió a: ${msg.contenido.replace('estado:', '')}`
                    : msg.contenido,
                  time: new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
              if (fetchOrderDetails && activeOrder) {
                const searchId = activeOrder.db_id || activeOrder.id;
                fetchOrderDetails(searchId);
              }
              return;
            }
            if (msg.id_remitente !== currentStudent.email) {
              setChatMessages(prev => [
                ...prev,
                {
                  sender: 'client',
                  text: msg.contenido,
                  time: new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
            }
          } catch (err) {
            console.error("Error al recibir mensaje de WebSocket en el repartidor:", err);
          }
        };

        ws.onerror = () => {
          console.warn("Error de conexión en WebSocket del repartidor.");
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsSocketConnected(false);
          console.log("WebSocket de repartidor cerrado.");
          
          socketAttemptsRef.current += 1;
          if (socketAttemptsRef.current < 5) {
            console.log(`Reconectando en 5 segundos... (Intento ${socketAttemptsRef.current + 1}/5)`);
            reconnectTimer = setTimeout(connect, 5000);
          } else {
            console.warn("Límite de reintentos alcanzado. Chat del repartidor en modo offline/historial.");
          }
        };
      } catch (e) {
        console.error("Fallo al inicializar WebSocket del repartidor:", e);
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (ws) {
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (watchId !== null) {
        console.log("Limpiando watchPosition en desmonte...");
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeOrder?.id, currentStudent, activeOrder?.status]);

  // 3. ENVIAR MENSAJE VÍA WEB SOCKET
  const handleSendChat = (e) => {
    e.preventDefault();
    console.log("Enviando mensaje:", chatInput);
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(JSON.stringify({ contenido: chatInput }));

    setChatMessages(prev => [
      ...prev,
      {
        sender: 'me',
        text: chatInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  const handlePickUp = async () => {
    if (changeOrderStatus && activeOrder) {
      await changeOrderStatus(activeOrder.id, 'esperando_entrega_restaurante');
    }
  };

  const handleComplete = () => {
    if (!activeOrder) return;
    
    // Guardar fee para el splash de éxito
    setCompletedOrderFee(activeOrder.deliveryFee);
    setShowCompletionSplash(true);
    
    // Ejecutar finalización en el estado global
    completeOrder(activeOrder.id);
    
    // Apagar splash tras unos segundos
    setTimeout(() => {
      setShowCompletionSplash(false);
    }, 3000);
  };

  // Pantalla de Éxito al Entregar (Ultra Premium)
  if (showCompletionSplash) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 animate-fade-in z-35">
        <div className="w-20 h-20 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 animate-bounce-subtle">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <div className="flex items-center gap-1 bg-emerald-950 border border-emerald-900 px-3 py-0.5 rounded-full text-emerald-400 text-[10px] font-extrabold uppercase mb-2">
          <Sparkles size={11} className="text-amber-400" />
          ¡Entrega Exitosa!
        </div>
        <h3 className="text-base font-extrabold text-white mb-1">¡Buen Trabajo, Compañero!</h3>
        <p className="text-[10px] text-slate-400 max-w-[80%] leading-relaxed mb-4">
          Has completado la entrega de forma segura en el campus. Tu comisión ha sido acreditada.
        </p>
        <div className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 w-44 shadow-inner">
          <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-wider">Acreditado</span>
          <span className="text-lg font-extrabold text-emerald-400">
            +${completedOrderFee.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  // Si no hay orden activa
  if (!activeOrder) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center py-14">
        <span className="text-4xl mb-3">📍</span>
        <h3 className="text-sm font-bold text-white mb-1">Sin entregas activas</h3>
        <p className="text-[10px] text-slate-500 max-w-[80%] leading-relaxed">
          Ve a la pestaña "Pedidos Campus" y acepta una orden para empezar a guiar tu entrega por el campus.
        </p>
      </div>
    );
  }

  if (activeOrder.status?.toLowerCase().trim() === 'finalizado_confirmado') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl animate-fade-in my-10 shadow-inner">
        <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 mb-4 animate-bounce-subtle">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">¡Pedido Finalizado y Confirmado!</h3>
        <p className="text-[10px] text-slate-500 max-w-[85%] leading-relaxed mb-5">
          El cliente ya confirmó la recepción de su comida de forma exitosa. Archiva este pedido para limpiar tu panel de reparto.
        </p>
        <button
          onClick={async () => {
            await archiveOrder(activeOrder.id);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 tap-effect flex items-center gap-1.5"
        >
          <CheckCircle2 size={14} strokeWidth={2.5} />
          Archivar Pedido
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 animate-fade-in">
      
      {/* Resumen de Entrega Activa */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 shadow-md flex items-center justify-between shrink-0">
        <div>
          <span className="text-[8px] text-slate-550 uppercase tracking-widest font-bold block">
            Código Pedido
          </span>
          <h4 className="text-xs font-bold text-white leading-tight">
            {activeOrder.id}
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[8px] text-slate-550 uppercase tracking-widest font-bold block">
            Pago
          </span>
          <span className="text-xs font-extrabold text-emerald-400">
            ${activeOrder.deliveryFee.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Indicador de Pasos del Repartidor */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-md flex flex-col gap-4.5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center text-[10px] font-bold text-emerald-400">
            {isPickedUp ? '2/2' : '1/2'}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">
              {isPickedUp ? 'Paso 2: Entregar al Estudiante' : 'Paso 1: Recoger Comida del Local'}
            </h3>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {isPickedUp ? 'Dirígete al punto de entrega en el campus' : 'Pide los ítems y confirma recogida'}
            </p>
          </div>
        </div>

        {/* Tarjeta Informativa Contextual */}
        {!isPickedUp ? (
          /* PASO 1: RECOGER EN LOCAL */
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-lg shrink-0">🍳</span>
              <div>
                <span className="text-[8px] text-slate-500 font-extrabold uppercase">Local de Origen</span>
                <h4 className="text-xs font-bold text-white leading-tight">{activeOrder.restaurantName}</h4>
                <p className="text-[9px] text-slate-450 mt-0.5">{activeOrder.building}</p>
              </div>
            </div>

            {/* Items a verificar */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5 my-1">
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Package size={10} className="text-primary-400" />
                Artículos a Retirar:
              </span>
              <ul className="flex flex-col gap-1 text-[9.5px] font-semibold text-slate-300 pl-1 list-disc list-inside">
                {activeOrder.items.map((item, idx) => (
                  <li key={idx}>
                    {item.quantity}x {item.name}
                  </li>
                ))}
              </ul>
            </div>

            {activeOrder.status === 'esperando_entrega_restaurante' ? (
              <>
                <div className="w-full bg-slate-950/40 border border-white/5 rounded-xl p-3 text-center my-1">
                  <p className="text-[10px] text-amber-400 font-bold animate-pulse">
                    🕒 Esperando a que el comedor confirme la entrega...
                  </p>
                </div>
                <button
                  disabled
                  className="w-full bg-slate-800 text-slate-500 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-not-allowed mt-1"
                >
                  Esperando Entrega del Local
                </button>
              </>
            ) : (
              <button
                onClick={handlePickUp}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 tap-effect mt-1"
              >
                Ya estoy en el local / Solicitar Pedido
              </button>
            )}
          </div>
        ) : (
          /* PASO 2: ENTREGAR A CLIENTE */
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-lg shrink-0">📍</span>
              <div className="flex-1">
                <span className="text-[8px] text-slate-500 font-extrabold uppercase">Lugar de Entrega</span>
                <h4 className="text-xs font-bold text-white leading-tight">{activeOrder.clientSpot}</h4>
                <p className="text-[9px] text-slate-450 mt-0.5">Cliente: <span className="text-slate-350 font-bold">{activeOrder.clientName}</span></p>
              </div>
            </div>

            {/* Tarjeta de contacto del Cliente */}
            <div className="flex items-center justify-between bg-slate-950/40 border border-white/5 rounded-xl p-2.5 my-1">
              <div>
                <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wide block mb-0.5">
                  Contacto del Cliente
                </span>
                <span className="text-[10px] text-slate-300 font-bold">
                  {activeOrder.clientName}
                </span>
              </div>
              <a
                href={`tel:${activeOrder.clientPhone || '0987654321'}`}
                className="bg-primary-950 hover:bg-primary-900 border border-primary-900/40 rounded-xl px-2.5 py-1.5 text-[9px] font-extrabold text-primary-400 flex items-center gap-1 tap-effect transition-colors"
              >
                <span>📞</span>
                <span>Llamar Cliente: {activeOrder.clientPhone || '0987654321'}</span>
              </a>
            </div>

            {activeOrder.clientNotes && (
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5 my-1">
                <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wide block mb-1">
                  Notas de Entrega del Compañero:
                </span>
                <p className="text-[9.5px] text-primary-200 italic leading-snug">
                  "{activeOrder.clientNotes}"
                </p>
              </div>
            )}

            {/* SUGERENCIA DE INSTRUCCIONES DE NAVEGACIÓN CAMPUS */}
            <div className="border-t border-slate-850 pt-2.5 mt-1">
              <span className="text-[8px] text-slate-550 font-extrabold uppercase tracking-wider block mb-1">
                Sugerencia de Ruta Universitaria:
              </span>
              <p className="text-[9px] text-slate-400 leading-relaxed font-medium mb-3">
                🚶 {activeOrder.sugerenciaRuta || activeOrder.sugerencia_ruta || "Avanzar al destino especificado y coordinar entrega con el estudiante."}
              </p>
            </div>

            {activeOrder.status?.toLowerCase().trim() === 'entregado_repartidor' ? (
              <div className="w-full bg-slate-950/40 border border-white/5 rounded-xl p-3 text-center my-1">
                <p className="text-[10px] text-emerald-400 font-bold animate-pulse">
                  🕒 Entrega reportada. Esperando confirmación del cliente...
                </p>
              </div>
            ) : (
              <button
                onClick={handleComplete}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 tap-effect mt-1.5"
              >
                <CheckCircle2 size={13} strokeWidth={2.5} />
                Confirmar Entrega al Estudiante
              </button>
            )}
          </div>
        )}
      </div>

      {/* Accesos rápidos e interactividad simulada */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 shadow-md flex mt-auto shrink-0">
        <button 
          onClick={() => setIsChatOpen(true)}
          className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-xl py-2.5 flex items-center justify-center gap-2 tap-effect transition-colors text-slate-350 hover:text-white"
        >
          <MessageSquare size={14} className="text-primary-400" />
          <span className="text-[10px] font-bold">Chatear con Cliente</span>
        </button>
      </div>

      {/* MODAL DE CHAT CON CLIENTE */}
      {isChatOpen && (
        <>
          {/* Fondo opaco con blur */}
          <div 
            onClick={() => setIsChatOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 animate-fade-in"
          ></div>
          
          {/* Contenedor del Modal */}
          <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-white/5 rounded-t-[32px] p-5 shadow-2xl z-50 flex flex-col h-[70%] md:h-[60%] md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-1/2 md:translate-y-1/2 md:rounded-[32px] md:border md:border-white/5 animate-slide-up">
            {/* Indicador de arrastre */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2 shrink-0"></div>
            
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2 shrink-0">
              <div>
                <span className="text-[8px] bg-primary-950 border border-primary-900/60 px-1.5 py-0.5 rounded text-primary-400 font-extrabold uppercase tracking-wide">
                  Chat de Entrega
                </span>
                <h3 className="text-xs font-bold text-white leading-tight mt-0.5">
                  Chat con: {activeOrder?.clientName || 'Cliente'}
                </h3>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-850 text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center tap-effect"
              >
                <X size={12} />
              </button>
            </div>
            
            {/* Historial de Mensajes */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-2 flex flex-col gap-2.5 bg-slate-950/30 p-3 rounded-2xl border border-slate-950/20 my-1">
              {chatMessages.map((msg, index) => {
                let bubbleClass = 'bg-slate-800 text-slate-300 rounded-2xl rounded-tl-none self-start';
                let senderLabel = activeOrder?.clientName || 'Cliente';

                if (msg.sender === 'me') {
                  bubbleClass = 'bg-primary-500 text-white rounded-2xl rounded-tr-none self-end';
                  senderLabel = 'Tú (Repartidor)';
                } else if (msg.sender === 'system') {
                  bubbleClass = 'bg-slate-900 text-slate-550 text-center mx-auto text-[9px] py-1 border border-slate-850';
                  senderLabel = 'Sistema';
                }

                return (
                  <div key={index} className={`max-w-[85%] p-2.5 text-[10px] flex flex-col ${bubbleClass}`}>
                    {msg.sender !== 'system' && (
                      <span className="text-[7.5px] font-extrabold opacity-60 mb-0.5 uppercase tracking-wide text-left">
                        {senderLabel}
                      </span>
                    )}
                    <p className="leading-snug text-left">{msg.text}</p>
                    <span className="text-[6.5px] text-right mt-1 opacity-70">
                      {msg.time}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Input y Botón de Enviar */}
            <form 
              onSubmit={handleSendChat}
              className="flex gap-2 pt-2 border-t border-slate-800/80 mt-2 shrink-0"
            >
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  activeOrder.status !== 'en_camino' 
                    ? "El chat se habilitará cuando inicies el camino..." 
                    : !isSocketConnected 
                      ? "Chat desconectado / Conectando..." 
                      : "Escribe un mensaje..."
                }
                disabled={activeOrder.status !== 'en_camino' || !isSocketConnected}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all disabled:opacity-40"
              />
              <button 
                type="submit"
                onClick={handleSendChat}
                disabled={activeOrder.status !== 'en_camino' || !isSocketConnected || !chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-slate-800 text-white disabled:text-slate-650 flex items-center justify-center tap-effect transition-all"
              >
                <Send size={13} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </>
      )}

    </div>
  );
};
