const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  validateClient,
  validateClientUpdate,
} = require("../validators/clientValidator");

const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  softDeleteClient,
  hardDeleteClient,
  getArchivedClients,
  recoverClient,
} = require("../controllers/clientController");

/**
 * @openapi
 * /api/clients:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Obtener todos los clientes
 *     description: Retorna todos los clientes creados por el usuario o con el mismo CIF de la empresa.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Retorna la lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Array de clientes
 *       '400':
 *         description: Error al obtener los clientes
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/", auth, getClients);

/**
 * @openapi
 * /api/clients:
 *   post:
 *     tags:
 *       - Clients
 *     summary: Crear un nuevo cliente
 *     description: Crea un cliente con campos obligatorios (name, email, cif).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - cif
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Empresa Ejemplo S.L."
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contacto@empresa.com"
 *               phone:
 *                 type: string
 *                 example: "+34 600 123 456"
 *               cif:
 *                 type: string
 *                 example: "B12345678"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "Calle Mayor"
 *                   number:
 *                     type: integer
 *                     example: 10
 *                   postal:
 *                     type: integer
 *                     example: 28001
 *                   city:
 *                     type: string
 *                     example: "Madrid"
 *                   province:
 *                     type: string
 *                     example: "Madrid"
 *     responses:
 *       '201':
 *         description: Cliente creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cliente creado correctamente"
 *                 client:
 *                   type: object
 *                   description: Objeto del cliente creado
 *       '422':
 *         description: Error de validación en los campos
 *       '400':
 *         description: Error al crear el cliente
 *       '401':
 *         description: No autorizado (falta token)
 */
router.post("/", auth, validateClient, createClient);

/**
 * @openapi
 * /api/clients/archive:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Obtener clientes archivados (soft delete)
 *     description: Retorna la lista de clientes marcados como borrados, creados por el usuario.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de clientes archivados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   description: Array de clientes archivados
 *                   items:
 *                     type: object
 *       '400':
 *         description: Error al obtener los clientes archivados
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/archive", auth, getArchivedClients);

/**
 * @openapi
 * /api/clients/{id}:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Obtener un cliente por ID
 *     description: Retorna un cliente específico, si pertenece al usuario o al CIF de su empresa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Retorna el cliente solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client:
 *                   type: object
 *       '400':
 *         description: ID inválido o error al obtener
 *       '404':
 *         description: Cliente no encontrado o acceso denegado
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/:id", auth, getClientById);

/**
 * @openapi
 * /api/clients/{id}:
 *   put:
 *     tags:
 *       - Clients
 *     summary: Actualizar un cliente
 *     description: Actualiza los datos de un cliente existente, si pertenece al usuario. Campos opcionales.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cliente Actualizado S.A."
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "update@empresa.com"
 *               phone:
 *                 type: string
 *                 example: "+34 699 123 987"
 *               cif:
 *                 type: string
 *                 example: "B87654321"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "Calle Real"
 *                   number:
 *                     type: integer
 *                     example: 45
 *                   postal:
 *                     type: integer
 *                     example: 28002
 *                   city:
 *                     type: string
 *                     example: "Madrid"
 *                   province:
 *                     type: string
 *                     example: "Madrid"
 *     responses:
 *       '200':
 *         description: Cliente actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cliente actualizado correctamente"
 *                 client:
 *                   type: object
 *                   description: Objeto del cliente actualizado
 *       '404':
 *         description: Cliente no encontrado o no autorizado
 *       '422':
 *         description: Error de validación (si algún campo es inválido)
 *       '400':
 *         description: ID inválido o error al actualizar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.put("/:id", auth, validateClientUpdate, updateClient);

/**
 * @openapi
 * /api/clients/{id}:
 *   delete:
 *     tags:
 *       - Clients
 *     summary: Eliminar cliente (hard delete)
 *     description: Elimina definitivamente un cliente, si fue creado por el usuario.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Cliente eliminado permanentemente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cliente eliminado permanentemente (hard delete)"
 *       '404':
 *         description: Cliente no encontrado o acceso denegado
 *       '400':
 *         description: ID inválido o error al eliminar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.delete("/:id", auth, hardDeleteClient);

/**
 * @openapi
 * /api/clients/archive/{id}:
 *   delete:
 *     tags:
 *       - Clients
 *     summary: Archivar cliente (soft delete)
 *     description: Marca un cliente como borrado sin eliminarlo físicamente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del cliente a archivar
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Cliente archivado correctamente (soft delete)
 *       '404':
 *         description: Cliente no encontrado o acceso denegado
 *       '400':
 *         description: ID inválido o error al archivar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.delete("/archive/:id", auth, softDeleteClient);

/**
 * @openapi
 * /api/clients/restore/{id}:
 *   patch:
 *     tags:
 *       - Clients
 *     summary: Restaurar cliente archivado
 *     description: Quita el estado de borrado (soft delete) y vuelve a estar activo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del cliente archivado
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Cliente restaurado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cliente restaurado correctamente"
 *                 client:
 *                   type: object
 *                   description: Cliente restaurado
 *       '404':
 *         description: Cliente no encontrado o no archivado
 *       '400':
 *         description: ID inválido o error al restaurar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.patch("/restore/:id", auth, recoverClient);

module.exports = router;
