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

// Crear un proyecto
router.post("/", auth, validateProject, createProject);

// Actualizar un proyecto
router.put("/:id", auth, validateProjectUpdate, updateProject);

// Obtener todos los proyectos del usuario o su empresa
router.get("/", auth, getProjects);

// Obtener un proyecto específico
router.get("/one/:id", auth, getProjectById);

//Borrado
router.delete("/archive/:id", auth, softDeleteProject);
router.delete("/:id", auth, hardDeleteProject);

// Listar proyectos archivados de un cliente
router.get("/archive", auth, getArchivedProjects);

// Restaurar proyecto archivado
router.patch("/restore/:id", auth, restoreProject);

module.exports = router;
