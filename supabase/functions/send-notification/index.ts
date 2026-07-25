const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, member_email, member_name, plan, amount, end_date, days_remaining, admin_emails } = await req.json();

    if (!BREVO_API_KEY) {
      throw new Error("Missing BREVO_API_KEY environment variable");
    }

    let subject = "";
    let toEmail = member_email;
    let toName = member_name || "Miembro";
    let htmlContent = "";

    // Formateadores auxiliares
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "N/A";
      try {
        const dateObj = new Date(dateStr);
        return dateObj.toISOString().split('T')[0];
      } catch {
        return dateStr;
      }
    };

    const formatCOP = (amountVal: number | string) => {
      const num = typeof amountVal === 'string' ? parseFloat(amountVal) : amountVal;
      if (isNaN(num)) return amountVal?.toString() || "0";
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num);
    };

    // Estilos comunes para los correos con la identidad visual de Platinum Center
    const emailHeaderHtml = `
      <div style="background-color: #1A1A1A; color: #FFFFFF; font-family: 'Inter', sans-serif; padding: 40px 20px; text-align: center; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #242424; border: 1px solid #3A3A3A; border-radius: 12px; overflow: hidden; text-align: left; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          <!-- Header/Branding -->
          <div style="background-color: #1A1A1A; padding: 25px 20px; text-align: center; border-bottom: 2px solid #C41E3A;">
            <h1 style="color: #C41E3A; margin: 0; font-family: 'Impact', 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(196, 30, 58, 0.3);">PLATINUM CENTER</h1>
          </div>
          <!-- Body Content -->
          <div style="padding: 30px; line-height: 1.6;">
    `;

    const emailFooterHtml = `
          </div>
          <!-- Footer -->
          <div style="background-color: #1A1A1A; padding: 20px; text-align: center; border-top: 1px solid #3A3A3A;">
            <p style="color: #A0A0A0; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Gym Platinum Center. Todos los derechos reservados.</p>
            <p style="color: #A0A0A0; font-size: 10px; margin: 5px 0 0 0;">Bogotá, Colombia</p>
          </div>
        </div>
      </div>
    `;

    if (type === 'PAYMENT_CONFIRMED') {
      subject = "¡Pago confirmado! Tu membresía está activa 💪";
      htmlContent = `
        ${emailHeaderHtml}
        <h2 style="color: #D4A017; font-size: 20px; margin-top: 0; text-transform: uppercase;">¡Hola, ${toName}!</h2>
        <p style="font-size: 15px; color: #FFFFFF;">Te confirmamos que hemos recibido tu pago exitosamente. Tu membresía ha sido activada y tu acceso al gimnasio está habilitado.</p>
        
        <div style="background-color: #1A1A1A; border: 1px solid #3A3A3A; border-left: 4px solid #D4A017; padding: 15px; margin: 24px 0; border-radius: 6px;">
          <h3 style="color: #D4A017; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Resumen del plan</h3>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Plan:</strong> ${plan || 'Membresía'}</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Monto pagado:</strong> ${formatCOP(amount)}</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Fecha de vencimiento:</strong> ${formatDate(end_date)}</p>
        </div>
        
        <p style="font-size: 14px; color: #A0A0A0; margin-bottom: 25px;">¡Gracias por entrenar con nosotros! Nos vemos en el gym para dar el 100%.</p>
        
        <div style="text-align: center;">
          <a href="https://platinum-center-git-develop-gymplatinumcenter-6828s-projects.vercel.app/portal" style="background-color: #C41E3A; color: #FFFFFF; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 0 10px rgba(196, 30, 58, 0.4);">Ver mi membresía</a>
        </div>
        ${emailFooterHtml}
      `;
    } else if (type === 'PAYMENT_CONFIRMED_ADMIN') {
      subject = "💰 Nuevo pago recibido - Platinum Center";
      toEmail = "jsda14@gmail.com";
      toName = "Admin Platinum Center";
      htmlContent = `
        ${emailHeaderHtml}
        <h2 style="color: #C41E3A; font-size: 20px; margin-top: 0; text-transform: uppercase;">¡Nuevo Pago Registrado!</h2>
        <p style="font-size: 15px; color: #FFFFFF;">Se ha procesado y confirmado una nueva transacción de membresía a través de la pasarela de pagos.</p>
        
        <div style="background-color: #1A1A1A; border: 1px solid #3A3A3A; border-left: 4px solid #C41E3A; padding: 15px; margin: 24px 0; border-radius: 6px;">
          <h3 style="color: #C41E3A; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Detalles de la Transacción</h3>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Miembro:</strong> ${member_name || 'Desconocido'} (${member_email})</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Plan adquirido:</strong> ${plan || 'Membresía'}</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Valor:</strong> ${formatCOP(amount)}</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Método de pago:</strong> Bold</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Vencimiento del plan:</strong> ${formatDate(end_date)}</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Fecha de proceso:</strong> ${formatDate(new Date().toISOString())}</p>
        </div>
        ${emailFooterHtml}
      `;
    } else if (type === 'EXPIRATION_WARNING') {
      subject = "⚠️ Tu membresía vence pronto";
      htmlContent = `
        ${emailHeaderHtml}
        <h2 style="color: #D4A017; font-size: 20px; margin-top: 0; text-transform: uppercase;">¡Hola, ${toName}!</h2>
        <p style="font-size: 15px; color: #FFFFFF;">Te recordamos que tu membresía en <strong>Platinum Center</strong> está próxima a vencer.</p>
        
        <div style="background-color: #1A1A1A; border: 1px solid #3A3A3A; border-left: 4px solid #C41E3A; padding: 15px; margin: 24px 0; border-radius: 6px;">
          <h3 style="color: #C41E3A; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Alerta de Vencimiento</h3>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Días restantes:</strong> ${days_remaining} ${days_remaining === 1 ? 'día' : 'días'}</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Fecha de vencimiento:</strong> ${formatDate(end_date)}</p>
        </div>
        
        <p style="font-size: 14px; color: #A0A0A0; margin-bottom: 25px;">No interrumpas tu ritmo. Realiza tu renovación de forma segura desde el portal web en pocos clics.</p>
        
        <div style="text-align: center;">
          <a href="https://platinum-center-git-develop-gymplatinumcenter-6828s-projects.vercel.app/portal/renewal" style="background-color: #C41E3A; color: #FFFFFF; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 0 10px rgba(196, 30, 58, 0.4);">Renovar ahora</a>
        </div>
        ${emailFooterHtml}
      `;
    } else if (type === 'PAYMENT_REJECTED') {
      subject = "❌ Pago no procesado - Platinum Center";
      htmlContent = `
        ${emailHeaderHtml}
        <h2 style="color: #EF4444; font-size: 20px; margin-top: 0; text-transform: uppercase;">¡Hola, ${toName}!</h2>
        <p style="font-size: 15px; color: #FFFFFF;">Tu pago no pudo ser procesado. Por favor intenta de nuevo desde tu portal.</p>
        
        <div style="background-color: #1A1A1A; border: 1px solid #3A3A3A; border-left: 4px solid #EF4444; padding: 15px; margin: 24px 0; border-radius: 6px;">
          <h3 style="color: #EF4444; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Estado de la Transacción</h3>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Estado:</strong> Rechazado / Fallido</p>
          <p style="margin: 6px 0; color: #FFFFFF; font-size: 14px;"><strong>Pasarela:</strong> Bold</p>
        </div>
        
        <p style="font-size: 14px; color: #A0A0A0; margin-bottom: 25px;">Si tienes alguna inquietud con tu medio de pago, comunícate con tu entidad financiera o reintenta el pago.</p>
        
        <div style="text-align: center;">
          <a href="https://platinum-center-git-develop-gymplatinumcenter-6828s-projects.vercel.app/portal/renewal" style="background-color: #EF4444; color: #FFFFFF; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">Reintentar pago</a>
        </div>
        ${emailFooterHtml}
      `;
    } else {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "Gym Platinum Center",
          email: "gym.platinum.center@gmail.com"
        },
        to: type === 'PAYMENT_CONFIRMED_ADMIN'
          ? (admin_emails && admin_emails.length > 0 ? admin_emails : [{ email: "jsda14@gmail.com", name: "Admin" }])
          : [
              {
                email: toEmail,
                name: toName
              }
            ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      throw new Error(`Brevo API error: ${brevoResponse.status} - ${errorText}`);
    }

    const brevoData = await brevoResponse.json();

    return new Response(JSON.stringify({ status: "success", message: "Email sent successfully", data: brevoData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ status: "error", error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
