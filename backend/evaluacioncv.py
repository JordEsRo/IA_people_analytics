from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query
from sqlmodel import Session, select, or_, and_, desc, join
from models import EvaluacionCV, JobPosition, ChargeProcess, User , MatchUpdateSchema
from cargabd import engine, get_session
from auth import get_current_user
import httpx, json
from typing import List, Optional
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

n8n = str(os.getenv('N8N_WEBHOOK_URL'))
routercv = APIRouter()

#Solo un CV
@routercv.post("/evaluar-cv/", response_model=EvaluacionCV)
async def eval_cv(
    puesto_id: int = Form(...),
    archivo: UploadFile = File(...),
    user=Depends(get_current_user)
):
    file_bytes = await archivo.read() #archivo pdf
    
    #puestos
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
    
    #JSON puesto
    job_json = {
        "name": job.name,
        # "requirements": job.requirements,
        "area": job.area
    }
    
    files = {'file': (archivo.filename, file_bytes, archivo.content_type),}
    
    data = {'job_json': json.dumps(job_json)}
    
    
    async with httpx.AsyncClient() as client:
        response = await client.post(n8n, files=files, data=data) #enviar a n8n
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Error al analizar CV") #en caso de error
    
    result = response.json()
    #validacion
    try:
        match_value = int(result.get("match", 0))
        if not (0 <= match_value <= 100):
            raise ValueError("El valor de match debe estar entre 0 y 100")
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Match inválido o malformado")

    skills_raw = result.get("skills", [])
    if isinstance(skills_raw, list):
        skills = ", ".join(skills_raw)
    elif isinstance(skills_raw, str):
        skills = skills_raw
    else:
        skills = ""

    if not skills or skills == "": #validacion
        raise HTTPException(status_code=400, detail="Skills vacías o mal formateadas")
    
    #Guardar resultado
    eval = EvaluacionCV(
        name = result["name"],
        #match = result["match"],
        match = match_value,
        reason = result["reason"],
        skills = skills,
        summary = result["summary"],
        puesto_id = puesto_id
    )

    with Session(engine) as session:
        session.add(eval)
        session.commit()
        session.refresh(eval)
    
    return eval


#Carga masiva de Cvs
@routercv.post("/evaluar-cvs", response_model=List[EvaluacionCV])
async def evaluar_cvs(
    puesto_id: int = Form(...),
    archivos: List[UploadFile] = File(...),
    user = Depends(get_current_user)
):
    resultados = []
    
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        
    job_json = {
        "name": job.name,
        # "requirements": job.requirements,
        "area": job.area
    }
    
    async with httpx.AsyncClient() as client:
        for archivo in archivos:
            file_bytes = await archivo.read()
            
            files = {'file': (archivo.filename, file_bytes, archivo.content_type)}
            data = {'job_json': json.dumps(job_json)}

            try:
                response = await client.post(n8n, files=files, data=data)
                if response.status_code != 200:
                    continue  # Saltar si falla

                result = response.json()

                match_value = int(result.get("match", 0))
                if not (0 <= match_value <= 100):
                    continue

                skills_raw = result.get("skills", [])
                if isinstance(skills_raw, list):
                    skills = ", ".join(skills_raw)
                elif isinstance(skills_raw, str):
                    skills = skills_raw
                else:
                    skills = ""

                if not skills or skills == "":
                    continue

                evaluacion = EvaluacionCV(
                    name=result["name"],
                    match=match_value,
                    reason=result["reason"],
                    skills=skills,
                    summary=result["summary"],
                    puesto_id=puesto_id
                )

                with Session(engine) as session:
                    session.add(evaluacion)
                    session.commit()
                    session.refresh(evaluacion)
                    resultados.append(evaluacion)

            except Exception as e:
                print(f"Error al procesar {archivo.filename}: {e}")
                continue

    if not resultados:
        raise HTTPException(status_code=500, detail="No se pudo procesar ningún CV")

    return resultados

