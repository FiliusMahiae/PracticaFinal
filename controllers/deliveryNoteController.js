const DeliveryNote = require("../models/DeliveryNote");
const mongoose = require("mongoose");
const { handleHttpError } = require("../utils/handleError");

const createDeliveryNote = async (req, res) => {
  try {
    const userId = req.user._id;

    const payload = {
      projectId: req.body.projectId,
      description: req.body.description || "",
      workEntries: req.body.workEntries || [],
      materialEntries: req.body.materialEntries || [],
      createdBy: userId,
    };

    const note = new DeliveryNote(payload);
    await note.save();

    res.status(201).json({
      message: "Albarán creado correctamente",
      deliveryNote: note,
    });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al crear el albarán", 400);
  }
};

const getDeliveryNotes = async (req, res) => {
  try {
    const userId = req.user._id;

    const deliveryNotes = await DeliveryNote.find({
      createdBy: userId,
    });

    res.json({ deliveryNotes });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "No se pudieron obtener los albaranes", 400);
  }
};

const getDeliveryNoteById = async (req, res) => {
  try {
    const deliveryNoteId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(deliveryNoteId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const deliveryNote = await DeliveryNote.findOne({
      _id: deliveryNoteId,
      createdBy: req.user._id, // Solo si el usuario es el autor
    })
      .populate("createdBy", "email name") //Cambia createdBy por el email y nombre del autor
      .populate({
        path: "projectId", //Cambia projectId por el proyecto
        populate: {
          path: "clientId", //Dentro del proyecto, cambia clientId por el cliente
          model: "Client",
        },
      });

    if (!deliveryNote) {
      return handleHttpError(res, "Albarán no encontrado o no autorizado", 404);
    }

    res.json({ deliveryNote });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al obtener el albarán", 400);
  }
};

module.exports = {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
};
