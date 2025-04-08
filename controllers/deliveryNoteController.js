const DeliveryNote = require("../models/DeliveryNote");
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

module.exports = { createDeliveryNote };
