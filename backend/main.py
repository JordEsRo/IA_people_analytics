from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cargabd import create_db_and_tables
from puestos import router as puestos_router
from evaluacioncv import routercv as cv_router
from mantenimiento import routermt as mantenimiento_router
from auth import routerauth as auth_router
from usuarios import routeruser as user_router
from procesos import routerprocess as process_router
from postulantes import routerpostulant as postulant_router

app = FastAPI()

#autorizar login al origins
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost"# tu frontend en desarrollo
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # ⚠️ importante
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/health")
def health_check():
    return {"status": "ok"}



# Rutas protegidas
app.include_router(puestos_router)
app.include_router(cv_router)
app.include_router(mantenimiento_router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(process_router)
app.include_router(postulant_router)