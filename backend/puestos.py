from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from models import JobPosition, JobPositionCreate, JobPositionRead
from cargabd import engine
from auth import get_current_user, require_admin
from fastapi.middleware.cors import CORSMiddleware

routerpuestos = APIRouter(prefix="/puestos", tags=["Puestos"])

#Crear puesto
@routerpuestos.post("/", response_model=JobPosition)
def create_job(job: JobPositionCreate, user=Depends(get_current_user)):
    with Session(engine) as session:
        if not job.name.strip(): #validacion
            raise HTTPException(status_code=400, detail="El nombre del puesto es obligatiorio")
        
        exist = session.exec(
            select(JobPosition).where(JobPosition.name == job.name, JobPosition.state == True)
        ).first()
        
        if exist: #validacion
            raise HTTPException(status_code=400, detail="Ya existe un puesto activo con ese nombre")
        
        new_job = JobPosition(**job.dict())
        session.add(new_job)
        session.commit()
        session.refresh(new_job)
        return new_job

#Listar puestos activos
@routerpuestos.get("/", response_model=list[JobPositionRead])
def read_jobs(user=Depends(get_current_user)):
    with Session(engine) as session:
        statement = (
            select(JobPosition)
            .where(JobPosition.state == True)
            .options(selectinload(JobPosition.area))# type: ignore
        )
        jobs = session.exec(statement).all()
        return jobs

#Listar todos los puestos
@routerpuestos.get("/todos", response_model=list[JobPositionRead])
def read_all_jobs(user=Depends(get_current_user)):
    with Session(engine) as session:
        statement = (
            select(JobPosition)
            .options(selectinload(JobPosition.area))# type: ignore  # Necesario para incluir el área
        )
        return session.exec(statement).all()

#Ver puesto
@routerpuestos.get("/{puesto_id}", response_model=JobPosition)
def read_job(puesto_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        return job

#Actualizar puesto
@routerpuestos.put("/{puesto_id}", response_model=JobPosition)
def update_job(puesto_id: int, update: JobPosition, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        job.name = update.name
        #job.requirements = update.requirements
        job.area_id = update.area_id
        session.commit()
        session.refresh(job)
        return job


#Desactivar
@routerpuestos.put("/{puesto_id}/desactivar")
def disable_job(puesto_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        
        job.state = False
        session.commit()
        return {"OK": True, "message": "Puesto desactivado correctamente"}

#Reactivar puesto
@routerpuestos.put("/{puesto_id}/activar")
def enable_job(puesto_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        
        job.state = True
        session.commit()
        return {"OK": True, "message": "Puesto reactivado correctamente"}

#Eliminar puesto
# @router.delete("/puestos/{puesto_id}")
# def delete_job(puesto_id: int, user=Depends(get_current_user)):
#     with Session(engine) as session:
#         job = session.get(JobPosition, puesto_id)
#         if not job:
#             raise HTTPException(status_code=404, detail="Puesto no encontrado")
#         session.delete(job)
#         session.commit()
#         return {"ok": True}