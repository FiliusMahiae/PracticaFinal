const PDFDocument = require("pdfkit");
const DeliveryNote = require("../models/DeliveryNote");
const User = require("../models/User");
const Project = require("../models/Project");
const { handleHttpError } = require("../utils/handleError");
const mongoose = require("mongoose");

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

const getDeliveryNotePdf = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const note = await DeliveryNote.findOne({ _id: noteId })
      .populate("createdBy", "email name role")
      .populate({
        path: "projectId",
        populate: {
          path: "clientId",
          model: "Client",
        },
      });

    if (!note) {
      return handleHttpError(res, "Albarán no encontrado", 404);
    }

    const isOwner = note.createdBy._id.equals(userId);
    const isGuest =
      req.user.role === "guest" &&
      note.createdBy._id.equals(req.user.invitedBy);

    if (!isOwner && !isGuest) {
      return handleHttpError(res, "No autorizado para ver este albarán", 403);
    }

    // Generar PDF
    const doc = new PDFDocument();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=albaran_${noteId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Albarán de Proyecto", { align: "center" });
    doc.moveDown();

    // Proyecto y Cliente
    doc.fontSize(14).text(`Proyecto: ${note.projectId.name}`);
    doc.text(`Código: ${note.projectId.projectCode}`);
    doc.text(`Cliente: ${note.projectId.clientId?.name || "Sin cliente"}`);
    doc.text(
      `Dirección del proyecto: ${note.projectId.address?.street || "-"}, ${
        note.projectId.address?.city || "-"
      }`
    );
    doc.moveDown();

    // Usuario
    doc
      .fontSize(14)
      .text(`Creado por: ${note.createdBy.name || note.createdBy.email}`);
    doc.text(`Fecha: ${note.date.toLocaleDateString()}`);
    doc.moveDown();

    // Descripción
    if (note.description) {
      doc.fontSize(14).text("Descripción:");
      doc.fontSize(12).text(note.description);
      doc.moveDown();
    }

    // Work entries
    if (note.workEntries.length > 0) {
      doc.fontSize(14).text("Personas y Horas:");
      note.workEntries.forEach((entry) => {
        doc.fontSize(12).text(`- ${entry.person}: ${entry.hours} horas`);
      });
      doc.moveDown();
    }

    // Materiales
    if (note.materialEntries.length > 0) {
      doc.fontSize(14).text("Materiales:");
      note.materialEntries.forEach((entry) => {
        doc.fontSize(12).text(`- ${entry.name}: ${entry.quantity} unidades`);
      });
      doc.moveDown();
    }

    // Firma (si implementas un campo "signature" en el modelo)
    if (note.signature) {
      doc.fontSize(14).text("Firma:");
      doc.image(note.signature, { width: 150 });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al generar el PDF", 500);
  }
};

const deleteDeliveryNote = async (req, res) => {
  try {
    const noteId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const note = await DeliveryNote.findOne({
      _id: noteId,
      createdBy: req.user._id,
    });

    if (!note) {
      return handleHttpError(res, "Albarán no encontrado o no autorizado", 404);
    }

    if (note.signature && note.signature.trim() !== "") {
      return handleHttpError(
        res,
        "No se puede eliminar un albarán firmado",
        403
      );
    }

    await DeliveryNote.deleteOne({ _id: noteId });

    res.json({ message: "Albarán eliminado correctamente" });
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al eliminar el albarán", 500);
  }
};

module.exports = {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  getDeliveryNotePdf,
  deleteDeliveryNote,
};
