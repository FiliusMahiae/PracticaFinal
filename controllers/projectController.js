/****************************************************************************************
 *  PROJECT CONTROLLER
 *  --------------------------------------------------------------------------------------
 *  Gestiona el ciclo de vida de proyectos para un usuario o para la empresa a la que
 *  pertenece:
 *    -> createProject          Alta con verificación de unicidad por nombre / código
 *    -> updateProject          Edición con control de acceso (creador o mismo CIF)
 *    -> getProjects            Listado (activos)
 *    -> getProjectById         Detalle individual
 *    -> softDeleteProject      Archivado (soft‑delete / trash)
 *    -> hardDeleteProject      Eliminación definitiva
 *    -> getArchivedProjects    Listado de proyectos archivados
 *    -> restoreProject         Restaurar un proyecto archivado
 *
 *  Notas clave de seguridad y diseño
 *  ---------------------------------
 *   - Permisos: el acceso se concede si el usuario es el creador (createdBy)
 *     o bien si comparte el mismo companyCif que el proyecto.
 *   - Filtro dinámico:
 *       [...].filter(Boolean) elimina los null de los $or, evitando condiciones vacías.
 *   - Soft‑delete: usa mongoose‑delete -> métodos .delete(), .findDeleted(), .restore().
 ****************************************************************************************/

const Project = require("../models/Project");
const User = require("../models/User");
const { handleHttpError } = require("../utils/handleError");
const mongoose = require("mongoose");

/* ======================================================================================
 *  CREATE PROJECT
 *  --------------------------------------------------------------------------------------
 *  - Extrae companyCif del usuario para permitir crear proyectos “compartidos” por CIF
 *  - Comprueba duplicados (mismo nombre o projectCode) para el mismo creador o CIF
 *  - Guarda el documento con createdBy y companyCif
 * ==================================================================================== */
const createProject = async (req, res) => {
  try {
    const { name, projectCode } = req.body;
    const userId = req.user._id;

    // Obtener el CIF de la empresa del usuario (si existe)
    const user = await User.findById(userId).select("company.cif");
    const companyCif = user?.company?.cif || null;

    /* -------------------------------- UNICIDAD ---------------------------------
     * Se construye un $or con dos bloques:
     *   A) Proyectos creados por el usuario con mismo name/projectCode
     *   B) Proyectos de la misma empresa (companyCif) con mismo name/projectCode
     * filter(Boolean) elimina el bloque B si companyCif === null
     * -------------------------------------------------------------------------- */
    const existing = await Project.findOne({
      $or: [
        { createdBy: userId, $or: [{ name }, { projectCode }] },
        companyCif ? { companyCif, $or: [{ name }, { projectCode }] } : null,
      ].filter(Boolean),
    });

    if (existing) {
      return handleHttpError(
        res,
        "Ya existe un proyecto con ese nombre o código",
        409
      );
    }

    const newProject = new Project({
      ...req.body,
      createdBy: userId,
      companyCif,
    });

    await newProject.save();
    res
      .status(201)
      .json({ message: "Proyecto creado correctamente", project: newProject });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al crear el proyecto", 400);
  }
};

/* ======================================================================================
 *  UPDATE PROJECT
 *  --------------------------------------------------------------------------------------
 *  - Verifica ObjectId válido
 *  - Comprueba permisos con los mismos criterios createBy / companyCif
 *  - Usa Object.assign para fusionar los cambios
 * ==================================================================================== */
const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return handleHttpError(res, "ID de proyecto inválido", 400);
    }

    const user = await User.findById(req.user._id).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { createdBy: req.user._id },
        companyCif ? { companyCif } : null,
      ].filter(Boolean),
    });

    if (!project) {
      return handleHttpError(
        res,
        "Proyecto no encontrado o no autorizado",
        404
      );
    }

    Object.assign(project, { ...req.body, companyCif }); // merge sin sobrescribir _id
    await project.save();

    res.json({ message: "Proyecto actualizado correctamente", project });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al actualizar el proyecto", 400);
  }
};

/* ======================================================================================
 *  GET PROJECTS -> lista activa (no borrados)
 * ==================================================================================== */
const getProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const projects = await Project.find({
      $or: [{ createdBy: userId }, companyCif ? { companyCif } : null].filter(
        Boolean
      ),
    }).populate("clientId");

    res.json({ projects });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudieron obtener los proyectos", 400);
  }
};

/* ======================================================================================
 *  GET PROJECT BY ID -> verifica permiso y población de clientId
 * ==================================================================================== */
const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(req.user._id).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { createdBy: req.user._id },
        companyCif ? { companyCif } : null,
      ].filter(Boolean),
    }).populate("clientId");

    if (!project) {
      return handleHttpError(
        res,
        "Proyecto no encontrado o no autorizado",
        404
      );
    }

    res.json({ project });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al obtener el proyecto", 400);
  }
};

/* ======================================================================================
 *  SOFT DELETE PROJECT -> marca deleted (mongoose‑delete)
 * ==================================================================================== */
const softDeleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(req.user._id).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { createdBy: req.user._id },
        companyCif ? { companyCif } : null,
      ].filter(Boolean),
    });

    if (!project) {
      return handleHttpError(
        res,
        "Proyecto no encontrado o no autorizado",
        404
      );
    }

    await project.delete(); // soft delete
    res.json({ message: "Proyecto archivado correctamente" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo archivar el proyecto", 400);
  }
};

/* ======================================================================================
 *  HARD DELETE PROJECT -> eliminación permanente
 * ==================================================================================== */
const hardDeleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(req.user._id).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { createdBy: req.user._id },
        companyCif ? { companyCif } : null,
      ].filter(Boolean),
    });

    if (!project) {
      return handleHttpError(
        res,
        "Proyecto no encontrado o no autorizado",
        404
      );
    }

    await Project.deleteOne({ _id: projectId }); // hard delete
    res.json({ message: "Proyecto eliminado permanentemente" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo eliminar el proyecto", 400);
  }
};

/* ======================================================================================
 *  GET ARCHIVED PROJECTS -> findDeleted (incluye sólo soft‑deleted)
 * ==================================================================================== */
const getArchivedProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const projects = await Project.findDeleted({
      $or: [{ createdBy: userId }, companyCif ? { companyCif } : null].filter(
        Boolean
      ),
    }).populate("clientId");

    res.json({ projects });
  } catch (err) {
    console.error(err);
    handleHttpError(
      res,
      "No se pudieron obtener los proyectos archivados",
      400
    );
  }
};

/* ======================================================================================
 *  RESTORE PROJECT -> des‑archiva (restore)
 * ==================================================================================== */
const restoreProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(req.user._id).select("company.cif");
    const companyCif = user?.company?.cif || null;

    const project = await Project.findOneDeleted({
      _id: projectId,
      $or: [
        { createdBy: req.user._id },
        companyCif ? { companyCif } : null,
      ].filter(Boolean),
    });

    if (!project) {
      return handleHttpError(res, "Proyecto no encontrado o no archivado", 404);
    }

    await project.restore(); // des‑marca deleted
    res.json({ message: "Proyecto restaurado correctamente", project });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo restaurar el proyecto", 400);
  }
};

/* ======================================================================================
 *  EXPORTS
 * ==================================================================================== */
module.exports = {
  createProject,
  updateProject,
  getProjects,
  getProjectById,
  softDeleteProject,
  hardDeleteProject,
  getArchivedProjects,
  restoreProject,
};
