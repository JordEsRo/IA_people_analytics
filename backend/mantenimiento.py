from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from models import JobPosition
from cargabd import engine
from auth import get_current_user

routermt = APIRouter()

#Desactivar
@routermt.put("/puestos/{puesto_id}/desactivar")
def disable_job(puesto_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        
        job.state = False
        session.commit()
        return {"OK": True, "message": "Puesto desactivado correctamente"}

#Reactivar puesto
@routermt.put("/puestos/{puesto_id}/activar")
def enable_job(puesto_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        job = session.get(JobPosition, puesto_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Puesto no encontrado")
        
        job.state = True
        session.commit()
        return {"OK": True, "message": "Puesto reactivado correctamente"}