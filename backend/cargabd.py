from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# sqlite_file_name = "db.sqlite3"

# engine = create_engine(f"sqlite:///{sqlite_file_name}", echo=True)

# URL de la base de datos (SQLite en este caso)
DATABASE_URL = str(os.getenv("DATABASE_URL"))

# Crear el motor de base de datos
engine = create_engine(DATABASE_URL, echo=True)

# Crear sesión local
def get_session():
    return Session(engine)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)