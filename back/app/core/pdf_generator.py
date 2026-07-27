from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.lib import colors
import qrcode
from io import BytesIO
from typing import Dict
from app.core.config import settings, ROOT


def wrap_text_by_width(text, font_name, font_size, max_width):
    """Envuelve el texto para que quepa en un ancho máximo"""
    words = text.replace("\n", " ").split()
    lines, current = [], ""
    for w in words:
        test = (current + " " + w).strip()
        if pdfmetrics.stringWidth(test, font_name, font_size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def fit_font_size_for_max_lines(text, font_name, start_size, min_size, max_width, max_lines):
    """Ajusta el tamaño de fuente para que el texto quepa en un máximo de líneas"""
    size = start_size
    lines = wrap_text_by_width(text, font_name, size, max_width)
    while len(lines) > max_lines and size > min_size:
        size -= 0.5
        lines = wrap_text_by_width(text, font_name, size, max_width)
    return size, lines


def draw_centered_in_box(c, text, x_left, x_right, y, font_name, font_size, text_color=None):
    """Dibuja texto centrado en una caja con color opcional"""
    c.setFont(font_name, font_size)
    if text_color:
        c.setFillColor(text_color)
    else:
        c.setFillColor(colors.HexColor('#1a1a1a'))  # Color oscuro por defecto
    c.drawCentredString((x_left + x_right) / 2, y, text)


def generate_certificate_pdf(certificado: Dict) -> BytesIO:
    """
    Genera un PDF del certificado usando la plantilla PNG
    
    Args:
        certificado: Diccionario con los datos del certificado que debe incluir:
            - codigo: Código del certificado
            - nombre_completo o nombres/apellidos: Nombre del cliente
            - mencion: Texto de la mención (título)
            - horas: Horas del curso
            - f_inicio: Fecha de inicio
            - f_termino: Fecha de término
            - curso o p_certificado: Programa del certificado
    """
    # Ruta a la plantilla
    # ROOT ya apunta a back/, así que solo necesitamos plantillas/plantilla.png
    plantilla_path = ROOT / "plantillas" / "plantilla.png"
    
    
    if not plantilla_path.exists():
        raise FileNotFoundError(f"Plantilla no encontrada en: {plantilla_path.resolve()}")
    
    # Preparar datos para el PDF
    mencion = certificado.get('mencion', '') or certificado.get('MENCIÓN', '') or ''
    horas = certificado.get('horas', '') or certificado.get('HORAS', '') or ''
    f_inicio = certificado.get('f_inicio', '') or certificado.get('F. INICIO', '') or ''
    f_termino = certificado.get('f_termino', '') or certificado.get('F. TÉRMINO', '') or certificado.get('F. TERMINO', '') or ''
    codigo = certificado.get('codigo', '') or certificado.get('CODIGO', '') or ''
    n_registro = (
        certificado.get('n_registro', '')
        or certificado.get('N.REGISTRO', '')
        or certificado.get('N_REGISTRO', '')
        or ''
    )
    n_codigo = (
        certificado.get('n_codigo', '')
        or certificado.get('N.CODIGO', '')
        or certificado.get('N_CODIGO', '')
        or ''
    )
    n_libro = (
        certificado.get('n_libro', '')
        or certificado.get('N.LIBRO', '')
        or certificado.get('N_LIBRO', '')
        or ''
    )

    def normalize_libro(value: str) -> str:
        raw = str(value or "").strip()
        return raw.zfill(3) if raw.isdigit() else raw
    
    # Construir duración
    duracion = f"{horas} HORAS PEDAGÓGICAS" if horas else "HORAS PEDAGÓGICAS"
    
    # Construir período (formato: "FEBRERO - MARZO 2025")
    periodo = ""
    if f_inicio and f_termino:
        # Intentar extraer mes y año de las fechas
        # Formato esperado: "24 de marzo" o "08 de julio del 2025"
        try:
            # Si las fechas ya están en formato legible, usarlas directamente
            if "del" in f_termino or "de" in f_termino:
                # Extraer mes y año de f_termino
                partes_termino = f_termino.split()
                if len(partes_termino) >= 3:
                    mes_termino = partes_termino[2].upper()  # mes
                    año = partes_termino[-1] if len(partes_termino) > 3 else "2025"
                    # Extraer mes de inicio
                    partes_inicio = f_inicio.split()
                    mes_inicio = partes_inicio[2].upper() if len(partes_inicio) >= 3 else ""
                    
                    if mes_inicio and mes_termino:
                        periodo = f"{mes_inicio} - {mes_termino} {año}"
                    elif mes_termino:
                        periodo = f"{mes_termino} {año}"
        except:
            pass
    
    if not periodo:
        # Fallback: usar las fechas tal cual
        if f_inicio and f_termino:
            periodo = f"{f_inicio} - {f_termino}"
        elif f_termino:
            periodo = f_termino
    
    # Modalidad (por defecto VIRTUAL, pero podría venir del certificado)
    modalidad = certificado.get('modalidad', 'VIRTUAL') or 'VIRTUAL'
    
    # URL de verificación
    base_url = settings.BASE_URL
    url_verificacion = f"{base_url}/consulta/{codigo}"
    
    # Preparar datos para el generador
    datos_pdf = {
        "titulo": mencion,
        "duracion": duracion,
        "modalidad": modalidad,
        "periodo": periodo,
        "url": url_verificacion,
        "codigo": codigo,
        "n_registro": str(n_registro).strip(),
        "n_codigo": str(n_codigo).strip(),
        "n_libro": normalize_libro(n_libro),
    }
    
    # Generar PDF
    buffer = BytesIO()
    W, H = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=(W, H))
    
    # Metadatos del PDF
    c.setTitle(codigo)
    c.setAuthor("Centro Profesional Docente")
    c.setSubject(f"Certificado {codigo}")
    
    # Dibujar plantilla de fondo
    try:
        c.drawImage(str(plantilla_path), 0, 0, width=W, height=H)
    except Exception as e:
        raise Exception(f"Error cargando plantilla: {str(e)}")
    
    # ================= POSICIONES (calibraciones) =================
    TITLE_SHIFT_LEFT = 45
    INFO_SHIFT_LEFT_DM = 52.5
    INFO_SHIFT_LEFT_PERIODO = 20
    MODALIDAD_SHIFT_X = -35
    
    title_box_left = 180 - TITLE_SHIFT_LEFT
    title_box_right = W - 260 - TITLE_SHIFT_LEFT
    title_max_width = title_box_right - title_box_left
    
    info_left_box_l = 95 - INFO_SHIFT_LEFT_DM
    info_left_box_r = 330 - INFO_SHIFT_LEFT_DM
    
    mod_box_l = info_left_box_l + MODALIDAD_SHIFT_X
    mod_box_r = info_left_box_r + MODALIDAD_SHIFT_X
    
    periodo_box_l = (W / 2 - 140) - INFO_SHIFT_LEFT_PERIODO
    periodo_box_r = (W / 2 + 80) - INFO_SHIFT_LEFT_PERIODO
    
    # Alturas
    y_titulo_top = (H - 175) + 25 - 14
    line_gap = 14
    max_lines = 3
    
    y_duracion = (H - 275) + 13
    y_modalidad = (H - 305) + 4
    y_periodo = H - 285
    
    # QR (no tocar)
    qr_x, qr_y, qr_w, qr_h = W - 220, (H - 350) + 60, 125, 125
    
    # ================= TITULO (baja si es 1 o 2 líneas) =================
    titulo = (datos_pdf.get("titulo") or "").strip()
    title_font = "Times-Bold"
    title_size, lines = fit_font_size_for_max_lines(
        titulo, title_font, 10, 8, title_max_width, max_lines
    )
    
    # Ajustar posición según número de líneas
    if len(lines) == 1:
        extra_down = 15  # baja más si es 1 línea
    elif len(lines) == 2:
        extra_down = 6   # baja un poco si son 2 líneas
    else:
        extra_down = 0   # no baja si son 3 o más líneas
    
    x_title_center = (title_box_left + title_box_right) / 2
    c.setFont(title_font, title_size)
    # Color oscuro para el título para mejor contraste
    c.setFillColor(colors.HexColor('#0d0d0d'))
    
    y = y_titulo_top - extra_down
    for line in lines:
        c.drawCentredString(x_title_center, y, line)
        y -= line_gap
    
    # ================= DURACION =================
    # Color gris oscuro para mejor legibilidad
    draw_centered_in_box(c, datos_pdf["duracion"], info_left_box_l, info_left_box_r, y_duracion, "Times-Roman", 9, colors.HexColor('#2c2c2c'))
    
    # ================= MODALIDAD =================
    modalidad = datos_pdf["modalidad"]
    mod_font, mod_size = "Times-Roman", 9
    mod_box_w = mod_box_r - mod_box_l
    while mod_size > 7 and pdfmetrics.stringWidth(modalidad, mod_font, mod_size) > mod_box_w:
        mod_size -= 0.5
    draw_centered_in_box(c, modalidad, mod_box_l, mod_box_r, y_modalidad, mod_font, mod_size, colors.HexColor('#2c2c2c'))
    
    # ================= PERIODO =================
    draw_centered_in_box(c, datos_pdf["periodo"], periodo_box_l, periodo_box_r, y_periodo, "Times-Roman", 9, colors.HexColor('#2c2c2c'))
    
    # ================= QR =================
    try:
        qr_img = qrcode.make(datos_pdf["url"])
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        c.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_w, height=qr_h)
    except Exception as e:
        pass
        # Continuar sin QR si hay error
    
    # ================= CODIGO (debajo del QR) =================
    codigo = (datos_pdf.get("codigo") or "").strip()
    if codigo:
        codigo_x = qr_x + (qr_w / 2)
        # Subir el código más arriba para que no interfiera con el QR
        # qr_y es la posición superior del QR, así que restamos más para subirlo
        codigo_y = qr_y - 0  # Subido más arriba del QR
        c.setFont("Times-Bold", 8)
        # Color distintivo para el código (azul oscuro)
        c.setFillColor(colors.HexColor('#1e3a5f'))
        c.drawCentredString(codigo_x, codigo_y, codigo)

    # ================= DATOS EN RECUADRO (N.REGISTRO / N.CODIGO / LIBRO) =================
    # Posiciones calibradas para el recuadro inferior derecho de la plantilla.
    x_registro = W - 188
    x_codigo_libro = W - 208
    y_registro = H - 333
    y_codigo = H - 348
    y_libro = H - 363

    box_max_width = 150
    c.setFillColor(colors.HexColor('#1a1a1a'))

    def draw_box_value(text, y, start_size=7):
        value = str(text or "").strip()
        font_name = "Times-Roman"
        font_size = start_size
        while font_size > 5.5 and pdfmetrics.stringWidth(value, font_name, font_size) > box_max_width:
            font_size -= 0.25
        c.setFont(font_name, font_size)
        c.drawString(box_text_x, y, value)

    box_text_x = x_registro
    draw_box_value(datos_pdf["n_registro"], y_registro)
    box_text_x = x_codigo_libro
    draw_box_value(datos_pdf["n_codigo"], y_codigo)
    draw_box_value(datos_pdf["n_libro"], y_libro)
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
