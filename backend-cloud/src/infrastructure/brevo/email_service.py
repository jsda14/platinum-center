import os
import requests
from typing import Any, Dict

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def _send_email(to_email: str, to_name: str, subject: str, html_content: str) -> Dict[str, Any]:
    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "gym.platinum.center@gmail.com")
    
    if not api_key:
        raise ValueError("La variable de entorno BREVO_API_KEY no está configurada")
        
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {
            "name": "Platinum Center",
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": to_name
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }
    
    response = requests.post(BREVO_API_URL, json=payload, headers=headers)
    
    if response.status_code not in (200, 201, 202):
        raise Exception(f"Error al enviar email via Brevo: {response.status_code} - {response.text}")
        
    return response.json()

def send_welcome_email(to_email: str, full_name: str) -> Dict[str, Any]:
    subject = "¡Te damos la bienvenida a Platinum Center! 🎉"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Inter', sans-serif;
                background-color: #1A1A1A;
                color: #FFFFFF;
                padding: 30px;
                margin: 0;
            }}
            .container {{
                max-width: 600px;
                background-color: #242424;
                border: 1px solid #3A3A3A;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.4);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-family: 'Bebas Neue', sans-serif;
                font-size: 32px;
                color: #C41E3A;
                font-weight: bold;
                letter-spacing: 1px;
            }}
            .title {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #FFFFFF;
            }}
            .content {{
                font-size: 16px;
                line-height: 1.6;
                color: #A0A0A0;
                margin-bottom: 30px;
            }}
            .footer {{
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #3A3A3A;
                padding-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="logo">PLATINUM CENTER</span>
            </div>
            <div class="title">¡Hola, {full_name}!</div>
            <div class="content">
                <p>Nos emociona enormemente darte la bienvenida oficial a <strong>Platinum Center</strong>.</p>
                <p>A partir de hoy, tienes acceso a nuestras instalaciones de primer nivel, instructores expertos y la mejor comunidad para alcanzar tus metas de acondicionamiento físico.</p>
                <p>Puedes ingresar a tu Portal del Miembro en cualquier momento para revisar el estado de tu membresía, tus pagos y hacernos llegar cualquier sugerencia.</p>
            </div>
            <div class="footer">
                Este es un correo automático enviado por Platinum Center. Por favor, no respondas a este mensaje.
            </div>
        </div>
    </body>
    </html>
    """
    return _send_email(to_email, full_name, subject, html_content)

def send_expiration_warning_email(to_email: str, full_name: str, days_remaining: int, end_date: str) -> Dict[str, Any]:
    subject = "Aviso importante: Tu membresía está próxima a vencer ⚠️"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Inter', sans-serif;
                background-color: #1A1A1A;
                color: #FFFFFF;
                padding: 30px;
                margin: 0;
            }}
            .container {{
                max-width: 600px;
                background-color: #242424;
                border: 1px solid #3A3A3A;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.4);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-family: 'Bebas Neue', sans-serif;
                font-size: 32px;
                color: #C41E3A;
                font-weight: bold;
                letter-spacing: 1px;
            }}
            .title {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #F59E0B;
            }}
            .content {{
                font-size: 16px;
                line-height: 1.6;
                color: #A0A0A0;
                margin-bottom: 30px;
            }}
            .highlight {{
                color: #FFFFFF;
                font-weight: bold;
            }}
            .footer {{
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #3A3A3A;
                padding-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="logo">PLATINUM CENTER</span>
            </div>
            <div class="title">¡Atención, {full_name}!</div>
            <div class="content">
                <p>Te informamos que tu membresía está próxima a vencer.</p>
                <p>Te quedan <span class="highlight">{days_remaining} días</span> de vigencia (fecha de vencimiento: <span class="highlight">{end_date}</span>).</p>
                <p>Para evitar interrupciones en tu acceso al gimnasio, te invitamos a renovar tu plan en la recepción o directamente a través de tu Portal del Miembro.</p>
                <p>¡Esperamos seguir acompañándote en tu entrenamiento!</p>
            </div>
            <div class="footer">
                Este es un correo automático enviado por Platinum Center. Por favor, no respondas a este mensaje.
            </div>
        </div>
    </body>
    </html>
    """
    return _send_email(to_email, full_name, subject, html_content)

def send_payment_confirmation_email(to_email: str, full_name: str, plan: str, amount: float, end_date: str) -> Dict[str, Any]:
    formatted_amount = f"${amount:,.0f}".replace(",", ".")
    plan_names = {
        "1_day": "Plan 1 Día",
        "15_days": "Plan 15 Días Consumibles",
        "1_month": "Plan 1 Mes",
        "1_year": "Plan 1 Año"
    }
    plan_display = plan_names.get(plan, plan)
    subject = "Confirmación de Pago Exitoso - Platinum Center ✅"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Inter', sans-serif;
                background-color: #1A1A1A;
                color: #FFFFFF;
                padding: 30px;
                margin: 0;
            }}
            .container {{
                max-width: 600px;
                background-color: #242424;
                border: 1px solid #3A3A3A;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.4);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-family: 'Bebas Neue', sans-serif;
                font-size: 32px;
                color: #C41E3A;
                font-weight: bold;
                letter-spacing: 1px;
            }}
            .title {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #22C55E;
            }}
            .content {{
                font-size: 16px;
                line-height: 1.6;
                color: #A0A0A0;
                margin-bottom: 30px;
            }}
            .receipt-table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                margin-bottom: 20px;
            }}
            .receipt-table td {{
                padding: 10px;
                border-bottom: 1px solid #3A3A3A;
            }}
            .receipt-label {{
                font-weight: 500;
                color: #A0A0A0;
            }}
            .receipt-value {{
                font-weight: bold;
                color: #FFFFFF;
                text-align: right;
            }}
            .footer {{
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #3A3A3A;
                padding-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="logo">PLATINUM CENTER</span>
            </div>
            <div class="title">¡Pago Confirmado, {full_name}!</div>
            <div class="content">
                <p>Hemos procesado tu pago correctamente. A continuación, te compartimos los detalles de tu transacción:</p>
                <table class="receipt-table">
                    <tr>
                        <td class="receipt-label">Plan Adquirido:</td>
                        <td class="receipt-value">{plan_display}</td>
                    </tr>
                    <tr>
                        <td class="receipt-label">Monto Pagado:</td>
                        <td class="receipt-value">{formatted_amount} COP</td>
                    </tr>
                    <tr>
                        <td class="receipt-label">Nueva Fecha de Vencimiento:</td>
                        <td class="receipt-value">{end_date}</td>
                    </tr>
                </table>
                <p>Tu acceso al gimnasio ha sido actualizado automáticamente. ¡Muchas gracias por tu confianza!</p>
            </div>
            <div class="footer">
                Este es un correo automático enviado por Platinum Center. Por favor, no respondas a este mensaje.
            </div>
        </div>
    </body>
    </html>
    """
    return _send_email(to_email, full_name, subject, html_content)
