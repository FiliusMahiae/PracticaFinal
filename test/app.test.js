const request = require("supertest");
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const { app, server } = require("../app");
const UserModel = require("../models/User"); // Ajusta la ruta a tu modelo de usuario si es diferente

beforeAll(async () => {
  await mongoose.connection.once("connected", () => {});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Registro de usuario", () => {
  beforeEach(async () => {
    // Limpia los usuarios antes de cada test
    await UserModel.deleteMany({});
  });

  it("Registrar un usuario válido", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        email: "test@example.com",
        password: "password123",
      })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("Rechazar un email inválido (422)", async () => {
    await request(app)
      .post("/api/users/register")
      .send({
        email: "invalid-email",
        password: "password123",
      })
      .expect(422);
  });

  it("Rechazar una contraseña demasiado corta (422)", async () => {
    await request(app)
      .post("/api/users/register")
      .send({
        email: "test2@example.com",
        password: "short",
      })
      .expect(422);
  });

  it("Rechazar un email duplicado (409)", async () => {
    // Crea el usuario primero
    await UserModel.create({
      email: "test@example.com",
      password: "password123",
    });

    // Intenta registrarlo de nuevo
    await request(app)
      .post("/api/users/register")
      .send({
        email: "test@example.com",
        password: "anotherpass123",
      })
      .expect(409);
  });
});

describe("Login de usuarios", () => {
  beforeAll(async () => {
    await UserModel.deleteMany({});

    const passwordCrypt = await bcryptjs.hash("password123", 10);
    // Creamos el usuario para testear el login
    await UserModel.create({
      email: "test@example.com",
      password: passwordCrypt,
    });
  });

  it("Login - OK", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({
        email: "test@example.com",
        password: "password123",
      })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("Login - email inexistente", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({
        email: "noexiste@example.com",
        password: "password123",
      })
      .expect(400);

    expect(res.body.message).toBe("Credenciales incorrectas");
  });

  it("Login - contraseña incorrecta", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({
        email: "test@example.com",
        password: "wrongpassword",
      })
      .expect(400);

    expect(res.body.message).toBe("Credenciales incorrectas");
  });
});
