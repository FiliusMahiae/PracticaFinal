/****************************************************************************************
 *  CLIENT CONTROLLER
 *  --------------------------------------------------------------------------------------
 *  CRUD completo de clientes + soft‑delete / restore:
 *    -> createClient          Alta de cliente asignado al usuario (y CIF)
 *    -> updateClient          Edición (solo autor)
 *    -> getClients            Lista: propios o mismo CIF
 *    -> getClientById         Detalle con control de acceso
 *    -> softDeleteClient      Archivado (mongoose‑delete)
 *    -> hardDeleteClient      Eliminación definitiva
 *    -> getArchivedClients    Lista de clientes archivados
 *    -> recoverClient         Restaurar cliente archivado
 *
 *  Permisos
 *  --------
 *   - createdBy === req.user._id             -> acceso siempre permitido
 *   - Si el usuario pertenece a una empresa  -> comparte clientes con su mismo CIF
 *     (solo para lectura; creación/edición requieren ser el autor).
 ****************************************************************************************/

const Client = require("../models/Client");
const mongoose = require("mongoose");
const User = require("../models/User");
const { handleHttpError } = require("../utils/handleError");
const { matchedData } = require("express-validator");

/* ======================================================================================
 *  CREATE CLIENT
 *  --------------------------------------------------------------------------------------
 *  - copia body + createdBy + cif explícito
 * ==================================================================================== */
const createClient = async (req, res) => {
  try {
    const data = matchedData(req);
    const client = new Client({
      ...data,
      createdBy: req.user._id, // se añade explícitamente
      cif: data.cif, // idem
    });
    await client.save();
    await client.populate([{ path: "createdBy", select: "name email" }]);
    res.status(201).json({ message: "Cliente creado correctamente", client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo crear el cliente", 400);
  }
};

/* ======================================================================================
 *  UPDATE CLIENT
 *  --------------------------------------------------------------------------------------
 *  - Sólo el autor puede editar
 * ==================================================================================== */
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

    const data = matchedData(req);
    client.set(data);
    await client.save();
    await client.populate([{ path: "createdBy", select: "name email" }]);

    res.json({ message: "Cliente actualizado correctamente", client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo actualizar el cliente", 400);
  }
};

/* ======================================================================================
 *  GET CLIENTS
 *  --------------------------------------------------------------------------------------
 *  - Filtra:
 *      – Propios (createdBy)
 *      – Mismo CIF (si el usuario tiene company.cif)
 *  - Construye array filters y usa $or
 * ==================================================================================== */
const getClients = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("company.cif");
    const userCif = user?.company?.cif;

    // Propios siempre; añade filtro por CIF si existe
    const filters = [{ createdBy: userId }];
    if (userCif) {
      filters.push({ cif: userCif });
    }

    const clients = await Client.find({ $or: filters }).populate(
      "createdBy",
      "email name"
    );

    res.json({ clients });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudieron obtener los clientes", 400);
  }
};

/* ======================================================================================
 *  GET CLIENT BY ID
 *  --------------------------------------------------------------------------------------
 *  - Permite acceso si es autor o comparte CIF
 * ==================================================================================== */
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

    await client.populate([{ path: "createdBy", select: "name email" }]);
    res.json({ client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al obtener el cliente", 400);
  }
};

/* ======================================================================================
 *  SOFT DELETE CLIENT
 *  --------------------------------------------------------------------------------------
 *  - Solo autor -> .delete() (mongoose-delete)
 * ==================================================================================== */
const softDeleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const userId = req.user._id;

    const client = await Client.findOne({
      _id: clientId,
      createdBy: userId,
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

/* ======================================================================================
 *  HARD DELETE CLIENT
 *  --------------------------------------------------------------------------------------
 *  - Eliminación permanente (autor únicamente)
 * ==================================================================================== */
const hardDeleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.user._id,
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

/* ======================================================================================
 *  GET ARCHIVED CLIENTS -> solo los borrados lógicamente del usuario
 * ==================================================================================== */
const getArchivedClients = async (req, res) => {
  try {
    const userId = req.user._id;

    const clients = await Client.findDeleted({
      createdBy: userId,
    }).populate("createdBy", "email name");

    res.json({ clients });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudieron obtener los clientes archivados", 400);
  }
};

/* ======================================================================================
 *  RECOVER CLIENT -> restaurar un cliente soft‑deleted
 * ==================================================================================== */
const recoverClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const client = await Client.findOneDeleted({
      _id: clientId,
      createdBy: req.user._id,
    });

    if (!client) {
      return handleHttpError(res, "Cliente no encontrado o no archivado", 404);
    }

    await client.restore();
    await client.populate([{ path: "createdBy", select: "name email" }]);
    res.json({ message: "Cliente restaurado correctamente", client });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudo restaurar el cliente", 400);
  }
};

/* ======================================================================================
 *  EXPORTS
 * ==================================================================================== */
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
