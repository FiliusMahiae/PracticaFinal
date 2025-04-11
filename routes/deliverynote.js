const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { uploadMiddlewareMemory } = require("../utils/handleStorage");

const {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  getDeliveryNotePdf,
  signDeliveryNote,
  deleteDeliveryNote,
} = require("../controllers/deliveryNoteController");

const { validateDeliveryNote } = require("../validators/deliveryNoteValidator");

// Crear albarán
router.post("/", auth, validateDeliveryNote, createDeliveryNote);

// Obtener todos los albaranes del usuario
router.get("/", auth, getDeliveryNotes);

// Obtener un albarán por ID (con populate)
router.get("/:id", auth, getDeliveryNoteById);

// Descargar el PDF del albarán (sube a IPFS si no está firmado y no se había subido)
router.get("/pdf/:id", auth, getDeliveryNotePdf);

// Firmar un albarán (sube la firma, regenera y sube el PDF firmado)
router.patch(
  "/sign/:id",
  auth,
  uploadMiddlewareMemory.single("image"),
  signDeliveryNote
);

// Borrar un albarán (solo si no está firmado)
router.delete("/:id", auth, deleteDeliveryNote);

module.exports = router;
