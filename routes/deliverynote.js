const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { uploadMiddlewareMemory } = require("../utils/handleStorage");

const {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  getDeliveryNotePdf,
  signDeliveryNote,
  deleteDeliveryNote,
} = require("../controllers/deliveryNoteController");

const { validateDeliveryNote } = require("../validators/deliveryNoteValidator");

/**
 * @openapi
 * /api/deliverynotes:
 *   post:
 *     tags:
 *       - DeliveryNotes
 *     summary: Crear un nuevo albarán
 *     description: Crea un albarán (delivery note) para un proyecto determinado. Requiere que `projectId` sea válido.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: ID del proyecto (referencia a Project)
 *                 example: "64bfa9d9133b5f001e0bba7f"
 *               description:
 *                 type: string
 *                 example: "Revisión de instalación eléctrica"
 *               workEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     person:
 *                       type: string
 *                       example: "Luis Martínez"
 *                     hours:
 *                       type: number
 *                       example: 5
 *               materialEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Cable coaxial"
 *                     quantity:
 *                       type: number
 *                       example: 10
 *     responses:
 *       '201':
 *         description: Albarán creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Albarán creado correctamente"
 *                 deliveryNote:
 *                   type: object
 *                   description: Objeto del albarán creado
 *       '422':
 *         description: Error de validación (si `projectId` no viene o no es válido)
 *       '400':
 *         description: Error al crear el albarán
 *       '401':
 *         description: No autorizado (falta token)
 */
router.post("/", auth, validateDeliveryNote, createDeliveryNote);

/**
 * @openapi
 * /api/deliverynotes:
 *   get:
 *     tags:
 *       - DeliveryNotes
 *     summary: Listar albaranes
 *     description: Obtiene todos los albaranes creados por el usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de albaranes del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveryNotes:
 *                   type: array
 *                   description: Array de albaranes
 *                   items:
 *                     type: object
 *       '400':
 *         description: Error al obtener los albaranes
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/", auth, getDeliveryNotes);

/**
 * @openapi
 * /api/deliverynotes/{id}:
 *   get:
 *     tags:
 *       - DeliveryNotes
 *     summary: Obtener un albarán por ID
 *     description: Retorna un albarán con su información expandida (proyecto, cliente, creador). Sólo si pertenece al usuario.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del albarán
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Devuelve el albarán solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveryNote:
 *                   type: object
 *       '400':
 *         description: ID inválido o error al obtener
 *       '404':
 *         description: Albarán no encontrado o no autorizado
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/:id", auth, getDeliveryNoteById);

/**
 * @openapi
 * /api/deliverynotes/pdf/{id}:
 *   get:
 *     tags:
 *       - DeliveryNotes
 *     summary: Obtener PDF de un albarán
 *     description: Genera un PDF del albarán, lo sube a IPFS si no se había subido, y devuelve el archivo PDF en la respuesta.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del albarán
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Devuelve el PDF del albarán
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       '403':
 *         description: No autorizado
 *       '404':
 *         description: Albarán no encontrado
 *       '500':
 *         description: Error interno al generar/subir el PDF
 */
router.get("/pdf/:id", auth, getDeliveryNotePdf);

/**
 * @openapi
 * /api/deliverynotes/sign/{id}:
 *   patch:
 *     tags:
 *       - DeliveryNotes
 *     summary: Firmar un albarán
 *     description: Sube la firma como imagen, regenera el PDF y lo sube a IPFS, devolviendo el PDF firmado en la respuesta.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del albarán a firmar
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen con la firma
 *     responses:
 *       '200':
 *         description: Albarán firmado. Se devuelve el PDF en la respuesta.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       '400':
 *         description: No se ha subido la firma o ID inválido
 *       '404':
 *         description: Albarán no encontrado o no autorizado
 *       '500':
 *         description: Error interno al firmar el albarán
 *       '401':
 *         description: No autorizado (falta token)
 */
router.patch(
  "/sign/:id",
  auth,
  uploadMiddlewareMemory.single("image"),
  signDeliveryNote
);

/**
 * @openapi
 * /api/deliverynotes/{id}:
 *   delete:
 *     tags:
 *       - DeliveryNotes
 *     summary: Eliminar un albarán (solo si no está firmado)
 *     description: Borra el albarán permanentemente si el usuario es el creador y todavía no está firmado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del albarán
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Albarán eliminado correctamente
 *       '403':
 *         description: El albarán ya está firmado y no puede eliminarse
 *       '404':
 *         description: Albarán no encontrado o no autorizado
 *       '400':
 *         description: ID inválido
 *       '401':
 *         description: No autorizado (falta token)
 *       '500':
 *         description: Error interno al eliminar
 */
router.delete("/:id", auth, deleteDeliveryNote);

module.exports = router;
