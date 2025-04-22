/**
 * Herramienta de envío de correos vía Gmail usando OAuth2.
 *
 * Flujo de alto nivel:
 *   1. Crea un cliente OAuth2 con las credenciales almacenadas en variables
 *      de entorno (.env).  ->  CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN.
 *   2. Intercambia el refresh token por un access token válido.
 *   3. Configura un transporter de Nodemailer con el esquema de autenticación
 *      “OAuth2” para Gmail.
 *   4. Expone sendEmail, función que abstrae el paso 1‑3 y envía el mensaje.
 */

// Dependencia principal para SMTP
const nodemailer = require("nodemailer");
// SDK de Google para OAuth2
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

/**
 * Crea y devuelve un objeto Nodemailer transporter ya autenticado.
 * Retorna una promesa porque necesita obtener un access token primero.
 */
const createTransporter = async () => {
  // Útil para depurar: verificar que la variable de entorno existe
  console.log(process.env.CLIENT_ID);

  // 1) Instancia cliente OAuth2 con credenciales de Google Cloud
  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  // 2) Carga el refresh token para poder pedir access tokens bajo demanda
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  // 3) Intercambia refresh token → access token
  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.log(err); // Log de error por consola
        reject("Failed to create access token.");
      }
      resolve(token); // Token temporal válido (~1 h)
    });
  });

  // 4) Configura Nodemailer con autenticación OAuth2
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL, // Cuenta Gmail desde la que se envía
      accessToken, // Token obtenido en el paso anterior
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });

  return transporter;
};

/**
 * Envia un correo electrónico.
 */
const sendEmail = async (emailOptions) => {
  try {
    let emailTransporter = await createTransporter(); // Transporter ya autenticado
    await emailTransporter.sendMail(emailOptions); // Envío del mensaje
  } catch (e) {
    console.log(e); // Manejo de errores básicos (podría externalizarse a un logger)
  }
};

// Exportación para usar en otros módulos
module.exports = { sendEmail };
