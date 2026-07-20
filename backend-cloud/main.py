from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Platinum Center API")

@app.get("/health")
def health_check():
    return {"status": "ok", "project": "platinum-center-test"}