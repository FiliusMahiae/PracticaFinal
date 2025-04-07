# Proyecto Backend — Gestión de Usuarios

## Universidad: U-TAD
## Alumno: Sergio Mahía
## Año académico: 2024/2025

---

## Descripción del proyecto

Este proyecto consiste en el desarrollo de una API RESTful usando Node.js y Express, que permite la gestión completa de usuarios. Incluye funcionalidades de registro, validación de email, login, onboarding de datos personales y de empresa, gestión de logo, recuperación de contraseña, invitación de compañeros y eliminación de cuenta.

Cumple con todos los requisitos técnicos solicitados en la práctica intermedia de la asignatura.

---

## Tecnologías utilizadas

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (autenticación)
- Bcrypt (cifrado de contraseñas)
- Multer (subida de archivos)
- Pinata + IPFS (almacenamiento de logos)
- express-validator (validación)
- dotenv (configuración de entorno)

---

## Instrucciones para ejecutar el proyecto

1. Clonar el repositorio:

```bash
git clone https://github.com/FiliusMahiae/PracticaParcial.git
cd PracticaParcial
```

2. Instalar las dependencias:

```bash
npm install
```

3. Configurar las variables de entorno:

Crea un archivo `.env` en la raíz del proyecto basado en `.env-example`:

```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/backend-api
JWT_SECRET=clave_secreta
PINATA_KEY=tu_api_key_de_pinata
PINATA_SECRET=tu_api_secret_de_pinata
PINATA_GATEWAY_URL=tu_gateway_de_pinata
MAX_ATTEMPTS=3
```

4. Iniciar el servidor en modo desarrollo:

```bash
npm start
```

---

## Endpoints principales

| Método | Ruta                                | Descripción                             |
|--------|-------------------------------------|-----------------------------------------|
| POST   | `/api/users/register`               | Registro de usuario                     |
| PUT    | `/api/users/validation`             | Validación del email                    |
| POST   | `/api/users/login`                  | Inicio de sesión                        |
| PUT    | `/api/users/onboarding/personal`    | Actualizar datos personales             |
| PATCH  | `/api/users/onboarding/company`     | Actualizar datos de la empresa          |
| PATCH  | `/api/users/logo`                   | Subir logo de la empresa                |
| GET    | `/api/users/me`                     | Obtener perfil del usuario              |
| DELETE | `/api/users/?soft=true / false`       | Eliminar cuenta (soft o hard)           |
| POST   | `/api/users/recover/request`        | Solicitar recuperación de contraseña    |
| PUT    | `/api/users/recover/reset`          | Resetear contraseña con token de recuperación |
| POST   | `/api/users/invite`                 | Invitar a un compañero (rol `guest`)    |

---

## Archivo de pruebas HTTP

Se incluye un archivo `requests.http` con todas las pruebas de los endpoints, compatible con REST Client para Visual Studio Code o importable en Postman.

---

## Cumplimiento del enunciado

- Registro con validación y código.
- Validación de email con intentos.
- Login con JWT.
- Onboarding completo.
- Validación condicional para autónomos.
- Subida de logo a IPFS.
- Eliminación soft/hard.
- Recuperación de contraseña.
- Invitación de usuarios invitados.

---

## Notas

- Todos los errores están gestionados correctamente con códigos HTTP 4XX/5XX.
- Las contraseñas se almacenan cifradas con bcrypt.
- La aplicación sigue una estructura modular clara y escalable.
