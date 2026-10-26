# ============================================================
# CashFlow Sentinel AI — FastAPI Backend Entry Point
# Run with: uvicorn main:app --reload --port 8000
# ============================================================

import uvicorn
from app.core.app_factory import create_app

app = create_app()

if __name__ == "__main__":
    from app.core.config import settings
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_DEBUG,
        log_level="debug" if settings.APP_DEBUG else "info",
    )
