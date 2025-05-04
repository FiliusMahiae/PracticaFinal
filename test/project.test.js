/* project.test.js */
const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../app");
const ProjectModel = require("../models/Project");
const UserModel = require("../models/User");
const ClientModel = require("../models/Client");
const { tokenSign } = require("../utils/handleJwt");

let user, token, user2, token2;
let projectUser, projectCompany, projectOtherCif;
let clientCommon, clientOther;

/**
 * Antes de cada test, limpiamos las colecciones relevantes
 * y creamos los datos de prueba:
 *  - Dos usuarios (user, user2) que comparten el mismo cif "CIFGLOBAL123"
 *    y uno de ellos (user2) puede también crear proyectos con otro cif.
 *  - Varios proyectos, uno creado por user,
 *    otro por user2 con el mismo cif, y otro por user2 con cif diferente.
 *  - Clients, para cumplir con el campo "clientId" requerido en Project.
 */
beforeEach(async () => {
  await UserModel.deleteMany({});
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});

  // CIF compartido
  const cif = "CIFGLOBAL123";

  // Creamos el primer usuario
  user = await UserModel.create({
    email: "user1@test.com",
    password: "123456",
    role: "user",
    isAutonomo: false,
    company: { cif },
  });
  token = await tokenSign(user);

  // Segundo usuario de la misma empresa (mismo CIF)
  user2 = await UserModel.create({
    email: "user2@test.com",
    password: "654321",
    role: "user",
    isAutonomo: false,
    company: { cif },
  });
  token2 = await tokenSign(user2);

  // Creamos dos clientes distintos para relacionarlos con los proyectos
  clientCommon = await ClientModel.create({
    name: "Cliente Común",
    email: "clientecomun@test.com",
    cif,
    createdBy: user._id,
  });

  clientOther = await ClientModel.create({
    name: "Cliente Otro CIF",
    email: "clienteotrocif@test.com",
    cif: "OTROCIF999",
    createdBy: user2._id,
  });

  // Proyecto creado por user (cif = CIFGLOBAL123)
  projectUser = await ProjectModel.create({
    name: "Proyecto Usuario",
    projectCode: "PROJ-USER-001",
    email: "projuser@test.com",
    clientId: clientCommon._id,
    createdBy: user._id,
    companyCif: cif,
  });

  // Proyecto creado por user2 con el mismo cif
  projectCompany = await ProjectModel.create({
    name: "Proyecto Empresa",
    projectCode: "PROJ-EMP-002",
    email: "projemp@test.com",
    clientId: clientCommon._id,
    createdBy: user2._id,
    companyCif: cif,
  });

  // Proyecto creado por user2 con otro CIF, que user no debería ver
  projectOtherCif = await ProjectModel.create({
    name: "Proyecto Otro CIF",
    projectCode: "PROJ-OTRO-003",
    email: "projotro@test.com",
    clientId: clientOther._id,
    createdBy: user2._id,
    companyCif: "OTROCIF999",
  });
});

describe("POST /api/project - Crear proyecto", () => {
  it("Debe crear un proyecto correctamente (201)", async () => {
    const res = await request(app)
      .post("/api/project")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Proyecto Nuevo",
        projectCode: "PROJ-NEW-001",
        email: "proyectonuevo@test.com",
        clientId: clientCommon._id, // requerido
      })
      .expect(201);

    expect(res.body).toHaveProperty("message", "Proyecto creado correctamente");
    expect(res.body.project).toHaveProperty("name", "Proyecto Nuevo");
    expect(res.body.project).toHaveProperty("projectCode", "PROJ-NEW-001");
    expect(res.body.project).toHaveProperty("createdBy", user._id.toString());
  });

  it("Error 401 si no se envía token", async () => {
    await request(app)
      .post("/api/project")
      .send({
        name: "Proyecto sin token",
        projectCode: "PROJ-NO-TOKEN",
        email: "sinToken@test.com",
        clientId: clientCommon._id,
      })
      .expect(401);
  });

  it("Error 422 si faltan campos requeridos (ej. name)", async () => {
    const res = await request(app)
      .post("/api/project")
      .set("Authorization", `Bearer ${token}`)
      .send({
        // Falta name
        projectCode: "SIN-NAME",
        email: "project@test.com",
        clientId: clientCommon._id,
      })
      .expect(422);

    expect(res.body).toHaveProperty("errors");
  });

  it("Error 409 si ya existe un proyecto con el mismo name o projectCode", async () => {
    // projectUser tiene name = "Proyecto Usuario" y projectCode = "PROJ-USER-001"
    const res = await request(app)
      .post("/api/project")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Proyecto Usuario",
        projectCode: "PROJ-COLLISION-999",
        email: "collision@test.com",
        clientId: clientCommon._id,
      })
      .expect(409);

    expect(res.body).toHaveProperty(
      "message",
      "Ya existe un proyecto con ese nombre o código"
    );
  });

  it("Error 409 si coincide el projectCode pero el nombre es distinto", async () => {
    const res = await request(app)
      .post("/api/project")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Nuevo Nombre Distinto",
        projectCode: "PROJ-USER-001", // coincide con projectUser
        email: "samecode@test.com",
        clientId: clientCommon._id,
      })
      .expect(409);

    expect(res.body).toHaveProperty(
      "message",
      "Ya existe un proyecto con ese nombre o código"
    );
  });
});

