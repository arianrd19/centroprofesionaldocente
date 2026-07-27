"""
Endpoints para gestionar clientes desde Google Sheets
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.core.google_sheets import sheets_service
from app.core.security import get_operator_or_admin
from app.core.errors import raise_safe_500
from pydantic import BaseModel, field_validator

_log = logging.getLogger(__name__)

router = APIRouter()


class ClienteCreate(BaseModel):
    """Modelo para crear cliente"""
    dni: Optional[str] = None
    nombreCompleto: str
    email: Optional[str] = None
    telefono: Optional[str] = None


class ClienteUpdate(BaseModel):
    """Modelo para actualizar cliente"""
    nombreCompleto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    
    @field_validator('nombreCompleto', 'email', 'telefono', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        """Convierte strings vacíos a None para campos opcionales"""
        if v == "":
            return None
        return v


@router.get("/clientes")
async def get_clientes(
    search: Optional[str] = Query(None, description="Buscar por DNI, nombre o apellido"),
    current_user: dict = Depends(get_operator_or_admin)
):
    """Obtiene todos los clientes o busca por criterio"""
    try:
        clientes = sheets_service.get_all_clientes()
        
        if search:
            search_lower = search.lower().strip()
            clientes = [
                c for c in clientes
                if (search_lower in str(c.get('DNI DEL CLIENTE', '') or c.get('DNI', '') or c.get('dni', '')).lower() or
                    search_lower in str(c.get('NOMBRE COMPLETO DEL CLIENTE', '') or c.get('NOMBRES', '') or c.get('nombres', '')).lower())
            ]
        
        return {
            "total": len(clientes),
            "clientes": clientes
        }
    except Exception as e:
        raise_safe_500(_log, "Error obteniendo clientes. Verifica que la hoja 'CLIENTES' exista.", e)


@router.get("/clientes/{dni}")
async def get_cliente_by_dni(
    dni: str,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Obtiene un cliente por DNI"""
    try:
        cliente = sheets_service.get_cliente_by_dni(dni)
        if not cliente:
            raise HTTPException(status_code=404, detail=f"Cliente con DNI {dni} no encontrado")
        return cliente
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error obteniendo cliente", e)


@router.post("/clientes")
async def create_cliente(
    cliente: ClienteCreate,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Crea un nuevo cliente"""
    try:
        # Convertir modelo a dict, mapeando nombres de campos al formato del Sheet
        cliente_dict = {}
        
        # Mapear campos al formato del Sheet (NOMBRE COMPLETO DEL CLIENTE, DNI DEL CLIENTE, etc.)
        if cliente.dni:
            cliente_dict['DNI DEL CLIENTE'] = str(cliente.dni).strip()
        if cliente.nombreCompleto:
            cliente_dict['NOMBRE COMPLETO DEL CLIENTE'] = str(cliente.nombreCompleto).strip()
        if cliente.email:
            cliente_dict['CORREO DEL CLIENTE'] = str(cliente.email).strip()
        if cliente.telefono:
            cliente_dict['CELULAR DEL CLIENTE'] = str(cliente.telefono).strip()
        
        nuevo_cliente = sheets_service.create_cliente(cliente_dict)
        return {
            "success": True,
            "cliente": nuevo_cliente,
            "message": "Cliente creado exitosamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise_safe_500(_log, "Error creando cliente", e)


@router.put("/clientes/{dni}")
async def update_cliente(
    dni: str,
    cliente: ClienteUpdate,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Actualiza un cliente existente"""
    try:
        # Debug: imprimir lo que se recibe
        
        # Convertir modelo a dict y mapear al formato del Sheet
        update_dict = cliente.model_dump(exclude_unset=True)
        
        # Mapear campos al formato del Sheet
        mapped_dict = {}
        if 'nombreCompleto' in update_dict and update_dict['nombreCompleto']:
            mapped_dict['NOMBRE COMPLETO DEL CLIENTE'] = str(update_dict['nombreCompleto']).strip()
        if 'email' in update_dict and update_dict['email']:
            mapped_dict['CORREO DEL CLIENTE'] = str(update_dict['email']).strip()
        if 'telefono' in update_dict and update_dict['telefono']:
            mapped_dict['CELULAR DEL CLIENTE'] = str(update_dict['telefono']).strip()
        
        
        cliente_actualizado = sheets_service.update_cliente(dni, mapped_dict)
        return {
            "success": True,
            "cliente": cliente_actualizado,
            "message": "Cliente actualizado exitosamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise_safe_500(_log, "Error actualizando cliente", e)


@router.delete("/clientes/{dni}")
async def delete_cliente(
    dni: str,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Elimina un cliente"""
    try:
        deleted = sheets_service.delete_cliente(dni)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Cliente con DNI {dni} no encontrado")
        return {
            "success": True,
            "message": "Cliente eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error eliminando cliente", e)
