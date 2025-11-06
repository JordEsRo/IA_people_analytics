# google_oauth.py
import os
import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import RefreshError

routergoogle = APIRouter(prefix="/google", tags=["Google OAuth"])

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/google/callback")
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# archivo local para persistir tokens (mejor: guarda en DB/vault)
TOKEN_FILE = os.environ.get("GOOGLE_TOKEN_FILE", "/app/credentials/google_tokens.json")
SERVICE_ACCOUNT_FILE = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE")  # opcional

def get_flow() -> Flow:
    if not CLIENT_ID or not CLIENT_SECRET:
        raise RuntimeError("GOOGLE_CLIENT_ID/CLIENT_SECRET no configurados")
    return Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "project_id": "placeholder",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "client_secret": CLIENT_SECRET,
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

@routergoogle.get("/auth")
def auth_google():
    flow = get_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",  # fuerza refresh_token la primera vez
    )
    # ideal: guarda 'state' en DB/SESSION asociado al usuario si usas sesiones
    return RedirectResponse(auth_url, status_code=307)

@routergoogle.get("/callback")
def auth_google_callback(request: Request, code: str = None, state: str = None):
    if code is None:
        raise HTTPException(status_code=400, detail="Missing code")
    flow = get_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    data = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,  # puede venir None si ya autorizado antes sin prompt=consent
        "expiry": creds.expiry.isoformat() if creds.expiry else None,
        "scopes": list(creds.scopes) if creds.scopes else SCOPES,
        "token_uri": creds.token_uri,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }

    # Persistir tokens (puedes sustituir por DB)
    try:
        os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception as e:
        return JSONResponse({"status": "error", "msg": "No se pudo guardar token", "error": str(e)}, status_code=500)

    return JSONResponse({"status": "ok", "saved_to": TOKEN_FILE, "google": data})

def _read_saved_tokens():
    if not os.path.exists(TOKEN_FILE):
        return None
    try:
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def get_drive_service():
    """
    Crea y devuelve el servicio de Drive. Soporta:
      - tokens guardados por /google/callback (refresh token)
      - o service account via GOOGLE_SERVICE_ACCOUNT_FILE
    Lanzará excepciones claras si no hay credenciales válidas.
    """
    # 1) Service account fallback (recomendado si lo puedes usar)
    if SERVICE_ACCOUNT_FILE and os.path.exists(SERVICE_ACCOUNT_FILE):
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        return build("drive", "v3", credentials=creds)

    # 2) Leer token guardado
    data = _read_saved_tokens()
    if not data:
        raise RuntimeError("No se encontraron tokens de Google. Visita /google/auth para autorizar.")

    creds = Credentials(
        token=data.get("access_token"),
        refresh_token=data.get("refresh_token"),
        token_uri=data.get("token_uri") or "https://oauth2.googleapis.com/token",
        client_id=data.get("client_id") or CLIENT_ID,
        client_secret=data.get("client_secret") or CLIENT_SECRET,
        scopes=data.get("scopes", SCOPES)
    )

    # refrescar si está expirado y hay refresh_token
    try:
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
                # actualizar archivo con nuevo access_token + expiry
                try:
                    data["access_token"] = creds.token
                    data["expiry"] = creds.expiry.isoformat() if creds.expiry else None
                    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
                        json.dump(data, f)
                except Exception:
                    # no bloqueante: seguimos con las credenciales refrescadas en memoria
                    pass
            else:
                # no se puede refrescar
                raise RuntimeError("Credenciales inválidas o sin refresh_token. Reautoriza en /google/auth")
    except RefreshError as e:
        # token revocado o inválido
        raise RuntimeError(f"RefreshError al refrescar credenciales: {e}")
    except HttpError as e:
        raise RuntimeError(f"HttpError durante refresh de credenciales: {e}")

    return build("drive", "v3", credentials=creds)

@routergoogle.get("/drive/files")
def listar_archivos():
    try:
        service = get_drive_service()
    except RuntimeError as e:
        return JSONResponse({"error": str(e)}, status_code=500)

    try:
        results = service.files().list(
            pageSize=10,
            fields="files(id, name, mimeType)"
        ).execute()
        return results.get("files", [])
    except HttpError as e:
        return JSONResponse({"error": "Google API error", "detail": str(e)}, status_code=500)
