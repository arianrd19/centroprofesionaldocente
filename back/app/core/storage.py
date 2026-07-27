"""
Sistema de almacenamiento de archivos (PDFs)
Soporta: Local (Hostinger), S3 (opcional)
"""
import os
from pathlib import Path
from datetime import datetime
from app.core.config import settings

# Importar boto3 solo si se necesita S3 (opcional)
try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    # Crear una clase dummy para ClientError si no está disponible
    class ClientError(Exception):
        pass


class StorageService:
    """Servicio de almacenamiento de archivos"""
    
    def __init__(self):
        self.storage_type = os.getenv('STORAGE_TYPE', 'local')
        self._init_storage()
    
    def _init_storage(self):
        """Inicializa el servicio de almacenamiento según la configuración"""
        if self.storage_type == 's3':
            if not BOTO3_AVAILABLE:
                raise Exception("boto3 no está instalado. Para usar S3, instala: pip install boto3")
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                    region_name=os.getenv('AWS_REGION', 'us-east-1')
                )
                self.bucket_name = os.getenv('AWS_BUCKET_NAME')
            except Exception as e:
                raise Exception(f"Error configurando S3: {str(e)}")
        elif self.storage_type == 'local':
            storage_path = os.getenv('STORAGE_PATH', settings.STORAGE_PATH)
            # Si es ruta relativa, crear desde ROOT (back/)
            if not os.path.isabs(storage_path):
                from app.core.config import ROOT
                # ROOT apunta a back/, así que back/uploads/certificados
                self.storage_path = ROOT / storage_path
            else:
                self.storage_path = Path(storage_path)
            
            # Asegurar que la carpeta exista
            self.storage_path.mkdir(parents=True, exist_ok=True)
            
            self.base_url = os.getenv('BASE_STORAGE_URL', settings.BASE_STORAGE_URL)
    
    def save_pdf(self, file_content: bytes, filename: str, codigo: str) -> dict:
        """
        Guarda un PDF y retorna la información de almacenamiento
        
        Returns:
            dict con 'path' y 'url'
        """
        # Generar ruta organizada por año/mes
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')
        
        if self.storage_type == 's3':
            return self._save_to_s3(file_content, filename, codigo, year, month)
        elif self.storage_type == 'local':
            return self._save_to_local(file_content, filename, codigo, year, month)
        else:
            raise ValueError(f"Tipo de almacenamiento no soportado: {self.storage_type}")
    
    def _save_to_local(self, file_content: bytes, filename: str, codigo: str, year: str, month: str) -> dict:
        """Guarda PDF en almacenamiento local"""
        # Crear estructura de carpetas: year/month/
        folder = self.storage_path / year / month
        folder.mkdir(parents=True, exist_ok=True)
        
        # Nombre único: codigo_timestamp.pdf
        safe_filename = f"{codigo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        file_path = folder / safe_filename
        
        # Guardar archivo
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        
        # Generar URL pública
        relative_path = f"{year}/{month}/{safe_filename}"
        url = f"{self.base_url}/{relative_path}"
        
        return {
            'path': str(file_path.resolve()),  # Ruta absoluta completa
            'url': url,
            'relative_path': relative_path
        }
    
    def _save_to_s3(self, file_content: bytes, filename: str, codigo: str, year: str, month: str) -> dict:
        """Guarda PDF en S3"""
        # Generar key único
        safe_filename = f"{codigo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        s3_key = f"certificados/{year}/{month}/{safe_filename}"
        
        try:
            # Subir a S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType='application/pdf',
                ACL='public-read'  # O 'private' si prefieres
            )
            
            # Generar URL pública
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            
            return {
                'path': s3_key,
                'url': url,
                'relative_path': s3_key
            }
        except ClientError as e:
            raise Exception(f"Error subiendo archivo a S3: {str(e)}")
    
    def delete_pdf(self, path_or_url: str) -> bool:
        """Elimina un PDF"""
        if self.storage_type == 's3':
            # Extraer key de la URL o usar path directamente
            if path_or_url.startswith('http'):
                key = path_or_url.split('.com/')[-1]
            else:
                key = path_or_url
            
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                return True
            except ClientError:
                return False
        
        elif self.storage_type == 'local':
            # path_or_url puede ser path completo o URL
            if path_or_url.startswith('http'):
                # Extraer path relativo de la URL
                relative_path = path_or_url.split('/uploads/certificados/')[-1]
                file_path = self.storage_path / relative_path
            else:
                file_path = Path(path_or_url)
            
            try:
                if file_path.exists():
                    file_path.unlink()
                    return True
                return False
            except Exception:
                return False
        
        return False


# Instancia global
storage_service = StorageService()
