from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy_utils import database_exists, create_database

load_dotenv()

# URL used when running locally (connecting to docker mapped port 5434)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password123@localhost:5434/nult_cashier")

# Create database if it doesn't exist
try:
    if not database_exists(SQLALCHEMY_DATABASE_URL):
        create_database(SQLALCHEMY_DATABASE_URL)
        print(f"Database created: {SQLALCHEMY_DATABASE_URL}")
except Exception as e:
    print(f"Warning: Could not check or create database. It might already exist or the server is not ready. Error: {e}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