#Obtener un resultado de cv(detalle)
@routercv.get("/evaluacion/{id}", response_model=EvaluacionCV)
def get_eval_detail(id: int):
    with Session(engine) as session:
        eval = session.get(EvaluacionCV, id)
        if not eval:
            raise HTTPException(status_code=404, detail="Evaluación no encontrada")
        return eval

###########################################################################
#Historial de evaluaciones - procesos
@routercv.get("/evaluaciones/historial")
def historial_general_evaluaciones(
    search: Optional[str] = Query(None),
    puesto_id: Optional[int] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    min_match: Optional[int] = Query(None),
    max_match: Optional[int] = Query(None),
    proceso: Optional[str] = Query(None),
    offset: int = 0,
    limit: int = 20,
    user: User = Depends(get_current_user)
):
    with Session(engine) as session:
        try:
            #print("Query params:", search, puesto_id, fecha_desde, fecha_hasta, min_match, max_match)
            
            query = (
                select(EvaluacionCV, ChargeProcess, JobPosition)
                .join(ChargeProcess, ChargeProcess.id == EvaluacionCV.charge_process_id)  # type: ignore
                .join(JobPosition, JobPosition.id == ChargeProcess.job_id)  # type: ignore
            )
            
            if user.role != "admin":
                subquery = select(ChargeProcess.id).where(ChargeProcess.user_id == user.id)
                query = query.where(EvaluacionCV.charge_process_id.in_(subquery))  # type: ignore

            # Filtro por nombre
            if search:
                query = query.where(EvaluacionCV.name.ilike(f"%{search}%")) # type: ignore

            # Filtro por puesto
            if puesto_id:
                query = query.where(EvaluacionCV.puesto_id == puesto_id)

            # Filtro por fechas
            if fecha_desde:
                try:
                    desde = datetime.strptime(fecha_desde, "%Y-%m-%d")
                    query = query.where(EvaluacionCV.date_create >= desde)
                except:
                    pass
            if fecha_hasta:
                try:
                    hasta = datetime.strptime(fecha_hasta, "%Y-%m-%d")
                    query = query.where(EvaluacionCV.date_create <= hasta)
                except:
                    pass

            # Filtro por match
            if min_match is not None:
                query = query.where(EvaluacionCV.match >= min_match) # type: ignore
            if max_match is not None:
                query = query.where(EvaluacionCV.match <= max_match) # type: ignore
                
            if proceso:
                query = query.where(ChargeProcess.code.ilike(f"%{proceso}%"))  # type: ignore

            query = query.order_by(desc(EvaluacionCV.date_create))
            total = len(session.exec(query).all())
            results = session.exec(query.offset(offset).limit(limit)).all()
            return {
                "total": total,
                "resultados": [
                    {
                        "name": e.name,
                        "match": e.match,
                        "puesto": job.name,
                        "summary": e.summary,
                        "reason": e.reason,
                        "skills": e.skills,
                        "fecha": e.date_create.strftime("%Y-%m-%d %H:%M:%S") if e.date_create else None,
                        "proceso": proc.code
                    }
                    for e, proc, job in results
                ]
            }
        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(status_code=500, detail=str(e))
        
        
#Actualizar matchs
@routercv.patch("/evaluaciones/actualizar-match")
def actualizar_match(data: MatchUpdateSchema, session: Session = Depends(get_session)):
    
    #print(data)
    
    evaluacion = session.exec(
        select(EvaluacionCV).where(
            EvaluacionCV.dni_postulante == data.dni,
            EvaluacionCV.charge_process_id == data.process_id
        )
    ).first()

    #print("Evaluación encontrada:", evaluacion)

    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada para ese DNI y proceso")

    evaluacion.match = data.match
    session.add(evaluacion)
    session.commit()

    return {"detail": f"Match actualizado a {data.match} para DNI {data.dni} en proceso {data.process_id}"}

        