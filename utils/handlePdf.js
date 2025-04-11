const PDFDocument = require("pdfkit");

const generatePdfBuffer = async (note) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Encabezado
      doc.fontSize(20).text("Albarán de Proyecto", { align: "center" });
      doc.moveDown();

      // Proyecto y Cliente
      doc.fontSize(14).text(`Proyecto: ${note.projectId.name}`);
      doc.text(`Código: ${note.projectId.projectCode}`);
      doc.text(`Cliente: ${note.projectId.clientId?.name || "Sin cliente"}`);
      doc.text(
        `Dirección: ${note.projectId.address?.street || "-"}, ${
          note.projectId.address?.city || "-"
        }`
      );
      doc.moveDown();

      // Usuario y fecha
      doc.text(`Creado por: ${note.createdBy.name || note.createdBy.email}`);
      doc.text(`Fecha: ${note.date.toLocaleDateString()}`);
      doc.moveDown();

      // Descripción
      if (note.description) {
        doc.fontSize(14).text("Descripción:");
        doc.fontSize(12).text(note.description);
        doc.moveDown();
      }

      // Horas
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
          doc.fontSize(12).text(`- ${entry.name}: ${entry.quantity}`);
        });
        doc.moveDown();
      }

      // Firma
      if (note.signature) {
        doc.fontSize(14).text("Firma:");
        try {
          const response = await fetch(note.signature);
          const arrayBuffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);
          doc.image(imageBuffer, { width: 150 });
        } catch (err) {
          doc.fontSize(12).text("[Error al cargar la imagen de firma]");
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generatePdfBuffer;
