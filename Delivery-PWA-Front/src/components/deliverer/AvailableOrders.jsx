import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, Navigation, Bike, DollarSign } from 'lucide-react';

export const AvailableOrders = () => {
  const { orders, acceptOrder, currentStudent, fetchCampusOrders } = useApp();

  useEffect(() => {
    if (fetchCampusOrders) {
      fetchCampusOrders();
    }
  }, [fetchCampusOrders]);

  // Filtrar pedidos en campus que aún no tienen repartidor (solo listos para retirar)
  const availableOrders = orders.filter(o => 
    o.status === 'listo_para_retirar' && !o.delivererId
  );

  return (
    <div className="flex-1 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Pedidos Esperando Reparto
        </h3>
        <span className="text-[10px] text-slate-500 font-bold">
          {availableOrders.length} disponibles
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableOrders.length > 0 ? (
          availableOrders.map(order => {
            // REGLA DE NEGOCIO: No se permite el auto-despacho (un repartidor no puede entregar su propio pedido)
            // Validamos contra su ID y correo para soportar tanto flujo de base de datos real como mocks
            const isSelfOrder = (currentStudent?.id && order.id_comprador === currentStudent.id) ||
                                (currentStudent?.email && (order.id_estudiante === currentStudent.email || order.clientEmail === currentStudent.email));

            // Calcular tiempo/distancia simulado según vehículo
            let walkTime = '6 min';
            let vehicleEmoji = '🚶';
            if (currentStudent?.vehicle === 'Bicicleta') {
              walkTime = '3 min';
              vehicleEmoji = '🚴';
            } else if (currentStudent?.vehicle === 'Scooter') {
              walkTime = '2 min';
              vehicleEmoji = '🛴';
            }

            return (
              <div key={order.id} className="bg-slate-900/40 border border-white/5 hover:border-primary-500/20 rounded-2xl p-4 flex flex-col gap-3 shadow-md card-hover transition-all duration-300">
                
                {/* ID de Pedido y Comisión */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-xs font-bold text-white block">{order.id}</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                      {order.restaurantName}
                    </span>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl px-2.5 py-1 text-right">
                    <span className="text-[8px] text-emerald-500 font-bold block leading-none">Mi Pago</span>
                    <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-0.5 mt-0.5">
                      <DollarSign size={10} strokeWidth={2.5} />
                      {order.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ruta Origen -> Destino */}
                <div className="flex flex-col gap-2.5 pl-1.5 relative">
                  {/* Línea punteada de ruta */}
                  <div className="absolute left-2 top-1.5 bottom-1.5 w-0.5 border-l border-dashed border-slate-755"></div>

                  {/* Origen */}
                  <div className="flex items-start gap-3 relative">
                    <div className="w-4 h-4 rounded-full bg-secondary-950 border border-secondary-800 text-[8px] flex items-center justify-center z-10">
                      🍳
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wide">Recoger en:</span>
                      <p className="text-[10px] text-white font-bold leading-tight mt-0.5">{order.restaurantName}</p>
                      <p className="text-[9px] text-slate-400">{order.building}</p>
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="flex items-start gap-3 relative">
                    <div className="w-4 h-4 rounded-full bg-primary-950 border border-primary-800 text-[8px] flex items-center justify-center z-10 animate-pulse">
                      📍
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-550 font-extrabold uppercase tracking-wide">Entregar en:</span>
                      <p className="text-[10px] text-white font-bold leading-tight mt-0.5">{order.clientSpot}</p>
                      {order.clientNotes && (
                        <p className="text-[9px] text-slate-400 italic max-w-[200px] truncate">
                          "{order.clientNotes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerta de Auto-Despacho */}
                {isSelfOrder && (
                  <p className="text-[8px] text-rose-450 font-bold text-center bg-rose-950/20 border border-rose-900/30 rounded-xl py-1.5 flex items-center justify-center gap-1">
                    ⚠️ No puedes aceptar y entregar tu propio pedido.
                  </p>
                )}

                {/* Botón Aceptar */}
                <button
                  onClick={() => {
                    if (isSelfOrder) {
                      alert("Acción no permitida: No puedes aceptar tu propio pedido.");
                      return;
                    }
                    acceptOrder(order.id, currentStudent?.email);
                  }}
                  disabled={isSelfOrder}
                  className={`w-full rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                    isSelfOrder 
                      ? 'bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/10 tap-effect'
                  }`}
                >
                  <Navigation size={12} fill="currentColor" className={isSelfOrder ? 'opacity-30' : ''} />
                  {isSelfOrder ? 'No puedes aceptar tu propio pedido' : 'Aceptar y Comenzar Reparto'}
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl shadow-inner">
            <span className="text-3xl mb-2 block">🚴</span>
            <p className="text-[10px] text-slate-500 font-bold">No hay pedidos disponibles para repartir.</p>
            <p className="text-[9px] text-slate-650 mt-1 max-w-[80%] mx-auto leading-normal">
              Apenas un comedor universitario prepare un pedido y lo marque como "Listo", aparecerá aquí.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
