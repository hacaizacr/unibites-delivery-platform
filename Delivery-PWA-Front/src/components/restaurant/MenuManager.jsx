import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, ToggleLeft, ToggleRight, X, Image, Tag, DollarSign, Edit2 } from 'lucide-react';

export const MenuManager = ({ restaurantId }) => {
  const { dishes, updateDishAvailability, addDishToMenu, updateDishPrice } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDishId, setEditingDishId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [newDish, setNewDish] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Almuerzos',
    imageFile: null
  });

  // Filtrar platos de este local
  const restaurantDishes = dishes.filter(d => d.restaurantId === restaurantId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDish.name || !newDish.price) return;

    const res = await addDishToMenu(restaurantId, newDish);
    if (res && res.success) {
      // Resetear formulario
      setNewDish({
        name: '',
        price: '',
        description: '',
        category: 'Almuerzos',
        imageFile: null
      });
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      setShowAddForm(false);
    }
  };

  const handleToggle = (dishId, currentStatus) => {
    updateDishAvailability(dishId, !currentStatus);
  };

  const handleSavePrice = async (dishId) => {
    if (!editPrice || isNaN(parseFloat(editPrice)) || parseFloat(editPrice) < 0) {
      alert("❌ Por favor ingresa un precio válido (positivo).");
      return;
    }
    const res = await updateDishPrice(dishId, editPrice);
    if (res && res.success) {
      setEditingDishId(null);
      setEditPrice('');
    } else {
      alert(`❌ Error al actualizar el precio: ${res?.message || "Error desconocido"}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      
      {/* Botón para agregar plato */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/10 tap-effect shrink-0"
      >
        {showAddForm ? (
          <>
            <X size={14} />
            Cancelar Formulario
          </>
        ) : (
          <>
            <Plus size={14} />
            Agregar Nuevo Plato al Menú
          </>
        )}
      </button>

      {/* Formulario de Adición Inteligente */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-xl animate-slide-up shrink-0">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1.5">
            <Plus size={14} className="text-primary-400" />
            Detalles del Nuevo Plato
          </h3>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400">Nombre del Plato</label>
            <input 
              type="text"
              required
              value={newDish.name}
              onChange={(e) => setNewDish(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej. Hamburguesa FING Especial"
              className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 transition-all"
            />
          </div>

          {/* Precio y Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400">Precio ($ USD)</label>
              <div className="relative">
                <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="number"
                  step="0.01"
                  required
                  value={newDish.price}
                  onChange={(e) => setNewDish(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="2.50"
                  className="w-full bg-slate-950/60 border border-white/5 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400">Categoría</label>
              <select
                value={newDish.category}
                onChange={(e) => setNewDish(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 transition-all cursor-pointer"
              >
                <option value="Almuerzos">Almuerzos</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Snacks">Snacks</option>
                <option value="Cafetería">Cafetería</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400">Descripción e Ingredientes</label>
            <textarea 
              rows="2"
              value={newDish.description}
              onChange={(e) => setNewDish(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ej. Carne asada, papas, lechuga y salsa secreta..."
              className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 transition-all resize-none"
            ></textarea>
          </div>

          {/* Imagen (Subida real a S3) */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-slate-400">Imagen del Plato</label>
            <input 
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setNewDish(prev => ({ ...prev, imageFile: file }));
              }}
              className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500 transition-all cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-primary-950 file:text-primary-400 hover:file:bg-primary-900"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-secondary-500 text-slate-950 rounded-xl py-2.5 text-xs font-extrabold transition-all shadow-md shadow-secondary-500/10 hover:bg-secondary-600 tap-effect mt-1"
          >
            Guardar Plato en Menú
          </button>
        </form>
      )}

      {/* Listado de Platos */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Platos en el Menú ({restaurantDishes.length})
        </h3>
        
        {restaurantDishes.length > 0 ? (
          restaurantDishes.map(dish => (
            <div 
              key={dish.id}
              className={`bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-300 ${
                !dish.available ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Miniatura plato */}
                <div className="w-12 h-12 rounded-xl bg-slate-850 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center relative">
                  {dish.image ? (
                    <>
                      <span className="text-sm absolute z-0 select-none">🍲</span>
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
                    <span className="text-sm">🍲</span>
                  )}
                </div>
                {/* Info plato */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{dish.name}</h4>
                  {editingDishId === dish.id ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="relative flex items-center bg-slate-950/60 border border-white/5 rounded-lg px-1.5 py-0.5 w-16">
                        <span className="text-[9px] text-slate-505 mr-0.5">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full bg-transparent text-[9px] text-primary-400 font-bold focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePrice(dish.id);
                            if (e.key === 'Escape') setEditingDishId(null);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSavePrice(dish.id)}
                        className="bg-emerald-500 text-slate-950 text-[8px] font-extrabold px-1.5 py-0.5 rounded hover:bg-emerald-600 transition-all shrink-0"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDishId(null)}
                        className="bg-slate-800 text-slate-400 text-[8px] font-bold px-1.5 py-0.5 rounded hover:bg-slate-700 transition-all shrink-0"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-semibold">
                      <span className="text-primary-400">${dish.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDishId(dish.id);
                          setEditPrice(dish.price.toString());
                        }}
                        className="text-slate-555 hover:text-primary-400 transition-colors p-0.5 flex items-center justify-center rounded bg-slate-950/60 border border-white/5"
                        title="Editar Precio"
                      >
                        <Edit2 size={9} />
                      </button>
                      <span className="text-slate-655">•</span>
                      <span className="text-slate-400">{dish.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Toggle de disponibilidad */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[8px] font-extrabold uppercase tracking-wider ${
                  dish.available ? 'text-emerald-400' : 'text-slate-505'
                }`}>
                  {dish.available ? 'Disponible' : 'Agotado'}
                </span>
                <button
                  onClick={() => handleToggle(dish.id, dish.available)}
                  className={`p-1.5 rounded-full transition-colors ${
                    dish.available ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {dish.available ? (
                    <ToggleRight size={28} className="cursor-pointer" />
                  ) : (
                    <ToggleLeft size={28} className="cursor-pointer" />
                  )}
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-slate-900/40 backdrop-blur-xs border border-white/5 rounded-2xl shadow-inner animate-fade-in">
            <p className="text-[10px] text-slate-500 font-bold">Tu menú está vacío. ¡Agrega tu primer plato!</p>
          </div>
        )}
      </div>

    </div>
  );
};
