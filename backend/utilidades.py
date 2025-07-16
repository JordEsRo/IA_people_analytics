# utils/extraccion_datos.py
import re

def extraer_datos_desde_pdf(contenido: bytes) -> dict:
    texto = contenido.decode("latin-1", errors="ignore")  # Ajustar según encoding del PDF
    
    return {
        "dni": extraer_dni(texto),
        "nombre": extraer_nombre(texto),
        "email": extraer_email(texto),
        "telefono": extraer_telefono(texto),
        "direccion": extraer_direccion(texto),
    }

def extraer_dni(texto):
    match = re.search(r"\b(?:DNI|N° Documento|Documento)\s*[:\-]?\s*(\d{8})\b", texto)
    return match.group(1) if match else None

def extraer_email(texto):
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", texto)
    return match.group(0) if match else None

def extraer_telefono(texto):
    match = re.search(r"\b9\d{8}\b", texto)
    return match.group(0) if match else None

def extraer_nombre(texto):
    # Lógica básica, puedes mejorarla con NLP
    match = re.search(r"(?i)(?:nombre\s*completo|postulante)[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]{10,})", texto)
    return match.group(1).strip() if match else "Nombre no detectado"

def extraer_direccion(texto):
    match = re.search(r"(?i)(?:dirección|domicilio)[:\-]?\s*(.+?)(?=\n|$)", texto)
    return match.group(1).strip() if match else None
