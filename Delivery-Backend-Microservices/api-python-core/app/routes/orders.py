import random
import requests
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import Pedido, DetallePedido, Usuario, Restaurante, VistaClienteParaRepartidor
from .auth import get_current_user, get_current_student, get_current_restaurant

router = APIRouter(prefix="/api", tags=["Pedidos y Logística"])

# --- PYDANTIC SCHEMAS ---

class DetallePedidoCreate(BaseModel):
    nombre_plato: str
    cantidad: int
    precio_unitario: float

class PedidoCreate(BaseModel):
    id_comprador: int
    id_restaurante: int
    lugar_entrega: str
    notas: Optional[str] = None
    items: List[DetallePedidoCreate]

class AceptarPedido(BaseModel):
    id_repartidor: int

class ActualizarEstado(BaseModel):
    estado_pedido: str

# Response schemas for clean serialization
class DetalleSchema(BaseModel):
    id: int
    nombre_plato: str
    cantidad: int
    precio_unitario: float

    class Config:
        from_attributes = True

class PedidoResponse(BaseModel):
    id: int
    codigo_orden: str
    id_comprador: int
    id_restaurante: int
    id_repartidor: Optional[int]
    estado_pedido: str
    archivado: bool
    lugar_entrega: str
    notas: Optional[str]
    total_pagar: float
    fecha_creacion: datetime
    detalles: List[DetalleSchema]
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    deliverer_name: Optional[str] = None
    deliverer_phone: Optional[str] = None
    sugerencia_ruta: Optional[str] = None

    class Config:
        from_attributes = True

# --- HELPERS ---

def notify_status_change(order_id: str, new_status: str):
    try:
        go_chat_url = "http://api-go-chat:8003/api/chat/system-broadcast"
        headers = {
            "Content-Type": "application/json",
            "X-System-Token": "unibites-core-system-token"
        }
        payload = {
            "id_pedido": order_id,
            "status": new_status
        }
        response = requests.post(go_chat_url, json=payload, headers=headers, timeout=3)
        if response.status_code == 200:
            print(f"Go Chat: System broadcasted state change {new_status} for {order_id} successfully.")
        else:
            print(f"Go Chat WARNING: Broadcast status returned {response.status_code} for {order_id}")
    except Exception as e:
        print(f"Go Chat ERROR: Failed to broadcast state change for {order_id} - {e}")

RUTAS_CAMPUS = {
    "Biblioteca, Librería y Admisiones": "Avanzar por el bulevar central hacia el edificio principal. Ingresar por la puerta lateral peatonal junto a Admisiones.",
    "Caballerizas": "Tomar el sendero vehicular hacia la zona baja del campus. Conducir con precaución en el tramo de tierra adyacente a las pesebreras.",
    "Colibrí (Billar)": "Dirigirse al área recreativa estudiantil junto a los patios de descanso. Entrega en la entrada principal del salón de juegos.",
    "College": "Tomar el acceso peatonal adoquinado en dirección al bloque de pregrado. El punto de encuentro es el vestíbulo del primer piso.",
    "Edificio Administrativo": "Subir por la rampa principal hacia las oficinas centrales. Dejar el pedido en la recepción del bloque de atención al público.",
    "Edificio de Aulas Marcelo Fernández": "Subir al bloque de aulas por las escaleras centrales. Zona de alta fluidez; se recomienda esperar al estudiante en el pasillo exterior.",
    "Edificio de Gastronomía": "Ruta interna directa en el bloque de talleres de cocina. Entrega inmediata en el área de counters o acceso de estudiantes.",
    "Edificio de Ingeniería Automotriz": "Dirigirse hacia la zona de talleres pesados del campus. Entrar por el portón lateral de acceso vehicular junto a los elevadores.",
    "Edificio de Marketing y Deportes": "Avanzar hacia el bloque deportivo cercano a las canchas. El punto de entrega recomendado es el hall del área administrativa.",
    "Facultad de Ciencias Médicas de la Salud y de la Vida": "Dirigirse al complejo de salud. Ingresar por el acceso principal de las clínicas simuladas y laboratorios.",
    "Food Trucks": "Ruta directa al patio de comidas abierto. Punto de entrega en la zona central de mesas comunes.",
    "Hannaska": "Avanzar hacia el bloque de servicios o cafetería Hannaska. Punto de encuentro rápido en la barra de atención exterior.",
    "Piedra Negra de Aulas": "Seguir el sendero hacia el emblemático bloque de Piedra Negra. Esperar al estudiante en la plaza empedrada de la entrada.",
    "Piedra Negra de Ciencias Médicas": "Avanzar al bloque de Piedra Negra del área de la salud. Punto de entrega en el acceso peatonal delantero.",
    "Repositorio y Bodegas": "Tomar la vía perimetral trasera del campus hacia el área de logística. Conducir despacio por zona de carga y descarga.",
    "Residencias Estudiantiles": "Dirigirse a la zona habitacional del campus. Por normativas de seguridad, el punto de entrega obligatorio es la garita de acceso a los dormitorios.",
    "Salón Auditorio Marcelo Fernández": "Avanzar hacia el teatro principal del bloque de aulas. En días de eventos, coordinar la entrega directamente en las puertas dobles del vestíbulo.",
    "Taller Mecánico": "Seguir la vía perimetral hacia los talleres técnicos del fondo del campus. Punto de entrega en la zona de recepción de herramientas."
}

