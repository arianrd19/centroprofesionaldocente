"""
Generador de códigos únicos para certificados
Basado en la función CERTCODE de Google Sheets:
    pass
- Usa timestamp + DNI o timestamp + mencion_nro + DNI
- SHA-256 hash
- Base64 encode
- Toma primeros 12 caracteres alfanuméricos
"""
import hashlib
import time
import base64
import re
import string
from typing import Callable, Optional


def generate_certificate_code(
    dni: Optional[str] = None,
    mencion_nro: Optional[str] = None,
    length: int = 12,
    salt: Optional[str] = None,
) -> str:
    """
    Genera un código único para certificado usando SHA-256 + Base64
    Código determinístico: mismo mencion_nro + dni (+ salt) siempre genera el mismo código

    Args:
        dni: DNI del cliente
        mencion_nro: NRO de la mención (opcional)
        length: Longitud del código (default 12)
        salt: valor adicional para variar el código ante colisiones, sin perder el esquema

    Returns:
        Código único determinístico (ej: Bpvn0qIWyOm7)
    """
    # Construir string: mencion_nro + "-" + dni (sin timestamp para que sea determinístico)
    if mencion_nro and dni:
        str_input = f"{str(mencion_nro)}-{str(dni)}"
    elif dni:
        str_input = str(dni)
    elif mencion_nro:
        str_input = str(mencion_nro)
    else:
        # Si no hay ni mención ni DNI, usar timestamp como fallback
        timestamp = str(int(time.time() * 1000))
        str_input = timestamp

    if salt:
        str_input = f"{str_input}-{salt}"

    # Calcular SHA-256 hash
    hash_bytes = hashlib.sha256(str_input.encode()).digest()

    # Codificar a Base64
    b64 = base64.b64encode(hash_bytes).decode('utf-8')

    # Remover caracteres no alfanuméricos (igual que en Google Sheets)
    b64_clean = re.sub(r'[^A-Za-z0-9]', '', b64)

    # Tomar primeros 12 caracteres
    code = b64_clean[:length]

    return code


def generate_unique_certificate_code(
    code_exists: Callable[[str], bool],
    dni: Optional[str] = None,
    mencion_nro: Optional[str] = None,
    length: int = 12,
    max_attempts: int = 5,
) -> str:
    """Genera un código y reintenta con salt distinto si ya existe (ver `code_exists`)."""
    code = generate_certificate_code(dni=dni, mencion_nro=mencion_nro, length=length)
    attempt = 0
    while code_exists(code) and attempt < max_attempts:
        attempt += 1
        code = generate_certificate_code(
            dni=dni, mencion_nro=mencion_nro, length=length, salt=f"retry{attempt}-{int(time.time() * 1000)}"
        )
    if code_exists(code):
        raise ValueError("No se pudo generar un código único para el certificado")
    return code


def generate_code_from_data(nombres: str, apellidos: str, dni: Optional[str] = None, 
                           curso: Optional[str] = None) -> str:
    """
    Genera código basado en datos del cliente
    Usa timestamp + DNI + datos adicionales
    """
    # Crear string único con los datos
    data_string = f"{nombres}{apellidos}{dni or ''}{curso or ''}{int(time.time())}"
    
    # Hash MD5
    hash_obj = hashlib.md5(data_string.encode())
    hash_hex = hash_obj.hexdigest()
    
    # Convertir a código alfanumérico (12 caracteres)
    chars = string.ascii_letters + string.digits
    code = ""
    
    for i in range(0, min(24, len(hash_hex)), 2):
        if len(code) >= 12:
            break
        pair = hash_hex[i:i+2]
        index = int(pair, 16) % len(chars)
        code += chars[index]
    
    return code[:12]
