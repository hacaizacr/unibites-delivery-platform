export const campusSpots = [
  { id: 'spot1', name: 'Biblioteca, Librería y Admisiones', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot2', name: 'Caballerizas', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot3', name: 'Colibrí (Billar)', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot4', name: 'College', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot5', name: 'Edificio Administrativo', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot6', name: 'Edificio de Aulas Marcelo Fernandez', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot7', name: 'Edificio de Gastronomía', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot8', name: 'Edificio de Ingeniería Automotriz', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot9', name: 'Edificio de Marketing y Deportes', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot10', name: 'Facultad de Ciencias Médicas de la Salud y de la Vida', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot11', name: 'Food Trucks', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot12', name: 'Hannaska', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot13', name: 'Piedra Negra de Aulas', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot14', name: 'Piedra Negra de Ciencias Médicas', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot15', name: 'Repositorio y Bodegas', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot16', name: 'Residencias Estudiantiles', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot17', name: 'Salón Auditorio Marcelo Fernández', floor: 'Campus', detail: 'UIDE' },
  { id: 'spot18', name: 'Taller Mecánico', floor: 'Campus', detail: 'UIDE' }
];

export const mockRestaurants = [
  {
    id: 1,
    name: 'Comedor Central Universitario',
    rating: 4.8,
    reviews: '120+ calificaciones',
    waitTime: '15-20 min',
    tag: 'Almuerzos',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    building: 'Edificio Central - Planta Baja',
    description: 'Comida casera, almuerzos universitarios completos y opciones vegetarianas a precios accesibles.',
    active: true
  },
  {
    id: 2,
    name: 'El Rincón de la FING',
    rating: 4.6,
    reviews: '85 calificaciones',
    waitTime: '10-15 min',
    tag: 'Bebidas y Snacks',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80',
    building: 'Facultad de Ingeniería - Bloque B',
    description: 'Hamburguesas premium, hot dogs, wraps crujientes y café bien cargado para tus jornadas de estudio.',
    active: true
  },
  {
    id: 3,
    name: 'Cafetería de Ciencias',
    rating: 4.5,
    reviews: '64 calificaciones',
    waitTime: '8-12 min',
    tag: 'Cafetería',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&q=80',
    building: 'Facultad de Ciencias Naturales',
    description: 'Opciones de comida saludable, jugos naturales, fruta fresca picada, repostería y pan de masa madre.',
    active: true
  },
  {
    id: 4,
    name: 'Snacks de la U',
    rating: 4.2,
    reviews: '40 calificaciones',
    waitTime: '5-8 min',
    tag: 'Snacks',
    image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80',
    building: 'Ciencias Sociales - Pasillo C',
    description: 'Galletas, snacks salados, bebidas frías, caramelos y golosinas para recargar energía rápido.',
    active: true
  }
];

