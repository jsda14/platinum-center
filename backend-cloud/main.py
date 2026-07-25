from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from src.api.routes.webhooks import router as webhooks_router
from src.api.routes.bold import router as bold_router

load_dotenv()

app = FastAPI(title="Platinum Center API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://platinum-center.vercel.app", "https://platinum-center-git-develop-gymplatinumcenter-6828s-projects.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks_router)
app.include_router(bold_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "project": "platinum-center-test"}