def enrich_order_with_client_info(pedido, db: Session):
    if not pedido:
        return
    client_info = db.query(VistaClienteParaRepartidor).filter(VistaClienteParaRepartidor.id == pedido.id_comprador).first()
    if client_info:
        pedido.client_name = client_info.nombre_completo
        pedido.client_phone = client_info.telefono
    else:
        pedido.client_name = "Compañero Universitario"
        pedido.client_phone = "0999999999"

    # Enrich with deliverer name and phone from Usuario table
    if pedido.id_repartidor:
        repartidor = db.query(Usuario).filter(Usuario.id == pedido.id_repartidor).first()
        if repartidor:
            pedido.deliverer_name = f"{repartidor.nombre} {repartidor.apellido[:1]}."
            pedido.deliverer_phone = repartidor.telefono
        else:
            pedido.deliverer_name = None
            pedido.deliverer_phone = None
    else:
        pedido.deliverer_name = None
        pedido.deliverer_phone = None

    # Enrich with dynamic university route suggestion based on location
    lugar = pedido.lugar_entrega.strip() if pedido.lugar_entrega else ""
    pedido.sugerencia_ruta = RUTAS_CAMPUS.get(lugar, "Avanzar hacia la ubicación especificada en el campus y coordinar entrega con el estudiante.")

# --- ENDPOINTS ---

