import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CHAT_WS, CHAT_API } from '../../services/apiConfig';
import { 
  ArrowLeft, Clock, MapPin, Bike, User, 
  MessageSquare, Send, RefreshCw, CheckCircle2, ShieldAlert, Star
} from 'lucide-react';

const CAMPUS_UIDE_CENTER = [-0.2114, -78.4905];

export const OrderTracking = ({ orderId, onBack }) => {
  const { orders, currentStudent, fetchOrderDetails, changeOrderStatus, archiveOrder, rateRestaurant } = useApp();
  const order = orders.find(o => o.id === orderId || o.db_id === orderId);

  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'system', text: 'Pedido registrado con éxito.', time: 'Hace unos instantes' }
  ]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Estados y Refs para Geolocalización y Mapa Leaflet
  const [repartidorCoords, setRepartidorCoords] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const delivererMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  
  const wsRef = useRef(null);
  const socketAttemptsRef = useRef(0);

  useEffect(() => {
    if (order && (order.status === 'finalizado_confirmado' || order.status === 'entregado_repartidor')) {
      const rated = localStorage.getItem(`rated_order_${orderId}`);
      if (!rated) {
        setShowRatingModal(true);
      }
    }
  }, [order?.status, orderId]);

  // 1. CARGAR HISTORIAL DE CHAT DESDE LA BASE DE DATOS DE POSTGRES (Fallback)
  useEffect(() => {
    if (!orderId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${CHAT_API}/api/chat/${orderId}/historial?token=${currentStudent?.token}`);
        if (res.ok) {
          const history = await res.json();
          const mappedMessages = history.map(msg => ({
            sender: msg.id_remitente === currentStudent?.email ? 'client' : 'deliverer',
            text: msg.contenido,
            time: new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          
          if (mappedMessages.length > 0) {
            setChatMessages([
              { sender: 'system', text: 'Historial de chat recuperado.', time: '' },
              ...mappedMessages
            ]);
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar el historial de chat del servidor de Go:", err);
      }
    };

    fetchHistory();
  }, [orderId, currentStudent?.token]);

  // Carga inicial del estado del pedido (el polling global se encarga de mantenerlo al día)
  useEffect(() => {
    if (!orderId || !fetchOrderDetails) return;
    const currentOrder = orders.find(o => o.id === orderId || o.db_id === orderId);
    
    // Si ya lo tenemos en la lista local, dejamos que el polling global o websocket lo actualice,
    // evitando llamadas redundantes desde este componente.
    if (currentOrder) return;

    fetchOrderDetails(orderId).then((res) => {
      if (!res) {
        console.warn("Orden no encontrada al cargar detalles. Redirigiendo...");
        onBack();
      }
    }).catch((err) => {
      console.error("Error al cargar detalles del pedido:", err);
      onBack();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, fetchOrderDetails, onBack]);

  // 2. CONEXIÓN WEB SOCKET EN TIEMPO REAL (Go Chat - Puerto 8003)
  useEffect(() => {
    // Guardia de conexión: No conectar si no hay ID, estudiante o repartidor asignado
    if (!orderId || !currentStudent || !order?.delivererId) return;
    if (order?.status === 'finalizado_confirmado') return;
    if (socketAttemptsRef.current >= 5) return;

    let isUnmounted = false;
    let ws = null;
    let reconnectTimer = null;

    const connect = () => {
      if (isUnmounted) return;
      if (socketAttemptsRef.current >= 5) {
        console.warn("WebSocket: Límite máximo de reintentos alcanzado (5). Silenciando chat.");
        return;
      }

      const wsUrl = `${CHAT_WS}/chat/${orderId}/${currentStudent.email}?token=${currentStudent.token}`;
      console.log(`Conectando WebSocket de cliente (Intento ${socketAttemptsRef.current + 1}/5):`, wsUrl);
      
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) {
            ws.close();
            return;
          }
          console.log("WebSocket de cliente conectado con éxito.");
          setIsSocketConnected(true);
          socketAttemptsRef.current = 0; // Resetear intentos al conectar con éxito
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            // Interceptar actualización de geolocalización
            if (msg.lat !== undefined && msg.lng !== undefined && msg.lat !== 0 && msg.lng !== 0) {
              setRepartidorCoords({ lat: msg.lat, lng: msg.lng });
              return;
            }

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
              if (fetchOrderDetails && order) {
                const searchId = order.db_id || order.id;
                fetchOrderDetails(searchId);
              }
              return;
            }
            if (msg.id_remitente !== currentStudent.email) {
              setChatMessages(prev => [
                ...prev,
                {
                  sender: 'deliverer',
                  text: msg.contenido,
                  time: new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
            }
          } catch (err) {
            console.error("Error al procesar mensaje de chat de WebSocket:", err);
          }
        };

        ws.onerror = () => {
          console.warn("Error de conexión en WebSocket de chat.");
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsSocketConnected(false);
          console.log("WebSocket de cliente cerrado.");
          
          socketAttemptsRef.current += 1;
          if (socketAttemptsRef.current < 5) {
            console.log(`Reconectando en 5 segundos... (Intento ${socketAttemptsRef.current + 1}/5)`);
            reconnectTimer = setTimeout(connect, 5000);
          } else {
            console.warn("Límite de reintentos alcanzado. Chat en modo offline/historial.");
          }
        };
      } catch (e) {
        console.error("Fallo al inicializar WebSocket:", e);
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
    };
  }, [orderId, currentStudent, order?.delivererId, order?.status]);

  // Sincronizar coords y order con ref para evitar clausuras obsoletas en el callback del mapa
  const repartidorCoordsRef = useRef(repartidorCoords);
  useEffect(() => {
    repartidorCoordsRef.current = repartidorCoords;
  }, [repartidorCoords]);

  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // 2.1 INICIALIZAR Y GESTIONAR MAPA LEAFLET DE CLIENTE (en_camino)
  useEffect(() => {
    let checkInterval = null;

    const initMap = () => {
      // Si el pedido no está en camino, destruir el mapa si existía
      if (orderRef.current?.status !== 'en_camino') {
        if (mapInstanceRef.current) {
          console.log("Limpiando mapa de Leaflet porque el pedido no está en camino...");
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          delivererMarkerRef.current = null;
          destinationMarkerRef.current = null;
        }
        return false;
      }

      // Si el mapa ya está inicializado o no hay contenedor en el DOM, no hacer nada
      if (!window.L || mapInstanceRef.current || !mapRef.current) {
        return false;
      }

      const L = window.L;
      console.log("Inicializando mapa de Leaflet en OrderTracking (vacío)...");
      
      const map = L.map(mapRef.current, {
        center: CAMPUS_UIDE_CENTER,
        zoom: 16,
        zoomControl: false
      });

      // Capa de mapa oscura premium (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
      }).addTo(map);

      // Iconos personalizados con TailwindCSS
      const destinationIcon = L.divIcon({
        className: '',
        html: `<div class="w-8 h-8 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-white text-xs shadow-lg shadow-rose-500/55 animate-pulse">🎓</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const delivererIcon = L.divIcon({
        className: '',
        html: `<div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs shadow-lg shadow-emerald-500/55">🚴</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      // Marcador de destino
      const destMarker = L.marker(CAMPUS_UIDE_CENTER, { icon: destinationIcon })
        .addTo(map)
        .bindPopup(`<strong class="text-slate-955">Tu Punto de Entrega</strong><br/><span class="text-slate-700 text-[10px]">${orderRef.current?.clientSpot || 'Campus UIDE'}</span>`)
        .openPopup();

      // Marcador del repartidor (inicialmente offset un poco si no hay GPS aún)
      const startPos = repartidorCoordsRef.current ? [repartidorCoordsRef.current.lat, repartidorCoordsRef.current.lng] : [-0.2125, -78.4915];
      const delMarker = L.marker(startPos, { icon: delivererIcon })
        .addTo(map)
        .bindPopup(`<strong class="text-slate-955">Repartidor Colaborativo</strong>`);

      mapInstanceRef.current = map;
      destinationMarkerRef.current = destMarker;
      delivererMarkerRef.current = delMarker;

      const bounds = L.latLngBounds([CAMPUS_UIDE_CENTER, startPos]);
      map.fitBounds(bounds, { padding: [40, 40] });

      return true;
    };

    // Intentar inicializar inmediatamente
    initMap();

    // Establecer un intervalo de monitoreo para inicializar o destruir según el estado cambie dinámicamente
    checkInterval = setInterval(() => {
      initMap();
    }, 1000);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (mapInstanceRef.current) {
        console.log("Limpiando mapa de Leaflet en desmonte...");
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        delivererMarkerRef.current = null;
        destinationMarkerRef.current = null;
      }
    };
  }, []);

  // Actualizar marcador cuando cambie repartidorCoords
  useEffect(() => {
    if (mapInstanceRef.current && delivererMarkerRef.current && repartidorCoords) {
      const L = window.L;
      const newPos = [repartidorCoords.lat, repartidorCoords.lng];
      delivererMarkerRef.current.setLatLng(newPos);

      // Reajustar límites de forma suave
      const bounds = L.latLngBounds([CAMPUS_UIDE_CENTER, newPos]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [repartidorCoords]);

  // 3. ENVIAR MENSAJE A TRAVÉS DE WEBSOCKET
  const handleSendMessage = (e) => {
    e.preventDefault();
    console.log("Enviando mensaje:", inputText);
    if (!inputText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Enviamos el payload al servidor de Go
    const payload = {
      contenido: inputText
    };
    wsRef.current.send(JSON.stringify(payload));

    // Agregar localmente a la UI para retroalimentación instantánea
    setChatMessages(prev => [
      ...prev,
      {
        sender: 'client',
        text: inputText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputText('');
  };

  if (!order || isArchived) {
    if (isArchived) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 min-h-[300px]">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 mb-4 animate-bounce-subtle mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">¡Pedido Archivado con Éxito!</h3>
          <p className="text-[10px] text-slate-500 max-w-[85%] leading-relaxed mx-auto">
            Redireccionando al panel principal...
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <ShieldAlert size={48} className="text-rose-500 mb-3" />
        <h3 className="text-sm font-bold text-white">Orden no encontrada</h3>
        <button onClick={onBack} className="mt-4 text-primary-500 font-bold text-xs flex items-center gap-1.5 justify-center">
          <ArrowLeft size={14} /> Volver a Locales
        </button>
      </div>
    );
  }

  // Estructura de estados
  const states = [
    { key: 'pendiente_restaurante', label: 'Recibido', desc: 'Esperando confirmación del comedor' },
    { key: 'en_preparacion', label: 'En Preparación', desc: 'Cocinando tu pedido con cariño' },
    { key: 'listo_para_retirar', label: 'Listo para Retirar', desc: 'Buscando estudiante-repartidor' },
    { key: 'en_camino', label: 'En Camino', desc: 'Repartidor cruzando el campus' },
    { key: 'entregado_repartidor', label: 'Entregado', desc: 'Repartidor reporta entrega' },
    { key: 'finalizado_confirmado', label: 'Finalizado', desc: '¡Disfruta tu comida universitaria!' }
  ];

  const currentStatusIndex = states.findIndex(s => s.key === order.status);

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 animate-fade-in no-scrollbar overflow-y-auto">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 backdrop-blur-xs border border-white/5 text-white flex items-center justify-center tap-effect"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">{order.id}</h2>
            <p className="text-[9px] text-slate-500">{order.restaurantName}</p>
          </div>
        </div>
      </div>

      {/* Tarjeta de estado principal */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4.5 mb-3 shadow-sm flex items-center justify-between">
        <div className="flex-1">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-0.5">
            Estado Actual
          </span>
          <h3 className="text-sm font-extrabold text-white">
            {order.status === 'rechazado_restaurante' ? 'Rechazado por Local' : (states[currentStatusIndex]?.label || 'Procesando')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            {order.status === 'rechazado_restaurante' 
              ? 'El restaurante ha rechazado tu pedido. El importe ha sido reembolsado a tu Wallet.' 
              : (states[currentStatusIndex]?.desc || 'Estamos actualizando el estado.')}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
          order.status === 'rechazado_restaurante' 
            ? 'bg-rose-950/80 border-rose-900/60 text-rose-500' 
            : 'bg-primary-950/80 border-primary-900/60 text-primary-400'
        }`}>
          {order.status === 'rechazado_restaurante' ? (
            <ShieldAlert size={24} />
          ) : order.status === 'en_camino' ? (
            <Bike size={24} className="animate-bounce-subtle" />
          ) : order.status === 'entregado_repartidor' || order.status === 'finalizado_confirmado' ? (
            <CheckCircle2 size={24} className="text-emerald-400" />
          ) : (
            <Clock size={24} className="animate-pulse-subtle" />
          )}
        </div>
      </div>

      {order.status === 'entregado_repartidor' && (
        <button
          onClick={() => changeOrderStatus(order.id, 'finalizado_confirmado')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl py-3.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 tap-effect animate-bounce-subtle mb-4"
        >
          <CheckCircle2 size={14} strokeWidth={2.5} />
          Confirmar Recepción de Comida
        </button>
      )}

      {order.status?.toLowerCase().trim() === 'finalizado_confirmado' && (
        <button
          onClick={async () => {
            // Limpieza inmediata del socket y referencias de conexión para evitar re-intentos
            if (wsRef.current) {
              try {
                wsRef.current.close();
              } catch (e) {}
              wsRef.current = null;
            }
            setIsSocketConnected(false);
            
            setIsArchived(true);
            const res = await archiveOrder(order.id);
            if (res.success) {
              onBack(); // Redirección forzada e inmediata
            } else {
              setIsArchived(false);
              alert(`Error al archivar: ${res.message || "Error desconocido"}`);
            }
          }}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-2xl py-3.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg tap-effect mb-4"
        >
          <CheckCircle2 size={14} strokeWidth={2.5} />
          Archivar Pedido
        </button>
      )}

      {/* MAPA DE SEGUIMIENTO EN TIEMPO REAL */}
      {order.status === 'en_camino' && (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 mb-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bike size={14} className="text-emerald-400 animate-pulse-subtle" />
              Sigue a tu Repartidor en Vivo
            </h3>
            {repartidorCoords && (
              <span className="text-[8px] text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/40 animate-pulse">
                Ubicación Actualizada
              </span>
            )}
          </div>
          <div 
            ref={mapRef} 
            className="w-full h-52 rounded-xl border border-white/5 overflow-hidden z-10" 
            style={{ minHeight: '208px' }}
          />
        </div>
      )}

      {/* Contenedor responsivo en grid para tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Columna 1: Línea de tiempo */}
        <div>
          {/* LINEA DE TIEMPO INTERACTIVA */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 mb-4 shadow-sm flex flex-col gap-4.5">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              Línea de Tiempo del Pedido
            </h3>
            
            <div className="flex flex-col gap-5 pl-2 relative">
              {/* Línea vertical de fondo */}
              <div className="absolute top-2.5 bottom-2.5 left-4.5 w-0.5 bg-slate-800"></div>

              {states.map((st, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={st.key} className="flex items-start gap-4 relative">
                    {/* Círculo indicador de estado */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                      isCompleted 
                        ? isCurrent 
                          ? 'bg-primary-500 border-primary-400 text-white shadow-md shadow-primary-500/20' 
                          : 'bg-emerald-500 border-emerald-400 text-slate-950 font-extrabold'
                        : 'bg-slate-950 border-slate-850 text-slate-650'
                    }`}>
                      {isCompleted ? (
                        isCurrent ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                        ) : (
                          <span className="text-[9px]">✓</span>
                        )
                      ) : null}
                    </div>

                    <div className="flex-1 -mt-0.5">
                      <h4 className={`text-xs font-bold ${
                        isCompleted ? 'text-white' : 'text-slate-500'
                      }`}>
                        {st.label}
                      </h4>
                      <p className={`text-[10px] ${
                        isCurrent ? 'text-slate-400' : 'text-slate-500'
                      } mt-0.5 leading-normal`}>
                        {st.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna 2: Repartidor y Chat */}
        <div className="flex flex-col gap-4">
          {/* DETALLE DEL REPARTIDOR ASIGNADO */}
          {order.delivererId ? (
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 mb-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80" 
                    alt={order.delivererName || "Repartidor"} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-[8px] bg-emerald-950 border border-emerald-800/80 px-1 py-0.5 rounded text-emerald-400 font-bold block w-fit mb-0.5 uppercase tracking-wide">
                    Repartidor Asignado
                  </span>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {order.delivererName || "Estudiante Repartidor"}
                  </h4>
                </div>
              </div>
              <a
                href={`tel:${order.delivererPhone || '0999999999'}`}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-white rounded-xl px-2.5 py-1.5 text-[8.5px] font-extrabold flex items-center gap-1 tap-effect shrink-0 transition-colors border-slate-800/80"
              >
                <span>📞</span>
                <span>Llamar: {order.delivererPhone || '0999999999'}</span>
              </a>
            </div>
          ) : (
            <div className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-4 mb-4 text-center shadow-inner">
              <p className="text-[10px] text-slate-500 font-bold">
                🕒 Esperando asignación de repartidor colaborativo...
              </p>
            </div>
          )}

          {/* CHAT DEL PEDIDO */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 shadow-sm flex flex-col h-60 shrink-0">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-primary-400" />
              Chat del Pedido
            </h3>

            {/* Burbujas del chat */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-2.5 flex flex-col gap-2 bg-slate-950/30 p-2.5 rounded-xl border border-slate-950/20 my-2">
              {chatMessages.map((msg, index) => {
                let bubbleClass = 'bg-slate-800 text-slate-300 rounded-2xl rounded-tl-none self-start';
                let senderLabel = 'Repartidor';

                if (msg.sender === 'client') {
                  bubbleClass = 'bg-primary-500 text-white rounded-2xl rounded-tr-none self-end';
                  senderLabel = 'Tú';
                } else if (msg.sender === 'system') {
                  bubbleClass = 'bg-slate-900 text-slate-500 text-center mx-auto text-[9px] py-1 border border-slate-850';
                  senderLabel = 'Sistema';
                }

                return (
                  <div key={index} className={`max-w-[85%] p-2 text-[10px] flex flex-col ${bubbleClass}`}>
                    {msg.sender !== 'system' && (
                      <span className="text-[8px] font-extrabold opacity-60 mb-0.5 uppercase tracking-wide">
                        {senderLabel}
                      </span>
                    )}
                    <p className="leading-snug">{msg.text}</p>
                    <span className="text-[7px] text-slate-400 text-right mt-1 opacity-70">
                      {msg.time}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Entrada de texto */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  !order.delivererId 
                    ? "Espera a tener un repartidor..." 
                    : !isSocketConnected 
                      ? "Chat desconectado / Conectando..." 
                      : "Escribe un mensaje rápido..."
                }
                disabled={!order.delivererId || !isSocketConnected}
                className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-primary-500/30 focus:ring-1 focus:ring-primary-500/10 transition-all disabled:opacity-40"
              />
              <button 
                type="submit"
                onClick={handleSendMessage}
                disabled={!order.delivererId || !isSocketConnected || !inputText.trim()}
                className="w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center tap-effect hover:bg-primary-600 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL DE CALIFICACIÓN (MODO OSCURO) */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-scale-in">
            {/* Cabecera del Modal */}
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl mb-4 animate-pulse-subtle">
              ⭐
            </div>
            
            <h3 className="text-base font-extrabold text-white mb-1">
              ¿Qué tal tu comida de {order.restaurantName}?
            </h3>
            <p className="text-xs text-slate-400 mb-6 max-w-[85%] leading-relaxed">
              Tu calificación ayuda a mejorar la experiencia gastronómica de todos los estudiantes en el campus.
            </p>

            {/* Selector de 5 estrellas */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => {
                const isHighlighted = hoverStars ? star <= hoverStars : star <= selectedStars;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStars(star)}
                    onMouseEnter={() => setHoverStars(star)}
                    onMouseLeave={() => setHoverStars(0)}
                    className="p-1 tap-effect transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      size={28}
                      fill={isHighlighted ? "#fbbf24" : "none"}
                      className={isHighlighted ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-slate-650 transition-colors duration-150"}
                    />
                  </button>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                type="button"
                disabled={isSubmittingRating}
                onClick={async () => {
                  setIsSubmittingRating(true);
                  const res = await rateRestaurant(order.restaurantId, selectedStars);
                  setIsSubmittingRating(false);
                  if (res.success) {
                    localStorage.setItem(`rated_order_${orderId}`, 'true');
                    setShowRatingModal(false);
                    // Confirmar recepción automáticamente si el repartidor ya lo entregó
                    if (order.status === 'entregado_repartidor') {
                      await changeOrderStatus(order.id, 'finalizado_confirmado');
                    }
                  }
                }}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-2xl py-3 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/10 tap-effect disabled:opacity-50"
              >
                {isSubmittingRating ? "Enviando..." : "Enviar Calificación"}
              </button>
              <button
                type="button"
                disabled={isSubmittingRating}
                onClick={async () => {
                  // Permitir omitir guardando el estado para que no aparezca de nuevo
                  localStorage.setItem(`rated_order_${orderId}`, 'skipped');
                  setShowRatingModal(false);
                  // Confirmar recepción automáticamente si el repartidor ya lo entregó
                  if (order.status === 'entregado_repartidor') {
                    await changeOrderStatus(order.id, 'finalizado_confirmado');
                  }
                }}
                className="w-full bg-transparent hover:bg-slate-850 text-slate-400 hover:text-slate-350 rounded-2xl py-2.5 text-xs font-bold transition-all tap-effect"
              >
                Omitir por ahora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
