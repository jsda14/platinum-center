from fastapi import FastAPI
from dotenv import load_dotenv
from src.api.routes.webhooks import router as webhooks_router
from src.api.routes.bold import router as bold_router

load_dotenv()

app = FastAPI(title="Platinum Center API")

app.include_router(webhooks_router)
app.include_router(bold_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "project": "platinum-center-test"}