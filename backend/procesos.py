from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, Body
from sqlmodel import Session, select, desc
from sqlalchemy.orm import selectinload
from models import ChargeProcess, ChargeProcessCreate, JobPosition, User, EvaluacionCV, Postulant
from google_oauth import get_drive_service
from googleapiclient.errors import HttpError
from cargabd import engine, get_session
from auth import get_current_user
from datetime import datetime, timezone, timedelta
import httpx
from typing import List, Optional, Dict
from dotenv import load_dotenv
import os
import uuid
import json
from jose import JWTError, jwt
import asyncio
import secrets
load_dotenv()

routerprocess = APIRouter(prefix="/procesos", tags=["Procesos"])

# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = os.getenv("ALGORITHM")
N8N_FOLDER_URL = str(os.getenv("N8N_CREATE_FOLDER_URL"))
N8N_PROCESAR_CVS_URL =str(os.getenv("N8N_PROCESAR_CVS_URL"))
N8N_ACTUALIZR_MATCHS_URL =str(os.getenv("N8N_ACTUALIZR_MATCHS_URL"))
N8N_PROCESAR_CVS_URL2 =str(os.getenv("N8N_PROCESAR_CVS_URL2"))
BASE_FRONT_URL = os.getenv("BASE_FRONT_URL")

##Clase para websocket
# class ConnectionManager:
#     def __init__(self):
#         # mapa process_id -> lista de websockets
#         self.active_connections: Dict[int, List[WebSocket]] = {}

#     async def connect(self, process_id: int, websocket: WebSocket):
#         await websocket.accept()
#         self.active_connections.setdefault(process_id, []).append(websocket)

#     def disconnect(self, process_id: int, websocket: WebSocket):
#         conns = self.active_connections.get(process_id, [])
#         if websocket in conns:
#             conns.remove(websocket)
#         if not conns:
#             self.active_connections.pop(process_id, None)

#     async def send_progress(self, process_id: int, message: dict):
#         conns = list(self.active_connections.get(process_id, []) or [])
#         for ws in conns:
#             try:
#                 await ws.send_json(message)
#             except Exception:
#                 # si falla al enviar, cerrar y remover esa conexión
#                 try:
#                     await ws.close()
#                 except:
#                     pass
#                 self.disconnect(process_id, ws)

# manager = ConnectionManager()


#Flujo de creacion
@routerprocess.post("/crear-proceso-carga/")
async def create_process_charge(
    data: ChargeProcessCreate,
    user=Depends(get_current_user)
):
    today_str = datetime.utcnow().strftime("%Y%m%d")
    
    job_id = data.job_id
    reque = data.reque
    functions = data.functions
    
    with Session(engine) as session:
        # validar puesto
        puesto = session.get(JobPosition, job_id)
        if not puesto:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")

        # contar Nprocesos del usuario
        existing = session.exec(
            select(ChargeProcess).where(ChargeProcess.user_id == user.id)
        )
        count = len(existing.all()) + 1
        code = f"{str(user.id).zfill(4)}-{today_str}-{str(count).zfill(5)}"
        
        # Verificar si ya hay un proceso con este código
        existing_process = session.exec(
            select(ChargeProcess).where(ChargeProcess.code == code)
        ).first()
        if existing_process:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un proceso con el código '{code}'"
            )
    
    # Crear carpeta en Drive vía n8n
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                N8N_FOLDER_URL,
                json={"folder_name": code, "puesto": puesto.name}
                ,timeout=httpx.Timeout(1800.0)
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error en comunicación: {e}"
            )
            
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Error al buscar/crear carpeta: {response.status_code} - {response.text}"
            )
                 
        try:
            n8n_data = response.json()
            folder_id = n8n_data.get("folder_id")
            folder_url = n8n_data.get("folder_url")

            if not folder_id:
                raise ValueError("Respuesta sin folder_id")
            if not folder_url:
                raise ValueError("Respuesta sin folder_url")

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al interpretar respuesta de n8n: {e} - {response.text}"
            )

    with Session(engine) as session:
        # Crear proceso
        process = ChargeProcess(
            code=code,
            job_id=job_id,
            reque=reque,
            functions=functions,
            user_id=user.id,
            drive_folder_id=folder_id,
            drive_folder_url=folder_url
        )
        session.add(process)
        session.commit()
        session.refresh(process)
        
        token = secrets.token_urlsafe(12)
        process_code = getattr(process, "code", None) or str(process.id)
        base = os.getenv("BASE_FRONT_URL", BASE_FRONT_URL)
        form_url = f"{base.rstrip('/')}/{process_code}/{token}"
 
        process.form_token = token
        process.form_url = form_url

        session.add(process)
        session.commit()
        session.refresh(process)

    return {
        "id": process.id,
        "code": process.code,
        "puesto": puesto.name,
        "drive_folder_id": process.drive_folder_id,
        "drive_folder_url": process.drive_folder_url,
        "form_url": process.form_url,
        "form_token": process.form_token
    }

