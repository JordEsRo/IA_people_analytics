from fastapi import APIRouter, Depends, HTTPException, Form, Query ,UploadFile , File
from sqlmodel import Session, select, desc
from models import ChargeProcess, JobPosition, User, Postulant, EvaluacionCV
from cargabd import engine
from auth import get_current_user
from datetime import datetime
import httpx
from typing import List, Optional
from dotenv import load_dotenv
import os
import uuid
load_dotenv()



routerprocess = APIRouter()


N8N_FOLDER_URL = str(os.getenv("N8N_CREATE_FOLDER_URL"))
N8N_PROCESAR_CVS_URL =str(os.getenv("N8N_PROCESAR_CVS_URL"))


#Flujo de creacion
@routerprocess.post("/crear-proceso-carga/")
async def create_process_charge(
    job_id: int = Form(...),
    reque: str = Form(...),
    area: str = Form(...),
    user=Depends(get_current_user)
):
    today_str = datetime.utcnow().strftime("%Y%m%d")
    
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
        
    async with httpx.AsyncClient() as client:
        response = await client.post(
            N8N_FOLDER_URL,
            json={"folder_name": code}
        )
       
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Error al buscar/crear carpeta: {response.status_code} - {response.text}"
            )
            
        try:
            data = response.json()
            folder_id = data.get("folder_id")
            folder_url = data.get("folder_url")

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
         
        process = ChargeProcess(
            code=code,
            job_id=job_id,
            reque=reque,
            area=area,
            user_id=user.id,
            drive_folder_id=folder_id,
            drive_folder_url=folder_url
        )
        session.add(process)
        session.commit()
        session.refresh(process)

    return process

#Listar
@routerprocess.get("/procesos/listar", response_model=List[ChargeProcess])
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
            data = p.dict()
            if user.role == "admin":
                autor = session.get(User, p.user_id)
                data["autor"] = autor.username if autor else "¿?"
            result.append(data)
            
        return result

#Activar  
@routerprocess.put("/procesos/{id}/activar")
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
@routerprocess.put("/procesos/{id}/desactivar")
def disable_process(id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, id)
        if not process or process.user_id != user.id:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")
        process.state = False
        session.add(process)
        session.commit()
        return {"msg": "Proceso desactivado"}


