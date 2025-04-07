const Client = require("../models/Client");
const mongoose = require("mongoose");
const { handleHttpError } = require("../utils/handleError");

const createClient = async (req, res) => {
  try {
    const client = new Client({
      ...req.body,
      createdBy: req.user._id,
      companyId: req.user.company?._id || null,
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

module.exports = { createClient, updateClient };
