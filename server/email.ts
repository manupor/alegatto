import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Alegatto <onboarding@resend.dev>";

export async function sendInviteEmail({
  toEmail,
  orgName,
  inviteLink,
  role,
}: {
  toEmail: string;
  orgName: string;
  inviteLink: string;
  role: string;
}) {
  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    senior: "Abogado Senior",
    assistant: "Asistente",
    intern: "Pasante",
  };

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Invitación a unirte a ${orgName} en Alegatto`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#10b981;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Alegatto</h1>
            <p style="margin:8px 0 0;color:#6ee7b7;font-size:14px;">Plataforma de IA Legal para Costa Rica</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:600;">Fuiste invitado a unirte</h2>
            <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
              Has sido invitado a unirte al despacho <strong style="color:#e2e8f0;">${orgName}</strong> en Alegatto
              con el rol de <strong style="color:#10b981;">${roleLabel[role] ?? role}</strong>.
            </p>
            <p style="margin:0 0 32px;color:#94a3b8;font-size:15px;line-height:1.6;">
              Alegatto es la plataforma de inteligencia artificial diseñada para abogados costarricenses —
              con acceso a toda la normativa nacional, generador de recursos, gestión de expedientes y mucho más.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background-color:#10b981;border-radius:8px;">
                  <a href="${inviteLink}"
                     style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                    Aceptar invitación
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#64748b;font-size:13px;text-align:center;">
              Si el botón no funciona, copiá este enlace en tu navegador:<br>
              <a href="${inviteLink}" style="color:#10b981;word-break:break-all;">${inviteLink}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#0f172a;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">
              © 2026 Alegatto · Este correo fue enviado porque alguien te invitó a su despacho.<br>
              Si no esperabas esta invitación, podés ignorar este correo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(error.message);
  }

  return data;
}