describe("PUT /api/project/:id - Actualizar proyecto", () => {
  it("Debe actualizar correctamente un proyecto propio (200)", async () => {
    const res = await request(app)
      .put(`/api/project/${projectUser._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Proyecto Usuario Actualizado",
        address: { city: "Barcelona" },
      })
      .expect(200);

    expect(res.body.message).toBe("Proyecto actualizado correctamente");
    expect(res.body.project.name).toBe("Proyecto Usuario Actualizado");
    expect(res.body.project.address.city).toBe("Barcelona");
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .put("/api/project/1234")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cualquier" })
      .expect(400);
  });

  it("Error 404 si el proyecto no pertenece al usuario ni a su empresa", async () => {
    // Intentar actualizar un proyecto con otro cif (projectOtherCif)
    const res = await request(app)
      .put(`/api/project/${projectOtherCif._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Intentando hackear" })
      .expect(404);

    expect(res.body.message).toBe("Proyecto no encontrado o no autorizado");
  });

  it("Error 422 si fallan validaciones (ej. name requerido) al actualizar", async () => {
    const res = await request(app)
      .put(`/api/project/${projectUser._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "", // no válido si es requerido
      })
      .expect(422);

    expect(res.body).toHaveProperty("errors");
  });

  it("Error 401 si no se envía token", async () => {
    await request(app)
      .put(`/api/project/${projectUser._id}`)
      .send({ name: "Sin token" })
      .expect(401);
  });
});

describe("GET /api/project - Obtener lista de proyectos", () => {
  it("Debe devolver proyectos creados por el usuario o con su mismo cif", async () => {
    const res = await request(app)
      .get("/api/project")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // projectUser y projectCompany deben salir, projectOtherCif NO
    expect(res.body.projects.length).toBe(2);

    const nombres = res.body.projects.map((p) => p.name);
    expect(nombres).toContain("Proyecto Usuario");
    expect(nombres).toContain("Proyecto Empresa");
    expect(nombres).not.toContain("Proyecto Otro CIF");
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).get("/api/project").expect(401);
  });
});

describe("GET /api/project/one/:id - Obtener proyecto por ID", () => {
  it("Debe devolver un proyecto propio o de su empresa (200)", async () => {
    const res = await request(app)
      .get(`/api/project/one/${projectCompany._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.project).toHaveProperty("name", "Proyecto Empresa");
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).get(`/api/project/one/${projectUser._id}`).expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .get("/api/project/one/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("Error 404 si el proyecto no pertenece al usuario ni a su empresa", async () => {
    await request(app)
      .get(`/api/project/one/${projectOtherCif._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});

describe("DELETE /api/project/archive/:id - Soft delete de proyecto", () => {
  it("Debe archivar (soft delete) un proyecto propio o de su empresa", async () => {
    // Archivamos el proyecto del propio user
    const res = await request(app)
      .delete(`/api/project/archive/${projectUser._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Proyecto archivado correctamente");

    // Verificamos que el proyecto ahora tiene 'deleted'
    const projBorrado = await ProjectModel.findOneWithDeleted({
      _id: projectUser._id,
    });
    expect(projBorrado.deleted).toBe(true);
  });

  it("Error 404 si el proyecto no es de la empresa (otro CIF)", async () => {
    await request(app)
      .delete(`/api/project/archive/${projectOtherCif._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app)
      .delete(`/api/project/archive/${projectUser._id}`)
      .expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .delete("/api/project/archive/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("DELETE /api/project/:id - Hard delete de proyecto", () => {
  it("Debe eliminar permanentemente un proyecto propio o de su empresa (200)", async () => {
    const res = await request(app)
      .delete(`/api/project/${projectUser._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Proyecto eliminado permanentemente");
    const projEliminado = await ProjectModel.findById(projectUser._id);
    expect(projEliminado).toBeNull();
  });

  it("Error 404 si el proyecto es de otro CIF", async () => {
    await request(app)
      .delete(`/api/project/${projectOtherCif._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).delete(`/api/project/${projectUser._id}`).expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .delete("/api/project/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("GET /api/project/archive - Obtener proyectos archivados", () => {
  it("Debe devolver solo los proyectos archivados (soft deleted) propios o de la empresa", async () => {
    // Primero archivamos uno de los proyectos
    await ProjectModel.delete({ _id: projectCompany._id });

    const res = await request(app)
      .get("/api/project/archive")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Solo projectCompany fue archivado y comparte cif
    expect(res.body.projects.length).toBe(1);
    expect(res.body.projects[0]._id).toBe(projectCompany._id.toString());
    expect(res.body.projects[0].deleted).toBe(true);
  });

  it("Error 401 si no se proporciona token", async () => {
    await request(app).get("/api/project/archive").expect(401);
  });
});

describe("PATCH /api/project/restore/:id - Restaurar proyecto archivado", () => {
  it("Debe restaurar correctamente un proyecto archivado propio/empresa", async () => {
    // Archivamos projectUser
    await ProjectModel.delete({ _id: projectUser._id });

    const res = await request(app)
      .patch(`/api/project/restore/${projectUser._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Proyecto restaurado correctamente");
    const restored = await ProjectModel.findById(projectUser._id);
    expect(restored.deleted).toBeFalsy();
  });

  it("Error 404 si el proyecto es de otro CIF", async () => {
    // Archivamos un proyecto con otro cif
    await ProjectModel.delete({ _id: projectOtherCif._id });

    await request(app)
      .patch(`/api/project/restore/${projectOtherCif._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("Error 401 si no se proporciona token", async () => {
    // Archivamos projectUser
    await ProjectModel.delete({ _id: projectUser._id });

    await request(app)
      .patch(`/api/project/restore/${projectUser._id}`)
      .expect(401);
  });

  it("Error 400 si el ID es inválido", async () => {
    await request(app)
      .patch("/api/project/restore/1234")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