#Listar
@routerprocess.get("/listar", response_model=List[ChargeProcess])
def list_process(
    job_id: Optional[int] = Query(None),
    state: Optional[bool] = Query(None),
    user=Depends(get_current_user)
):
    with Session(engine) as session:
        query = select(ChargeProcess)
        
        if user.role != "admin":
            query = query.where(ChargeProcess.user_id == user.id)
            
        if job_id is not None:
            query = query.where(ChargeProcess.job_id == job_id)
            
        if state is not None:
            query = query.where(ChargeProcess.state == state)
            
        process = session.exec(query.order_by(desc(ChargeProcess.create_date))).all()
        
        result = []
        
        for p in process:
            autor = None
            if user.role == "admin":
                usr = session.get(User, p.user_id)
                autor = usr.username if usr else None
            result.append({
                "id": p.id,
                "code": p.code,
                "create_date": p.create_date,
                "state": p.state,
                "end_process": p.end_process,
                "puesto": p.job.name if p.job else None,
                "area": p.job.area.name if p.job and p.job.area else None,
                "reque": p.reque,
                "functions": p.functions,
                "autor": autor,
                "drive_folder_url": p.drive_folder_url
            })
        return result

#Activar  
@routerprocess.put("/{id}/activar")
def enable_process(id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, id)
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")
        process.state = True
        session.add(process)
        session.commit()
        return {"msg": "Proceso activado"}

#Desactivar
@routerprocess.put("/{id}/desactivar")
def disable_process(id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, id)
        if not process or process.user_id != user.id:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")
        process.state = False
        session.add(process)
        session.commit()
        return {"msg": "Proceso desactivado"}

######################  PRUEBAS ##############################
#async
def list_drive_files(folder_id: str):
    """
    Lista los archivos de una carpeta en Google Drive usando el service.
    """
    try:
        service = get_drive_service()
        archivos = []
        page_token = None

        while True:
            # results = (
            #     service.files()
            #     .list(
            #         q=f"'{folder_id}' in parents and mimeType!='application/vnd.google-apps.folder'",
            #         fields="nextPageToken, files(id, name, webViewLink)",
            #         pageSize=1000,  # máximo permitido por la API
            #         pageToken=page_token,
            #     )
            #     .execute()
            # )
            results = service.files().list(
                q=f"'{folder_id}' in parents and mimeType!='application/vnd.google-apps.folder'",
                fields="nextPageToken, files(id, name, webViewLink)",
                pageSize=1000,
                pageToken=page_token,
            ).execute()

            archivos.extend(results.get("files", []))
            page_token = results.get("nextPageToken")

            if not page_token:
                break

        return archivos

    except HttpError as e:
        print(f"❌ Error al listar archivos de Drive: {e}")
        return []