@router.post("/pedidos", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
def crear_pedido(data: PedidoCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    # Security Rule: Only allow order creation for the logged-in student
    if current_user.get("id") != data.id_comprador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. Solo puedes crear pedidos para tu propia cuenta."
        )

    # 1. Verificar existencia del comprador
    comprador = db.query(Usuario).filter(Usuario.id == data.id_comprador).first()
    if not comprador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario comprador con ID {data.id_comprador} no encontrado."
        )

    # 2. Verificar existencia del restaurante
    restaurante = db.query(Restaurante).filter(Restaurante.id == data.id_restaurante).first()
    if not restaurante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurante con ID {data.id_restaurante} no encontrado."
        )

    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pedido debe contener al menos un plato en el carrito."
        )

    # 3. Calcular el total y generar el código de pedido
    subtotal = sum(item.precio_unitario * item.cantidad for item in data.items)
    delivery_fee = 1.20  # Comisión fija del envío universitario
    total = round(subtotal + delivery_fee, 2)
    codigo = f"ORD-{random.randint(1000, 9999)}"

    # 4. Iniciar transacción en la base de datos local (FastAPI / PostgreSQL)
    new_order = Pedido(
        codigo_orden=codigo,
        id_comprador=data.id_comprador,
        id_restaurante=data.id_restaurante,
        estado_pedido="Pendiente_Restaurante",
        lugar_entrega=data.lugar_entrega.strip(),
        notas=data.notas.strip() if data.notas else None,
        total_pagar=total
    )
    
    db.add(new_order)
    db.flush()  # Genera el ID del pedido para asociarlo a los detalles sin hacer commit aún

    # Agregar detalles de la orden
    for item in data.items:
        detail = DetallePedido(
            id_pedido=new_order.id,
            nombre_plato=item.nombre_plato.strip(),
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario
        )
        db.add(detail)

    # 5. LLAMADA CRÍTICA A JAVA WALLET (api-java-wallet - Puerto 8002)
    # Debita el monto total directamente de la cuenta simulada del estudiante
    wallet_debit_url = "http://api-java-wallet:8002/api/wallet/debit"
    try:
        debit_response = requests.post(
            wallet_debit_url,
            json={
                "email": comprador.correo_uide,
                "amount": total
            },
            headers={"X-Wallet-Token": "unibites-wallet-system-secret"},
            timeout=5
        )
        
        # 6. Evaluar respuesta del débito
        if debit_response.status_code == 402:  # Payment Required (Saldo insuficiente)
            db.rollback()  # REVERTIMOS la creación del pedido localmente
            res_data = debit_response.json()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Saldo insuficiente. El pago del pedido fue rechazado por la Wallet. {res_data.get('message', '')}"
            )
        elif debit_response.status_code != 200:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error transaccional con el Wallet Service (Status {debit_response.status_code})."
            )
            
    except requests.exceptions.RequestException as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El servicio de Billetera (Java Wallet) no está disponible para procesar el cobro: {e}"
        )

    # 7. Si todo sale bien, hacemos commit y consolidamos la orden!
    db.commit()
    db.refresh(new_order)
    enrich_order_with_client_info(new_order, db)
    print(f"Pedido {new_order.codigo_orden} creado y cobrado exitosamente a {comprador.correo_uide}")
    return new_order

@router.get("/pedidos/campus", response_model=List[PedidoResponse])
def obtener_pedidos_campus(db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    pedidos = db.query(Pedido).filter(
        Pedido.estado_pedido == "Listo_Para_Retirar",
        Pedido.archivado == False
    ).order_by(Pedido.fecha_creacion.desc()).all()
    for p in pedidos:
        enrich_order_with_client_info(p, db)
    return pedidos

@router.get("/pedidos/repartidor/{email}", response_model=PedidoResponse)
def obtener_pedido_activo_repartidor(email: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    if current_user.get("sub") != email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para consultar el pedido activo de otro repartidor."
        )
    pedido = db.query(Pedido).join(Usuario, Pedido.id_repartidor == Usuario.id).filter(
        Usuario.correo_uide == email,
        Pedido.estado_pedido != "Finalizado_Confirmado",
        Pedido.archivado == False
    ).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active order found for this deliverer"
        )
    enrich_order_with_client_info(pedido, db)
    return pedido

@router.get("/pedidos/comprador/{email}", response_model=List[PedidoResponse])
def obtener_pedidos_activo_comprador(email: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    if current_user.get("sub") != email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para consultar los pedidos de otro estudiante."
        )
    pedidos = db.query(Pedido).join(Usuario, Pedido.id_comprador == Usuario.id).filter(
        Usuario.correo_uide == email,
        Pedido.archivado == False
    ).order_by(Pedido.fecha_creacion.desc()).all()
    for p in pedidos:
        enrich_order_with_client_info(p, db)
    return pedidos

@router.get("/pedidos/{id_or_code}", response_model=PedidoResponse)
def obtener_pedido(id_or_code: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    pedido = None
    if id_or_code.isdigit():
        pedido = db.query(Pedido).filter(Pedido.id == int(id_or_code)).first()
    if not pedido:
        pedido = db.query(Pedido).filter(Pedido.codigo_orden == id_or_code).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con identificador {id_or_code} no encontrado."
        )
    
    # Ownership Validation
    role = current_user.get("role")
    user_id = current_user.get("id")
    if role == "restaurant":
        if pedido.id_restaurante != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado para consultar este pedido."
            )
    else:
        if pedido.id_comprador != user_id and pedido.id_repartidor != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado para consultar este pedido."
            )
            
    enrich_order_with_client_info(pedido, db)
    return pedido

