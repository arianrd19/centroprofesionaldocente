import qrcode
from io import BytesIO
from PIL import Image
from app.core.config import settings


def generate_qr_code(codigo: str, size: int = 512) -> BytesIO:
    """Genera un código QR para un certificado"""
    # Usar la misma URL de verificación que se guarda en PDF_URL
    base_url = settings.BASE_URL
    url = f"{base_url}/consulta/{codigo}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Convertir a BytesIO
    img_io = BytesIO()
    img.save(img_io, format='PNG')
    img_io.seek(0)
    
    return img_io
