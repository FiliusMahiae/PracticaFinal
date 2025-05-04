const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../app");
const UserModel = require("../models/User");
const ClientModel = require("../models/Client");
const { tokenSign } = require("../utils/handleJwt");

let user, token, otroUser;
let clientePropio, clienteEmpresa, clienteOculto;

beforeEach(async () => {
  await UserModel.deleteMany({});
  await ClientModel.deleteMany({});

  const cif = "CIFGLOBAL123";

  user = await UserModel.create({
    email: "user@test.com",
    password: "123456",
    role: "user",
    company: { cif },
  });
  token = await tokenSign(user);

  otroUser = await UserModel.create({
    email: "otro@test.com",
    password: "654321",
    company: { cif },
  });

  clientePropio = await ClientModel.create({
    name: "Cliente Propio",
    email: "propio@empresa.com",
    cif,
    createdBy: user._id,
  });

  clienteEmpresa = await ClientModel.create({
    name: "Cliente Empresa",
    email: "empresa@grupo.com",
    cif,
    createdBy: otroUser._id,
  });

  clienteOculto = await ClientModel.create({
    name: "Cliente Oculto",
    email: "oculto@otro.com",
    cif: "OTROCIF999",
    createdBy: otroUser._id,
  });
});

describe("POST /api/client - Crear cliente", () => {
  it("Debe crear un cliente correctamente", async () => {
    const res = await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cliente Uno",
        email: "cliente1@test.com",
        cif: "CIF-DEL-BODY-001",
      })
      .expect(201)
      .expect("Content-Type", /json/);

    expect(res.body).toHaveProperty("message", "Cliente creado correctamente");
    expect(res.body.client).toHaveProperty("name", "Cliente Uno");
    expect(res.body.client).toHaveProperty("cif", "CIF-DEL-BODY-001");
    expect(res.body.client).toHaveProperty(
      "createdBy._id",
      user._id.toString()
    );
  });

  it("Debe fallar sin token (401)", async () => {
    await request(app)
      .post("/api/client")
      .send({
        name: "Cliente Sin Token",
        email: "noauth@test.com",
        cif: "X12345678",
      })
      .expect(401);
  });

  it("Debe fallar si falta el nombre (422)", async () => {
    await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "faltaNombre@test.com",
        cif: "CIF123",
      })
      .expect(422);
  });

  it("Debe fallar si el email no es válido (422)", async () => {
    await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cliente Error Email",
        email: "noesunemail",
        cif: "CIF123",
      })
      .expect(422);
  });

  it("Debe fallar si falta el cif y el usuario no tiene uno (422)", async () => {
    user.company.cif = undefined;
    await user.save();
    const updatedToken = await tokenSign(user);

    await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${updatedToken}`)
      .send({
        name: "Cliente sin cif",
        email: "cliente3@test.com",
      })
      .expect(422);
  });
});

describe("PUT /api/client/:id - Actualizar cliente", () => {
  it("Debe actualizar correctamente el cliente", async () => {
    const res = await request(app)
      .put(`/api/client/${clientePropio._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cliente Actualizado",
        address: { city: "Madrid" },
      })
      .expect(200);

    expect(res.body.message).toBe("Cliente actualizado correctamente");
    expect(res.body.client.name).toBe("Cliente Actualizado");
    expect(res.body.client.address.city).toBe("Madrid");
  });

  it("Error 401 si no se envía token", async () => {
    await request(app)
      .put(`/api/client/${clientePropio._id}`)
      .send({ name: "Nuevo Nombre" })
      .expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .put("/api/client/1234")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nombre" })
      .expect(400);
  });

  it("Error 404 si el cliente no pertenece al usuario", async () => {
    const otroToken = await tokenSign(otroUser);

    await request(app)
      .put(`/api/client/${clientePropio._id}`)
      .set("Authorization", `Bearer ${otroToken}`)
      .send({ name: "Hackeado" })
      .expect(404);
  });

  it("Error 422 si el email es inválido", async () => {
    await request(app)
      .put(`/api/client/${clientePropio._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "noesunemail" })
      .expect(422);
  });
});

describe("GET /api/client - Obtener lista de clientes", () => {
  it("Debe devolver clientes creados por el usuario o con su mismo cif", async () => {
    const res = await request(app)
      .get("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.clients).toHaveLength(2);

    const nombres = res.body.clients.map((c) => c.name);
    expect(nombres).toContain("Cliente Propio");
    expect(nombres).toContain("Cliente Empresa");
    expect(nombres).not.toContain("Cliente Oculto");
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).get("/api/client").expect(401);
  });
});

describe("GET /api/client/:id - Obtener cliente por ID", () => {
  it("Debe devolver un cliente propio", async () => {
    const res = await request(app)
      .get(`/api/client/${clientePropio._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.client).toHaveProperty("name", "Cliente Propio");
  });

  it("Debe devolver un cliente de la misma empresa (por cif)", async () => {
    const res = await request(app)
      .get(`/api/client/${clienteEmpresa._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.client).toHaveProperty("name", "Cliente Empresa");
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).get(`/api/client/${clientePropio._id}`).expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .get("/api/client/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("Error 404 si el cliente no pertenece al usuario ni a su empresa", async () => {
    await request(app)
      .get(`/api/client/${clienteOculto._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});

describe("DELETE /api/client/archive/:id - Soft delete de cliente (solo si es del usuario)", () => {
  it("Debe archivar (soft delete) un cliente propio", async () => {
    const res = await request(app)
      .delete(`/api/client/archive/${clientePropio._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe(
      "Cliente archivado correctamente (soft delete)"
    );

    const clienteBorrado = await ClientModel.findOneWithDeleted({
      _id: clientePropio._id,
    });
    expect(clienteBorrado.deleted).toBe(true);
  });

  it("Error 404 si el cliente tiene el mismo cif pero no fue creado por el usuario", async () => {
    await request(app)
      .delete(`/api/client/archive/${clienteEmpresa._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 404 si el cliente no pertenece al usuario ni a su empresa", async () => {
    await request(app)
      .delete(`/api/client/archive/${clienteOculto._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app)
      .delete(`/api/client/archive/${clientePropio._id}`)
      .expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .delete("/api/client/archive/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("DELETE /api/client/:id - Hard delete de cliente (solo si es del usuario)", () => {
  it("Debe eliminar permanentemente un cliente propio", async () => {
    await request(app)
      .delete(`/api/client/${clientePropio._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const clienteBorrado = await ClientModel.findById(clientePropio._id);
    expect(clienteBorrado).toBeNull();
  });

  it("Error 404 si el cliente tiene el mismo cif pero no fue creado por el usuario", async () => {
    await request(app)
      .delete(`/api/client/${clienteEmpresa._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).delete(`/api/client/${clientePropio._id}`).expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .delete("/api/client/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("GET /api/client/archive - Obtener clientes archivados (soft deleted)", () => {
  it("Debe devolver solo los clientes archivados por el usuario", async () => {
    await ClientModel.delete({ _id: clientePropio._id });

    const res = await request(app)
      .get("/api/client/archive")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.clients).toHaveLength(1);
    expect(res.body.clients[0]._id).toBe(clientePropio._id.toString());
    expect(res.body.clients[0].deleted).toBe(true);
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).get("/api/client/archive").expect(401);
  });
});

describe("PATCH /api/client/restore/:id - Restaurar cliente archivado (solo si es del usuario)", () => {
  it("Debe restaurar correctamente un cliente archivado propio", async () => {
    await ClientModel.delete({ _id: clientePropio._id });

    const res = await request(app)
      .patch(`/api/client/restore/${clientePropio._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Cliente restaurado correctamente");

    const clienteRestaurado = await ClientModel.findById(clientePropio._id);
    expect(clienteRestaurado.deleted).toBeFalsy();
  });

  it("Error 404 si el cliente no pertenece al usuario", async () => {
    await ClientModel.delete({ _id: clienteEmpresa._id });

    await request(app)
      .patch(`/api/client/restore/${clienteEmpresa._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 401 si no se proporciona token", async () => {
    await ClientModel.delete({ _id: clientePropio._id });

    await request(app)
      .patch(`/api/client/restore/${clientePropio._id}`)
      .expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .patch("/api/client/restore/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
