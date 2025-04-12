const Project = require("../models/Project");
const User = require("../models/User");
const { handleHttpError } = require("../utils/handleError");
const mongoose = require("mongoose");

const createProject = async (req, res) => {
  try {
    const { name, projectCode } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select("company.cif");
    const companyCif = user?.company?.cif || null;

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

    Object.assign(project, { ...req.body, companyCif });
    await project.save();

    res.json({ message: "Proyecto actualizado correctamente", project });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al actualizar el proyecto", 400);
  }
};

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

    await project.delete();
    res.json({ message: "Proyecto archivado correctamente" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo archivar el proyecto", 400);
  }
};

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

    await Project.deleteOne({ _id: projectId });
    res.json({ message: "Proyecto eliminado permanentemente" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo eliminar el proyecto", 400);
  }
};

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

    await project.restore();
    res.json({ message: "Proyecto restaurado correctamente", project });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo restaurar el proyecto", 400);
  }
};

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
