from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from models import JobPosition, JobPositionCreate
from cargabd import engine
from auth import get_current_user, require_admin
from fastapi.middleware.cors import CORSMiddleware

router = APIRouter()

#Crear puesto
@router.post("/puestos/", response_model=JobPosition)
def create_job(job: JobPositionCreate, user=Depends(get_current_user)):
    with Session(engine) as session:
        if not job.name.strip(): #validacion
            raise HTTPException(status_code=400, detail="El nombre del puesto es obligatiorio")
        
        if job.years_experience < 0: #validacion
            raise HTTPException(status_code=400, detail="Los años de experiencia ni pueden ser negativos")
        
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
@router.get("/puestos/", response_model=list[JobPosition])
def read_jobs(user=Depends(get_current_user)):
    with Session(engine) as session:
        jobs = session.exec(select(JobPosition).where(JobPosition.state == True)).all()
        return jobs

#Listar todos los puestos
@router.get("/puestos/todos", response_model=list[JobPosition])
def read_all_jobs(user=Depends(get_current_user)):
    with Session(engine) as session:
        return session.exec(select(JobPosition)).all()

#Ver puesto
@router.get("/puestos/{puesto_id}", response_model=JobPosition)
def read_job(puesto_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        return job

#Actualizar puesto
@router.put("/puestos/{puesto_id}", response_model=JobPosition)
def update_job(puesto_id: int, update: JobPosition, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        job.name = update.name
        job.years_experience = update.years_experience
        job.skills_rq = update.skills_rq
        job.knowldg = update.knowldg
        session.commit()
        session.refresh(job)
        return job


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