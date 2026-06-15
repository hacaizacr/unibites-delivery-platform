import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { mockRestaurants, mockDishes } from '../data/mockData';
import { CORE_API, WALLET_API } from '../services/apiConfig';

const AppContext = createContext();

const mapBackendStatusToFrontend = (backendStatus) => {
  if (!backendStatus) return 'pendiente_restaurante';
  const status = backendStatus.toLowerCase().trim();
  if (status === 'pendiente_restaurante' || status === 'pendiente') return 'pendiente_restaurante';
  if (status === 'en_preparacion') return 'en_preparacion';
  if (status === 'listo_para_retirar' || status === 'listo_para_recoger') return 'listo_para_retirar';
  if (status === 'en camino' || status === 'en_camino') return 'en_camino';
  if (status === 'entregado_repartidor' || status === 'entregado') return 'entregado_repartidor';
  if (status === 'finalizado_confirmado') return 'finalizado_confirmado';
  return status;
};

export const AppProvider = ({ children }) => {
  // Roles activos: 'client', 'restaurant', 'deliverer'
  const [activeRole, setActiveRole] = useState('client');
  
  // Datos del Estudiante Logueado (Cliente y Repartidor)
  const [currentStudent, setCurrentStudent] = useState(() => {
    const saved = localStorage.getItem('unibites_current_student');
    return saved ? JSON.parse(saved) : null;
  });

  // Pantalla de Bienvenida Inicial
  const [showWelcome, setShowWelcome] = useState(() => {
    const saved = localStorage.getItem('unibites_current_student');
    return !saved;
  });

  // Lista de Estudiantes Registrados
  const [registeredStudents, setRegisteredStudents] = useState(() => {
    const saved = localStorage.getItem('unibites_registered_students');
    return saved ? JSON.parse(saved) : [
      {
        firstName: 'Harold',
        lastName: 'Uribe',
        email: 'harold@uide.edu.ec',
        password: 'student123',
        name: 'Harold U.',
        isOnline: true,
        earnings: 0.0,
        vehicle: 'Bicicleta',
        phone: '0999999999',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80'
      }
    ];
  });

  // Datos interactivos de Restaurantes
  const [restaurants, setRestaurants] = useState(() => {
    const saved = localStorage.getItem('unibites_restaurants');
    const list = saved ? JSON.parse(saved) : mockRestaurants;
    
    // Asegurar credenciales por defecto para los restaurantes existentes
    const defaultCredentials = {
      1: { username: 'comedor', password: 'comedor123' },
      2: { username: 'fing', password: 'fing123' },
      3: { username: 'ciencias', password: 'ciencias123' },
      4: { username: 'snacks', password: 'snacks123' }
    };
    
    return list.map(r => {
      let especialidades = r.especialidades;
      if (!especialidades) {
        if (r.tag) {
          especialidades = r.tag.split(/\s+y\s+|\s*,\s*/).map(s => s.trim());
        } else {
          especialidades = ["Almuerzos"];
        }
      }
      const creds = defaultCredentials[r.id];
      if (creds && (!r.username || !r.password)) {
        return { ...r, username: creds.username, password: creds.password, especialidades };
      }
      return { ...r, especialidades };
    });
  });

  const [dishes, setDishes] = useState(() => {
    const saved = localStorage.getItem('unibites_dishes');
    return saved ? JSON.parse(saved) : mockDishes;
  });

  const [orders, setOrders] = useState([]);

  // Estado del Cliente (Carrito)
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('unibites_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCartRestaurantId, setActiveCartRestaurantId] = useState(() => {
    const saved = localStorage.getItem('unibites_cart_restaurant_id');
    return saved ? parseInt(saved) || null : null;
  });

  // ID del restaurante actualmente "iniciado sesión" (por simulación)
  const [activeRestaurantId, setActiveRestaurantId] = useState(() => {
    const saved = localStorage.getItem('unibites_active_restaurant_id');
    return saved ? parseInt(saved) : null;
  });

  const [currentRestaurant, setCurrentRestaurant] = useState(() => {
    const saved = localStorage.getItem('unibites_current_restaurant');
    return saved ? JSON.parse(saved) : null;
  });

  const fetchRestaurants = useCallback(async () => {
    try {
      console.log("Obteniendo restaurantes del backend...");
      const restRes = await fetch(`${CORE_API}/api/restaurantes`);
      if (restRes.ok) {
        const restData = await restRes.json();
        if (restData && restData.length > 0) {
          // Mapear campos de la base de datos a los que espera el frontend
          const mappedRestaurants = restData.map(r => {
            const especialidades = r.especialidades || [];
            return {
              id: r.id,
              name: r.nombre_local,
              nombre_local: r.nombre_local,
              rating: r.rating !== undefined ? r.rating : 5,
              reviews: r.total_votos !== undefined ? `${r.total_votos} votos` : "0 votos",
              waitTime: "10-15 min",
              especialidades: especialidades,
              tag: especialidades.length > 0 ? especialidades[0] : (r.id === 1 ? "Comedor" : "Cafetería"),
              image: r.image || (r.id === 1 
                ? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" 
                : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"),
              cover: r.cover || (r.id === 1 
                ? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"
                : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"),
              building: r.ubicacion_campus,
              ubicacion_campus: r.ubicacion_campus,
              description: r.descripcion || "Restaurante universitario oficial en el campus.",
              active: true,
              username: r.username,
              password: r.password
            };
          });
          
          setRestaurants(mappedRestaurants);
          console.log("Restaurantes cargados exitosamente del backend!");
          return mappedRestaurants;
        }
      }
    } catch (err) {
      console.warn("WARNING: No se pudo conectar al Backend para cargar los restaurantes.", err);
    }
    return null;
  }, []);

  const syncCatalogWithBackend = useCallback(async () => {
    try {
      console.log("Intentando sincronizar catálogo con el Backend...");
      
      const mappedRestaurants = await fetchRestaurants();
      if (mappedRestaurants && mappedRestaurants.length > 0) {
        // 2. Obtener platos para cada restaurante
        let allDishes = [];
        for (const r of mappedRestaurants) {
          try {
            const menuRes = await fetch(`${CORE_API}/api/restaurantes/${r.id}/menu`);
            if (menuRes.ok) {
              const menuData = await menuRes.json();
              if (menuData && menuData.length > 0) {
                const mappedDishes = menuData.map(d => ({
                  id: d.id,
                  restaurantId: d.id_restaurante,
                  name: d.nombre,
                  price: d.price || d.precio,
                  description: d.descripcion,
                  image: d.imagen_url || d.image || '',
                  category: r.id === 1 ? "Almuerzos" : "Café & Snacks",
                  available: d.disponible !== undefined ? d.disponible : true
                }));
                allDishes = [...allDishes, ...mappedDishes];
              }
            }
          } catch (menuErr) {
            console.error(`Error al sincronizar menú del restaurante ${r.id}:`, menuErr);
          }
        }

        if (allDishes.length > 0) {
          setDishes(allDishes);
          console.log("Platos sincronizados con el backend!");
        }
      }

    } catch (err) {
      console.warn("WARNING: No se pudo conectar al Backend para sincronizar el catálogo. Operando con Mock Data local.", err);
    }
  }, [fetchRestaurants]);

  // --- MÉTODOS DEL CLIENTE (ESTUDIANTE) ---

  const loginStudent = async (email, password) => {
    // 1. Validación de cliente local inicial (opcional pero mantiene UX rápido)
    const emailRegex = /^[^\s@]+@uide\.edu\.ec$/i;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Acceso denegado. Debes usar tu correo institucional de la UIDE (@uide.edu.ec)' };
    }

    try {
      // 2. LLAMADA REAL AL MICROSERVICIO CORE (Python - FastAPI)
      // Se conecta al puerto 8001 para validar credenciales en PostgreSQL
      const response = await fetch(`${CORE_API}/api/auth/estudiante/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo_uide: email, contrasena: password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.detail || 'Credenciales inválidas.' };
      }

      // 3. INTEGRACIÓN CRUZADA CON EL MICROSERVICIO DE ECONOMÍA (Java - Spring Boot)
      // Al iniciar sesión, consultamos el saldo real en la wallet (Puerto 8002) vía proxy de FastAPI (Puerto 8001)
      let finalStudent = { ...data.student };
      try {
        const walletRes = await fetch(`${CORE_API}/api/wallet/balance/${email.toLowerCase().trim()}`, {
          headers: {
            'Authorization': `Bearer ${finalStudent.token}`
          }
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          // Sincronizamos las ganancias/saldo de la wallet en el estado local de React
          finalStudent.earnings = walletData.balance;
        }
      } catch (walletErr) {
        console.error("WARNING: No se pudo conectar al microservicio de Wallet (Puerto 8002). Usando saldo local simulado.", walletErr);
      }

      setCurrentStudent(finalStudent);
      return { success: true, student: finalStudent };

    } catch (error) {
      console.error("Error de conexión:", error);
      return { success: false, message: 'No se pudo establecer conexión con el servidor del Backend.' };
    }
  };

  const registerStudent = async (nombre, apellido, email, password, phone) => {
    const emailRegex = /^[^\s@]+@uide\.edu\.ec$/i;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Acceso denegado. Debes usar tu correo institucional de la UIDE (@uide.edu.ec)' };
    }

    try {
      // 1. REGISTRO EN EL MICROSERVICIO CORE (Python - FastAPI)
      // Persiste el nuevo estudiante en la tabla 'usuarios' de PostgreSQL
      const response = await fetch(`${CORE_API}/api/auth/estudiante/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre,
          apellido: apellido,
          correo_uide: email,
          contrasena: password,
          telefono: phone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.detail || 'Error al registrar estudiante.' };
      }

      // 2. INICIALIZACIÓN AUTOMÁTICA DE SU BILLETERA (Java - Spring Boot)
      // Consultamos el saldo de su wallet por primera vez para forzar al microservicio 
      // de Java a crear la billetera con el saldo inicial por defecto de $50.00.
      let finalStudent = { ...data.student };
      try {
        const walletRes = await fetch(`${CORE_API}/api/wallet/balance/${email.toLowerCase().trim()}`, {
          headers: {
            'Authorization': `Bearer ${finalStudent.token}`
          }
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          finalStudent.earnings = walletData.balance; // Debe recibir $50.00
        }
      } catch (walletErr) {
        console.error("WARNING: No se pudo auto-inicializar la wallet en el microservicio de Java.", walletErr);
      }

      // Sincronizamos en la lista local de estudiantes también para mantener la retrocompatibilidad
      setRegisteredStudents(prev => {
        const filtered = prev.filter(s => s.email?.toLowerCase() !== email.toLowerCase().trim());
        return [...filtered, finalStudent];
      });

      setCurrentStudent(finalStudent);
      return { success: true, student: finalStudent };

    } catch (error) {
      console.error("Error de conexión:", error);
      return { success: false, message: 'No se pudo establecer conexión con el servidor para crear la cuenta.' };
    }
  };

  const logoutStudent = () => {
    setCurrentStudent(null);
    clearCart();
    setActiveRole('client');
    setShowWelcome(true);
  };
  
  const addToCart = (dish, quantity = 1) => {
    if (activeCartRestaurantId && activeCartRestaurantId !== dish.restaurantId) {
      if (window.confirm('¿Deseas vaciar tu carrito actual? Solo puedes ordenar de un restaurante a la vez.')) {
        setCart([{ ...dish, quantity }]);
        setActiveCartRestaurantId(dish.restaurantId);
      }
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === dish.id);
      if (existing) {
        return prev.map(item => item.id === dish.id 
          ? { ...item, quantity: item.quantity + quantity } 
          : item
        );
      }
      return [...prev, { ...dish, quantity }];
    });
    
    if (!activeCartRestaurantId) {
      setActiveCartRestaurantId(dish.restaurantId);
    }
  };

  const updateCartQuantity = (dishId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === dishId);
      if (!item) return prev;
      
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const filtered = prev.filter(i => i.id !== dishId);
        if (filtered.length === 0) {
          setActiveCartRestaurantId(null);
        }
        return filtered;
      }

      return prev.map(i => i.id === dishId ? { ...i, quantity: newQty } : i);
    });
  };

  const clearCart = () => {
    setCart([]);
    setActiveCartRestaurantId(null);
  };

  const placeOrder = async (clientSpotName, clientNotes, clientName = 'Estudiante Anónimo') => {
    if (cart.length === 0) return null;

    const idComprador = currentStudent?.id || 1; // Fallback para desarrollo si no hay ID cargado
    const items = cart.map(item => ({
      nombre_plato: item.name,
      cantidad: item.quantity,
      precio_unitario: item.price
    }));

    try {
      // 1. LLAMADA REAL DE CREACIÓN DE PEDIDO (Python Core - Puerto 8001)
      const response = await fetch(`${CORE_API}/api/pedidos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentStudent?.token}`
        },
        body: JSON.stringify({
          id_comprador: idComprador,
          id_restaurante: activeCartRestaurantId,
          lugar_entrega: clientSpotName,
          notas: clientNotes || "",
          items: items
        })
      });

      const data = await response.json();

      // 2. Control de fondos insuficientes (Wallet rechaza el pago)
      if (!response.ok) {
        if (response.status === 402) {
          alert(`🚫 Pago Rechazado: Saldo insuficiente en tu Wallet.\n\n${data.detail || ""}`);
          return { success: false, message: "Saldo insuficiente" };
        }
        alert(`❌ Error al procesar el pedido: ${data.detail || "Error interno"}`);
        return { success: false, message: data.detail };
      }

      // 3. Mapear respuesta del backend a estructura local de React
      const newOrder = {
        id: data.codigo_orden,
        db_id: data.id,
        id_comprador: data.id_comprador || idComprador,
        restaurantId: data.id_restaurante,
        restaurantName: restaurants?.find(r => r.id === data.id_restaurante)?.nombre_local || restaurants?.find(r => r.id === data.id_restaurante)?.name || 'Local Universitario',
        building: restaurants?.find(r => r.id === data.id_restaurante)?.ubicacion_campus || restaurants?.find(r => r.id === data.id_restaurante)?.building || 'Campus',
        clientName: clientName,
        clientSpot: data.lugar_entrega,
        clientNotes: data.notas,
        clientPhone: currentStudent ? currentStudent.phone : '0999999999',
        clientEmail: currentStudent ? currentStudent.email : 'harold@uide.edu.ec',
        id_estudiante: currentStudent ? currentStudent.email : 'harold@uide.edu.ec',
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        deliveryFee: 1.20,
        total: data.total_pagar,
        status: mapBackendStatusToFrontend(data.estado_pedido),
        archivado: data.archivado || false,
        delivererId: null,
        delivererName: null,
        delivererVehicle: null,
        createdAt: data.fecha_creacion
      };

      setOrders(prev => [newOrder, ...prev]);
      clearCart();

      // 4. Refrescar balance de la Billetera del Estudiante (Java Wallet)
      try {
        if (currentStudent && currentStudent.email) {
          const walletRes = await fetch(`${CORE_API}/api/wallet/balance/${currentStudent.email.toLowerCase().trim()}`, {
            headers: {
              'Authorization': `Bearer ${currentStudent?.token}`
            }
          });
          if (walletRes.ok) {
            const walletData = await walletRes.json();
            setCurrentStudent(prev => ({ ...prev, earnings: walletData.balance }));
          }
        }
      } catch (wErr) {
        console.warn("No se pudo recargar saldo tras débito de compra:", wErr);
      }

      return { success: true, order: newOrder };

    } catch (error) {
      console.error("Error placeOrder:", error);
      alert("❌ Error de red: No se pudo conectar al servidor de pedidos.");
      return { success: false, message: "Error de red" };
    }
  };

  // --- MÉTODOS DE AUTENTICACIÓN Y GESTIÓN RESTAURANTE ---

  const loginRestaurant = async (username, password) => {
    const safeUsername = (username || '').toString().trim();
    const safePassword = (password || '').toString();

    console.log(">>> Iniciando POST de login para:", safeUsername);

    try {
      const response = await fetch(`${CORE_API}/api/auth/restaurante/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: safeUsername,
          password: safePassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Usuario o contraseña incorrectos.');
      }

      // Sincronizar catálogo para asegurar que el estado React tiene la información fresca del local
      await fetchRestaurants();

      setCurrentRestaurant(data.restaurant);
      setActiveRestaurantId(data.restaurant.id);
      return { success: true, restaurant: data.restaurant };
    } catch (error) {
      console.error(">>> Fallo real:", error.response?.data || error.message || error);
      return { success: false, message: error.message || 'Usuario o contraseña incorrectos.' };
    }
  };

  const registerRestaurant = async (name, building, especialidades = [], description = '', username, password) => {
    const exists = restaurants.some(r => r.username?.toLowerCase() === username.toLowerCase());
    if (exists) {
      return { success: false, message: 'El usuario de este local ya existe.' };
    }

    try {
      const response = await fetch(`${CORE_API}/api/restaurantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_local: name,
          ubicacion_campus: building,
          username: username.trim(),
          password: password,
          descripcion: description || 'Nuevo restaurante universitario colaborador.',
          especialidades: especialidades,
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
          cover: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al registrar local en el servidor.');
      }

      // Colocar obligatoriamente el await fetchRestaurants() antes de actualizar el estado
      await fetchRestaurants();
      setActiveRestaurantId(data.id);
      return { success: true, restaurant: data };
    } catch (error) {
      console.error("Fallo al guardar:", error);
      return { success: false, message: error.message || 'Error de conexión con el backend.' };
    }
  };

  const logoutRestaurant = () => {
    setActiveRestaurantId(null);
    setCurrentRestaurant(null);
  };

  const changeOrderStatus = async (orderId, nextStatus) => {
    const normalizedNextStatus = (nextStatus || '').toLowerCase().trim();
    if (!orders || !Array.isArray(orders)) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      setOrders(prev => {
        if (!prev || !Array.isArray(prev)) return [];
        return prev.map(o => o.id === orderId ? { ...o, status: normalizedNextStatus } : o);
      });
      return;
    }

    if (!order.db_id && (typeof order.id === 'string' && order.id.startsWith('ORD-'))) {
      alert("Pedido desincronizado, refrescando...");
      if (activeRestaurantId) await fetchRestaurantOrders(activeRestaurantId);
      await fetchCampusOrders();
      return;
    }

    const dbId = order.db_id || order.id;
    let backendStatus = normalizedNextStatus;
    if (normalizedNextStatus === 'pendiente_restaurante' || normalizedNextStatus === 'pendiente') backendStatus = 'Pendiente_Restaurante';
    else if (normalizedNextStatus === 'en_preparacion') backendStatus = 'En_Preparacion';
    else if (normalizedNextStatus === 'listo_para_retirar' || normalizedNextStatus === 'listo_para_recoger') backendStatus = 'Listo_Para_Retirar';
    else if (normalizedNextStatus === 'esperando_entrega_restaurante') backendStatus = 'Esperando_Entrega_Restaurante';
    else if (normalizedNextStatus === 'en_camino') backendStatus = 'En_Camino';
    else if (normalizedNextStatus === 'entregado_repartidor' || normalizedNextStatus === 'entregado') backendStatus = 'Entregado_Repartidor';
    else if (normalizedNextStatus === 'finalizado_confirmado') backendStatus = 'Finalizado_Confirmado';
    else if (normalizedNextStatus === 'rechazado_restaurante') backendStatus = 'Rechazado_Restaurante';

    const token = activeRole === 'restaurant' ? currentRestaurant?.token : currentStudent?.token;

    try {
      const response = await fetch(`${CORE_API}/api/pedidos/${dbId}/estado`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado_pedido: backendStatus.toLowerCase().trim()
        })
      });

      if (response.ok) {
        setOrders(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          return prev.map(o => o.id === orderId ? { ...o, status: normalizedNextStatus } : o);
        });
        await fetchRestaurantOrders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("No se pudo actualizar el estado del pedido en el backend:", errorData.detail || errorData);
        alert(`❌ Error al cambiar estado: ${errorData.detail || "Error en el servidor"}`);
      }
    } catch (error) {
      console.error("Error al actualizar el estado del pedido:", error);
      alert("❌ Error de red: No se pudo conectar con el servidor para actualizar el estado.");
    }
  };

  const updateDishAvailability = async (dishId, available) => {
    if (!dishes || !Array.isArray(dishes)) return;
    const dish = dishes.find(d => d.id === dishId);
    if (!dish) {
      console.error("Plato no encontrado localmente.");
      return;
    }

    const restaurantId = dish.restaurantId;

    try {
      const response = await fetch(`${CORE_API}/api/restaurantes/${restaurantId}/menu/${dishId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentRestaurant?.token}`
        },
        body: JSON.stringify({
          disponible: available
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Fallo al actualizar disponibilidad del plato:", data.detail || data);
        alert(`❌ Error al actualizar disponibilidad: ${data.detail || "Error interno"}`);
        return;
      }

      await syncCatalogWithBackend();
    } catch (error) {
      console.error("Fallo al actualizar disponibilidad del plato:", error);
      alert("❌ Error de red: No se pudo conectar con el servidor.");
    }
  };

  const updateDishPrice = async (dishId, newPrice) => {
    if (!dishes || !Array.isArray(dishes)) return { success: false, message: "Catálogo no disponible." };
    const dish = dishes.find(d => d.id === dishId);
    if (!dish) {
      return { success: false, message: "Plato no encontrado localmente." };
    }

    try {
      const response = await fetch(`${CORE_API}/api/platos/${dishId}/precio`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentRestaurant?.token}`
        },
        body: JSON.stringify({
          precio: parseFloat(newPrice)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Fallo al actualizar precio del plato:", data.detail || data);
        return { success: false, message: data.detail || "Error al actualizar el precio." };
      }

      await syncCatalogWithBackend();
      return { success: true };
    } catch (error) {
      console.error("Fallo al actualizar precio del plato:", error);
      return { success: false, message: "Error de red: No se pudo conectar con el servidor." };
    }
  };

  const addDishToMenu = async (restaurantId, dishData) => {
    try {
      const formData = new FormData();
      formData.append('nombre', dishData.name);
      formData.append('precio', parseFloat(dishData.price));
      formData.append('descripcion', dishData.description || "");
      if (dishData.imageFile) {
        formData.append('imagen', dishData.imageFile);
      }

      const response = await fetch(`${CORE_API}/api/restaurantes/${restaurantId}/menu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentRestaurant?.token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Fallo al guardar:", data.detail || data);
        alert(`❌ Error al agregar plato al backend: ${data.detail || "Error interno"}`);
        return { success: false };
      }

      await syncCatalogWithBackend();
      return { success: true, dish: data };
    } catch (error) {
      console.error("Fallo al guardar:", error.response || error);
      alert("❌ Error de red: No se pudo agregar el plato al servidor.");
      return { success: false };
    }
  };

  const rateRestaurant = async (restaurantId, estrellas) => {
    try {
      const response = await fetch(`${CORE_API}/api/restaurantes/${restaurantId}/calificar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentStudent?.token}`
        },
        body: JSON.stringify({ estrellas: parseInt(estrellas) })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Fallo al calificar restaurante:", data.detail || data);
        alert(`❌ Error al calificar local: ${data.detail || "Error interno"}`);
        return { success: false };
      }

      await fetchRestaurants();
      return { success: true };
    } catch (error) {
      console.error("Fallo al calificar restaurante:", error);
      alert("❌ Error de red: No se pudo enviar la calificación.");
      return { success: false };
    }
  };

  // --- MÉTODOS DE GESTIÓN REPARTIDOR (AHORA FACETA DEL ESTUDIANTE) ---

  const toggleDelivererOnline = () => {
    if (!currentStudent) return;
    setCurrentStudent(prev => ({ ...prev, isOnline: !prev.isOnline }));
  };

  const updateDelivererVehicle = (vehicle) => {
    if (!currentStudent) return;
    setCurrentStudent(prev => ({ ...prev, vehicle }));
  };

  const acceptOrder = async (orderId, studentEmail) => {
    if (!currentStudent) return { success: false, message: "No autenticado" };
    if (!orders || !Array.isArray(orders)) return { success: false, message: "No orders" };

    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return { success: false, message: "Pedido no encontrado" };

    if (!targetOrder.db_id && (typeof targetOrder.id === 'string' && targetOrder.id.startsWith('ORD-'))) {
      alert("Pedido desincronizado, refrescando...");
      await fetchCampusOrders();
      return { success: false, message: "Pedido desincronizado" };
    }

    const dbId = targetOrder.db_id || targetOrder.id;
    const idRepartidor = currentStudent.id || 1;

    try {
      // 1. Petición PUT al backend (api-python-core - Puerto 8001)
      const response = await fetch(`${CORE_API}/api/pedidos/${dbId}/aceptar`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentStudent?.token}`
        },
        body: JSON.stringify({
          id_repartidor: idRepartidor
        })
      });

      const data = await response.json();

      // 2. Control de fraude (No auto-despacharse pedidos propios)
      if (!response.ok) {
        if (response.status === 403) {
          alert(`🚫 Prevención de Fraudes: No puedes aceptar y entregar tu propio pedido.`);
          return { success: false, message: "Auto-despacho bloqueado" };
        }
        alert(`❌ Error al aceptar el pedido: ${data.detail || "Error interno"}`);
        return { success: false, message: data.detail };
      }

      setOrders(prev => {
        if (!prev || !Array.isArray(prev)) return [];
        return prev.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: 'listo_para_retirar',
                delivererId: currentStudent.email, 
                delivererName: currentStudent.name,
                delivererVehicle: currentStudent.vehicle,
                delivererPhone: currentStudent.phone || '0999999999'
              } 
            : order
        );
      });
      
      // Persistencia: Guardar ID en localStorage
      localStorage.setItem('unibites_active_order_id', dbId.toString());
      
      return { success: true };

    } catch (error) {
      console.error("Error acceptOrder:", error);
      alert("❌ Error de red al intentar aceptar el pedido.");
      return { success: false, message: "Error de red" };
    }
  };

  const completeOrder = async (orderId) => {
    if (!orders || !Array.isArray(orders)) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (!order.db_id && (typeof order.id === 'string' && order.id.startsWith('ORD-'))) {
      alert("Pedido desincronizado, refrescando...");
      await fetchCampusOrders();
      return;
    }

    const dbId = order.db_id || order.id;

    try {
      // 1. LLAMADA AL BACKEND PARA REGISTRAR ENTREGA
      const response = await fetch(`${CORE_API}/api/pedidos/${dbId}/estado`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentStudent?.token}`
        },
        body: JSON.stringify({
          estado_pedido: 'Entregado_Repartidor'
        })
      });

      if (response.ok) {
        setOrders(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          return prev.map(o => 
            o.id === orderId ? { ...o, status: 'entregado_repartidor' } : o
          );
        });
        // Remover ID de localStorage al ser completada la entrega por el repartidor
        localStorage.removeItem('unibites_active_order_id');
      } else {
        const data = await response.json();
        alert(`❌ Error al entregar el pedido: ${data.detail || "Error interno"}`);
      }
    } catch (error) {
      console.error("Error completeOrder:", error);
    }
  };

  const archiveOrder = async (orderId) => {
    if (!orders || !Array.isArray(orders)) return { success: false, message: "No orders" };
    const order = orders.find(o => o.id === orderId);

    if (!order.db_id && (typeof order.id === 'string' && order.id.startsWith('ORD-'))) {
      alert("Pedido desincronizado, refrescando...");
      if (activeRestaurantId) await fetchRestaurantOrders(activeRestaurantId);
      await fetchCampusOrders();
      return { success: false, message: "Pedido desincronizado" };
    }

    const dbId = order.db_id || order.id;
    const token = activeRole === 'restaurant' ? currentRestaurant?.token : currentStudent?.token;
    try {
      const response = await fetch(`${CORE_API}/api/pedidos/${dbId}/archivar`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remover de localStorage si es el pedido que teníamos activo
        const activeOrderId = localStorage.getItem('unibites_active_order_id');
        if (activeOrderId === dbId.toString() || activeOrderId === orderId.toString()) {
          localStorage.removeItem('unibites_active_order_id');
        }
        setOrders(prev => prev.filter(o => o.id !== orderId));
        return { success: true };
      } else {
        const data = await response.json();
        console.error("Error al archivar pedido:", data.detail || data);
        return { success: false, message: data.detail || "Error al archivar" };
      }
    } catch (error) {
      console.error("Error al archivar el pedido:", error);
      return { success: false, message: "Error de red" };
    }
  };

  // --- CARGA DINÁMICA DE DETALLES DE UN PEDIDO INDIVIDUAL ---
  const fetchOrderDetails = useCallback(async (orderId) => {
    if (!orderId) return null;
    const token = activeRoleRef.current === 'restaurant' ? currentRestaurantRef.current?.token : currentStudentRef.current?.token;
    try {
      const response = await fetch(`${CORE_API}/api/pedidos/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const o = await response.json();
        if (!o) return null;

        const isCompradorMe = o.id_comprador === currentStudent?.id;
        const compradorData = registeredStudents?.find(s => s.id === o.id_comprador);
        const isRepartidorMe = o.id_repartidor === currentStudent?.id;
        const repartidorData = registeredStudents?.find(s => s.id === o.id_repartidor);

        const updatedOrder = {
          id: o.codigo_orden,
          db_id: o.id,
          id_comprador: o.id_comprador,
          restaurantId: o.id_restaurante,
          restaurantName: restaurants?.find(r => r.id === o.id_restaurante)?.nombre_local || 'Local Universitario',
          building: restaurants?.find(r => r.id === o.id_restaurante)?.ubicacion_campus || 'Campus',
          clientName: o.client_name || (isCompradorMe 
            ? `${currentStudent.firstName} ${currentStudent.lastName}` 
            : (compradorData ? `${compradorData.firstName} ${compradorData.lastName}` : 'Compañero Universitario')),
          clientSpot: o.lugar_entrega,
          clientNotes: o.notas,
          clientPhone: o.client_phone || (isCompradorMe 
            ? currentStudent.phone 
            : (compradorData?.phone || '0999999999')),
          clientEmail: isCompradorMe 
            ? currentStudent.email 
            : (compradorData?.email || 'estudiante@uide.edu.ec'),
          id_estudiante: isCompradorMe 
            ? currentStudent.email 
            : (compradorData?.email || 'estudiante@uide.edu.ec'),
          items: o.detalles ? o.detalles.map(d => ({ id: d.id, name: d.nombre_plato, quantity: d.cantidad || d.quantity, price: d.precio_unitario })) : [],
          subtotal: o.total_pagar - 1.20,
          deliveryFee: 1.20,
          total: o.total_pagar,
          status: mapBackendStatusToFrontend(o.estado_pedido),
          archivado: o.archivado || false,
          delivererId: o.id_repartidor 
            ? (isRepartidorMe ? currentStudent.email : (repartidorData?.email || o.id_repartidor)) 
            : null,
          delivererName: o.id_repartidor 
            ? (o.deliverer_name || (isRepartidorMe ? currentStudent.name : (repartidorData?.name || 'Compañero Repartidor'))) 
            : null,
          delivererVehicle: o.id_repartidor 
            ? (isRepartidorMe ? currentStudent.vehicle : (repartidorData?.vehicle || 'Bicicleta')) 
            : null,
          sugerenciaRuta: o.sugerencia_ruta || o.sugerenciaRuta || '',
          createdAt: o.fecha_creacion
        };

        setOrders(prev => {
          if (!prev || !Array.isArray(prev)) return [updatedOrder];
          const exists = prev.some(order => order.id === orderId || order.db_id === o.id);
          if (exists) {
            return prev.map(order => order.id === orderId || order.db_id === o.id ? updatedOrder : order);
          } else {
            return [updatedOrder, ...prev];
          }
        });
        return updatedOrder;
      } else if (response.status === 404) {
        console.warn(`Pedido con ID ${orderId} no encontrado (404). Limpiando de localStorage.`);
        const activeOrderId = localStorage.getItem('unibites_active_order_id');
        if (activeOrderId === orderId.toString()) {
          localStorage.removeItem('unibites_active_order_id');
        }
      }
    } catch (error) {
      console.warn("No se pudo obtener detalles del pedido:", error);
    }
    return null;
  }, [currentStudent, registeredStudents, restaurants]);

  // --- CARGA DINÁMICA DE PEDIDOS PARA EL RESTAURANTE ---
  const fetchRestaurantOrders = useCallback(async (restaurantId = activeRestaurantId) => {
    if (!restaurantId) return [];
    try {
      const response = await fetch(`${CORE_API}/api/restaurantes/${restaurantId}/pedidos`, {
        headers: {
          'Authorization': `Bearer ${currentRestaurant?.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (!data || !Array.isArray(data)) return [];
        const mapped = data.map(o => {
          const isCompradorMe = o.id_comprador === currentStudent?.id;
          const compradorData = registeredStudents?.find(s => s.id === o.id_comprador);
          const isRepartidorMe = o.id_repartidor === currentStudent?.id;
          const repartidorData = registeredStudents?.find(s => s.id === o.id_repartidor);

          return {
            id: o.codigo_orden,
            db_id: o.id,
            id_comprador: o.id_comprador,
            restaurantId: o.id_restaurante,
            restaurantName: restaurants?.find(r => r.id === o.id_restaurante)?.nombre_local || 'Local Universitario',
            building: restaurants?.find(r => r.id === o.id_restaurante)?.ubicacion_campus || 'Campus',
            clientName: o.client_name || (isCompradorMe 
              ? `${currentStudent.firstName} ${currentStudent.lastName}` 
              : (compradorData ? `${compradorData.firstName} ${compradorData.lastName}` : 'Compañero Universitario')),
            clientSpot: o.lugar_entrega,
            clientNotes: o.notas || '',
            clientPhone: o.client_phone || (isCompradorMe 
              ? currentStudent.phone 
              : (compradorData?.phone || '0999999999')),
            clientEmail: isCompradorMe 
              ? currentStudent.email 
              : (compradorData?.email || 'estudiante@uide.edu.ec'),
            id_estudiante: isCompradorMe 
              ? currentStudent.email 
              : (compradorData?.email || 'estudiante@uide.edu.ec'),
            items: o.detalles ? o.detalles.map(d => ({ id: d.id, name: d.nombre_plato, quantity: d.cantidad || d.quantity, price: d.precio_unitario })) : [],
            subtotal: o.total_pagar - 1.20,
            deliveryFee: 1.20,
            total: o.total_pagar,
            status: mapBackendStatusToFrontend(o.estado_pedido),
            archivado: o.archivado || false,
            delivererId: o.id_repartidor 
              ? (isRepartidorMe ? currentStudent.email : (repartidorData?.email || o.id_repartidor)) 
              : null,
            delivererName: o.id_repartidor 
              ? (o.deliverer_name || (isRepartidorMe ? currentStudent.name : (repartidorData?.name || 'Compañero Repartidor'))) 
              : null,
            delivererVehicle: o.id_repartidor 
              ? (isRepartidorMe ? currentStudent.vehicle : (repartidorData?.vehicle || 'Bicicleta')) 
              : null,
            sugerenciaRuta: o.sugerencia_ruta || o.sugerenciaRuta || '',
            createdAt: o.fecha_creacion
          };
        });

        setOrders(prev => {
          if (!prev || !Array.isArray(prev)) return mapped.filter(o => !o.archivado);
          const localOnly = prev.filter(p => !mapped.some(m => m.id === p.id));
          return [...localOnly, ...mapped].filter(o => !o.archivado);
        });
        
        return mapped;
      } else if (response.status === 404) {
        console.warn(`WARNING: El restaurante con ID ${restaurantId} no existe en la base de datos (404). Deslogueando.`);
        if (restaurantId === activeRestaurantId) {
          logoutRestaurant();
        }
      }
    } catch (error) {
      console.warn("No se pudo obtener pedidos del restaurante con el backend:", error);
    }
    return [];
  }, [activeRestaurantId, currentStudent, registeredStudents, restaurants]);

  // --- CARGA DINÁMICA DE PEDIDOS EN CAMPUS ---
  const fetchCampusOrders = useCallback(async () => {
    try {
      // 1. Verificación de activeOrderId guardado en localStorage (Persistencia del Repartidor)
      const savedActiveOrderId = localStorage.getItem('unibites_active_order_id');
      if (savedActiveOrderId) {
        console.log("Persistencia: Recuperando pedido activo desde local storage:", savedActiveOrderId);
        await fetchOrderDetails(savedActiveOrderId);
      } else if (currentStudent && currentStudent.email) {
        // 2. Si no hay activeOrderId en localStorage, consultar backend para sincronizar (Sincronización del Estado Perdido)
        try {
          const activeRes = await fetch(`${CORE_API}/api/pedidos/repartidor/${currentStudent.email.toLowerCase().trim()}`, {
            headers: {
              'Authorization': `Bearer ${currentStudent.token}`
            }
          });
          if (activeRes.ok) {
            const activeOrderData = await activeRes.json();
            if (activeOrderData && activeOrderData.id) {
              console.log("Sincronización: Detectado pedido activo asignado al repartidor desde el backend:", activeOrderData.id);
              localStorage.setItem('unibites_active_order_id', activeOrderData.id.toString());
              await fetchOrderDetails(activeOrderData.id);
            }
          }
        } catch (activeErr) {
          console.warn("No se pudo consultar pedido activo del repartidor en el backend:", activeErr);
        }
      }

      // 2.1 Sincronización del Comprador: Obtener los pedidos activos creados por el estudiante
      if (currentStudent && currentStudent.email) {
        try {
          const compradorRes = await fetch(`${CORE_API}/api/pedidos/comprador/${currentStudent.email.toLowerCase().trim()}`, {
            headers: {
              'Authorization': `Bearer ${currentStudent.token}`
            }
          });
          if (compradorRes.ok) {
            const compradorData = await compradorRes.json();
            if (compradorData && Array.isArray(compradorData)) {
              const mappedComprador = compradorData.map(o => {
                const isCompradorMe = o.id_comprador === currentStudent?.id;
                const compradorStudent = registeredStudents?.find(s => s.id === o.id_comprador);
                const isRepartidorMe = o.id_repartidor === currentStudent?.id;
                const repartidorData = registeredStudents?.find(s => s.id === o.id_repartidor);

                return {
                  id: o.codigo_orden,
                  db_id: o.id,
                  id_comprador: o.id_comprador,
                  restaurantId: o.id_restaurante,
                  restaurantName: restaurants?.find(r => r.id === o.id_restaurante)?.nombre_local || 'Local Universitario',
                  building: restaurants?.find(r => r.id === o.id_restaurante)?.ubicacion_campus || 'Campus',
                  clientName: o.client_name || (isCompradorMe 
                    ? `${currentStudent.firstName} ${currentStudent.lastName}` 
                    : (compradorStudent ? `${compradorStudent.firstName} ${compradorStudent.lastName}` : 'Compañero Universitario')),
                  clientSpot: o.lugar_entrega,
                  clientNotes: o.notas,
                  clientPhone: o.client_phone || (isCompradorMe 
                    ? currentStudent.phone 
                    : (compradorStudent?.phone || '0999999999')),
                  clientEmail: isCompradorMe 
                    ? currentStudent.email 
                    : (compradorStudent?.email || 'estudiante@uide.edu.ec'),
                  id_estudiante: isCompradorMe 
                    ? currentStudent.email 
                    : (compradorStudent?.email || 'estudiante@uide.edu.ec'),
                  items: o.detalles ? o.detalles.map(d => ({ id: d.id, name: d.nombre_plato, quantity: d.cantidad || d.quantity, price: d.precio_unitario })) : [],
                  subtotal: o.total_pagar - 1.20,
                  deliveryFee: 1.20,
                  total: o.total_pagar,
                  status: mapBackendStatusToFrontend(o.estado_pedido),
                  archivado: o.archivado || false,
                  delivererId: o.id_repartidor 
                    ? (isRepartidorMe ? currentStudent.email : (repartidorData?.email || o.id_repartidor)) 
                    : null,
                  delivererName: o.id_repartidor 
                    ? (o.deliverer_name || (isRepartidorMe ? currentStudent.name : (repartidorData?.name || 'Compañero Repartidor'))) 
                    : null,
                  delivererVehicle: o.id_repartidor 
                    ? (isRepartidorMe ? currentStudent.vehicle : (repartidorData?.vehicle || 'Bicicleta')) 
                    : null,
                  sugerenciaRuta: o.sugerencia_ruta || o.sugerenciaRuta || '',
                  createdAt: o.fecha_creacion
                };
              });

              setOrders(prev => {
                if (!prev || !Array.isArray(prev)) return mappedComprador.filter(o => !o.archivado);
                const localOnly = prev.filter(p => !mappedComprador.some(m => m.id === p.id));
                return [...localOnly, ...mappedComprador].filter(o => !o.archivado);
              });
            }
          }
        } catch (compradorErr) {
          console.warn("No se pudo consultar pedidos activos del comprador en el backend:", compradorErr);
        }
      }

      // Sincronizar saldo de Wallet del estudiante logueado periódicamente a través del proxy de FastAPI
      if (currentStudent && currentStudent.email) {
        try {
          const walletRes = await fetch(`${CORE_API}/api/wallet/balance/${currentStudent.email.toLowerCase().trim()}`, {
            headers: {
              'Authorization': `Bearer ${currentStudent.token}`
            }
          });
          if (walletRes.ok) {
            const walletData = await walletRes.json();
            setCurrentStudent(prev => {
              if (prev && prev.earnings !== walletData.balance) {
                return { ...prev, earnings: walletData.balance };
              }
              return prev;
            });
          }
        } catch (wErr) {
          console.warn("No se pudo sincronizar saldo del estudiante:", wErr);
        }
      }

      const response = await fetch(`${CORE_API}/api/pedidos/campus`, {
        headers: {
          'Authorization': `Bearer ${currentStudent?.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (!data || !Array.isArray(data)) return;
        const mapped = data.map(o => {
          const isCompradorMe = o.id_comprador === currentStudent?.id;
          const compradorData = registeredStudents?.find(s => s.id === o.id_comprador);
          const isRepartidorMe = o.id_repartidor === currentStudent?.id;
          const repartidorData = registeredStudents?.find(s => s.id === o.id_repartidor);

          return {
            id: o.codigo_orden,
            db_id: o.id,
            id_comprador: o.id_comprador,
            restaurantId: o.id_restaurante,
            restaurantName: restaurants?.find(r => r.id === o.id_restaurante)?.nombre_local || 'Local Universitario',
            building: restaurants?.find(r => r.id === o.id_restaurante)?.ubicacion_campus || 'Campus',
            clientName: o.client_name || (isCompradorMe 
              ? `${currentStudent.firstName} ${currentStudent.lastName}` 
              : (compradorData ? `${compradorData.firstName} ${compradorData.lastName}` : 'Compañero Universitario')),
            clientSpot: o.lugar_entrega,
            clientNotes: o.notas,
            clientPhone: o.client_phone || (isCompradorMe 
              ? currentStudent.phone 
              : (compradorData?.phone || '0999999999')),
            clientEmail: isCompradorMe 
              ? currentStudent.email 
              : (compradorData?.email || 'estudiante@uide.edu.ec'),
            id_estudiante: isCompradorMe 
              ? currentStudent.email 
              : (compradorData?.email || 'estudiante@uide.edu.ec'),
            items: o.detalles ? o.detalles.map(d => ({ id: d.id, name: d.nombre_plato, quantity: d.cantidad || d.quantity, price: d.precio_unitario })) : [],
            subtotal: o.total_pagar - 1.20,
            deliveryFee: 1.20,
            total: o.total_pagar,
            status: mapBackendStatusToFrontend(o.estado_pedido),
            archivado: o.archivado || false,
            delivererId: o.id_repartidor 
              ? (isRepartidorMe ? currentStudent.email : (repartidorData?.email || o.id_repartidor)) 
              : null,
            delivererName: o.id_repartidor 
              ? (o.deliverer_name || (isRepartidorMe ? currentStudent.name : (repartidorData?.name || 'Compañero Repartidor'))) 
              : null,
            delivererVehicle: o.id_repartidor 
              ? (isRepartidorMe ? currentStudent.vehicle : (repartidorData?.vehicle || 'Bicicleta')) 
              : null,
            sugerenciaRuta: o.sugerencia_ruta || o.sugerenciaRuta || '',
            createdAt: o.fecha_creacion
          };
        });
        
        setOrders(prev => {
          if (!prev || !Array.isArray(prev)) return mapped.filter(o => !o.archivado);
          const localOnly = prev.filter(p => !mapped.some(m => m.id === p.id));
          return [...localOnly, ...mapped].filter(o => !o.archivado);
        });
      }
    } catch (error) {
      console.warn("No se pudo sincronizar pedidos del campus con el backend:", error);
    }
  }, [currentStudent, registeredStudents, restaurants, fetchOrderDetails]);

  // refs para el ciclo de polling global
  const activeRoleRef = useRef(activeRole);
  const activeRestaurantIdRef = useRef(activeRestaurantId);
  const currentStudentRef = useRef(currentStudent);
  const fetchRestaurantOrdersRef = useRef(fetchRestaurantOrders);
  const fetchCampusOrdersRef = useRef(fetchCampusOrders);
  const fetchOrderDetailsRef = useRef(fetchOrderDetails);
  const ordersRef = useRef(orders);

  useEffect(() => {
    activeRoleRef.current = activeRole;
    activeRestaurantIdRef.current = activeRestaurantId;
    currentStudentRef.current = currentStudent;
    fetchRestaurantOrdersRef.current = fetchRestaurantOrders;
    fetchCampusOrdersRef.current = fetchCampusOrders;
    fetchOrderDetailsRef.current = fetchOrderDetails;
    ordersRef.current = orders;
  });

  // Polling global centralizado y seguro
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const poll = async () => {
      if (!isMounted) return;

      if (document.hidden) {
        timeoutId = setTimeout(poll, 5000);
        return;
      }

      try {
        const activeResId = activeRestaurantIdRef.current;
        const student = currentStudentRef.current;

        if (activeResId) {
          await fetchRestaurantOrdersRef.current(activeResId);
        }

        if (student) {
          await fetchCampusOrdersRef.current();

          // Refrescar los detalles de pedidos activos (no confirmados/finalizados)
          if (ordersRef.current && Array.isArray(ordersRef.current)) {
            const activeOrders = ordersRef.current.filter(o => o.status !== 'finalizado_confirmado');
            for (const order of activeOrders) {
              const searchId = order.db_id || order.id;
              await fetchOrderDetailsRef.current(searchId);
            }
          }
        }
      } catch (err) {
        console.warn("Error en el ciclo de polling global:", err);
      }

      if (isMounted) {
        timeoutId = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // 3. useEffect de Inicialización de la Aplicación
  useEffect(() => {
    const initApp = async () => {
      let isStudentValid = true;
      let isRestaurantValid = true;

      // 3.1. Verificar persistencia (localStorage) de estudiante
      if (currentStudent && currentStudent.email) {
        try {
          const res = await fetch(`${CORE_API}/api/auth/estudiante/verificar/${currentStudent.email.toLowerCase().trim()}`);
          if (!res.ok) {
            console.warn("Estudiante persistido no encontrado en el backend (ej. tras reinicio DB). Limpiando localStorage.");
            logoutStudent();
            isStudentValid = false;
          }
        } catch (err) {
          console.error("Error al validar estudiante persistido:", err);
        }
      }

      // 3.2. Verificar persistencia (localStorage) de restaurante
      if (activeRestaurantId) {
        try {
          const res = await fetch(`${CORE_API}/api/restaurantes`);
          if (res.ok) {
            const data = await res.json();
            const exists = data && Array.isArray(data) && data.some(r => r.id === activeRestaurantId);
            if (!exists) {
              console.warn("Restaurante persistido no encontrado en el backend (ej. tras reinicio DB). Limpiando localStorage.");
              logoutRestaurant();
              isRestaurantValid = false;
            }
          }
        } catch (err) {
          console.error("Error al validar restaurante persistido:", err);
        }
      }

      // 3.3. Carga de datos si las validaciones no las invalidaron
      if (isStudentValid || isRestaurantValid) {
        try {
          await syncCatalogWithBackend();
          
          if (activeRestaurantId && isRestaurantValid) {
            await fetchRestaurantOrders(activeRestaurantId);
          }
          
          await fetchCampusOrders();
        } catch (loadErr) {
          console.error("Error al cargar datos iniciales del catálogo/pedidos:", loadErr);
        }
      }
    };

    initApp();
  }, [activeRestaurantId, currentStudent?.email, fetchRestaurantOrders, fetchCampusOrders, syncCatalogWithBackend]);

  // 4. Persistir en LocalStorage al haber cambios (Al final del archivo)
  useEffect(() => {
    if (currentStudent) {
      localStorage.setItem('unibites_current_student', JSON.stringify(currentStudent));
    } else {
      localStorage.removeItem('unibites_current_student');
    }
  }, [currentStudent]);

  useEffect(() => {
    localStorage.setItem('unibites_restaurants', JSON.stringify(restaurants));
  }, [restaurants]);

  useEffect(() => {
    localStorage.setItem('unibites_dishes', JSON.stringify(dishes));
  }, [dishes]);

  useEffect(() => {
    localStorage.setItem('unibites_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('unibites_registered_students', JSON.stringify(registeredStudents));
  }, [registeredStudents]);

  useEffect(() => {
    localStorage.setItem('unibites_cart', JSON.stringify(cart));
    localStorage.setItem('unibites_cart_restaurant_id', activeCartRestaurantId || '');
  }, [cart, activeCartRestaurantId]);

  useEffect(() => {
    if (activeRestaurantId) {
      localStorage.setItem('unibites_active_restaurant_id', activeRestaurantId.toString());
    } else {
      localStorage.removeItem('unibites_active_restaurant_id');
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    if (currentRestaurant) {
      localStorage.setItem('unibites_current_restaurant', JSON.stringify(currentRestaurant));
    } else {
      localStorage.removeItem('unibites_current_restaurant');
    }
  }, [currentRestaurant]);

  return (
    <AppContext.Provider value={{
      activeRole,
      setActiveRole,
      currentStudent,
      currentRestaurant,
      setCurrentRestaurant,
      showWelcome,
      setShowWelcome,
      loginStudent,
      registerStudent,
      logoutStudent,
      restaurants,
      dishes,
      orders,
      cart,
      activeCartRestaurantId,
      activeRestaurantId,
      setActiveRestaurantId,
      addToCart,
      updateCartQuantity,
      clearCart,
      placeOrder,
      loginRestaurant,
      registerRestaurant,
      logoutRestaurant,
      changeOrderStatus,
      updateDishAvailability,
      updateDishPrice,
      addDishToMenu,
      toggleDelivererOnline,
      updateDelivererVehicle,
      acceptOrder,
      completeOrder,
      fetchRestaurantOrders,
      fetchCampusOrders,
      fetchOrderDetails,
      fetchRestaurants,
      rateRestaurant,
      archiveOrder
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
