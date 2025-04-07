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
} = require("../controllers/projectController");

// Crear un proyecto
router.post("/", auth, validateProject, createProject);

// Actualizar un proyecto
router.put("/:id", auth, validateProjectUpdate, updateProject);

// Obtener todos los proyectos del usuario o su empresa
router.get("/", auth, getProjects);

// Obtener un proyecto específico
router.get("/one/:id", auth, getProjectById);

module.exports = router;
