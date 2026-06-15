import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .models import Restaurante, Plato
from .routes import auth, catalog, orders
from .security import hash_password

# Create database tables dynamically if they don't exist.
# Recreate tables if old schema is detected to apply the change automatically.
try:
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if "restaurantes" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("restaurantes")]
        if "total_votos" not in columns:
            print("Schema change detected: 'total_votos' column is missing in 'restaurantes'. Recreating database tables...")
            Base.metadata.drop_all(bind=engine)
            print("Database tables dropped successfully.")
    Base.metadata.create_all(bind=engine)
    print("PostgreSQL Core Tables verified/created successfully.")
    
    # Create dynamic database view vista_cliente_para_repartidor
    from sqlalchemy import text
    with engine.connect() as conn:
        res = conn.execute(text("SELECT relkind FROM pg_class WHERE relname = 'vista_cliente_para_repartidor'")).fetchone()
        if res:
            if res[0] == 'r':
                conn.execute(text("DROP TABLE vista_cliente_para_repartidor CASCADE;"))
            elif res[0] == 'v':
                conn.execute(text("DROP VIEW vista_cliente_para_repartidor CASCADE;"))
        
        conn.execute(text("""
            CREATE VIEW vista_cliente_para_repartidor AS
            SELECT id, nombre || ' ' || apellido AS nombre_completo, telefono
            FROM usuarios;
        """))
        conn.commit()
    print("Database view 'vista_cliente_para_repartidor' verified/created successfully.")
except Exception as e:
    print(f"PostgreSQL Core Tables/Views Error: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="UniBites Core Microservice",
    description="Python FastAPI backend managing Users, Catalog and seeding data for UniBites.",
    version="1.1.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(orders.router)

for route in app.routes:
    if hasattr(route, "methods"):
        print(f"Ruta: {route.path} | Métodos: {route.methods}")

# Healthcheck Endpoint
@app.get("/health", tags=["General"])
def health_check():
    return {
        "service": "api-python-core",
        "status": "healthy",
        "timestamp": os.popen("date").read().strip() or "2026-05-29"
    }

# Seeding Function: executers on application startup
@app.on_event("startup")
def seed_initial_data():
    print("--- FastAPI Registered Routes ---")
    for route in app.routes:
        methods = getattr(route, "methods", None)
        print(f"Route: {route.path} - Methods: {methods}")
    print("---------------------------------")
    db = SessionLocal()
    try:
        # Check if restaurantes table is empty
        rest_count = db.query(Restaurante).count()
        if rest_count == 0:
            print("Seeding initial database data...")
            
            # 1. Create Restaurants
            comedor = Restaurante(
                id=1,
                nombre_local="Comedor Central Universitario",
                ubicacion_campus="Edificio Central - Planta Baja",
                username="comedor",
                password=hash_password("comedor123"),
                descripcion="Restaurante universitario oficial en el campus.",
                especialidades=["Comedor", "Almuerzos"],
                image="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
                cover="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"
            )
            ciencias = Restaurante(
                id=2,
                nombre_local="Cafetería de Ciencias",
                ubicacion_campus="Facultad de Ciencias Naturales",
                username="ciencias",
                password=hash_password("ciencias123"),
                descripcion="Restaurante universitario oficial en el campus.",
                especialidades=["Cafetería", "Bebidas", "Snacks"],
                image="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
                cover="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"
            )
            
            db.add(comedor)
            db.add(ciencias)
            db.commit()
            
            # 2. Create Dishes (Platos) for Comedor Central
            dish1 = Plato(
                id=101,
                id_restaurante=1,
                nombre="Menú Ejecutivo del Día",
                precio=3.50,
                descripcion="Sopa del día, filete de pollo a la plancha, arroz con menestra y jugo de frutas.",
                imagen_url="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"
            )
            dish2 = Plato(
                id=102,
                id_restaurante=1,
                nombre="Porción de Papas Rústicas",
                precio=1.50,
                descripcion="Crujientes papas corte rústico sazonadas con finas hierbas y aderezo especial.",
                imagen_url="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80"
            )
            
            # 3. Create Dishes (Platos) for Cafetería de Ciencias
            dish3 = Plato(
                id=201,
                id_restaurante=2,
                nombre="Sandwich Caprese de Masa Madre",
                precio=3.20,
                descripcion="Mozzarella fresca, tomate, hojas de albahaca y aderezo pesto en masa madre.",
                imagen_url="https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80"
            )
            dish4 = Plato(
                id=202,
                id_restaurante=2,
                nombre="Batido Verde Antioxidante",
                precio=2.50,
                descripcion="Piña, espinaca, jengibre, naranja fresca y semillas de chía hidratadas.",
                imagen_url="https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80"
            )
            
            db.add_all([dish1, dish2, dish3, dish4])
            db.commit()
            print("Database successfully seeded with restaurants and menus!")
        else:
            print("Database already contains data, skipping seeding.")
        
        # Reset sequences in PostgreSQL on every startup to ensure sync and avoid insert collisions
        if db.bind.dialect.name == "postgresql":
            from sqlalchemy import text
            db.execute(text("SELECT setval('restaurantes_id_seq', COALESCE((SELECT MAX(id) FROM restaurantes), 1))"))
            db.execute(text("SELECT setval('platos_id_seq', COALESCE((SELECT MAX(id) FROM platos), 1))"))
            db.commit()
            print("PostgreSQL sequences synchronized successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
