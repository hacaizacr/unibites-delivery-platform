import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/shared/Layout';
import { StudentLogin } from './components/client/StudentLogin';
import { ClientHome } from './components/client/ClientHome';
import { RestaurantDetail } from './components/client/RestaurantDetail';
import { Cart } from './components/client/Cart';
import { OrderTracking } from './components/client/OrderTracking';
import { RestaurantDashboard } from './components/restaurant/RestaurantDashboard';
import { DelivererDashboard } from './components/deliverer/DelivererDashboard';
import { WelcomeScreen } from './components/shared/WelcomeScreen';
import { Compass, ShoppingBag, ClipboardList, Clock } from 'lucide-react';

const MainApp = () => {
  const { activeRole, cart, orders, currentStudent, showWelcome } = useApp();
  
  // Vistas del Cliente: 'home', 'restaurant-detail', 'cart', 'tracking'
  const [clientView, setClientView] = useState('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Cantidad total de productos en el carrito del cliente
  const cartItemCount = cart ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;

  // Manejar navegación del cliente a un local específico
  const handleSelectRestaurant = (id) => {
    setSelectedRestaurantId(id);
    setClientView('restaurant-detail');
  };

  // Manejar cuando el pedido es creado con éxito
  const handleOrderPlaced = (orderId) => {
    setTrackingOrderId(orderId);
    setClientView('tracking');
  };

  // Renderizar la vista correspondiente al Cliente
  const renderClientContent = () => {
    // Si no se ha logueado el estudiante, forzar pantalla de login o bienvenida
    if (!currentStudent) {
      if (showWelcome) {
        return <WelcomeScreen />;
      }
      return <StudentLogin />;
    }

    switch (clientView) {
      case 'home':
        return <ClientHome onSelectRestaurant={handleSelectRestaurant} />;
      
      case 'restaurant-detail':
        return (
          <RestaurantDetail 
            restaurantId={selectedRestaurantId} 
            onBack={() => setClientView('home')} 
            onOpenCart={() => setClientView('cart')} 
          />
        );
      
      case 'cart':
        return (
          <Cart 
            onBack={() => {
              if (selectedRestaurantId) {
                setClientView('restaurant-detail');
              } else {
                setClientView('home');
              }
            }} 
            onOrderPlaced={handleOrderPlaced} 
          />
        );
      
      case 'tracking':
        if (trackingOrderId) {
          return (
            <OrderTracking 
              orderId={trackingOrderId} 
              onBack={() => {
                setTrackingOrderId(null); // Limpiar para volver a la lista general
              }} 
            />
          );
        }
        
        // Vista general de historial/seguimiento si no hay un ID de seguimiento activo
        return (
          <div className="flex-1 flex flex-col p-4 pb-20 animate-fade-in no-scrollbar overflow-y-auto">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 border-b border-slate-900 pb-2">
              Mis Pedidos en Campus
            </h2>
            <div className="flex flex-col gap-3">
              {orders && orders.length > 0 ? (
                orders.map(order => (
                  <div 
                    key={order.id}
                    onClick={() => {
                      setTrackingOrderId(order.id);
                      setClientView('tracking');
                    }}
                    className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex items-center justify-between cursor-pointer card-hover shadow-sm hover:shadow-primary-500/5 transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white">{order.id}</span>
                        <span className="text-[8px] text-slate-500 font-semibold">•</span>
                        <span className="text-[9px] text-slate-400 font-medium">{order.restaurantName}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[8.5px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        order.status === 'finalizado_confirmado'
                          ? 'bg-emerald-950/80 border border-emerald-900/60 text-emerald-400'
                          : order.status === 'rechazado_restaurante'
                          ? 'bg-rose-950/80 border border-rose-900/80 text-rose-500'
                          : order.status === 'pendiente_restaurante'
                          ? 'bg-rose-950/80 border border-rose-900/60 text-rose-450'
                          : 'bg-primary-950/80 border border-primary-900/60 text-primary-400 animate-pulse'
                      }`}>
                        {order.status === 'pendiente_restaurante' ? 'Pendiente' : 
                         order.status === 'en_preparacion' ? 'Preparando' :
                         order.status === 'listo_para_retirar' ? 'Listo p/ Retirar' :
                         order.status === 'en_camino' ? 'En Camino' : 
                         order.status === 'entregado_repartidor' ? 'Entregado p/ Repartidor' : 
                         order.status === 'rechazado_restaurante' ? 'Rechazado por Local' : 'Finalizado'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl shadow-inner">
                  <span className="text-3xl mb-2 block">📋</span>
                  <p className="text-[10px] text-slate-500 font-bold">Aún no has realizado pedidos.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <ClientHome onSelectRestaurant={handleSelectRestaurant} />;
    }
  };

  return (
    <Layout>
      {/* Contenido condicional basado en el rol seleccionado */}
      {activeRole === 'client' && renderClientContent()}
      {activeRole === 'restaurant' && <RestaurantDashboard />}
      {activeRole === 'deliverer' && <DelivererDashboard />}

      {/* BARRA DE NAVEGACIÓN INFERIOR (Solo para el Estudiante/Cliente LOGUEADO) */}
      {activeRole === 'client' && currentStudent && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-white/5 flex items-center z-50 select-none">
          <div className="max-w-[1200px] w-full mx-auto flex items-center justify-around">
            <button 
              onClick={() => {
                setClientView('home');
                setSelectedRestaurantId(null);
              }}
              className={`flex flex-col items-center gap-1.5 transition-colors tap-effect ${
                clientView === 'home' || clientView === 'restaurant-detail' ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Compass size={18} />
              <span className="text-[9px] font-bold">Locales</span>
            </button>

            <button 
              onClick={() => setClientView('cart')}
              className={`flex flex-col items-center gap-1.5 transition-colors tap-effect relative ${
                clientView === 'cart' ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ShoppingBag size={18} />
              <span className="text-[9px] font-bold">Carrito</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary-500 border border-slate-900 text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce-subtle">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => {
                setClientView('tracking');
                setTrackingOrderId(null); // Abre el listado general primero
              }}
              className={`flex flex-col items-center gap-1.5 transition-colors tap-effect ${
                clientView === 'tracking' ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ClipboardList size={18} />
              <span className="text-[9px] font-bold">Pedidos</span>
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

const App = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
