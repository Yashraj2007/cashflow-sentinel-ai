# ============================================================
# CashFlow Sentinel AI — App Factory
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Import route packages
from app.api.routes.auth import router as auth_router
from app.api.routes.businesses import router as businesses_router
from app.api.routes.customers import router as customers_router
from app.api.routes.suppliers import router as suppliers_router
from app.api.routes.invoices import router as invoices_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.expenses import router as expenses_router
from app.api.routes.deals import router as deals_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.scenarios import router as scenarios_router
from app.api.routes.forecast import router as forecast_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.reports_bank_settings import (
    reports_router,
    bank_router,
    settings_router,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="CashFlow Sentinel AI API",
        description="Predictive cash-flow intelligence and financial decision support API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS Middleware ─────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health check endpoints ──────────────────────────────────
    @app.get("/")
    @app.get("/api/health")
    async def health_check():
        return {
            "status": "ok",
            "app": "CashFlow Sentinel AI",
            "version": "1.0.0",
        }

    # ── Register Routers ────────────────────────────────────────
    app.include_router(auth_router)
    app.include_router(businesses_router)
    app.include_router(customers_router)
    app.include_router(suppliers_router)
    app.include_router(invoices_router)
    app.include_router(transactions_router)
    app.include_router(expenses_router)
    app.include_router(deals_router)
    app.include_router(assistant_router)
    app.include_router(scenarios_router)
    app.include_router(forecast_router)
    app.include_router(alerts_router)
    app.include_router(reports_router)
    app.include_router(bank_router)
    app.include_router(settings_router)

    return app