export const mockDishes = [
  // Comedor Central (ID 1)
  {
    id: 101,
    restaurantId: 1,
    name: 'Menú Ejecutivo del Día',
    price: 3.50,
    description: 'Sopa casera de verduras, filete de pechuga de pollo a la plancha o ensalada con falafel, guarnición de arroz integral, menestra y jugo natural de fruta de temporada.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    category: 'Almuerzos',
    available: true
  },
  {
    id: 102,
    restaurantId: 1,
    name: 'Menú del Estudiante (Económico)',
    price: 2.00,
    description: 'Plato fuerte consistente en porción de proteína del día (carne de res o soya), porción de arroz, fréjoles guisados y plátano maduro frito.',
    image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&q=80',
    category: 'Almuerzos',
    available: true
  },
  {
    id: 103,
    restaurantId: 1,
    name: 'Porción de Papas Rústicas',
    price: 1.50,
    description: 'Papas fritas con corte rústico sazonadas con sal de mar y finas hierbas. Acompañadas de aderezo casero.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80',
    category: 'Snacks',
    available: true
  },

  // El Rincón de la FING (ID 2)
  {
    id: 201,
    restaurantId: 2,
    name: 'FING Burger Doble Queso',
    price: 4.50,
    description: 'Doble hamburguesa de res premium de 120g en pan brioche artesanal, doble queso cheddar fundido, lechuga hidropónica, rodaja de tomate fresco y salsa especial de la casa.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    category: 'Almuerzos',
    available: true
  },
  {
    id: 202,
    restaurantId: 2,
    name: 'Wrap de Pollo Crispy',
    price: 3.80,
    description: 'Tortilla de trigo gigante rellena de pollo crujiente empanizado, tocino ahumado, tomate picado, queso mozzarella, lechuga romana y aderezo César.',
    image: 'https://images.unsplash.com/photo-1626700051175-6518c4793f4f?w=400&q=80',
    category: 'Almuerzos',
    available: true
  },
  {
    id: 203,
    restaurantId: 2,
    name: 'Café Cappuccino Doble',
    price: 1.80,
    description: 'Doble shot de espresso premium con leche vaporizada y espuma cremosa, decorado con una lluvia fina de canela o chocolate amargo.',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
    category: 'Bebidas',
    available: true
  },

  // Cafetería de Ciencias (ID 3)
  {
    id: 301,
    restaurantId: 3,
    name: 'Ensalada del Huerto Científico',
    price: 3.80,
    description: 'Cama crujiente de lechugas orgánicas, rúcula y espinaca, pechuga de pollo a las finas hierbas desmechada, aguacate en rodajas, tomates cherry, almendras laminadas y vinagreta de miel y mostaza.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    category: 'Almuerzos',
    available: true
  },
  {
    id: 302,
    restaurantId: 3,
    name: 'Sandwich Caprese en Pan de Masa Madre',
    price: 3.20,
    description: 'Mozzarella de búfala fresca, rodajas de tomate italiano fresco, hojas tiernas de albahaca orgánica y pesto cremoso en pan de masa madre artesanal y tostado al grill.',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80',
    category: 'Snacks',
    available: true
  },
  {
    id: 303,
    restaurantId: 3,
    name: 'Smoothie Verde Antioxidante',
    price: 2.50,
    description: 'Batido saludable e hiper-refrescante de espinaca, piña madura, manzana verde, jengibre fresco, jugo de naranja recién exprimido y semillas de chía hidratadas.',
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80',
    category: 'Bebidas',
    available: true
  },

  // Snacks de la U (ID 4)
  {
    id: 401,
    restaurantId: 4,
    name: 'Combo Medialunas + Café',
    price: 1.50,
    description: 'Un delicioso café negro tipo americano caliente acompañado de 2 esponjosas medialunas dulces horneadas el mismo día.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    category: 'Cafetería',
    available: true
  },
  {
    id: 402,
    restaurantId: 4,
    name: 'Empanada de Horno Jamón y Queso',
    price: 1.20,
    description: 'Empanada horneada de masa de hojaldre crujiente rellena con trozos de jamón york y abundante queso mozzarella fundido.',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80',
    category: 'Snacks',
    available: true
  },
  {
    id: 403,
    restaurantId: 4,
    name: 'Té Helado de Durazno Natural 500ml',
    price: 1.00,
    description: 'Infusión casera de té negro saborizada con pulpa de durazno dulce y servida bien helada con rodajas de limón real.',
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&q=80',
    category: 'Bebidas',
    available: true
  }
];

export const initialOrders = [
  {
    id: 'ORD-9823',
    restaurantId: 2,
    restaurantName: 'El Rincón de la FING',
    building: 'Facultad de Ingeniería - Bloque B',
    clientName: 'Alejandro Domínguez',
    clientSpot: 'College',
    clientNotes: 'Entregar en el bloque del College. Estoy de polera negra.',
    clientEmail: 'alejandro@uide.edu.ec',
    id_estudiante: 'alejandro@uide.edu.ec',
    items: [
      { id: 201, name: 'FING Burger Doble Queso', quantity: 1, price: 4.50 },
      { id: 203, name: 'Café Cappuccino Doble', quantity: 1, price: 1.80 }
    ],
    subtotal: 6.30,
    deliveryFee: 1.00,
    total: 7.30,
    status: 'listo_para_recoger', // pendiente, en_preparacion, listo_para_recoger, en_camino, entregado
    delivererId: null,
    delivererName: null,
    delivererVehicle: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // hace 30 minutos
  },
  {
    id: 'ORD-1042',
    restaurantId: 3,
    restaurantName: 'Cafetería de Ciencias',
    building: 'Facultad de Ciencias Naturales',
    clientName: 'Daniela Montes',
    clientSpot: 'Biblioteca, Librería y Admisiones',
    clientNotes: 'En las mesas de la biblioteca. Por favor entrar sin hacer ruido.',
    clientEmail: 'daniela@uide.edu.ec',
    id_estudiante: 'daniela@uide.edu.ec',
    items: [
      { id: 301, name: 'Ensalada del Huerto Científico', quantity: 1, price: 3.80 },
      { id: 303, name: 'Smoothie Verde Antioxidante', quantity: 1, price: 2.50 }
    ],
    subtotal: 6.30,
    deliveryFee: 1.20,
    total: 7.50,
    status: 'en_preparacion',
    delivererId: null,
    delivererName: null,
    delivererVehicle: null,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() // hace 10 minutos
  }
];
