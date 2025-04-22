# Proyecto Backend — Práctica Final

## Universidad: U-TAD
## Alumno: Sergio Mahía
## Año académico: 2024/2025

---

## Descripción del proyecto

Este proyecto consiste en el desarrollo de una API RESTful usando Node.js y Express, que permite la gestión completa de usuarios, clientes, proyectos y albaranes.

Cumple con todos los requisitos técnicos solicitados en la práctica final de la asignatura.

---

## Tecnologías utilizadas

- **Node.js** – runtime JavaScript en servidor  
- **Express.js** – framework HTTP  
- **MongoDB + Mongoose** – base de datos 
- **JWT (jsonwebtoken)** – autenticación basada en tokens  
- **Bcrypt** – hashing de contraseñas  
- **express‑validator** – validación de peticiones  
- **Multer** – recepción de archivos (logo, firma)  
- **Pinata + IPFS** – almacenamiento descentralizado de imágenes y PDF  
- **PDFKit** – generación de documentos PDF en memoria  
- **Nodemailer + Gmail OAuth2** – envío de correos (códigos, invitaciones)  
- **@slack/webhook** – notificaciones de logs a Slack  
- **Swagger (swagger‑ui‑express + swagger‑jsdoc)** – documentación interactiva de la API  
- **morgan‑body** – logging detallado de peticiones/respuestas  
- **CORS** – gestión de orígenes cruzados  
- **dotenv** – configuración de variables de entorno  

---

## Instrucciones para ejecutar el proyecto

1. Clonar el repositorio:

```bash
git clone https://github.com/FiliusMahiae/PracticaFinal.git
cd PracticaFinal
```

2. Instalar las dependencias:

```bash
npm install
```

3. Configurar las variables de entorno:

Crea un archivo `.env` en la raíz del proyecto basado en `.env-example`:

```env
# Puerto en el que se levanta el servidor Express.

# Por ejemplo, si PORT=3000, se accede a la app en http://localhost:3000

PORT=

# URL de conexión a la base de datos MongoDB.

# Incluye las credenciales de acceso y el nombre de la base de datos.

# Ejemplo: mongodb+srv://usuario:contraseña@cluster.mongodb.net/nombreDB

MONGODB_URI=

# Clave secreta utilizada para firmar y verificar tokens JWT en Express.

# Se usa para generar el token al hacer login y validar peticiones autenticadas.

JWT_SECRET=

# URL del gateway de Pinata para acceder a los archivos subidos a IPFS.

# Es algo como: https://gateway.pinata.cloud/ipfs/

# Se utiliza para generar el enlace público del archivo tras subirlo.

PINATA_GATEWAY_URL=

# Clave pública de la API de Pinata.

# Necesaria para autenticar las peticiones a la API de Pinata (subida de archivos a IPFS).

PINATA_KEY=

# Clave secreta de la API de Pinata.

# Se combina con PINATA_KEY para firmar las peticiones.

PINATA_SECRET=

# Webhook de Slack para enviar notificaciones desde Express a un canal.

# Se usa para logear los errores internos del servidor (5XX).

SLACK_WEBHOOK=

# Dirección de Gmail desde la que se enviarán los correos de verificación

EMAIL=

# Token de actualización OAuth2 generado en OAuth Playground

# Se usa para obtener automáticamente nuevos access tokens sin intervención del usuario

REFRESH_TOKEN=

# Secreto del cliente OAuth2 (lo proporciona Google al crear credenciales en el proyecto)

CLIENT_SECRET=

# ID del cliente OAuth2 (identifica la aplicación en el ecosistema de Google)

CLIENT_ID=

# URI de redirección que se usa únicamente para obtener el refresh_token manualmente

# En tiempo de ejecución no se usa, pero es obligatorio para configurar correctamente el cliente OAuth2

REDIRECT_URI=

```

4. Iniciar el servidor en modo desarrollo:

```bash
npm start
```

---

## Archivo de pruebas HTTP

Se incluyen varios archivos `*.http` con todas las pruebas de los endpoints, compatible con REST Client para Visual Studio Code o importable en Postman.
