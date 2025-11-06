from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from models import JobPosition
from cargabd import engine
from auth import get_current_user

routermt = APIRouter()

