const nodemailer = require("nodemailer");
const { buildFrontendUrl, getFrontendHost } = require("./publicUrl");

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

function renderEmailLayout({ title, contentHtml }) {
  const safeTitle = title || "Notificacion de Enyell";
  const frontendHost = getFrontendHost();
  const homeUrl = buildFrontendUrl("/");
  const servicesUrl = buildFrontendUrl("/servicios");
  const contactUrl = buildFrontendUrl("/contacto");
  const privacyUrl = buildFrontendUrl("/privacidad");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0; padding:0; background:#E8E9EA;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
          ${safeTitle}
        </div>
        <div style="margin:0; padding:48px 20px; background:#E8E9EA;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; border-collapse:collapse; box-shadow:0 4px 20px rgba(0,0,0,0.13);">
                  <tr>
                    <td style="height:4px; line-height:4px; background:#e94560; font-size:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="background:#1a1a2e; padding:28px 40px 24px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td align="left" style="vertical-align:middle;">
                            <div style="font-family:'Poppins', 'Montserrat', Arial, sans-serif; font-size:33px; line-height:1; color:#F1F2F4; letter-spacing:0.02em;">
                              ENYELL
                            </div>
                            <div style="width:54px; height:4px; background:#e94560; margin-top:5px; line-height:4px; font-size:0;">&nbsp;</div>
                          </td>
                          <td align="right" style="vertical-align:middle;">
                            <a href="${homeUrl}" style="font-family:Roboto, Arial, sans-serif; font-size:11px; color:rgba(255,255,255,0.50); letter-spacing:0.08em; text-transform:uppercase; text-decoration:none;">
                              ${frontendHost}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#1a1a2e; padding:0 40px 26px;">
                      <p style="margin:0; font-family:Roboto, Arial, sans-serif; font-size:15px; color:rgba(255,255,255,0.80); font-weight:300; line-height:1.4;">
                        Notificaci&oacute;n de <strong style="color:#e94560; font-weight:500;">Enyell</strong>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#FFFFFF; padding:42px 40px; border-left:1px solid #E5E7EB; border-right:1px solid #E5E7EB;">
                      <div style="font-family:'Poppins', 'Montserrat', Arial, sans-serif; font-size:34px; line-height:1.1; color:#202124; text-transform:uppercase; letter-spacing:0; margin:0 0 24px;">
                        ${safeTitle}
                      </div>
                      <div style="font-family:Roboto, Arial, sans-serif; font-size:15px; line-height:1.7; color:#1F2937;">
                        ${contentHtml}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="height:2px; line-height:2px; background:#e94560; font-size:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="background:#1a1a2e; padding:32px 40px 28px;">
                      <div style="font-family:'Poppins', 'Montserrat', Arial, sans-serif; font-size:24px; line-height:1; color:#F1F2F4; letter-spacing:0.02em; margin-bottom:10px;">
                        ENYELL
                      </div>
                      <p style="font-family:Roboto, Arial, sans-serif; font-size:13px; color:rgba(255,255,255,0.55); margin:0 0 22px; line-height:1.6; font-weight:300;">
                        Ilustraci&oacute;n &middot; Arte por comisi&oacute;n &middot; Dise&#241;o original<br>
                        Tu visi&oacute;n, mi arte.
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; border-top:1px solid rgba(255,255,255,0.09); border-bottom:1px solid rgba(255,255,255,0.07);">
                        <tr>
                          <td style="padding:18px 0; font-family:Roboto, Arial, sans-serif; font-size:12px; color:rgba(255,255,255,0.60); line-height:1.8;">
                            <a href="${servicesUrl}" style="color:rgba(255,255,255,0.65); text-decoration:none;">Servicios</a>
                            <span style="color:rgba(255,255,255,0.25);"> &middot; </span>
                            <a href="${contactUrl}" style="color:rgba(255,255,255,0.65); text-decoration:none;">Contacto</a>
                            <span style="color:rgba(255,255,255,0.25);"> &middot; </span>
                            <a href="${privacyUrl}" style="color:rgba(255,255,255,0.65); text-decoration:none;">Privacidad</a>
                            <br>
                            <a href="mailto:hola@ienyell.com" style="color:rgba(255,255,255,0.65); text-decoration:none;">hola@ienyell.com</a>
                          </td>
                        </tr>
                      </table>
                      <p style="font-family:Roboto, Arial, sans-serif; font-size:11px; color:rgba(255,255,255,0.30); margin:18px 0 5px; line-height:1.7;">
                        &copy; 2026 Enyell &middot; ${frontendHost} &middot; Costa Rica
                      </p>
                      <p style="font-family:Roboto, Arial, sans-serif; font-size:11px; color:rgba(255,255,255,0.25); margin:0; line-height:1.7;">
                        Recibi&oacute; este correo porque se registr&oacute; o interactu&oacute; con los servicios de Enyell.
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="font-family:Roboto, Arial, sans-serif; font-size:10px; color:#AAAAAA; margin:16px 0 0; letter-spacing:0.04em;">
                  ENYELL &middot; Ilustraci&oacute;n y arte por comisi&oacute;n &middot; ${frontendHost}
                </p>
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;
}

async function sendEmail({ to, subject, html, attachments }) {
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
      attachments
    });
    return true;
  } catch (error) {
    console.error("No se pudo enviar el email:", error);
    return false;
  }
}

module.exports = {
  renderEmailLayout,
  sendEmail
};
