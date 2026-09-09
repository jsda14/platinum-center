"""
Router de administración.
Re-exporta src.api.routes.admin para compatibilidad con la estructura de src/routers/.
"""
from src.api.routes.admin import router

__all__ = ["router"]
