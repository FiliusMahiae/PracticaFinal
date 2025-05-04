/* deliveryNote.test.js */

const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");

const { app } = require("../app");
const { tokenSign } = require("../utils/handleJwt");

const UserModel = require("../models/User");
const ProjectModel = require("../models/Project");
const ClientModel = require("../models/Client");
const DeliveryNoteModel = require("../models/DeliveryNote");

let user, token;
let user2, token2;
let client, project, deliveryNote, signedNote;

/**
 * Se ejecuta antes de cada test, borrando las colecciones
 * relevantes y creando datos nuevos para aislar cada prueba.
 */
beforeEach(async () => {
  await UserModel.deleteMany({});
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});
  await DeliveryNoteModel.deleteMany({});

  // Creamos un usuario principal
  user = await UserModel.create({
    email: "usuario@test.com",
    password: "123456",
    role: "user",
  });
  token = await tokenSign(user);

  // Segundo usuario (para probar restricciones)
  user2 = await UserModel.create({
    email: "otro@test.com",
    password: "654321",
    role: "user",
  });
  token2 = await tokenSign(user2);

  // Creamos un cliente y un proyecto asociados al primer usuario
  client = await ClientModel.create({
    name: "Cliente de Prueba",
    email: "cliente@test.com",
    cif: "48201640L",
    createdBy: user._id,
  });

  project = await ProjectModel.create({
    name: "Proyecto de Albaranes",
    projectCode: "PROJ-ABC-001",
    email: "project@test.com",
    clientId: client._id,
    createdBy: user._id,
  });

  // Un deliveryNote sin firmar
  deliveryNote = await DeliveryNoteModel.create({
    projectId: project._id,
    createdBy: user._id,
    description: "Albarán sin firma",
    workEntries: [
      { person: "Juan", hours: 5 },
      { person: "María", hours: 3 },
    ],
  });

  // Un deliveryNote firmado (para probar que no se pueda borrar)
  signedNote = await DeliveryNoteModel.create({
    projectId: project._id,
    createdBy: user._id,
    description: "Albarán ya firmado",
    signature: "https://gateway.pinata.cloud/ipfs/firmaAnterior.png",
  });
});

describe("POST /api/deliveryNote - Crear albarán", () => {
  it("Debe crear un albarán correctamente (201)", async () => {
    const res = await request(app)
      .post("/api/deliveryNote")
      .set("Authorization", `Bearer ${token}`)
      .send({
        projectId: project._id.toString(),
        description: "Nuevo Albarán",
        workEntries: [{ person: "Carlos", hours: 2 }],
      })
      .expect(201);

    expect(res.body).toHaveProperty("message", "Albarán creado correctamente");
    expect(res.body.deliveryNote).toHaveProperty(
      "description",
      "Nuevo Albarán"
    );
    expect(res.body.deliveryNote).toHaveProperty(
      "createdBy._id",
      user._id.toString()
    );
  });

  it("Error 401 si no se envía token", async () => {
    await request(app)
      .post("/api/deliveryNote")
      .send({
        projectId: project._id.toString(),
        description: "Sin token",
      })
      .expect(401);
  });

  it("Error 422 si falta projectId o es inválido", async () => {
    const res = await request(app)
      .post("/api/deliveryNote")
      .set("Authorization", `Bearer ${token}`)
      .send({
        description: "Albarán sin projectId",
      })
      .expect(422);

    expect(res.body).toHaveProperty("errors");
  });
});

describe("GET /api/deliveryNote - Obtener lista de albaranes del usuario", () => {
  it("Debe devolver los albaranes creados por el usuario (200)", async () => {
    // Esperamos 2 => deliveryNote y signedNote (ambos son del mismo user)
    const res = await request(app)
      .get("/api/deliveryNote")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.deliveryNotes).toHaveLength(2);
  });

  it("No debe devolver albaranes de otro usuario", async () => {
    // user2 no tiene ninguno creado
    const res = await request(app)
      .get("/api/deliveryNote")
      .set("Authorization", `Bearer ${token2}`)
      .expect(200);

    expect(res.body.deliveryNotes).toHaveLength(0);
  });

  it("Error 401 si no se envía token", async () => {
    await request(app).get("/api/deliveryNote").expect(401);
  });
});

