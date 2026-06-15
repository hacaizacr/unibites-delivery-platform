from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    correo_uide = Column(String(100), unique=True, index=True, nullable=False)
    contrasena_hash = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    es_repartidor = Column(Boolean, default=False)

    # Relationships for orders
    pedidos_comprados = relationship("Pedido", back_populates="comprador", foreign_keys="[Pedido.id_comprador]")
    pedidos_entregados = relationship("Pedido", back_populates="repartidor", foreign_keys="[Pedido.id_repartidor]")

class Restaurante(Base):
    __tablename__ = "restaurantes"

    id = Column(Integer, primary_key=True, index=True)
    nombre_local = Column(String(100), nullable=False)
    ubicacion_campus = Column(String(150), nullable=False)
    username = Column(String(100), nullable=True)
    password = Column(String(100), nullable=True)
    descripcion = Column(String(255), nullable=True)
    especialidades = Column(JSON, default=list)
    image = Column(String(255), nullable=True)
    cover = Column(String(255), nullable=True)
    total_votos = Column(Integer, default=0, server_default="0", nullable=False)
    puntuacion_acumulada = Column(Integer, default=0, server_default="0", nullable=False)

    @property
    def rating(self) -> int:
        if not self.total_votos or self.total_votos == 0:
            return 5
        import math
        avg = self.puntuacion_acumulada / self.total_votos
        return math.floor(avg + 0.5)
    
    # Relationship to dishes
    platos = relationship("Plato", back_populates="restaurante", cascade="all, delete-orphan")
    pedidos = relationship("Pedido", back_populates="restaurante")

class Plato(Base):
    __tablename__ = "platos"

    id = Column(Integer, primary_key=True, index=True)
    id_restaurante = Column(Integer, ForeignKey("restaurantes.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    precio = Column(Float, nullable=False)
    descripcion = Column(String(255), nullable=True)
    imagen_url = Column(String(255), nullable=True)
    disponible = Column(Boolean, default=True)

    # Relationship to restaurant
    restaurante = relationship("Restaurante", back_populates="platos")

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    codigo_orden = Column(String(50), unique=True, index=True, nullable=False) # e.g. ORD-1042
    id_comprador = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    id_restaurante = Column(Integer, ForeignKey("restaurantes.id"), nullable=False)
    id_repartidor = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    estado_pedido = Column(String(50), default="Pendiente_Restaurante") # Pendiente_Restaurante, En_Preparacion, Listo_Para_Retirar, En_Camino, Entregado_Repartidor, Finalizado_Confirmado
    archivado = Column(Boolean, default=False)
    lugar_entrega = Column(String(200), nullable=False)
    notas = Column(Text, nullable=True)
    total_pagar = Column(Float, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # Relationships
    comprador = relationship("Usuario", back_populates="pedidos_comprados", foreign_keys=[id_comprador])
    repartidor = relationship("Usuario", back_populates="pedidos_entregados", foreign_keys=[id_repartidor])
    restaurante = relationship("Restaurante", back_populates="pedidos")
    detalles = relationship("DetallePedido", back_populates="pedido", cascade="all, delete-orphan")

class DetallePedido(Base):
    __tablename__ = "detalle_pedidos"

    id = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    nombre_plato = Column(String(100), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)

    # Relationship to order
    pedido = relationship("Pedido", back_populates="detalles")

class VistaClienteParaRepartidor(Base):
    __tablename__ = "vista_cliente_para_repartidor"

    id = Column(Integer, primary_key=True)
    nombre_completo = Column(String(200))
    telefono = Column(String(20))