def guardar_resultado(session: Session, result: dict, process):
    """
    Guarda el resultado de n8n en Postulant y EvaluacionCV respetando la
    prioridad: si ya existe postulant asociado al CV -> no sobrescribir datos básicos.
    """
    url_cv = result.get("url_cv")
    nombre_archivo = result.get("nombre_archivo")
    cv_procesado = result.get("cv_procesado", False)
    cv_estado = result.get("cv_estado", "no leído")
    motivo = result.get("motivo")
    name = result.get("name") or nombre_archivo
    dni = (result.get("dni") or "").strip() or None

    # 1) buscar postulant por cv_url (prioritario) o por drive file id si lo tienes
    postulant = None
    if url_cv:
        postulant = session.exec(select(Postulant).where(Postulant.cv_url == url_cv)).first()

    # (opcional) si n8n devuelve drive_file_id puedes buscar por cv_drive_file_id también:
    if not postulant and result.get("drive_file_id"):
        postulant = session.exec(select(Postulant).where(Postulant.cv_drive_file_id == result.get("drive_file_id"))).first()

    # 2) si no lo encontramos por CV, buscar por dni si viene
    if not postulant and dni:
        postulant = session.exec(select(Postulant).where(Postulant.dni == dni)).first()

    # 3) si aún no existe, crear uno nuevo (dni puede ser temp-UUID si no hay dni)
    if not postulant:
        if not dni:
            dni = f"temp-{uuid.uuid4()}"
        postulant = Postulant(
            dni=dni,
            name=name,
            email=result.get("email"),
            telf=result.get("telf"),
            address=result.get("address"),
            years_exper=result.get("years_exper"),
            level_educa=result.get("level_educa"),
            certif=", ".join(result.get("certif")) if isinstance(result.get("certif"), list) else result.get("certif"),
            languages=", ".join(result.get("languages")) if isinstance(result.get("languages"), list) else result.get("languages"),
            differential_advantages=result.get("differential_advantages"),
            cv_url=url_cv,
            cv_drive_file_id=result.get("drive_file_id")
        )
        session.add(postulant)
        session.flush()  # asegurar que tenga dni para FK de EvaluacionCV

    else:
        # Si existe postulant **por CV** -> NO sobrescribir los campos básicos (name/email/telf/address)
        # Si existe por DNI (o lo encontramos por drive id), asumimos que está OK actualizar la info básica.
        found_by_cv = (postulant.cv_url == url_cv and url_cv is not None)
        if not found_by_cv:
            # actualizar/normalizar campos básicos con la data recibida
            postulant.name = name or postulant.name
            postulant.email = result.get("email") or postulant.email
            postulant.telf = result.get("telf") or postulant.telf
            postulant.address = result.get("address") or postulant.address
            # actualizar campos complementarios siempre
            postulant.years_exper = result.get("years_exper") if result.get("years_exper") is not None else postulant.years_exper
            postulant.level_educa = result.get("level_educa") or postulant.level_educa
            # certif / languages pueden llegar como lista o string
            if result.get("certif") is not None:
                postulant.certif = ", ".join(result.get("certif")) if isinstance(result.get("certif"), list) else result.get("certif")
            if result.get("languages") is not None:
                postulant.languages = ", ".join(result.get("languages")) if isinstance(result.get("languages"), list) else result.get("languages")
            postulant.differential_advantages = result.get("differential_advantages") or postulant.differential_advantages
            # si postulant no tenía cv_url, guardarlo ahora
            if not postulant.cv_url and url_cv:
                postulant.cv_url = url_cv
            if not postulant.cv_drive_file_id and result.get("drive_file_id"):
                postulant.cv_drive_file_id = result.get("drive_file_id")

        else:
            # existente por CV -> solo actualizar campos no-basicos (no modificar name/email/telf/address)
            postulant.years_exper = result.get("years_exper") if result.get("years_exper") is not None else postulant.years_exper
            postulant.level_educa = result.get("level_educa") or postulant.level_educa
            if result.get("certif") is not None:
                postulant.certif = ", ".join(result.get("certif")) if isinstance(result.get("certif"), list) else result.get("certif")
            if result.get("languages") is not None:
                postulant.languages = ", ".join(result.get("languages")) if isinstance(result.get("languages"), list) else result.get("languages")
            postulant.differential_advantages = result.get("differential_advantages") or postulant.differential_advantages
            if not postulant.cv_drive_file_id and result.get("drive_file_id"):
                postulant.cv_drive_file_id = result.get("drive_file_id")

    # Guardar postulant (si fue modificado)
    session.add(postulant)
    session.flush()

    # 4) ahora crear la EvaluacionCV asociada
    eval_data = result.get("evaluacion") or {}
    raw_match = eval_data.get("match")
    try:
        match_val = float(raw_match) if raw_match is not None else 0.0
    except Exception:
        match_val = 0.0

    if cv_procesado and raw_match is not None and 0 <= match_val <= 100:
        evaluation = EvaluacionCV(
            name=eval_data.get("name") or name,
            match=match_val,
            reason=eval_data.get("reason", ""),
            functions=eval_data.get("functions", ""),
            skills=", ".join(eval_data.get("skills") or []),
            summary=eval_data.get("summary", ""),
            puesto_id=eval_data.get("puesto_id", process.job_id),
            charge_process_id=process.id,
            dni_postulante=postulant.dni,
            years_exper=float(result.get("years_exper", 0)) if result.get("years_exper") else None,
            level_educa=result.get("level_educa"),
            certif=", ".join(result.get("certif")) if isinstance(result.get("certif"), list) else result.get("certif"),
            languages=", ".join(result.get("languages")) if isinstance(result.get("languages"), list) else result.get("languages"),
            differential_advantages=result.get("differential_advantages"),
            url_cv=url_cv,
            nombre_archivo=nombre_archivo,
            cv_procesado=cv_procesado,
            cv_estado=cv_estado,
        )
    else:
        evaluation = EvaluacionCV(
            name=name or "No identificado",
            match=0.0,
            puesto_id=process.job_id,
            charge_process_id=process.id,
            dni_postulante=postulant.dni if cv_procesado else None,
            url_cv=url_cv,
            nombre_archivo=nombre_archivo,
            cv_procesado=cv_procesado,
            cv_estado=cv_estado,
            reason=motivo or "",
            functions="",
            skills="",
            summary=""
        )

    session.add(evaluation)
    # No commit aquí — commit lo hace el caller (como en tu bucle). 


