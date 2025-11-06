from fastapi import APIRouter, HTTPException, Depends, Body
from sqlmodel import Session, select
from models import User, UserUpdate, PasswordChange, PasswordChangeLog
from auth import hash_password, verify_password, create_access_token, require_admin, get_current_user
from cargabd import engine, get_session
from typing import List

routeruser = APIRouter(prefix="/usuarios", tags=["Usuarios"])

#Cambiar rol
@routeruser.put("/{user_id}/rol", dependencies=[Depends(require_admin)])
def change_role_user(
    user_id: int,
    new_role: str = Body(..., embed=True),
):
    if new_role not in ("admin","usuario"):
        raise HTTPException(status_code=400, detail="Rol no válido. Se debe usar 'admin' o 'usuario'.")
    
    with Session(engine) as session:
        user = session.get(User, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user.role = new_role
        session.commit()
        return {"ok": True, "message": f"Rol cambiado a {new_role}"}

#Editar usuario
@routeruser.put("/{user_id}/editar", dependencies=[Depends(require_admin)])
def update_user(
    user_id: int,
    new_username: str = Body(..., embed=True),
    admin=Depends(get_current_user),
):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user or not user.state:
            raise HTTPException(status_code=404, detail="Usuario no encontrado o desactivado")

        assert user.id is not None

        username_old = user.username
        user.username = new_username

        # registrar el cambio
        update_log = UserUpdate(
            user_id=user_id,
            username_old=username_old,
            username_new=new_username,
            updated_by=admin.username,
        )
        session.add(update_log)
        session.commit()
        session.refresh(user)

    return {"ok": True, "message": f"Usuario actualizado a {new_username}"}

#Activar usuario
@routeruser.put("/{user_id}/activar", dependencies=[Depends(require_admin)])
def enable_user(user_id: int):
    with Session(engine) as session:
        user = session.get(User, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user.state = True
        session.commit()
        return {"ok": True, "message": f"Usuario {user.username} reactivado"}

#Desactivar usuario
@routeruser.put("/{user_id}/desactivar", dependencies=[Depends(require_admin)])
def disable_user(user_id: int):
    with Session(engine) as session:
        user = session.get(User, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        if user.role == "admin":
            raise HTTPException(status_code=403, detail="No puedes deshabilitar a un administrador")
        
        user.state = False
        session.commit()
        return {"ok": True, "message": f"Usuario {user.username} desactivado"}

#Cambio de contraseña
@routeruser.put("/{user_id}/password", dependencies=[Depends(require_admin)])
def cambiar_password(
    user_id: int,
    datos: PasswordChange,
    admin=Depends(get_current_user)
):
    if datos.nueva_password != datos.confirmacion:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")
    
    with Session(engine) as session:
        user = session.get(User, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user.password_hash = hash_password(datos.nueva_password)
        
        assert user.id
        
        assert user.id is not None, "El usuario no tiene ID asignado"
        
        log = PasswordChangeLog(
            user_id=user.id,
            changed_by=admin.username
        )
        
        session.add(log)
        
        session.commit()
        return {"ok": True, "message": f"Contraseña actualizada para {user.username}"}

#Auditoria
@routeruser.get("/{id}/auditoria", response_model=dict)
def ver_auditoria(id: int, db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    updates = db.query(UserUpdate).filter_by(user_id=id).all()
    passwords = db.query(PasswordChangeLog).filter_by(user_id=id).all()

    return {
        "updates": [u.to_dict() for u in updates],
        "password_changes": [p.to_dict() for p in passwords],
    }

#Listar usuarios
@routeruser.get("/", response_model=list[User], dependencies=[Depends(require_admin)])
def list_users():
    with Session(engine) as session:
        return session.exec(select(User)).all()
