const DeliveryNote = require("../models/DeliveryNote");
const User = require("../models/User");
const Project = require("../models/Project");
const { Readable } = require("stream");
const generatePdfBuffer = require("../utils/handlePdf");
const uploadToPinata = require("../utils/handleUploadIPFS");

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

    const note = await DeliveryNote.findOne({ _id: noteId })
      .populate("createdBy", "email name role")
      .populate({
        path: "projectId",
        populate: { path: "clientId", model: "Client" },
      });

    if (!note) return handleHttpError(res, "Albarán no encontrado", 404);

    const isOwner = note.createdBy._id.equals(userId);
    const isGuest =
      req.user.role === "guest" &&
      note.createdBy._id.equals(req.user.invitedBy);
    if (!isOwner && !isGuest) return handleHttpError(res, "No autorizado", 403);

    // Generar PDF
    const buffer = await generatePdfBuffer(note);

    // Subir a IPFS
    const result = await uploadToPinata(buffer, `albaran-${noteId}.pdf`);
    note.pdfUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    await note.save();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=albaran-${noteId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    Readable.from(buffer).pipe(res);
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al generar el PDF", 500);
  }
};

const signDeliveryNote = async (req, res) => {
  try {
    const noteId = req.params.id;

    const note = await DeliveryNote.findOne({
      _id: noteId,
      createdBy: req.user._id,
    })
      .populate("createdBy", "email name")
      .populate({
        path: "projectId",
        populate: { path: "clientId", model: "Client" },
      });

    if (!note)
      return handleHttpError(res, "Albarán no encontrado o no autorizado", 404);
    if (!req.file) return handleHttpError(res, "No se ha subido la firma", 400);

    // Subir firma
    const imageUpload = await uploadToPinata(
      req.file.buffer,
      `firma-${noteId}.png`
    );
    const signatureUrl = `https://gateway.pinata.cloud/ipfs/${imageUpload.IpfsHash}`;
    note.signature = signatureUrl;

    // Generar nuevo PDF con firma
    const buffer = await generatePdfBuffer(note);

    // Subir a IPFS y actualizar pdfUrl si antes era un PDF sin firma
    const newUpload = await uploadToPinata(
      buffer,
      `albaran-${noteId}-firmado.pdf`
    );
    note.pdfUrl = `https://gateway.pinata.cloud/ipfs/${newUpload.IpfsHash}`;
    await note.save();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=albaran-${noteId}-firmado.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    Readable.from(buffer).pipe(res);
  } catch (err) {
    console.error(err);
    handleHttpError(res, "Error al firmar el albarán", 500);
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
  signDeliveryNote,
  deleteDeliveryNote,
};
