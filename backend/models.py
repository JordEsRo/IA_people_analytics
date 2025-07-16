from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    password_hash: str
    role: str = Field(default="usuario")  # Valores posibles: "admin" o "usuario"
    state: bool = Field(default=True)

class JobPosition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    years_experience: int
    skills_rq: str
    knowldg: Optional[str] = None
    state: bool = Field(default=True)

class JobPositionCreate(SQLModel):
    name: str
    years_experience: int
    skills_rq: str
    knowldg: str

class EvaluacionCV(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    match: int
    reason: str
    skills: str
    summary: str
    puesto_id: int
    charge_process_id: Optional[int] = Field(default=None, foreign_key="chargeprocess.id")
    dni_postulante: Optional[str] = Field(default=None, foreign_key="postulant.dni")
    date_create: datetime = Field(default_factory=datetime.utcnow)
    
    charge_process: Optional["ChargeProcess"] = Relationship(back_populates="evaluaciones")
    postulant: Optional["Postulant"] = Relationship(back_populates="evaluations")
    
class UserUpdate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    username_old: str
    username_new: str
    updated_by: str 
    date_update: datetime = Field(default_factory=datetime.utcnow)
    
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
    date_changed: datetime = Field(default_factory=datetime.utcnow)
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
    evaluations: List["EvaluacionCV"] = Relationship(back_populates="postulant")
    regis_date: datetime = Field(default_factory=datetime.utcnow)
    
class ChargeProcess(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str
    job_id: Optional[int] = Field(default=None, foreign_key="jobposition.id")
    reque: str
    area: str
    user_id: int = Field(foreign_key="user.id")
    drive_folder_id: Optional[str] = None
    drive_folder_url: Optional[str] = None
    create_date: datetime = Field(default_factory=datetime.utcnow)
    state: bool = Field(default=True)
    autor: Optional[str] = None
    
    job: Optional[JobPosition] = Relationship()
    evaluaciones: List["EvaluacionCV"] = Relationship(back_populates="charge_process")

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
    eval_date: datetime = Field(default_factory=datetime.utcnow)