#Flujo grande de procesar CVS
@routerprocess.post("/procesos/{process_id}/procesar-cvs")
async def process_cvs(process_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")

        if user.role != "admin" and process.user_id != user.id:
            raise HTTPException(status_code=403, detail="No tienes permiso para este proceso")

        if not process.drive_folder_id:
            raise HTTPException(status_code=400, detail="El proceso no tiene carpeta asociada")

        job = session.get(JobPosition, process.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto asociado no encontrado")

        payload = {
            "folder_id": process.drive_folder_id,
            "process_id": process.id,
            "puesto": job.name,
            "puesto_id": job.id,
            "area": process.area,
            "reque": process.reque
            
        }
    
        #print(N8N_PROCESAR_CVS_URL)
        #print(payload)
        
    async with httpx.AsyncClient() as client:
        try:
            #print("URL a n8n:", N8N_PROCESAR_CVS_URL)
            #print("Payload enviado:", payload)

            response = await client.post(
                            N8N_PROCESAR_CVS_URL,
                            json=payload,
                            timeout=httpx.Timeout(120.0)
                        )

            #print("Respuesta de n8n recibida. Status:", response.status_code)
            #print("Contenido crudo:", response.text)

            response.raise_for_status()
            results = response.json()

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Tiempo de espera agotado al contactar con n8n")
                
        except httpx.HTTPStatusError as e:
            # Este tipo de error SÍ tiene .response
            status_code = e.response.status_code
            content = e.response.text
            raise HTTPException(
                status_code=500,
                detail=f"Error al contactar n8n: status {status_code}, body: {content}"
            )

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error de conexión al contactar n8n: {str(e)}"
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error inesperado: {str(e)}"
            )

    if not isinstance(results, list) or len(results) == 0:
        raise HTTPException(status_code=500, detail="Respuesta inválida o vacía desde n8n")

    results_ok = []
    
    print("RESULTADO DE N8N:", results)
    
    with Session(engine) as session:
        for r in results:
            dni = r.get("dni")
            name = r.get("name")

            print("Parte del resultado de n8n",r)
            
            if not name:
                continue  # Saltar si faltan datos clave

            if not dni or not dni.strip():
                dni = f"temp-{uuid.uuid4()}"
            
            # Crear o actualizar Postulant
            postulant = session.exec(select(Postulant).where(Postulant.dni == dni)).first()
            if postulant:
                postulant.name = name
                postulant.email = r.get("email")
                postulant.telf = r.get("telf")
                postulant.address = r.get("address")
            else:
                postulant = Postulant(
                    dni=dni,
                    name=name,
                    email=r.get("email"),
                    telf=r.get("telf"),
                    address=r.get("address")
                )
                session.add(postulant)
                session.flush()  # Para obtener el ID si se usa luego

            # Registrar evaluación
            eval_data = r.get("evaluacion", {})
            if eval_data:
                match = int(eval_data.get("match", 0))
                if 0 <= match <= 100:
                    evaluation = EvaluacionCV(
                        name=eval_data.get("name", name),
                        match=match,
                        reason=eval_data.get("reason", ""),
                        skills=", ".join(eval_data.get("skills", [])),
                        summary=eval_data.get("summary", ""),
                        puesto_id=eval_data.get("puesto_id", process.job_id),
                        charge_process_id=process.id,
                        dni_postulante=postulant.dni
                    )
                    session.add(evaluation)
                    results_ok.append({
                        "name": evaluation.name,
                        "match": evaluation.match,
                        "reason": evaluation.reason,
                        "skills": evaluation.skills,
                        "summary": evaluation.summary,
                        "puesto_id": evaluation.puesto_id,
                        "charge_process_id": evaluation.charge_process_id,
                        "fecha": datetime.utcnow().isoformat()  # o evaluation.regis_date si lo tienes
                    })

        session.commit()

    return {
            "evaluaciones_registradas": len(results_ok),
            "postulantes_procesados": len(results),
            "evaluaciones": [
                    {
                        "name": e["name"],
                        "match": e["match"],
                        "summary": e["summary"],
                        "reason": e["reason"],
                        "skills": e["skills"],
                        "fecha": e.get("fecha")  # ya es string, así que no uses .strftime
                    }
                    for e in results_ok
                ]
            }


# Obtener detalle de un proceso de carga
@routerprocess.get("/procesos/{process_id}")
def get_process_detail(process_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")

        if user.role != "admin" and process.user_id != user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a este proceso")

        job = session.get(JobPosition, process.job_id)
        autor = session.get(User, process.user_id)

        return {
            "id": process.id,
            "code": process.code,
            "area": process.area,
            "reque": process.reque,
            "job": {
                "id": job.id,
                "name": job.name,
                "skills_rq": job.skills_rq,
                "knowldg": job.knowldg,
                "years_experience": job.years_experience,
            } if job else None,
            "autor": autor.username if autor else None,
            "state": process.state,
            "drive_folder_url": process.drive_folder_url,
            "create_date": process.create_date,
        }
        
# Obtener evaluaciones del historial por proceso
@routerprocess.get("/procesos/{process_id}/evaluaciones")
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

        print(evaluaciones)
        return [
            {
                "name": e.name,
                "match": e.match,
                "summary": e.summary,
                "reason": e.reason,
                "skills": e.skills,
                "fecha": e.date_create.strftime("%Y-%m-%d %H:%M:%S") if e.date_create else None
            }
            for e in evaluaciones
        ]


        



#####################################################################################################
#Crear proceso
@routerprocess.post("/procesos/")
def create_process(
    job_id: int,
    reque: str,
    area: str,
    user= Depends(get_current_user)    
):
    with Session(engine) as session:
        
        job = session.get(JobPosition, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        
        existing = session.exec(
            select(ChargeProcess).where(ChargeProcess.user_id == user.id)
        )
        count = len(existing.all()) + 1
        code = f"{str(user.id).zfill(4)}-{datetime.now().strftime('%Y%m%d')}-{str(count).zfill(5)}"
        
        proceso = ChargeProcess(
            code=code,
            job_id=job_id,
            reque=reque,
            area=area,
            user_id=user.id
        )

        session.add(proceso)
        session.commit()
        session.refresh(proceso)

        return proceso
    

#Traer lista de PDFs de una carpeta 
@routerprocess.post("/procesos/{process_id}/listar-pdfs")
async def lists_pdfs_process(process_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        process = session.get(ChargeProcess, process_id)
        
        if not process:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")
        
        if user.role != "admin" and process.user_id != user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a este proceso")
        
        if not process.drive_folder_id:
            raise HTTPException(status_code=404, detail="Proceso sin carpeta de Drive asociada")
        
        payload = {
            "folder_id": process.drive_folder_id,
            "process_id": process.id
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(N8N_PROCESAR_CVS_URL, json=payload)
                response.raise_for_status()
                data = response.json()
                
                #print("Respuesta cruda de n8n:", data)
                
                # Si n8n devuelve un dict plano con los campos correctos
                if isinstance(data, dict) and "pdf_files" in data:
                    return {
                        "process_id": data.get("process_id", process.id),
                        "pdf_files": data["pdf_files"]
                    }

                # Si n8n devuelve lista de 1 objeto (más raro, pero tolerante)
                if isinstance(data, list) and len(data) > 0 and "pdf_files" in data[0]:
                    return {
                        "process_id": data[0].get("process_id", process.id),
                        "pdf_files": data[0]["pdf_files"]
                    }

                # Si n8n devuelve solo una lista de strings (respaldo aún)
                if isinstance(data, list) and all(isinstance(x, str) for x in data):
                    return {
                        "process_id": process.id,
                        "pdf_files": data
                    }
                raise HTTPException(status_code=500, detail="Respuesta inesperada de n8n")
                
            except httpx.HTTPError as e:
                raise HTTPException(status_code=500, detail=f"Error al contactar n8n: {str(e)}")