const request = require("supertest");
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const { app } = require("../app");

const UserModel = require("../models/User");
const ClientModel = require("../models/Client");
const { tokenSign } = require("../utils/handleJwt");

beforeAll(async () => {
  await mongoose.connection.once("connected", () => {});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Crear cliente", () => {
  let user;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany();
    await ClientModel.deleteMany();

    user = await UserModel.create({
      email: "vendedor@example.com",
      password: await bcryptjs.hash("password123", 10),
      role: "user",
      company: {
        name: "Empresa S.L.",
        cif: "B12345678",
        city: "Madrid",
        province: "Madrid",
      },
    });

    token = await tokenSign(user);
  });

  it("Crea un cliente correctamente", async () => {
    const res = await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Juan Pérez",
        email: "juanperez@example.com",
        phone: "600123123",
        address: {
          street: "Calle Real",
          number: 10,
          postal: 28080,
          city: "Madrid",
          province: "Madrid",
        },
      })
      .expect(201);

    expect(res.body.message).toBe("Cliente creado correctamente");
    expect(res.body.client.name).toBe("Juan Pérez");
    expect(res.body.client.createdBy).toBe(user._id.toString());

    const clientInDb = await ClientModel.findOne({
      email: "juanperez@example.com",
    });
    expect(clientInDb).not.toBeNull();
    expect(clientInDb.createdBy.toString()).toBe(user._id.toString());
  });

  it("Error 422 si falta el nombre", async () => {
    const res = await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "cliente@example.com" })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Error 422 si el email es inválido", async () => {
    const res = await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cliente sin email válido", email: "noesemail" })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Error 401 si no se envía token", async () => {
    await request(app)
      .post("/api/client")
      .send({ name: "Cliente sin token", email: "cliente@example.com" })
      .expect(401);
  });

  it("Error 401 si el token es inválido", async () => {
    await request(app)
      .post("/api/client")
      .set("Authorization", "Bearer token-falso")
      .send({
        name: "Cliente con token inválido",
        email: "cliente@example.com",
      })
      .expect(401);
  });
});

describe("Actualización de cliente", () => {
  let user;
  let token;
  let client;

  beforeEach(async () => {
    await UserModel.deleteMany();
    await ClientModel.deleteMany();

    user = await UserModel.create({
      email: "modificador@example.com",
      password: await bcryptjs.hash("password123", 10),
    });

    token = await tokenSign(user);

    client = await ClientModel.create({
      name: "Cliente Original",
      email: "original@example.com",
      phone: "600000000",
      createdBy: user._id,
    });
  });

  it("Actualiza correctamente un cliente propio", async () => {
    const res = await request(app)
      .put(`/api/client/${client._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cliente Modificado",
        email: "nuevo@example.com",
        phone: "611111111",
      })
      .expect(200);

    expect(res.body.message).toBe("Cliente actualizado correctamente");
    expect(res.body.client.name).toBe("Cliente Modificado");
    expect(res.body.client.email).toBe("nuevo@example.com");
  });

  it("Devuelve 400 si el ID no es válido", async () => {
    const res = await request(app)
      .put("/api/client/id-invalido")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nombre" })
      .expect(400);

    expect(res.body.message).toBe("ID de cliente inválido");
  });

  it("Devuelve 404 si el cliente no existe", async () => {
    const idFalso = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/client/${idFalso}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nombre" })
      .expect(404);

    expect(res.body.message).toBe("Cliente no encontrado o no autorizado");
  });

  it("Devuelve 404 si el cliente no es del usuario", async () => {
    const otroUsuario = await UserModel.create({
      email: "otro@example.com",
      password: "12345678",
    });

    const otroToken = await tokenSign(otroUsuario);

    const res = await request(app)
      .put(`/api/client/${client._id}`)
      .set("Authorization", `Bearer ${otroToken}`)
      .send({ name: "Intento no autorizado" })
      .expect(404);

    expect(res.body.message).toBe("Cliente no encontrado o no autorizado");
  });

  it("Devuelve 401 si no se envía token", async () => {
    await request(app)
      .put(`/api/client/${client._id}`)
      .send({ name: "Sin token" })
      .expect(401);
  });
});
