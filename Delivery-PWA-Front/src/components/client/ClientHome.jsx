import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Star, Clock, MapPin, ChevronRight } from 'lucide-react';

export const ClientHome = ({ onSelectRestaurant }) => {
  const { restaurants } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const categories = ['Todos', 'Almuerzos', 'Bebidas', 'Snacks', 'Cafetería'];

  // Filtrar locales
  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (restaurant.especialidades && restaurant.especialidades.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      restaurant.building.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Todos' || 
      (restaurant.especialidades && restaurant.especialidades.includes(selectedCategory));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 animate-fade-in no-scrollbar overflow-y-auto">
      
      {/* Mensaje de Bienvenida */}
      <div className="mb-4">
        <h2 className="text-xl font-extrabold text-white leading-tight">
          ¡Hola Estudiante! 👋
        </h2>
        <p className="text-xs text-slate-400">¿Qué te gustaría comer hoy en el campus?</p>
      </div>



      {/* Buscador */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" 
          placeholder="Buscar comedor, comida o facultad..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/30 focus:ring-1 focus:ring-primary-500/10 transition-all shadow-inner"
        />
      </div>

      {/* Categorías */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Categorías</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

      {/* Título de Sección */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Locales en el Campus
        </h3>
        <span className="text-[10px] text-slate-500 font-semibold">{filteredRestaurants.length} disponibles</span>
      </div>

      {/* Lista de Restaurantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map(restaurant => (
            <div 
              key={restaurant.id}
              onClick={() => onSelectRestaurant(restaurant.id)}
              className="bg-slate-900/40 backdrop-blur-xs border border-white/5 hover:border-primary-500/20 rounded-2xl overflow-hidden cursor-pointer card-hover flex flex-col shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
            >
              {/* Imagen de Portada */}
              <div className="relative h-28 w-full bg-slate-850">
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
                  }}
                />
                <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1 justify-end max-w-[80%]">
                  {restaurant.especialidades && restaurant.especialidades.map(spec => (
                    <div key={spec} className="bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-white font-bold text-[9px] uppercase tracking-wider border border-slate-800">
                      {spec}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detalles */}
              <div className="p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={11} 
                          fill={i < restaurant.rating ? "currentColor" : "none"} 
                          className={i < restaurant.rating ? "text-amber-400" : "text-slate-600"}
                        />
                      ))}
                      <span className="text-[10px] font-extrabold text-slate-400 ml-1">({restaurant.rating})</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 mb-2.5 flex items-center gap-1">
                    <MapPin size={10} className="text-primary-400 shrink-0" />
                    {restaurant.building}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-1 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock size={11} className="text-slate-500" />
                    <span>Listo en {restaurant.waitTime}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-400 font-bold hover:text-primary-300">
                    Ver menú
                    <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <span className="text-3xl mb-2">🍽️</span>
            <h4 className="text-xs font-bold text-white mb-1">No encontramos locales</h4>
            <p className="text-[10px] text-slate-500 max-w-[80%] leading-relaxed">
              Prueba buscando con otros términos o selecciona una categoría diferente.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
