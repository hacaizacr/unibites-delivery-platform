from fastapi import APIRouter, HTTPException, Depends, status, File, Form, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import boto3
import requests
from dotenv import load_dotenv
from ..database import get_db
from ..models import Restaurante, Plato
from pydantic import BaseModel
from ..security import hash_password
from .auth import get_current_user, get_current_student, get_current_restaurant

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-east-1")

router = APIRouter(prefix="/api", tags=["Catálogo Campus"])

# --- PYDANTIC SCHEMAS ---

class PlatoSchema(BaseModel):
    id: int
    id_restaurante: int
    nombre: str
    precio: float
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    disponible: bool = True

    class Config:
        from_attributes = True

class PlatoCreate(BaseModel):
    nombre: str
    precio: float
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    disponible: Optional[bool] = True

class RestauranteSchema(BaseModel):
    id: int
    nombre_local: str
    ubicacion_campus: str
    username: Optional[str] = None
    password: Optional[str] = None
    descripcion: Optional[str] = None
    especialidades: List[str] = []
    image: Optional[str] = None
    cover: Optional[str] = None
    total_votos: int = 0
    puntuacion_acumulada: int = 0
    rating: int = 5

    class Config:
        from_attributes = True

class RestauranteCreate(BaseModel):
    nombre_local: str
    ubicacion_campus: str
    username: Optional[str] = None
    password: Optional[str] = None
    descripcion: Optional[str] = None
    especialidades: List[str] = []
    image: Optional[str] = None
    cover: Optional[str] = None

class CalificacionSchema(BaseModel):
    estrellas: int

# --- ENDPOINTS ---

@router.get("/restaurantes", response_model=List[RestauranteSchema])
def obtener_restaurantes(db: Session = Depends(get_db)):
    restaurantes = db.query(Restaurante).all()
    return restaurantes

@router.post("/restaurantes", response_model=RestauranteSchema, status_code=status.HTTP_201_CREATED)
def crear_restaurante(data: RestauranteCreate, db: Session = Depends(get_db)):
    # Check if username already exists if provided
    if data.username:
        exists = db.query(Restaurante).filter(Restaurante.username == data.username.strip()).first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El usuario de local '{data.username}' ya está registrado."
            )

    new_restaurant = Restaurante(
        nombre_local=data.nombre_local.strip(),
        ubicacion_campus=data.ubicacion_campus.strip(),
        username=data.username.strip() if data.username else None,
        password=hash_password(data.password) if data.password else None,
        descripcion=data.descripcion.strip() if data.descripcion else None,
        especialidades=data.especialidades,
        image=data.image.strip() if data.image else None,
        cover=data.cover.strip() if data.cover else None
    )
    db.add(new_restaurant)
    db.commit()
    db.refresh(new_restaurant)
    return new_restaurant

@router.get("/restaurantes/{id}/menu", response_model=List[PlatoSchema])
def obtener_menu(id: int, db: Session = Depends(get_db)):
    restaurante = db.query(Restaurante).filter(Restaurante.id == id).first()
    if not restaurante:
        raise HTTPException(
            status_code=404,
            detail=f"Restaurante con ID {id} no encontrado en el campus."
        )
    platos = db.query(Plato).filter(Plato.id_restaurante == id).all()
    return platos

