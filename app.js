/**
 * Punto de entrada de la aplicación.
 *
 * 1. Carga variables de entorno desde .env con dotenv.
 * 2. Importa dependencias (Express, CORS, conexión a BD, loggers, Swagger).
 * 3. Configura middlewares globales: logging, CORS, JSON body‑parser.
 * 4. Expone documentación interactiva de la API en /api-docs.
 * 5. Monta las rutas en /api.
 * 6. Tras conectar con la base de datos, levanta el servidor (salvo en entorno de test).
 *
 */

// 1) Carga variables de entorno definidas en .env
require("dotenv").config();

// -------------------------------------------------------------------
// * DEPENDENCIAS Y UTILIDADES
// -------------------------------------------------------------------

// Framework HTTP principal
const express = require("express");
// Middleware para habilitar CORS
const cors = require("cors");
// Función de conexión a la base de datos (Mongoose)
const dbConnect = require("./config/db");
// Destino personalizado donde se enviarán los logs
const loggerStream = require("./utils/handleLogger");
// Middleware para registrar peticiones y respuestas con formato extendido
const morganBody = require("morgan-body");

// Herramientas para documentación OpenAPI/Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./docs/swagger");

// Instancia de la aplicación Express
const app = express();

// -------------------------------------------------------------------
// * MIDDLEWARES
// -------------------------------------------------------------------

// Registro de peticiones que resulten en errores (status >= 500).
// - noColors evita caracteres de color en los logs.
// - skip filtra las peticiones exitosas para no saturar la consola.
// - stream redirige la salida al manejador de logs de la aplicación.
morganBody(app, {
  noColors: true,
  skip: function (req, res) {
    return res.statusCode < 500;
  },
  stream: loggerStream,
});

// Habilita CORS para todas las rutas y métodos.
app.use(cors());

// Parseo automático de cuerpos JSON en req.body.
app.use(express.json());

// -------------------------------------------------------------------
// * RUTAS Y DOCUMENTACIÓN
// -------------------------------------------------------------------

// Servir la UI de Swagger en /api-docs para explorar la API de forma interactiva.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Cargar de forma dinámica todas las rutas definidas en ./routes bajo el
// prefijo /api (versionado / organización de endpoints).
app.use("/api", require("./routes"));

// -------------------------------------------------------------------
// * INICIALIZACIÓN DEL SERVIDOR
// -------------------------------------------------------------------

let server;

// Conexión a la base de datos antes de arrancar el servidor.
// Dado que dbConnect devuelve una promesa, se espera a su resolución.
dbConnect().then(() => {
  // Selecciona el puerto desde variables de entorno o por defecto 3000.
  const PORT = process.env.PORT || 3000;
  // Evitar levantar un servidor real durante pruebas automatizadas.
  if (process.env.NODE_ENV !== "test") {
    // Arranque del servidor HTTP.
    server = app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  }
});

// Exportación de la app y del servidor para pruebas unitarias / integración.
module.exports = { app, server };
