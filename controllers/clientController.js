const Client = require("../models/Client");
const mongoose = require("mongoose");
const User = require("../models/User");
const { handleHttpError } = require("../utils/handleError");

const createClient = async (req, res) => {
  try {
    const client = new Client({
      ...req.body,
      createdBy: req.user._id,
      cif: req.body.cif,
    });
    await client.save();
    res.status(201).json({ message: "Cliente creado correctamente", client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo crear el cliente", 400);
  }
};

const updateClient = async (req, res) => {
  try {
    const clientId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID de cliente inválido", 400);
    }

    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.user._id,
    });
    if (!client) {
      return handleHttpError(res, "Cliente no encontrado o no autorizado", 404);
    }

    Object.assign(client, req.body);
    await client.save();

    res.json({ message: "Cliente actualizado correctamente", client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo actualizar el cliente", 400);
  }
};

const getClients = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    const filters = [{ createdBy: userId }];
    if (userCif) {
      filters.push({ cif: userCif });
    }

    const clients = await Client.find({ $or: filters });

    res.json({ clients });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudieron obtener los clientes", 400);
  }
};

const getClientById = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const userId = req.user._id;

    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    const client = await Client.findOne({
      _id: clientId,
      $or: [{ createdBy: userId }, userCif ? { cif: userCif } : null].filter(
        Boolean
      ),
    });

    if (!client) {
      return handleHttpError(
        res,
        "Cliente no encontrado o acceso denegado",
        404
      );
    }

    res.json({ client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al obtener el cliente", 400);
  }
};

const softDeleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    const client = await Client.findOne({
      _id: clientId,
      $or: [
        { createdBy: req.user._id },
        userCif ? { cif: userCif } : null,
      ].filter(Boolean),
    });

    if (!client) {
      return handleHttpError(
        res,
        "Cliente no encontrado o acceso denegado",
        404
      );
    }

    await client.delete();
    res.json({ message: "Cliente archivado correctamente (soft delete)" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo archivar el cliente", 400);
  }
};

const hardDeleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    const client = await Client.findOne({
      _id: clientId,
      $or: [
        { createdBy: req.user._id },
        userCif ? { cif: userCif } : null,
      ].filter(Boolean),
    });

    if (!client) {
      return handleHttpError(
        res,
        "Cliente no encontrado o acceso denegado",
        404
      );
    }

    await Client.deleteOne({ _id: clientId });
    res.json({ message: "Cliente eliminado permanentemente (hard delete)" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo eliminar el cliente", 400);
  }
};

const getArchivedClients = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    const clients = await Client.findDeleted({
      $or: [{ createdBy: userId }, userCif ? { cif: userCif } : null].filter(
        Boolean
      ),
    });

    res.json({ clients });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudieron obtener los clientes archivados", 400);
  }
};

const recoverClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    const client = await Client.findOneDeleted({
      _id: clientId,
      $or: [
        { createdBy: req.user._id },
        userCif ? { cif: userCif } : null,
      ].filter(Boolean),
    });

    if (!client) {
      return handleHttpError(res, "Cliente no encontrado o no archivado", 404);
    }

    await client.restore();
    res.json({ message: "Cliente restaurado correctamente", client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo restaurar el cliente", 400);
  }
};

module.exports = {
  createClient,
  updateClient,
  getClients,
  getClientById,
  softDeleteClient,
  hardDeleteClient,
  getArchivedClients,
  recoverClient,
};
