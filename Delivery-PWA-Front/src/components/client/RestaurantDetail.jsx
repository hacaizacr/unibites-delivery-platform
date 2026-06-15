import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Star, Clock, MapPin, Plus, ShoppingBag, Check } from 'lucide-react';

export const RestaurantDetail = ({ restaurantId, onBack, onOpenCart }) => {
  const { restaurants, dishes, addToCart, cart } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [addedItemEffect, setAddedItemEffect] = useState({});

  const restaurant = restaurants.find(r => r.id === restaurantId);
  
  if (!restaurant) {
    return (
      <div className="p-4 text-center text-slate-400">
        Restaurante no encontrado.
        <button onClick={onBack} className="block mx-auto mt-4 text-primary-500 font-bold">Volver</button>
      </div>
    );
  }

  // Filtrar platos de este restaurante
  const restaurantDishes = dishes.filter(d => d.restaurantId === restaurantId);
  
  // Extraer categorías exclusivas de este restaurante
  const menuCategories = ['Todos', ...new Set(restaurantDishes.map(d => d.category))];

  // Filtrar por categoría seleccionada
  const filteredDishes = restaurantDishes.filter(dish => 
    selectedCategory === 'Todos' || dish.category === selectedCategory
  );

  // Manejar click para añadir al carrito
  const handleAddToCart = (dish) => {
    addToCart(dish, 1);
    
    // Efecto visual de agregado
    setAddedItemEffect(prev => ({ ...prev, [dish.id]: true }));
    setTimeout(() => {
      setAddedItemEffect(prev => ({ ...prev, [dish.id]: false }));
    }, 1200);
  };

  // Datos para el barra flotante del carrito
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex-1 flex flex-col pb-24 animate-fade-in no-scrollbar overflow-y-auto">
      
      {/* Botón Volver y Portada */}
      <div className="relative h-44 w-full bg-slate-800 shrink-0">
        <img 
          src={restaurant.cover || restaurant.image} 
          alt={restaurant.name} 
          className="w-full h-full object-cover opacity-60"
        />
        
        {/* Botón Volver */}
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-850 text-white flex items-center justify-center tap-effect hover:bg-slate-900"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Info básica flotante */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex flex-wrap gap-1 mb-1">
            {restaurant.especialidades && restaurant.especialidades.map(spec => (
              <span key={spec} className="bg-primary-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                {spec}
              </span>
            ))}
          </div>
          <h2 className="text-lg font-extrabold text-white leading-tight drop-shadow-md">
            {restaurant.name}
          </h2>
        </div>
      </div>

      {/* Tarjeta de información extendida */}
      <div className="p-4 bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl flex flex-col gap-2 shadow-sm my-4">
        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
          {restaurant.description}
        </p>

        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold mt-1">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-white">{restaurant.rating}</span>
            <span>({restaurant.reviews})</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-slate-500" />
            <span>Listo en {restaurant.waitTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-primary-400" />
            <span className="truncate max-w-[120px]">{restaurant.building}</span>
          </div>
        </div>
      </div>

      {/* Selector de Categorías Menú */}
      <div className="p-4 bg-slate-950/90 backdrop-blur-md sticky top-0 z-10 border-b border-white/5 shadow-sm shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {menuCategories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === category 
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/10' 
                  : 'bg-slate-900/55 text-slate-400 border border-white/5 hover:border-slate-800 hover:text-white hover:bg-slate-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Platos */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDishes.length > 0 ? (
          filteredDishes.map(dish => (
            <div 
              key={dish.id}
              className={`bg-slate-900/40 border border-white/5 hover:border-primary-500/20 rounded-2xl p-3.5 flex gap-3.5 card-hover shadow-md hover:shadow-primary-500/5 transition-all duration-300 ${
                !dish.available ? 'opacity-55' : ''
              }`}
            >
              {/* Info del plato */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5 leading-snug">
                    {dish.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                    {dish.description}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-sm font-extrabold text-white">
                    ${dish.price.toFixed(2)}
                  </span>
                  
                  <button
                    disabled={!dish.available}
                    onClick={() => dish.available && handleAddToCart(dish)}
                    className={`h-7 px-3 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold transition-all tap-effect ${
                      !dish.available
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                        : addedItemEffect[dish.id]
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-primary-500 text-white hover:bg-primary-600 shadow-md shadow-primary-500/10'
                    }`}
                  >
                    {!dish.available ? (
                      "Agotado"
                    ) : addedItemEffect[dish.id] ? (
                      <>
                        <Check size={11} strokeWidth={3} />
                        Añadido
                      </>
                    ) : (
                      <>
                        <Plus size={11} strokeWidth={3} />
                        Agregar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Imagen del plato */}
              <div className="w-20 h-20 rounded-xl bg-slate-850 overflow-hidden shrink-0 border border-slate-800/80 flex items-center justify-center relative">
                {dish.image ? (
                  <>
                    <span className="text-xl absolute z-0 select-none">🍲</span>
                    <img 
                      src={dish.image} 
                      alt={dish.name} 
                      className="w-full h-full object-cover absolute z-10 bg-slate-850"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </>
                ) : (
                  <span className="text-xl">🍲</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl shadow-inner">
            <p className="text-[10px] text-slate-500 font-bold">No hay platos disponibles en esta categoría.</p>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartItemsCount > 0 && (
        <div className="absolute bottom-20 left-4 right-4 bg-primary-500 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl shadow-primary-950/30 border border-primary-400/25 animate-slide-up z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ShoppingBag size={14} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-100 block -mb-0.5">
                {cartItemsCount} {cartItemsCount === 1 ? 'producto' : 'productos'}
              </span>
              <span className="text-sm font-extrabold tracking-tight">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
          </div>
          <button 
            onClick={onOpenCart}
            className="bg-white text-primary-600 hover:bg-slate-50 text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
          >
            Ver Carrito
            <Check size={11} strokeWidth={3} />
          </button>
        </div>
      )}

    </div>
  );
};