@router.post("/restaurantes/{id}/menu", response_model=PlatoSchema, status_code=status.HTTP_201_CREATED)
def crear_plato(
    id: int, 
    nombre: str = Form(...),
    precio: float = Form(...),
    descripcion: Optional[str] = Form(""),
    imagen: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_restaurant)
):
    # Security Rule: Only allow adding dishes to the authenticated restaurant
    if current_user.get("id") != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. Solo puedes gestionar el menú de tu propio restaurante."
        )

    restaurante = db.query(Restaurante).filter(Restaurante.id == id).first()
    if not restaurante:
        raise HTTPException(
            status_code=404,
            detail=f"Restaurante con ID {id} no encontrado en el campus."
        )
    
    imagen_url = ""
    if imagen and imagen.filename:
        # Check if AWS S3 credentials are set
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
            try:
                s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_S3_REGION_NAME
                )
                file_ext = os.path.splitext(imagen.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_ext}"
                
                s3_client.upload_fileobj(
                    imagen.file,
                    AWS_STORAGE_BUCKET_NAME,
                    unique_filename,
                    ExtraArgs={
                        "ACL": "public-read",
                        "ContentType": imagen.content_type
                    }
                )
                
                if AWS_S3_REGION_NAME == "us-east-1":
                    imagen_url = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{unique_filename}"
                else:
                    imagen_url = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/{unique_filename}"
                print(f"AWS S3: Imagen subida exitosamente: {imagen_url}")
            except Exception as e:
                print(f"AWS S3 ERROR: No se pudo subir la imagen - {e}")
        else:
            print("AWS S3 WARNING: Credenciales incompletas. La imagen no fue subida.")
    
    new_dish = Plato(
        id_restaurante=id,
        nombre=nombre.strip(),
        precio=precio,
        descripcion=descripcion.strip() if descripcion else "",
        imagen_url=imagen_url,
        disponible=True
    )
    db.add(new_dish)
    db.commit()
    db.refresh(new_dish)
    return new_dish

class PlatoUpdate(BaseModel):
    disponible: bool

@router.put("/restaurantes/{id}/menu/{plato_id}", response_model=PlatoSchema)
def actualizar_disponibilidad_plato(id: int, plato_id: int, data: PlatoUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_restaurant)):
    # Security Rule: Only allow updates from the authenticated restaurant owner
    if current_user.get("id") != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. Solo puedes gestionar el menú de tu propio restaurante."
        )

    plato = db.query(Plato).filter(Plato.id_restaurante == id, Plato.id == plato_id).first()
    if not plato:
        raise HTTPException(
            status_code=404,
            detail=f"Plato con ID {plato_id} no encontrado para este restaurante."
        )
    plato.disponible = data.disponible
    db.commit()
    db.refresh(plato)
    return plato

class PlatoPrecioUpdate(BaseModel):
    precio: float

@router.put("/platos/{plato_id}/precio", response_model=PlatoSchema)
def actualizar_precio_plato(plato_id: int, data: PlatoPrecioUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_restaurant)):
    # 1. Buscar el plato
    plato = db.query(Plato).filter(Plato.id == plato_id).first()
    if not plato:
        raise HTTPException(
            status_code=404,
            detail=f"Plato con ID {plato_id} no encontrado."
        )

    # 2. Validar que el restaurante autenticado sea el dueño del plato
    if current_user.get("id") != plato.id_restaurante:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. Solo puedes gestionar los platos de tu propio restaurante."
        )

    # 3. Validar el precio (no puede ser negativo)
    if data.precio < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El precio del plato no puede ser negativo."
        )

    # 4. Actualizar precio
    plato.precio = round(data.precio, 2)
    db.commit()
    db.refresh(plato)
    return plato

@router.post("/restaurantes/{id}/calificar", response_model=RestauranteSchema)
def calificar_restaurante(id: int, calificacion: CalificacionSchema, db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    if calificacion.estrellas < 1 or calificacion.estrellas > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La calificación debe ser un número entero entre 1 y 5."
        )
    
    restaurante = db.query(Restaurante).filter(Restaurante.id == id).first()
    if not restaurante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurante con ID {id} no encontrado."
        )
    
    restaurante.total_votos += 1
    restaurante.puntuacion_acumulada += calificacion.estrellas
    
    db.commit()
    db.refresh(restaurante)
    return restaurante

@router.get("/wallet/balance/{email}")
def obtener_balance_wallet(email: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    # Security Rule: Students can only view their own balance!
    if current_user.get("sub") != email.lower().strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para ver la billetera de otro estudiante."
        )
        
    wallet_url = f"http://api-java-wallet:8002/api/wallet/balance/{email.lower().strip()}"
    try:
        res = requests.get(wallet_url, headers={"X-Wallet-Token": "unibites-wallet-system-secret"}, timeout=5)
        if res.status_code == 200:
            return res.json()
        else:
            raise HTTPException(status_code=res.status_code, detail="Error al obtener balance desde el servicio de Wallet.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Servicio de Wallet no disponible: {e}")
