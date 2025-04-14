const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  validateProject,
  validateProjectUpdate,
} = require("../validators/projectValidator");

const {
  createProject,
  updateProject,
  getProjects,
  getProjectById,
  softDeleteProject,
  hardDeleteProject,
  getArchivedProjects,
  restoreProject,
} = require("../controllers/projectController");

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Crear un nuevo proyecto
 *     description: Crea un proyecto asociado al usuario y/o su empresa. Valida que no haya otro con el mismo nombre o projectCode.
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
 *               - projectCode
 *               - email
 *               - clientId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Instalación de paneles solares"
 *               projectCode:
 *                 type: string
 *                 example: "PRJ001"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "info@empresa.com"
 *               clientId:
 *                 type: string
 *                 description: ID del cliente (referencia a Client)
 *                 example: "64bfa9d9133b5f001e0bba7f"
 *               code:
 *                 type: string
 *                 description: Campo opcional
 *                 example: "CodOpcional123"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "Calle Falsa"
 *                   number:
 *                     type: integer
 *                     example: 42
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
 *         description: Proyecto creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto creado correctamente"
 *                 project:
 *                   type: object
 *                   description: Objeto del proyecto creado
 *       '409':
 *         description: Ya existe un proyecto con ese nombre o código
 *       '422':
 *         description: Error de validación (datos faltantes o inválidos)
 *       '400':
 *         description: Error de validación manual o fallo al crear
 *       '401':
 *         description: No autorizado (falta token)
 */
router.post("/", auth, validateProject, createProject);

/**
 * @openapi
 * /api/projects/{id}:
 *   put:
 *     tags:
 *       - Projects
 *     summary: Actualizar un proyecto
 *     description: Actualiza los datos del proyecto. Los campos son opcionales, pero si vienen, no pueden ser inválidos. Si el usuario/empresa no es dueño, retorna 404.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del proyecto
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
 *                 example: "Proyecto renovado"
 *               projectCode:
 *                 type: string
 *                 example: "PRJ999"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nuevo@empresa.com"
 *               clientId:
 *                 type: string
 *                 example: "64bfa9d9133b5f001e0bba7f"
 *               code:
 *                 type: string
 *                 example: "CodNuevo"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "Calle Actualizada"
 *                   number:
 *                     type: integer
 *                     example: 100
 *                   postal:
 *                     type: integer
 *                     example: 28999
 *                   city:
 *                     type: string
 *                     example: "Leganés"
 *                   province:
 *                     type: string
 *                     example: "Madrid"
 *     responses:
 *       '200':
 *         description: Proyecto actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto actualizado correctamente"
 *                 project:
 *                   type: object
 *                   description: Objeto del proyecto actualizado
 *       '404':
 *         description: Proyecto no encontrado o no autorizado
 *       '422':
 *         description: Error de validación (campos inválidos)
 *       '400':
 *         description: ID inválido o error al actualizar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.put("/:id", auth, validateProjectUpdate, updateProject);

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener proyectos
 *     description: Devuelve todos los proyectos asociados al usuario o a su empresa (populate de clientId).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de proyectos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Array de proyectos
 *       '400':
 *         description: Error al obtener los proyectos
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/", auth, getProjects);

/**
 * @openapi
 * /api/projects/one/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Obtener un proyecto específico
 *     description: Retorna un solo proyecto, si pertenece al usuario o a su empresa (populate de clientId).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del proyecto
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7e"
 *     responses:
 *       '200':
 *         description: Retorna el proyecto solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   type: object
 *                   description: Datos del proyecto
 *       '400':
 *         description: ID inválido u error al obtener
 *       '404':
 *         description: Proyecto no encontrado o no autorizado
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/one/:id", auth, getProjectById);

/**
 * @openapi
 * /api/projects/archive/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Archivar (soft delete) un proyecto
 *     description: Marca un proyecto como "borrado" sin eliminarlo físicamente. Si no pertenece al usuario/empresa, devuelve 404.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del proyecto a archivar
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Proyecto archivado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto archivado correctamente"
 *       '404':
 *         description: Proyecto no encontrado o no autorizado
 *       '400':
 *         description: ID inválido o error al archivar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.delete("/archive/:id", auth, softDeleteProject);

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Borrado permanente (hard delete) de un proyecto
 *     description: Elimina físicamente un proyecto, si pertenece al usuario o empresa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del proyecto
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Proyecto eliminado permanentemente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto eliminado permanentemente"
 *       '404':
 *         description: Proyecto no encontrado o no autorizado
 *       '400':
 *         description: ID inválido o error al eliminar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.delete("/:id", auth, hardDeleteProject);

/**
 * @openapi
 * /api/projects/archive:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Listar proyectos archivados
 *     description: Devuelve todos los proyectos que han sido marcados como borrados (soft delete).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de proyectos archivados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   description: Array de proyectos archivados
 *                   items:
 *                     type: object
 *       '400':
 *         description: Error al obtener proyectos archivados
 *       '401':
 *         description: No autorizado (falta token)
 */
router.get("/archive", auth, getArchivedProjects);

/**
 * @openapi
 * /api/projects/restore/{id}:
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Restaurar un proyecto archivado
 *     description: Quita el estado de borrado (soft delete) a un proyecto previamente archivado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del proyecto archivado
 *         schema:
 *           type: string
 *           example: "64bfa9d9133b5f001e0bba7f"
 *     responses:
 *       '200':
 *         description: Proyecto restaurado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto restaurado correctamente"
 *                 project:
 *                   type: object
 *                   description: Proyecto restaurado
 *       '404':
 *         description: Proyecto no encontrado o no archivado
 *       '400':
 *         description: ID inválido o error al restaurar
 *       '401':
 *         description: No autorizado (falta token)
 */
router.patch("/restore/:id", auth, restoreProject);

module.exports = router;
