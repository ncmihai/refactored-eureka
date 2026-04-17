from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import credit, depozit, investitii, optimizare
from app.core.config import settings

app = FastAPI(title="Finance Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(credit.router, prefix="/api/v1")
app.include_router(optimizare.router, prefix="/api/v1")
app.include_router(depozit.router, prefix="/api/v1")
app.include_router(investitii.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}
