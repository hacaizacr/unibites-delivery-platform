import requests
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..database import get_db
from ..models import Usuario, Restaurante
from ..security import hash_password, verify_password, create_jwt_token, verify_jwt_token

router = APIRouter(prefix="/api/auth", tags=["Estudiantes Auth"])

# Security schemes
security_bearer = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización faltante o formato inválido (debe ser Bearer <token>)"
        )
    payload = verify_jwt_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación inválido o expirado"
        )
    return payload

def get_current_student(payload: dict = Depends(get_current_user)):
    if payload.get("role") != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de estudiante."
        )
    return payload

def get_current_restaurant(payload: dict = Depends(get_current_user)):
    if payload.get("role") != "restaurant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de restaurante."
        )
    return payload

class StudentRegister(BaseModel):
    nombre: str
    apellido: str
    correo_uide: str
    contrasena: str
    telefono: str
    es_repartidor: bool = False

class StudentLogin(BaseModel):
    correo_uide: str
    contrasena: str

@router.post("/estudiante/registro")
def registrar_estudiante(data: StudentRegister, db: Session = Depends(get_db)):
    # 1. Validar correo institucional de la UIDE (@uide.edu.ec)
    if not data.correo_uide.lower().endswith("@uide.edu.ec"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Debes usar tu correo institucional de la UIDE (@uide.edu.ec)"
        )
    
    # 2. Verificar si el usuario ya existe
    exists = db.query(Usuario).filter(Usuario.correo_uide == data.correo_uide.lower()).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este correo institucional ya se encuentra registrado."
        )

    # 3. Guardar en Postgres con la contraseña hasheada
    new_user = Usuario(
        nombre=data.nombre.strip(),
        apellido=data.apellido.strip(),
        correo_uide=data.correo_uide.lower().strip(),
        contrasena_hash=hash_password(data.contrasena),

        telefono=data.telefono.strip(),
        es_repartidor=data.es_repartidor
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. LLAMAR AL ENDPOINT DEL MICROSERVICIO DE JAVA (api-java-wallet)
    # El microservicio de Java maneja la economía. Hacemos un llamado HTTP para
    # inicializar su billetera con el saldo de bienvenida de $50.00.
    wallet_initialized = False
    wallet_service_url = "http://api-java-wallet:8002/api/wallet/create"
    
    try:
        # Petición POST según especificación de arquitectura
        wallet_response = requests.post(
            wallet_service_url,
            json={"email": new_user.correo_uide, "amount": 50.00},
            headers={"X-Wallet-Token": "unibites-wallet-system-secret"},
            timeout=5
        )
        if wallet_response.status_code in (200, 201):
            wallet_initialized = True
            print(f"Java Wallet: Billetera inicializada exitosamente para {new_user.correo_uide}")
        else:
            print(f"Java Wallet WARNING: Respuesta inesperada {wallet_response.status_code} desde wallet service")
    except Exception as e:
        print(f"Java Wallet ERROR: No se pudo conectar al microservicio de Java en {wallet_service_url} - {e}")
        # Intentar fallback de contingencia al endpoint GET balance (que auto-registra)
        try:
            fallback_url = f"http://api-java-wallet:8002/api/wallet/balance/{new_user.correo_uide}"
            fallback_res = requests.get(fallback_url, headers={"X-Wallet-Token": "unibites-wallet-system-secret"}, timeout=3)
            if fallback_res.ok:
                wallet_initialized = True
                print(f"Java Wallet Fallback: Billetera inicializada exitosamente vía GET para {new_user.correo_uide}")
        except Exception as fe:
            print(f"Java Wallet Fallback ERROR: También falló el fallback a la Wallet - {fe}")

    # Generate JWT token
    token = create_jwt_token({"sub": new_user.correo_uide, "role": "client", "id": new_user.id})

    return {
        "success": True,
        "message": "Estudiante registrado exitosamente en el Core API.",
        "wallet_initialized": wallet_initialized,
        "student": {
            "id": new_user.id,
            "firstName": new_user.nombre,
            "lastName": new_user.apellido,
            "email": new_user.correo_uide,
            "name": f"{new_user.nombre} {new_user.apellido[:1]}.",
            "phone": new_user.telefono,
            "role": "deliverer" if new_user.es_repartidor else "client",
            "isOnline": True,
            "earnings": 50.00 if wallet_initialized else 0.00,
            "vehicle": "Bicicleta",
            "avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80",
            "token": token
        }
    }

@router.get("/estudiante/verificar/{email}")
def verificar_estudiante(email: str, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.correo_uide == email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado en la base de datos."
        )
    return {"id": user.id, "email": user.correo_uide}

@router.post("/estudiante/login")
def login_estudiante(data: StudentLogin, db: Session = Depends(get_db)):
    if not data.correo_uide.lower().endswith("@uide.edu.ec"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Debes usar tu correo institucional de la UIDE (@uide.edu.ec)"
        )

    user = db.query(Usuario).filter(Usuario.correo_uide == data.correo_uide.lower()).first()
    if not user or not verify_password(data.contrasena, user.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo institucional o contraseña incorrectos."
        )

    # Opcional: Consultamos el saldo real en el microservicio de Java
    earnings = 0.00
    try:
        wallet_url = f"http://api-java-wallet:8002/api/wallet/balance/{user.correo_uide}"
        wallet_res = requests.get(wallet_url, headers={"X-Wallet-Token": "unibites-wallet-system-secret"}, timeout=3)
        if wallet_res.ok:
            wallet_data = wallet_res.json()
            earnings = wallet_data.get("balance", 0.00)
    except Exception as e:
        print(f"Java Wallet WARNING: No se pudo obtener el saldo real de la billetera al iniciar sesión - {e}")

    # Generate JWT token
    token = create_jwt_token({"sub": user.correo_uide, "role": "client", "id": user.id})

    return {
        "success": True,
        "message": "Inicio de sesión exitoso.",
        "student": {
            "id": user.id,
            "firstName": user.nombre,
            "lastName": user.apellido,
            "email": user.correo_uide,
            "name": f"{user.nombre} {user.apellido[:1]}.",
            "phone": user.telefono,
            "role": "deliverer" if user.es_repartidor else "client",
            "isOnline": True,
            "earnings": earnings,
            "vehicle": "Bicicleta",
            "avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80",
            "token": token
        }
    }

class RestaurantLogin(BaseModel):
    username: str
    password: str

@router.post("/restaurante/login")
def login_restaurante(data: RestaurantLogin, db: Session = Depends(get_db)):
    if not data.username or not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere usuario y contraseña."
        )
    
    rest = db.query(Restaurante).filter(Restaurante.username == data.username.strip()).first()
    if not rest or not verify_password(data.password, rest.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos."
        )
        
    token = create_jwt_token({"sub": rest.username, "role": "restaurant", "id": rest.id})

    return {
        "success": True,
        "message": "Inicio de sesión exitoso.",
        "restaurant": {
            "id": rest.id,
            "nombre_local": rest.nombre_local,
            "ubicacion_campus": rest.ubicacion_campus,
            "username": rest.username,
            "descripcion": rest.descripcion,
            "especialidades": rest.especialidades,
            "image": rest.image,
            "cover": rest.cover,
            "token": token
        }
    }
