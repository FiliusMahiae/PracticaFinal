/****************************************************************************************
 *  DELIVERY NOTE CONTROLLER
 *  --------------------------------------------------------------------------------------
 *  Funcionalidades cubiertas:
 *    -> createDeliveryNote     Alta de parte/albarán vinculado a un proyecto
 *    -> getDeliveryNotes       Listado propios del usuario
 *    -> getDeliveryNoteById    Detalle con población profunda (project + client)
 *    -> getDeliveryNotePdf     Genera PDF (IPFS) y lo envía como descarga
 *    -> signDeliveryNote       Adjunta firma, regenera PDF y actualiza la URL
 *    -> deleteDeliveryNote     Elimina (solo si no está firmado)
 *
 *  Puntos de integración externos:
 *    - generatePdfBuffer()   -> PDFKit: crea un buffer PDF a partir del modelo
 *    - uploadToPinata()      -> Carga binarios a Pinata y devuelve IpfsHash
 *    - mongoose-delete NO usado aquí (borrado real en deleteDeliveryNote)
 *    - Readable.from(buffer) -> convierte Buffer a stream para piping HTTP
 ****************************************************************************************/

const { matchedData } = require("express-validator");
const DeliveryNote = require("../models/DeliveryNote");
const { Readable } = require("stream");
const generatePdfBuffer = require("../utils/handlePdf");
const uploadToPinata = require("../utils/handleUploadIPFS");
const { handleHttpError } = require("../utils/handleError");
const mongoose = require("mongoose");

/* ======================================================================================
 *  CREATE DELIVERY NOTE
 *  --------------------------------------------------------------------------------------
 *  - Recoge los campos validados del body con matchedData y los encapsula en payload
 *  - Guarda documento y devuelve 201
 * ==================================================================================== */
const createDeliveryNote = async (req, res) => {
  try {
    const userId = req.user._id;
    // Extraemos solo los campos validados
    const data = matchedData(req);
    const payload = {
      projectId: data.projectId,
      description: data.description || "",
      workEntries: data.workEntries || [],
      materialEntries: data.materialEntries || [],
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

/* ======================================================================================
 *  LIST DELIVERY NOTES (sólo los del usuario autenticado)
 * ==================================================================================== */
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

/* ======================================================================================
 *  GET DELIVERY NOTE BY ID
 *  --------------------------------------------------------------------------------------
 *  - Población anidada:
 *      createdBy  -> (email, name)
 *      projectId  -> (objeto Project)
 *        └─ clientId -> (objeto Client)
 * ==================================================================================== */
const getDeliveryNoteById = async (req, res) => {
  try {
    const deliveryNoteId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(deliveryNoteId)) {
      return handleHttpError(res, "ID inválido", 400);
    }

    const deliveryNote = await DeliveryNote.findOne({
      _id: deliveryNoteId,
      createdBy: req.user._id,
    })
      .populate("createdBy", "email name")
      .populate({
        path: "projectId",
        populate: {
          path: "clientId",
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

/* ======================================================================================
 *  GET DELIVERY NOTE PDF
 *  --------------------------------------------------------------------------------------
 *  Flujo:
 *    1) Verifica acceso (propietario o invitado con role guest)
 *    2) generatePdfBuffer(note) -> Buffer
 *    3) Subir buffer a Pinata, guarda pdfUrl con IpfsHash
 *    4) Devuelve el PDF como attachment (stream)
 *  Detalle de permisos invitado:
 *    - token JWT debe incluir role='guest' y invitedBy = creador del albarán
 * ==================================================================================== */
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

    // Permisos -> owner o invitado guest (invitedBy)
    const isOwner = note.createdBy._id.equals(userId);
    const isGuest =
      req.user.role === "guest" &&
      note.createdBy._id.equals(req.user.invitedBy);
    if (!isOwner && !isGuest) return handleHttpError(res, "No autorizado", 403);

    // 1) Generar PDF
    const buffer = await generatePdfBuffer(note);

    // 2) Subir a IPFS
    const result = await uploadToPinata(buffer, `albaran-${noteId}.pdf`);
    note.pdfUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    await note.save();

    // 3) Enviar como descarga
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

/* ======================================================================================
 *  SIGN DELIVERY NOTE
 *  --------------------------------------------------------------------------------------
 *  - Solo el autor puede firmar
 *  - Sube la imagen PNG de la firma a Pinata y guarda note.signature
 *  - Regenera un nuevo PDF con la firma visible
 *  - Sobrescribe pdfUrl con el PDF firmado
 * ==================================================================================== */
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

    // 1) Subir imagen de firma a IPFS
    const imageUpload = await uploadToPinata(
      req.file.buffer,
      `firma-${noteId}.png`
    );
    const signatureUrl = `https://gateway.pinata.cloud/ipfs/${imageUpload.IpfsHash}`;
    note.signature = signatureUrl;

    // 2) Regenerar PDF con firma
    const buffer = await generatePdfBuffer(note);

    // 3) Subir nuevo PDF firmado
    const newUpload = await uploadToPinata(
      buffer,
      `albaran-${noteId}-firmado.pdf`
    );
    note.pdfUrl = `https://gateway.pinata.cloud/ipfs/${newUpload.IpfsHash}`;
    await note.save();

    // 4) Respuesta con descarga directa
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

/* ======================================================================================
 *  DELETE DELIVERY NOTE
 *  --------------------------------------------------------------------------------------
 *  - Permite eliminación permanente solo si la nota NO está firmada
 * ==================================================================================== */
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

/* ======================================================================================
 *  EXPORTS
 * ==================================================================================== */
module.exports = {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  getDeliveryNotePdf,
  signDeliveryNote,
  deleteDeliveryNote,
};
