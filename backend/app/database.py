from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import MetaData
import os
from dotenv import load_dotenv
from sqlalchemy_utils import database_exists, create_database

load_dotenv()

# URL configuration
# Support for Supabase and production Postgres
DEFAULT_DB_URL = "postgresql://postgres:password123@localhost:5434/nult_cashier"
raw_url = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

print(raw_url)

# Normalize URL: Current app is synchronous, so we need a sync driver
# If user provided an asyncpg URL (common in Supabase examples), convert it to sync
if "postgresql+asyncpg://" in raw_url:
    SQLALCHEMY_DATABASE_URL = raw_url.replace("postgresql+asyncpg://", "postgresql://")
else:
    SQLALCHEMY_DATABASE_URL = raw_url

# Schema configuration (Database as Schema)
# Supabase or production Postgres often uses a specific schema name
DB_SCHEMA = os.getenv("DATABASE_SCHEMA", "public")

# Create database if it doesn't exist (SQLite or Local Postgres only)
# For Supabase/Production, the DB usually exists, but the schema might be custom
try:
    if "localhost" in SQLALCHEMY_DATABASE_URL or "127.0.0.1" in SQLALCHEMY_DATABASE_URL:
        if not database_exists(SQLALCHEMY_DATABASE_URL):
            create_database(SQLALCHEMY_DATABASE_URL)
            print(f"Database created: {SQLALCHEMY_DATABASE_URL}")
except Exception as e:
    print(f"Warning: Database check skipped. Error: {e}")

# Connection arguments
connect_args = {}
if "postgresql" in SQLALCHEMY_DATABASE_URL:
    # Set search_path for schema support
    connect_args["options"] = f"-csearch_path={DB_SCHEMA}"

# Production-ready engine configurations
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True, # Critical for Supabase/Remote DB to avoid EOF errors
)

# Ensure schema exists (if not public)
if DB_SCHEMA != "public":
    with engine.connect() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA}"))
        conn.commit()

# Schema-aware metadata
metadata = MetaData(schema=DB_SCHEMA)
Base = declarative_base(metadata=metadata)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

