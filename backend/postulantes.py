from fastapi import APIRouter, Depends, HTTPException, Form, Query ,UploadFile , File
from sqlmodel import Session, select, desc
from models import User, Postulant, EvaluacionCV
from cargabd import engine
from auth import get_current_user
from typing import List, Optional
from dotenv import load_dotenv
import os
from sqlalchemy import or_

load_dotenv()

routerpostulant = APIRouter()

#Listar Postulantes
@routerpostulant.get("/postulantes/", response_model=List[Postulant])
def listar_postulantes(
    offset: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        query = select(Postulant)
        if search:
            query = query.where(
                or_(
                    Postulant.name.ilike(f"%{search}%"),  # type: ignore
                    Postulant.dni.ilike(f"%{search}%"),  # type: ignore
                    Postulant.email.ilike(f"%{search}%"),  # type: ignore
                )
            )
        results = session.exec(query.offset(offset).limit(limit)).all()
        return results

#Historial
@routerpostulant.get("/postulantes/{dni}/historial", response_model=List[EvaluacionCV])
def historial_postulante(
    dni: str,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        evaluaciones = session.exec(
            select(EvaluacionCV).where(EvaluacionCV.dni_postulante == dni)
        ).all()
        return evaluaciones