// Slack SDK -> IncomingWebhook provee un wrapper simple para enviar mensajes via URL
const { IncomingWebhook } = require("@slack/webhook");

// Instancia del webhook usando la URL almacenada en SLACK_WEBHOOK
const webHook = new IncomingWebhook(process.env.SLACK_WEBHOOK);

// Stream de logging compatible con morgan‑body
const loggerStream = {
  write: (message) => {
    // Cada mensaje recibido se envía como texto a Slack
    webHook.send({
      text: message,
    });
  },
};

// Exporta el stream para ser consumido por el sistema de logs de la aplicación
module.exports = loggerStream;