describe("GET /api/deliveryNote/:id - Obtener un albarán por ID", () => {
  it("Debe devolver el albarán si es creado por el usuario (200)", async () => {
    const res = await request(app)
      .get(`/api/deliveryNote/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.deliveryNote).toHaveProperty(
      "_id",
      deliveryNote._id.toString()
    );
    expect(res.body.deliveryNote).toHaveProperty(
      "description",
      "Albarán sin firma"
    );
  });

  it("Error 401 si no se envía token", async () => {
    await request(app).get(`/api/deliveryNote/${deliveryNote._id}`).expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .get("/api/deliveryNote/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("Error 404 si el albarán no existe o no pertenece al usuario", async () => {
    // Intenta con un albarán de user, pero con el token de user2
    await request(app)
      .get(`/api/deliveryNote/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token2}`)
      .expect(404);
  });
});

describe("GET /api/deliveryNote/pdf/:id - Descargar PDF del albarán", () => {
  it("Debe devolver un PDF si el albarán existe y es del usuario (200)", async () => {
    const res = await request(app)
      .get(`/api/deliveryNote/pdf/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("Error 403 si no eres el creador ni 'guest' invitado", async () => {
    // user2 no es creador ni invitado
    await request(app)
      .get(`/api/deliveryNote/pdf/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token2}`)
      .expect(403);
  });

  it("Error 404 si no existe el albarán", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await request(app)
      .get(`/api/deliveryNote/pdf/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});

describe("PATCH /api/deliveryNote/sign/:id - Firmar albarán", () => {
  it("Debe firmar el albarán si lo creó el usuario y se envía la imagen (200)", async () => {
    const imagePath = path.join(__dirname, "fixtures", "image.png");

    const res = await request(app)
      .patch(`/api/deliveryNote/sign/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", imagePath)
      .expect(200);

    expect(res.headers["content-type"]).toBe("application/pdf");

    // Verificamos en DB que se haya guardado la firma
    const updatedNote = await DeliveryNoteModel.findById(deliveryNote._id);
    expect(updatedNote.signature).toMatch(/ipfs/i);
    expect(updatedNote.pdfUrl).toMatch(/ipfs/i);
  });

  it("Error 400 si no se sube ninguna imagen", async () => {
    // No adjuntamos nada
    await request(app)
      .patch(`/api/deliveryNote/sign/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("Error 404 si el albarán no existe o no es tuyo", async () => {
    await request(app)
      .patch(`/api/deliveryNote/sign/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token2}`)
      .attach("image", path.join(__dirname, "fixtures", "image.png"))
      .expect(404);
  });
});

describe("DELETE /api/deliveryNote/:id - Eliminar albarán", () => {
  it("Debe eliminar (hard delete) un albarán sin firmar (200)", async () => {
    const res = await request(app)
      .delete(`/api/deliveryNote/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Albarán eliminado correctamente");

    // Verificamos que ya no existe en la DB
    const inDb = await DeliveryNoteModel.findById(deliveryNote._id);
    expect(inDb).toBeNull();
  });

  it("Error 403 si el albarán ya está firmado", async () => {
    await request(app)
      .delete(`/api/deliveryNote/${signedNote._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("Error 404 si no te pertenece o no existe", async () => {
    // Caso: no existe
    const fakeId = new mongoose.Types.ObjectId();
    await request(app)
      .delete(`/api/deliveryNote/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    // Caso: pertenece a otro user
    await request(app)
      .delete(`/api/deliveryNote/${deliveryNote._id}`)
      .set("Authorization", `Bearer ${token2}`)
      .expect(404);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .delete("/api/deliveryNote/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