@router.put("/pedidos/{id_or_code}/aceptar", response_model=PedidoResponse)
def aceptar_pedido(id_or_code: str, data: AceptarPedido, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: dict = Depends(get_current_student)):
    # Security Rule: Only allow assigning the order to the logged-in deliverer
    if current_user.get("id") != data.id_repartidor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. No puedes asignar a otro usuario como repartidor de este pedido."
        )

    pedido = None
    if id_or_code.isdigit():
        pedido = db.query(Pedido).filter(Pedido.id == int(id_or_code)).first()
    if not pedido:
        pedido = db.query(Pedido).filter(Pedido.codigo_orden == id_or_code).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con identificador {id_or_code} no encontrado."
        )

    # 1. REGLA DE NEGOCIO CRÍTICA: El repartidor no puede ser el comprador de la orden
    if pedido.id_comprador == data.id_repartidor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación inválida. Un estudiante no puede actuar como el repartidor de su propio pedido."
        )

    # Verificar que el repartidor exista
    repartidor = db.query(Usuario).filter(Usuario.id == data.id_repartidor).first()
    if not repartidor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario repartidor con ID {data.id_repartidor} no encontrado."
        )

    # 2. Asignar repartidor y cambiar estado a Listo_Para_Retirar
    pedido.id_repartidor = data.id_repartidor
    pedido.estado_pedido = "Listo_Para_Retirar"
    
    db.commit()
    db.refresh(pedido)
    enrich_order_with_client_info(pedido, db)
    print(f"Pedido {pedido.codigo_orden} aceptado por el repartidor {repartidor.correo_uide}")
    background_tasks.add_task(notify_status_change, pedido.codigo_orden, "Listo_Para_Retirar")
    return pedido

