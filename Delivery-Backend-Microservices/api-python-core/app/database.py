import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://unibites_user:unibites_password@postgres-db:5432/unibites_db"
)

# Connect to database with a retry mechanism
engine = None
db_connected = False

for i in range(10):
    try:
        engine = create_engine(DATABASE_URL)
        # Test connection
        conn = engine.connect()
        conn.close()
        db_connected = True
        print("SQLAlchemy: Connected to PostgreSQL database successfully!")
        break
    except Exception as e:
        print(f"SQLAlchemy: Waiting for database connection... ({i+1}/10) - Error: {e}")
        time.sleep(3)

if not db_connected:
    print("SQLAlchemy WARNING: Could not connect to PostgreSQL. Using SQLite fallback for local development.")
    DATABASE_URL = "sqlite:///./unibites_backup.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
