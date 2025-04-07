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
} = require("../controllers/projectController");

// Crear un proyecto
router.post("/", auth, validateProject, createProject);

// Actualizar un proyecto
router.put("/:id", auth, validateProjectUpdate, updateProject);

module.exports = router;