@router.put("/pedidos/{id_or_code}/estado", response_model=PedidoResponse)
def actualizar_estado_pedido(id_or_code: str, data: ActualizarEstado, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    pedido = None
    if id_or_code.isdigit():
        pedido = db.query(Pedido).filter(Pedido.id == int(id_or_code)).first()
    if not pedido:
        pedido = db.query(Pedido).filter(Pedido.codigo_orden == id_or_code).first()
    if not pedido:
        # Fallback debug log: show what orders exist in db
        existentes = db.query(Pedido.id, Pedido.codigo_orden).all()
        lista_existentes = [f"ID: {r[0]}, Codigo: {r[1]}" for r in existentes]
        print(f"DATABASE WARNING: Pedido {id_or_code} no encontrado. Pedidos en DB: {lista_existentes}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con identificador {id_or_code} no encontrado en la DB. Pedidos existentes: {lista_existentes}"
        )

    # Security Rules based on roles
    role = current_user.get("role")
    user_id = current_user.get("id")
    
    incoming = data.estado_pedido.strip().lower().replace(" ", "_").replace("-", "_")
    mapping = {
        "pendiente_restaurante": "Pendiente_Restaurante",
        "pendiente": "Pendiente_Restaurante",
        "en_preparacion": "En_Preparacion",
        "listo_para_retirar": "Listo_Para_Retirar",
        "listo_para_recoger": "Listo_Para_Retirar",
        "esperando_entrega_restaurante": "Esperando_Entrega_Restaurante",
        "en_camino": "En_Camino",
        "entregado_repartidor": "Entregado_Repartidor",
        "finalizado_confirmado": "Finalizado_Confirmado",
        "rechazado_restaurante": "Rechazado_Restaurante"
    }

    if incoming not in mapping:
        normalized = None
        for k, v in mapping.items():
            if v.lower() == incoming or v.lower().replace(" ", "_").replace("-", "_") == incoming:
                normalized = v
                break
        if not normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado de pedido no válido: {data.estado_pedido}. Debe ser uno de: {list(set(mapping.values()))}"
            )
    else:
        normalized = mapping[incoming]

    # Enforce Auth Authorization Constraints
    if role == "restaurant":
        # Restaurant owners can only update status of orders belonging to their restaurant
        if pedido.id_restaurante != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Este pedido no pertenece a tu restaurante."
            )
        # Restaurants can only set states: Pendiente_Restaurante, En_Preparacion, Listo_Para_Retirar, Rechazado_Restaurante, En_Camino
        allowed_states = {"Pendiente_Restaurante", "En_Preparacion", "Listo_Para_Retirar", "Rechazado_Restaurante", "En_Camino"}
        if normalized not in allowed_states:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No autorizado. Un restaurante no puede cambiar el estado a {normalized}"
            )
        if normalized == "En_Camino" and not pedido.id_repartidor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Operación inválida. No se puede poner en camino un pedido sin un repartidor asignado."
            )
    elif role == "client":
        # Students: Buyer or assigned Deliverer
        is_buyer = (pedido.id_comprador == user_id)
        is_deliverer = (pedido.id_repartidor == user_id)
        
        if not (is_buyer or is_deliverer):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No eres comprador ni repartidor asociado a este pedido."
            )
            
        if normalized == "Finalizado_Confirmado":
            # Only the buyer can confirm reception
            if not is_buyer:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No autorizado. Solo el comprador puede confirmar la recepción final."
                )
        else:
            # Deliverer transit states (Esperando_Entrega_Restaurante, En_Camino, Entregado_Repartidor)
            if not is_deliverer:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No autorizado. Solo el repartidor asignado puede cambiar el tránsito del pedido."
                )
            allowed_transit = {"Esperando_Entrega_Restaurante", "En_Camino", "Entregado_Repartidor"}
            if normalized not in allowed_transit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No autorizado. Estado de tránsito inválido para repartidor."
                )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol de usuario inválido.")

    pedido.estado_pedido = normalized

    # REGLA DE REEMBOLSO: Si el pedido cambia a 'Rechazado_Restaurante', reembolsamos el monto total al comprador
    if normalized == "Rechazado_Restaurante":
        comprador = db.query(Usuario).filter(Usuario.id == pedido.id_comprador).first()
        if comprador:
            wallet_credit_url = "http://api-java-wallet:8002/api/wallet/credit"
            try:
                credit_response = requests.post(
                    wallet_credit_url,
                    json={
                        "email": comprador.correo_uide,
                        "amount": pedido.total_pagar
                    },
                    headers={"X-Wallet-Token": "unibites-wallet-system-secret"},
                    timeout=5
                )
                if credit_response.status_code == 200:
                    print(f"Java Wallet: Reembolsados ${pedido.total_pagar} al comprador {comprador.correo_uide} por rechazo de pedido")
                else:
                    print(f"Java Wallet WARNING: Respuesta inesperada {credit_response.status_code} al reembolsar")
            except Exception as e:
                print(f"Java Wallet ERROR: No se pudo reembolsar al comprador - {e}")

    # REGLA DE COMISIÓN: Si el pedido cambia a 'Finalizado_Confirmado', acreditamos $0.20 en la billetera del repartidor
    if normalized == "Finalizado_Confirmado":
        if not pedido.id_repartidor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede marcar como Entregado un pedido que no tiene un repartidor asignado."
            )
            
        repartidor = db.query(Usuario).filter(Usuario.id == pedido.id_repartidor).first()
        if not repartidor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repartidor asociado no encontrado en la base de datos."
            )

        # Call Java Wallet to credit the fixed $0.96 commission to deliverer (80% of $1.20)
        wallet_credit_url = "http://api-java-wallet:8002/api/wallet/credit"
        try:
            credit_response = requests.post(
                wallet_credit_url,
                json={
                    "email": repartidor.correo_uide,
                    "amount": 0.96
                },
                headers={"X-Wallet-Token": "unibites-wallet-system-secret"},
                timeout=5
            )
            if credit_response.status_code == 200:
                print(f"Java Wallet: Acreditados $0.96 de comisión al repartidor {repartidor.correo_uide}")
            else:
                print(f"Java Wallet WARNING: Respuesta inesperada {credit_response.status_code} al acreditar comisión")
        except Exception as e:
            print(f"Java Wallet ERROR: No se pudo acreditar comisión en la Wallet al repartidor - {e}")

        # Call Java Wallet to credit the fixed $0.24 commission to platform (20% of $1.20)
        try:
            platform_response = requests.post(
                wallet_credit_url,
                json={
                    "email": "plataforma@uide.edu.ec",
                    "amount": 0.24
                },
                headers={"X-Wallet-Token": "unibites-wallet-system-secret"},
                timeout=5
            )
            if platform_response.status_code == 200:
                print(f"Java Wallet: Acreditados $0.24 de tarifa de plataforma a plataforma@uide.edu.ec")
            else:
                print(f"Java Wallet WARNING: Respuesta inesperada {platform_response.status_code} al acreditar tarifa de plataforma")
        except Exception as e:
            print(f"Java Wallet ERROR: No se pudo acreditar tarifa de plataforma en la Wallet - {e}")

    db.commit()
    db.refresh(pedido)
    enrich_order_with_client_info(pedido, db)
    background_tasks.add_task(notify_status_change, pedido.codigo_orden, normalized)
    return pedido

