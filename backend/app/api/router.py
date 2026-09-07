from fastapi import APIRouter
from app.api.employees import router as employees_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()
api_router.include_router(employees_router)
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])

