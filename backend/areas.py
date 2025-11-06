from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from models import Area, AreaCreate
from cargabd import engine
from auth import get_current_user

areasouter = APIRouter(prefix="/areas", tags=["Areas"])

# Crear área
@areasouter.post("/", response_model=Area)
def create_area(area: AreaCreate, user=Depends(get_current_user)):
    with Session(engine) as session:
        if not area.name.strip():
            raise HTTPException(status_code=400, detail="El nombre del área es obligatorio")

        exist = session.exec(
            select(Area).where(Area.name == area.name, Area.state == True)
        ).first()

        if exist:
            raise HTTPException(status_code=400, detail="Ya existe un área activa con ese nombre")

        new_area = Area(**area.dict())
        session.add(new_area)
        session.commit()
        session.refresh(new_area)
        return new_area

# Listar áreas activas
@areasouter.get("/", response_model=list[Area])
def read_areas(user=Depends(get_current_user)):
    with Session(engine) as session:
        areas = session.exec(select(Area).where(Area.state == True)).all()
        return areas

# Listar todas las áreas (activas e inactivas)
@areasouter.get("/todos", response_model=list[Area])
def read_all_areas(user=Depends(get_current_user)):
    with Session(engine) as session:
        return session.exec(select(Area)).all()

# Ver un área
@areasouter.get("/{area_id}", response_model=Area)
def read_area(area_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        area = session.get(Area, area_id)
        if not area:
            raise HTTPException(status_code=404, detail="Área no encontrada")
        return area

# Actualizar un área
@areasouter.put("/{area_id}", response_model=Area)
def update_area(area_id: int, update: AreaCreate, user=Depends(get_current_user)):
    with Session(engine) as session:
        area = session.get(Area, area_id)
        if not area:
            raise HTTPException(status_code=404, detail="Área no encontrada")
        
        area.name = update.name
        session.commit()
        session.refresh(area)
        return area

# Activar/Desactivar área
@areasouter.put("/{area_id}/estado", response_model=Area)
def toggle_area_state(area_id: int, user=Depends(get_current_user)):
    with Session(engine) as session:
        area = session.get(Area, area_id)
        if not area:
            raise HTTPException(status_code=404, detail="Área no encontrada")
        area.state = not area.state
        session.commit()
        session.refresh(area)
        return area