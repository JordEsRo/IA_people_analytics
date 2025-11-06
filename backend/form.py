from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from models import Postulant, Postulation, ChargeProcess, JobPosition
from sqlmodel import select
from sqlalchemy.orm import Session
from cargabd import engine, get_session
import httpx
import os
from typing import Optional

routerform = APIRouter(prefix="/form", tags=["Form"])

N8N_FOLDER_URL = os.getenv("N8N_FOLDER_URL")  # webhook n8n
MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

@routerform.post("/apply")
async def apply(
    name: str = Form(...),
    dni: str = Form(...),
    telf: str = Form(None),
    email: str = Form(...),
    address: str = Form(None),
    puesto: str = Form(None),
    process_code: str = Form(...),
    process_name: str = Form(None),
    drive_folder_id: str = Form(None),
    form_token: Optional[str] = Form(None),  # opcional: se exige si ChargeProcess tiene token
    cv: UploadFile = File(...),
):
    # 1) validación del archivo (tipo / tamaño)
    if cv.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Formato CV no permitido")
    contents = await cv.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="CV excede tamaño máximo")

    # 2) localizar el ChargeProcess (por code preferiblemente, si no por id numérico)
    with Session(engine) as session:
        stmt = select(ChargeProcess).where(ChargeProcess.code == process_code)
        cp_res = session.execute(stmt)
        cp = cp_res.scalars().first()

        if not cp:
            # intentar por id si el process_code es numérico
            try:
                pid = int(process_code)
                cp = session.get(ChargeProcess, pid)
            except Exception:
                cp = None

        if not cp:
            raise HTTPException(status_code=404, detail="ChargeProcess no encontrado")

        # Si el ChargeProcess tiene token, exigir que el cliente lo envíe y coincida
        if getattr(cp, "form_token", None):
            if not form_token or cp.form_token != form_token:
                raise HTTPException(status_code=403, detail="Token de formulario inválido o faltante")

        # determinar carpeta: preferir la que está guardada en DB
        folder_id = cp.drive_folder_id or drive_folder_id

        # 3) crear o actualizar Postulant (PK = dni)
        postulant = session.get(Postulant, dni)
        if not postulant:
            postulant = Postulant(
                dni=dni,
                name=name,
                email=email,
                telf=telf,
                address=address
            )
            session.add(postulant)
            session.commit()
            session.refresh(postulant)
        else:
            # actualizar campos básicos si cambiaron
            updated = False
            if name and postulant.name != name:
                postulant.name = name; updated = True
            if email and postulant.email != email:
                postulant.email = email; updated = True
            if telf and postulant.telf != telf:
                postulant.telf = telf; updated = True
            if address and postulant.address != address:
                postulant.address = address; updated = True
            if updated:
                session.add(postulant)
                session.commit()
                session.refresh(postulant)

        # 4) crear Postulation si no existe (dni + process_id)
        stmt2 = select(Postulation).where(
            Postulation.postulant_dni == dni,
            Postulation.process_id == cp.id
        )
        res2 = session.execute(stmt2)
        postulation = res2.scalars().first()
        if not postulation:
            postulation = Postulation(
                postulant_dni=dni,
                process_id=cp.id,
                status="Pendiente"
            )
            session.add(postulation)
            session.commit()
            session.refresh(postulation)

        # Guardar ids y folder antes de cerrar la sesión
        saved_postulant_dni = postulant.dni
        saved_postulation_id = postulation.id
        saved_cp_id = cp.id
        saved_folder_id = folder_id

    # 5) Subir el archivo a n8n (fuera del contexto DB)
    files = {"file": (cv.filename, contents, cv.content_type)}
    data = {
        "drive_folder_id": saved_folder_id,
        "process_code": process_code,
        "postulant_dni": saved_postulant_dni,
        "postulation_id": str(saved_postulation_id),
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(N8N_FOLDER_URL, data=data, files=files, timeout=120.0)
            #if isinstance(resp_json, list) and len(resp_json) > 0:
            #    resp_json = resp_json[0]
            print("DEBUG RESP STATUS:", resp.status_code)
            print("DEBUG RESP CONTENT:", resp.text)
    except Exception as e:
        # marcar error en postulation y devolver 502
        with Session(engine) as session:
            p = session.get(Postulation, saved_postulation_id)
            if p:
                p.status = "ErrorUpload"
                session.add(p)
                session.commit()
        raise HTTPException(status_code=502, detail=f"Error al conectar con n8n: {e}")

    if resp.status_code != 200:
        with Session(engine) as session:
            p = session.get(Postulation, saved_postulation_id)
            if p:
                p.status = "ErrorUpload"
                session.add(p)
                session.commit()
        raise HTTPException(status_code=502, detail="Error al subir CV a storage")

    resp_json = resp.json()
    file_url = resp_json.get("file_url")
    file_id = resp_json.get("file_id")

    # 6) actualizar Postulant y Postulation con resultados de la subida
    with Session(engine) as session:
        p = session.get(Postulant, saved_postulant_dni)
        if p:
            p.cv_url = file_url
            p.cv_drive_file_id = file_id
            session.add(p)

        post = session.get(Postulation, saved_postulation_id)
        if post:
            post.status = "Recibido"
            session.add(post)

        session.commit()

    return {
        "detail": "Postulación registrada",
        "postulant_dni": saved_postulant_dni,
        "postulation_id": saved_postulation_id,
        "file_url": file_url,
    }

@routerform.get("/info/{process_code}/{token}")
def get_form_info(process_code: str, token: str):
    """
    Devuelve la info pública del ChargeProcess si el token coincide.
    """
    with Session(engine) as session:
        # Ejecutar consulta y obtener objeto correctamente
        result = session.execute(select(ChargeProcess).where(ChargeProcess.code == process_code))
        cp = result.scalars().first()

        # si no lo encontramos por code, intentar por id numérico
        if not cp:
            try:
                pid = int(process_code)
                cp = session.get(ChargeProcess, pid)
            except ValueError:
                cp = None

        if not cp or cp.form_token != token:
            raise HTTPException(status_code=404, detail="Formulario no encontrado o token inválido")

        puesto_name = None
        if cp.job_id:
            job = session.get(JobPosition, cp.job_id)
            puesto_name = job.name if job else None

        return {
            "process_code": cp.code,
            "process_id": cp.id,
            "process_name": puesto_name or "",
            "puesto": puesto_name or "",
            "drive_folder_id": cp.drive_folder_id,
            "form_url": cp.form_url
        }