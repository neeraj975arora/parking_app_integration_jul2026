"""FastAPI application entry point."""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import setup_logging
from .database import engine
from . import models
from .routers import auth, vehicles, sessions, parking, admin, api_v1, bookings, payments

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Parking App API",
    description="FastAPI backend – drop-in replacement for Flask backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (same as Flask CORS(app)) ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(sessions.router)
app.include_router(parking.router)
app.include_router(admin.router)
app.include_router(api_v1.router)
app.include_router(bookings.router)
app.include_router(payments.router)

# ── Health check (same path as Flask) ────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    """Create all tables on startup — same as Flask's db.create_all()."""
    try:
        models.Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created on startup")
    except Exception as e:
        logger.warning(f"Could not create tables on startup (DB may not be ready yet): {e}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Parking App API is running"}

@app.get("/")
def root():
    return {"status": "healthy", "message": "Parking App API is running"}

# ── Global error handlers ─────────────────────────────────────────────────────
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import HTTPException as FastAPIHTTPException

@app.exception_handler(FastAPIHTTPException)
async def fastapi_http_exception_handler(request: Request, exc: FastAPIHTTPException):
    """Pass FastAPI HTTPException detail through as-is (preserves route error messages)."""
    return JSONResponse(status_code=exc.status_code, content=exc.detail)

@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette 404/405 (path/method not found) with Flask-compatible messages."""
    if exc.status_code == 404:
        return JSONResponse(status_code=404, content={"msg": "Resource not found"})
    if exc.status_code == 405:
        return JSONResponse(status_code=405, content={"msg": "Method not allowed"})
    return JSONResponse(status_code=exc.status_code, content={"msg": str(exc.detail)})

@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(status_code=500, content={"msg": "Internal server error"})