@router.get("/restaurantes/{restaurante_id}/pedidos", response_model=List[PedidoResponse])
def obtener_pedidos_restaurante(restaurante_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_restaurant)):
    # Security Rule: Only allow restaurants to view their own orders
    if current_user.get("id") != restaurante_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para acceder a los pedidos de otro restaurante."
        )

    restaurante = db.query(Restaurante).filter(Restaurante.id == restaurante_id).first()
    if not restaurante:
        # Obtener los IDs y nombres de locales existentes en la base de datos
        existentes = db.query(Restaurante.id, Restaurante.nombre_local).all()
        ids_existentes = [r[0] for r in existentes]
        nombres_existentes = [r[1] for r in existentes]
        print(f"DATABASE WARNING: Restaurante ID {restaurante_id} no encontrado. Locales en DB: {list(zip(ids_existentes, nombres_existentes))}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurante con ID {restaurante_id} no encontrado. Locales disponibles: {ids_existentes} ({nombres_existentes})"
        )
    
    pedidos = db.query(Pedido).filter(
        Pedido.id_restaurante == restaurante_id,
        Pedido.archivado == False,
        Pedido.estado_pedido.in_([
            "Pendiente_Restaurante", 
            "En_Preparacion", 
            "Listo_Para_Retirar", 
            "Esperando_Entrega_Restaurante", 
            "En_Camino", 
            "Entregado_Repartidor",
            "Finalizado_Confirmado"
        ])
    ).order_by(Pedido.fecha_creacion.desc()).all()
    for p in pedidos:
        enrich_order_with_client_info(p, db)
    
    return pedidos

@router.put("/pedidos/{id_or_code}/archivar", response_model=PedidoResponse)
def archivar_pedido(id_or_code: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    pedido = None
    if id_or_code.isdigit():
        pedido = db.query(Pedido).filter(Pedido.id == int(id_or_code)).first()
    if not pedido:
        pedido = db.query(Pedido).filter(Pedido.codigo_orden == id_or_code).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con identificador {id_or_code} no encontrado."
        )

    # Security Rule: Only buyer, deliverer, or restaurant associated with the order can archive it
    user_id = current_user.get("id")
    role = current_user.get("role")
    if role == "restaurant":
        if pedido.id_restaurante != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado para archivar este pedido."
            )
    else:
        if pedido.id_comprador != user_id and pedido.id_repartidor != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado para archivar este pedido."
            )

    pedido.archivado = True
    db.commit()
    db.refresh(pedido)
    enrich_order_with_client_info(pedido, db)
    return pedido

@router.get("/admin/plataforma/balance")
def obtener_balance_plataforma(db: Session = Depends(get_db)):
    """
    Endpoint para que el creador de la plataforma consulte los fondos acumulados
    por comisiones de envío (20% de cada entrega = $0.24).
    """
    wallet_url = "http://api-java-wallet:8002/api/wallet/balance/plataforma@uide.edu.ec"
    try:
        res = requests.get(wallet_url, headers={"X-Wallet-Token": "unibites-wallet-system-secret"}, timeout=5)
        if res.status_code == 200:
            return res.json()
        elif res.status_code == 404:
            return {"email": "plataforma@uide.edu.ec", "balance": 0.00, "message": "Plataforma iniciada sin fondos aún."}
        else:
            raise HTTPException(status_code=res.status_code, detail="Error al consultar balance de plataforma en la Wallet.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Servicio Wallet no disponible: {e}")
