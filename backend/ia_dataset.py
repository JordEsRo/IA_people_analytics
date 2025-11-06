from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select
from models import DatasetEntry, DatasetEntryCreate
from cargabd import get_session  # tu dependencia
from sqlalchemy.exc import IntegrityError
import json

routerdataset = APIRouter(prefix="/dataset", tags=["Dataset"])

@routerdataset.post("/guardar")
def save_dataset(entry: DatasetEntryCreate, session: Session = Depends(get_session)):
    """
    Guarda un registro en la tabla ia_training_dataset usando sqlmodel.
    Retorna {"status":"ok", "final_json": <final_json>} como requiere tu flujo.
    """
    # Construimos el objeto DB
    db_item = DatasetEntry.from_orm(entry)
    
    try:
        session.add(db_item)
        session.commit()
        session.refresh(db_item)
    except IntegrityError as ie:
        # ejemplo: conflicto por unique constraint (process_id, url_cv)
        session.rollback()
        raise HTTPException(status_code=409, detail="Registro duplicado")
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    # Respuesta: sólo el final_json (y status)
    return {"status": "ok", "final_json": db_item.final_json}