#Proceso de evaluacion de CV
@routerprocess.post("/{process_id}/procesar-cvs")
async def process_cvs(process_id: int, request: Request, user=Depends(get_current_user)):
    
    token = request.headers.get("authorization")
    if not token:
        raise HTTPException(status_code=401, detail="No se proporcionó token")

    with Session(engine) as session:
        process = session.get(ChargeProcess, process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")

        if user.role != "admin" and process.user_id != user.id:
            raise HTTPException(status_code=403, detail="No tienes permiso")

        job = session.get(JobPosition, process.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto asociado no encontrado")

        job_name = job.name
        job_id = job.id
        job_area = job.area.name if job.area else None
        job_reque = process.reque
        job_funcs = process.functions

        

        # Marcar como en proceso
        process.is_processing = True
        session.add(process)
        session.commit()
        session.refresh(process)

        res = session.exec(
            select(EvaluacionCV.url_cv).where(EvaluacionCV.charge_process_id == process.id)
        )
        try:
            already = res.scalars().all()
        except AttributeError:
            # fallback si res no tiene scalars()
            already = res.all()
        urls_procesadas = set([u for u in already if u])
        
        print ("-----------------------------DEBUG:",urls_procesadas)
    try:
        # 1. Listar todos los archivos en la carpeta de Drive
        #archivos = await list_drive_files(process.drive_folder_id)
        # justo donde usas asyncio.to_thread(list_drive_files, process.drive_folder_id)
        try:
            archivos = await asyncio.to_thread(list_drive_files, process.drive_folder_id)
        except Exception as e:
            # log claro
            print("Error listando archivos de Drive (posible invalid_grant):", e)
            # limpiar estado
            with Session(engine) as s2:
                proc2 = s2.get(ChargeProcess, process_id)
                if proc2:
                    proc2.is_processing = False
                    s2.add(proc2)
                    s2.commit()
            # devolver error legible al cliente
            raise HTTPException(status_code=502, detail=f"Error autenticación/Drive: {str(e)}")
        

        # Filtrar solo los pendientes (los que NO están en urls_procesadas)
        pendientes = [a for a in archivos if a.get("webViewLink") not in urls_procesadas]

        print(f"📂 Total: {len(archivos)}, ✅ Procesados: {len(urls_procesadas)}, ⏳ Pendientes: {len(pendientes)}")

        results_ok, cvs_no_procesados, cvs_procesados = [], [], []
        errores = []

        async with httpx.AsyncClient() as client:
            with Session(engine) as session:
                for idx, archivo in enumerate(pendientes, start=1):
                    url_cv = archivo.get("webViewLink")
                    nombre_archivo = archivo.get("name")

                    print(f"Procesando archivo N° {idx} de {len(pendientes)} → {nombre_archivo}")

                    payload = {
                        "folder_id": process.drive_folder_id,
                        "process_id": process.id,
                        "puesto": job_name,
                        "puesto_id": job_id,
                        "area": job_area,
                        "reque": job_reque,
                        "funcs": job_funcs,
                        "url_cv": url_cv,
                        "nombre_archivo": nombre_archivo,
                        "token": token
                    }

                    try:
                        response = await client.post(N8N_PROCESAR_CVS_URL2, json=payload, timeout=httpx.Timeout(300.0))
                        response.raise_for_status()
                        result = response.json()

                        if isinstance(result, str):
                            result = json.loads(result)

                        # Guardar inmediatamente en DB
                        guardar_resultado(session, result, process)

                        session.commit()
                        results_ok.append(result)
                        cvs_procesados.append({"nombre_archivo": nombre_archivo, "url_cv": url_cv, "cv_estado": result.get("cv_estado")})
                        
                        # -- enviar progreso (éxito) --
                        # try:
                        #     await manager.send_progress(process.id, {
                        #         "current": idx,
                        #         "total": len(pendientes),
                        #         "file": nombre_archivo,
                        #         "status": "ok"
                        #     })
                        # except Exception as ws_err:
                        #     print("Warning: fallo al enviar progreso por WS:", ws_err)

                    except Exception as e:
                        session.rollback()
                        errores.append({"nombre_archivo": nombre_archivo, "url_cv": url_cv, "error": str(e)})
                        cvs_no_procesados.append({"nombre_archivo": nombre_archivo, "url_cv": url_cv, "cv_estado": "falló"})
                        print("Error procesando archivo:", nombre_archivo, e)

                        # try:
                        #     await manager.send_progress(process.id, {
                        #         "current": idx,
                        #         "total": len(pendientes),
                        #         "file": nombre_archivo,
                        #         "status": "error",
                        #         "error": str(e)
                        #     })
                        # except Exception as ws_err:
                        #     print("Warning: fallo al enviar progreso por WS (error):", ws_err)

                        continue

        # try:
        #     await manager.send_progress(process.id, {
        #         "current": len(pendientes),
        #         "total": len(pendientes),
        #         "completed": True
        #     })
        # except Exception as ws_err:
        #     print("Warning: fallo al enviar progreso final por WS:", ws_err)

        return {
            "evaluaciones_registradas": len(results_ok),
            "cvs_procesados": cvs_procesados,
            "cvs_no_procesados": cvs_no_procesados,
            "errores": errores
        }
    
    except Exception as e:
        print("Error en el procesamiento:", e)
        return {"error": "Error en el procesamiento"}
    
    finally:
        # 🚩 siempre marcar como terminado
        with Session(engine) as session:
            process = session.get(ChargeProcess, process_id)
            process.is_processing = False
            session.add(process)
            session.commit()
######################  PRUEBAS #############################
 

# Obtener detalle de un proceso de carga
@routerprocess.get("/{process_id}")
def get_process_detail(process_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        stmt = (
            select(ChargeProcess)
            .where(ChargeProcess.id == process_id)
            .options(
                selectinload(ChargeProcess.job).selectinload(JobPosition.area) #type: ignore
            )
        )
        process = session.exec(stmt).first()
        
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")

        if user.role != "admin" and process.user_id != user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a este proceso")

        #job = session.get(JobPosition, process.job_id)
        autor = session.get(User, process.user_id)
        
        return {
            "id": process.id,
            "code": process.code,
            "fecha": process.create_date,
            "state": process.state,
            "puesto": process.job.name if process.job else None,
            "area": process.job.area.name if process.job and process.job.area else None,
            "reque": process.reque,
            "functions": process.functions,
            "url_form": process.form_url,
            "autor": autor.username if autor else None,
            "drive_folder_url": process.drive_folder_url,
            "end_process": process.end_process,
            "is_processing": process.is_processing,  # 🚩 nuevo
        }

# Obtener evaluaciones del historial por proceso
@routerprocess.get("/{process_id}/evaluaciones")
def get_evaluaciones_por_proceso(process_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")

        if user.role != "admin" and process.user_id != user.id:
            raise HTTPException(status_code=403, detail="No autorizado")

        evaluaciones = session.exec(
            select(EvaluacionCV).where(EvaluacionCV.charge_process_id == process_id)
        ).all()

        return [
            {
                "id": e.id,
                "name": e.name,
                "match": e.match,
                "match_eval": e.match_eval if e.match_eval is not None else None,
                "match_total": e.match_total if e.match_total is not None else None,
                "summary": e.summary,
                "reason": e.reason,
                "functions": e.functions,
                "skills": e.skills,
                "fecha": e.date_create.strftime("%Y-%m-%d %H:%M:%S") if e.date_create else None,
                "cv_procesado": e.cv_procesado,
                "flag_shade": e.flag_shade,
                "url_cv": e.url_cv,
                "nombre_archivo": e.nombre_archivo,
            }
            for e in evaluaciones
        ]

#Finalizar proceso
@routerprocess.post("/{id}/finalizar")
async def endless_process(
id: int,
request: Request,
session: Session = Depends(get_session),
current_user: User = Depends(get_current_user)
):    
    token = request.headers.get("authorization")
    if not token:
        raise HTTPException(status_code=401, detail="No se proporcionó token")

    process = session.get(ChargeProcess, id)
    
    if not process:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    if process.end_process:
        raise HTTPException(status_code=400, detail="Este proceso ya fue finalizado")

    # 1. Obtener evaluaciones con match ≥ 80
    evaluations = session.exec(
        select(EvaluacionCV).where(
            EvaluacionCV.charge_process_id == id,
            EvaluacionCV.match >= 80
        )
    ).all()

    if not evaluations:
        raise HTTPException(status_code=400, detail="No hay evaluaciones con match ≥ 80 para finalizar")

    # 2. Armar payload para n8n
    payload = {
        "proceso_id": id,
        "evaluaciones": [
            {
                "dni": e.dni_postulante,
                "match": e.match,
                "name": e.name,
                "years_exper": e.years_exper,
                "level_educa": e.level_educa,
                "certif": e.certif,
                "languages": e.languages,
                "differential_advantages": e.differential_advantages,
            }
            for e in evaluations
        ],
        "token": token
    }
    
    # 3. Enviar a n8n
    try:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                                N8N_ACTUALIZR_MATCHS_URL,
                                json=payload
                                ,timeout=httpx.Timeout(10800.0)
                            )

                response.raise_for_status()
            
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="Tiempo de espera agotado al contactar con n8n")
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=502, detail=f"Error desde n8n: {e.response.text}")
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Error al llamar al flujo de n8n: {str(e)}")
                
    # 4. Marcar proceso como finalizado
    process.end_process = True
    session.add(process)
    session.commit()

    return {
        "detail": f"Proceso {id} finalizado correctamente.",
        "total_enviados": len(evaluations)
    }

@routerprocess.post("/{id}/reactivar")
async def reactivate_process(id: int, session: Session = Depends(get_session)):
    process = session.get(ChargeProcess, id)
    if not process:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")

    if not process.end_process:
        raise HTTPException(status_code=400, detail="El proceso ya está activo")

    process.end_process = False
    session.add(process)
    session.commit()
    return {"detail": f"Proceso {id} reactivado exitosamente"} 

#Creacion Form
@routerprocess.post("/{process_id}/generate_form_url")
def generate_form_url(process_id: int):
    with Session(engine) as session:
        cp = session.get(ChargeProcess, process_id)
        if not cp:
            raise HTTPException(status_code=404, detail="ChargeProcess no encontrado")

        # generar token único
        token = secrets.token_urlsafe(12)  # <- CORRECCIÓN

        # usar code si existe, sino id
        process_code = getattr(cp, "code", None) or str(cp.id)

        # construir la url pública (BASE_FRONT_URL debe incluir /apply si así lo quieres)
        base = os.getenv("BASE_FRONT_URL", BASE_FRONT_URL)
        form_url = f"{base.rstrip('/')}/{process_code}/{token}"

        # Guardar en BD
        cp.form_token = token
        cp.form_url = form_url
        session.add(cp)
        session.commit()
        session.refresh(cp)

        return {"form_url": cp.form_url, "form_token": cp.form_token}


#recalcular match_total
@routerprocess.put("/evaluaciones/{eval_id}")
def update_evaluacion_match(eval_id: int, payload: dict = Body(...), user=Depends(get_current_user)):
    """
    Payload esperado: { "match_eval": 75.5 }
    Valida 0..100, recalcula match_total = 0.5*match + 0.5*match_eval
    """
    match_eval = payload.get("match_eval")
    if match_eval is None:
        raise HTTPException(status_code=400, detail="match_eval es requerido")

    try:
        match_eval = float(match_eval)
    except Exception:
        raise HTTPException(status_code=400, detail="match_eval debe ser numérico")

    if match_eval < 0 or match_eval > 100:
        raise HTTPException(status_code=400, detail="match_eval debe estar entre 0 y 100")

    with Session(engine) as session:
        ev = session.get(EvaluacionCV, eval_id)
        if not ev:
            raise HTTPException(status_code=404, detail="Evaluación no encontrada")

        # Permisos: solo admin o dueño del proceso puede modificar
        process = session.get(ChargeProcess, ev.charge_process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Proceso asociado no encontrado")
        # cargar user via token (get_current_user ya lo hizo), pero revisar rol:
        # Si quieres más restricción: require user.id == process.user_id (ya lo tienes en otros endpoints)
        current = user
        if current.role != "admin" and process.user_id != current.id:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta evaluación")

        # calcular match_total
        try:
            match_base = float(ev.match or 0)
        except:
            match_base = 0.0

        match_total = 0.5 * match_base + 0.5 * match_eval

        # opcional: redondeo a 2 decimales
        match_total = round(match_total, 2)

        ev.match_eval = match_eval
        ev.match_total = match_total

        session.add(ev)
        session.commit()
        session.refresh(ev)

        return {
            "id": ev.id,
            "match": ev.match,
            "match_eval": ev.match_eval,
            "match_total": ev.match_total
        }

#API websocket
# @routerprocess.websocket("/ws/{process_id}")
# async def websocket_endpoint(websocket: WebSocket, process_id: int):
#     # El cliente debe pasar token como query param: ?token=Bearer%20<token>
#     token = websocket.query_params.get("token")
#     if token and token.startswith("Bearer "):
#         token = token.split(" ", 1)[1]
#     if not token:
#         # 4401 -> custom "no autorizado"
#         await websocket.close(code=4401)
#         return

#     # validar token
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         username = payload.get("sub")
#         if not isinstance(username, str):
#             raise JWTError("sub inválido")
#     except JWTError:
#         await websocket.close(code=4401)
#         return

#     # validar que el usuario tiene acceso al proceso
#     try:
#         with Session(engine) as session:
#             user = session.exec(select(User).where(User.username == username)).first()
#             if not user:
#                 await websocket.close(code=4401)
#                 return
#             process = session.get(ChargeProcess, process_id)
#             if not process:
#                 await websocket.close(code=4403)  # no encontrado / prohibido
#                 return
#             if user.role != "admin" and process.user_id != user.id:
#                 await websocket.close(code=4403)
#                 return
#     except Exception:
#         await websocket.close(code=4401)
#         return

#     # conectar y mantener vivo
#     await manager.connect(process_id, websocket)
#     try:
#         # loop para mantener la conexión abierta; los envíos son desde el backend
#         while True:
#             # Sólo mantenemos vivo. Si el cliente envía pings, esto los ignora.
#             await asyncio.sleep(30)
#     except WebSocketDisconnect:
#         manager.disconnect(process_id, websocket)
#     except Exception:
#         manager.disconnect(process_id, websocket)