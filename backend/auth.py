from cargabd import engine 
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from models import User
from dotenv import load_dotenv
from cargabd import engine, get_session
import os
from fastapi.security import OAuth2PasswordRequestForm
load_dotenv()

routerauth = APIRouter()

sekey = str(os.getenv('SECRET_KEY'))
alg = str(os.getenv('ALGORITHM'))
ACCESS_TOKEN_EXPIRE_MINUTES=60


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, sekey, algorithm=alg)

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, sekey, algorithms=[alg])
        username = payload.get("sub")
        if not isinstance(username, str):
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            raise credentials_exception
        return user

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido solo a administradores")
    return user


#Login
@routerauth.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    statement = select(User).where(User.username == form_data.username, User.state == True)
    user = session.exec(statement).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@routerauth.options("/login")
def options_login():
    return JSONResponse(status_code=200, content={})

#Listar usuarios
@routerauth.get("/usuarios/", response_model=list[User], dependencies=[Depends(require_admin)])
def list_users():
    with Session(engine) as session:
        return session.exec(select(User)).all()
    
    
@routerauth.post("/register-admin")
def register_admin(form_data: OAuth2PasswordRequestForm = Depends()):
    user = User(username=form_data.username, password_hash=hash_password(form_data.password), role="admin")
    with Session(engine) as session:
        session.add(user)
        session.commit()
        return {"msg": "Admin registrado"}

#Registro usuarios
@routerauth.post("/registro", dependencies=[Depends(require_admin)])
def register_user(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        exist = session.exec(select(User).where(User.username == form_data.username)).first()
        if exist:
            raise HTTPException(status_code=400, detail="Usuario ya existe")
        user = User(username=form_data.username, password_hash=hash_password(form_data.password), role="usuario")
        session.add(user)
        session.commit()
        return {"msg": "Usuario registrado"}