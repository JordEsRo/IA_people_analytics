from sqlmodel import ForeignKey, SQLModel, Field, Relationship, Column
from typing import Optional, List, Dict, Any
from sqlalchemy.dialects.postgresql import JSONB
from uuid import UUID
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from sqlalchemy import DateTime
from functools import partial

peru_time = partial(datetime.now, timezone(timedelta(hours=-5)))

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    password_hash: str
    role: str = Field(default="usuario")  # Valores posibles: "admin" o "usuario"
    state: bool = Field(default=True)


class EvaluacionCV(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    match: float
    match_eval: Optional[float] = None # Nuevo campo para match específico de evaluación
    match_total: Optional[float] = None # Nuevo campo para match total
    reason: str
    functions: str
    skills: str
    summary: str
    puesto_id: int
    dni_postulante: Optional[str] = Field(default=None, foreign_key="postulant.dni", nullable=True)
    charge_process_id: Optional[int] = Field(default=None, foreign_key="chargeprocess.id", index=True, nullable=True)
    date_create: datetime = Field(default_factory=peru_time)
    postulation_id: Optional[int] = Field(default=None, foreign_key="postulation.id", index=True, nullable=True)

    # Nuevos campos
    years_exper: Optional[float] = None
    level_educa: Optional[str] = None  # Ej: Bachiller, Titulado, Maestría
    certif: Optional[str] = None  # CSV o string descriptivo
    languages: Optional[str] = None          # CSV o descripción
    differential_advantages: Optional[str] = None
    
    url_cv: Optional[str] = Field(default=None, nullable=True)
    cv_procesado: bool = Field(default=False, nullable=False)
    nombre_archivo: Optional[str] = Field(default=None, nullable=True)
    cv_estado: Optional[str] = Field(default=None, nullable=True)
    flag_shade: Optional[bool] = Field(default=False, nullable=False)

    postulation: "Postulation" = Relationship(back_populates="evaluaciones")
    
class UserUpdate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    username_old: str
    username_new: str
    updated_by: str
    date_update: datetime = Field(default_factory=peru_time)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username_old": self.username_old,
            "username_new": self.username_new,
            "updated_by": self.updated_by,
            "date_update": self.date_update.isoformat(),
        }

class PasswordChange(BaseModel):
    nueva_password: str
    confirmacion: str

class PasswordChangeLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    changed_by: str 
    date_changed: datetime = Field(default_factory=peru_time)
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "changed_by": self.changed_by,
            "date_changed": self.date_changed.isoformat(),
        }

class Postulant(SQLModel, table=True):
    dni: str = Field(primary_key=True,index=True)
    name: str
    email: Optional[str] = None
    telf: Optional[str] = None
    address: Optional[str] = None
    regis_date: datetime = Field(default_factory=peru_time)
    
    # Nuevos campos
    years_exper: Optional[float] = None
    level_educa: Optional[str] = None  # Ej: Bachiller, Titulado, Maestría
    certif: Optional[str] = None  # CSV o string descriptivo
    languages: Optional[str] = None          # CSV o descripción
    differential_advantages: Optional[str] = None
    cv_url: Optional[str] = Field(default=None, nullable=True)  # <-- nuevo
    cv_drive_file_id: Optional[str] = Field(default=None, nullable=True)

    #evaluations: List["EvaluacionCV"] = Relationship(back_populates="postulant")

    postulations: List["Postulation"] = Relationship(back_populates="postulant")

class Postulation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    postulant_dni: str = Field(foreign_key="postulant.dni", index=True)
    process_id: int = Field(foreign_key="chargeprocess.id", index=True)

    status: str = Field(default="Pendiente")  # Ej: Pendiente, En revisión, Aprobado, Rechazado
    applied_at: datetime = Field(default_factory=peru_time)

    # Relaciones
    postulant: "Postulant" = Relationship(back_populates="postulations")
    process: "ChargeProcess" = Relationship(back_populates="postulations")

    evaluaciones: List["EvaluacionCV"] = Relationship(back_populates="postulation")

class ChargeProcess(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str
    #job_id: Optional[int] = Field(default=None, foreign_key="jobposition.id") #Eliminar
    job_id: int = Field(foreign_key="jobposition.id")  # Puesto seleccionado desde el frontend
    reque: str
    functions: str
    # area: str #Se debe eliminar antes de generar la tabla Area
    user_id: UUID = Field(sa_column=Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False))
    drive_folder_id: Optional[str] = None
    drive_folder_url: Optional[str] = None
    create_date: datetime = Field(default_factory=peru_time)
    state: bool = Field(default=True)
    autor: Optional[str] = None
    end_process: bool = Field(default=False, nullable=False)
    is_processing: bool = Field(default=False, nullable=False)
    form_url: str = Field(default=None, nullable=True)

    form_token: Optional[str] = Field(default=None, nullable=True)
    
    # job: Optional[JobPosition] = Relationship() #Eliminar
    job: Optional["JobPosition"] = Relationship(back_populates="charge_processes")
    #evaluaciones: List["EvaluacionCV"] = Relationship(back_populates="charge_process")
    
    postulations: List["Postulation"] = Relationship(back_populates="process")

class ChargeProcessCreate(BaseModel):
    job_id: int  # Puesto seleccionado desde el frontend
    reque: str
    functions: str

class PostulantHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    postulant_id: Optional[str] = Field(foreign_key="postulant.dni")
    process_id: int = Field(foreign_key="chargeprocess.id")
    match: float
    skills_detected: str
    summary: str
    reason: str
    pdf_file: str
    hasg_doc: str
    eval_date: datetime = Field(default_factory=peru_time)
##

class JobPosition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    # years_experience: int #Eliminar
    # skills_rq: str #Eliminar
    # knowldg: Optional[str] = None #Eliminar
    #requirements: str
    area_id: int = Field(foreign_key="area.id")
    state: bool = Field(default=True)

    area: Optional["Area"] = Relationship(back_populates="job_positions")
    charge_processes: List["ChargeProcess"] = Relationship(back_populates="job")

class JobPositionBase(SQLModel):
    name: str
    #requirements: str
    area_id: int

class JobPositionCreate(JobPositionBase):
    pass

class Area(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    state: bool = Field(default=True)
    job_positions: List["JobPosition"] = Relationship(back_populates="area")

class AreaCreate(SQLModel):
    name: str
    
class AreaBase(SQLModel):
    name: str

class AreaRead(AreaBase):
    id: int
    
class JobPositionRead(JobPositionBase):
    id: int
    state: bool
    area: Optional[AreaRead] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str
    
class MatchUpdateSchema(BaseModel):
    dni: str
    process_id: int
    match: float

## interesante, revisar
class DatasetEntryBase(SQLModel):
    process_id: Optional[int] = None
    folder_id: Optional[str] = None
    puesto_id: Optional[int] = None
    url_cv: Optional[str] = None
    nombre_archivo: Optional[str] = None
    cv_text: Optional[str] = None
    # Campos JSONB (usa Column(JSONB) para Postgres)
    job_requirements: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    job_functions: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    raw_agent_output: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    raw_agent_output_2: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    cleaned_output: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    final_json: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    model_meta: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    source: Optional[str] = "IA_AGENT"
    n8n_node: Optional[str] = None

# Modelo para crear (request body)
class DatasetEntryCreate(DatasetEntryBase, SQLModel):
    pass

# Modelo que representa la tabla
class DatasetEntry(DatasetEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    processed_at: Optional[datetime] = Field(default_factory=peru_time, sa_column=Column(DateTime(timezone=True)))