const request = require("supertest");
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const { tokenSign } = require("../utils/handleJwt");
const { app } = require("../app");
const UserModel = require("../models/User"); // Ajusta la ruta a tu modelo de usuario si es diferente
const path = require("path");

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

    const userFromDB = await UserModel.findOne({ email: "test@example.com" });
    expect(userFromDB.verificationCode).toBeDefined();
  });

  it("Rechazar registro sin email", async () => {
    await request(app)
      .post("/api/users/register")
      .send({
        password: "password123",
      })
      .expect(422);
  });

  it("Rechazar registro sin contraseña", async () => {
    await request(app)
      .post("/api/users/register")
      .send({
        email: "test@example.com",
      })
      .expect(422);
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

describe("Validación de email con código", () => {
  let user;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user = await UserModel.create({
      email: "test@example.com",
      password: await bcryptjs.hash("password123", 10),
      verificationCode: "123456",
      attempts: 3,
    });
  });

  it("Valida correctamente el email con el código correcto", async () => {
    const token = await tokenSign(user);

    const res = await request(app)
      .put("/api/users/validation")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "123456" })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body.message).toBe("Email validado correctamente");

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser.status).toBe(1);
    expect(updatedUser.verificationCode).toBeNull();
  });

  it("Código inválido - decrementa intentos y error 400", async () => {
    const token = await tokenSign(user);

    const res = await request(app)
      .put("/api/users/validation")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "000000" })
      .expect(400);

    expect(res.body.message).toContain("Quedan 2 intentos");

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser.attempts).toBe(2);
  });

  it("Código inválido - sin intentos restantes, error 403", async () => {
    user.attempts = 1;
    await user.save();
    const token = await tokenSign(user);

    const res = await request(app)
      .put("/api/users/validation")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "000000" })
      .expect(403);

    expect(res.body.message).toBe("Número máximo de intentos alcanzado");

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser.attempts).toBe(0);
  });

  it("Error 422 si no se envía código", async () => {
    const token = await tokenSign(user);

    await request(app)
      .put("/api/users/validation")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(422);
  });

  it("Error 422 si el código no tiene 6 dígitos", async () => {
    const token = await tokenSign(user);

    await request(app)
      .put("/api/users/validation")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "abc" })
      .expect(422);
  });

  it("Error 404 si el usuario no existe", async () => {
    const fakeUser = new UserModel({
      email: "ghost@example.com",
      password: "irrelevant",
      verificationCode: "123456",
    });
    const token = await tokenSign(fakeUser); // token con ID válido pero que no está en DB

    await UserModel.deleteMany({}); // elimina todos

    const res = await request(app)
      .put("/api/users/validation")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "123456" })
      .expect(404);

    expect(res.body.message).toBe("Usuario no encontrado");
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

  it("Login - falta el email", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ password: "password123" })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Login - falta la contraseña", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com" })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Login - email mal formado", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "not-an-email", password: "password123" })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Login - contraseña muy corta", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "123" })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });
});

describe("Actualización de datos personales", () => {
  let user;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany({});

    user = await UserModel.create({
      email: "test@example.com",
      password: await bcryptjs.hash("password123", 10),
    });

    token = await tokenSign(user);
  });

  it("Actualiza correctamente los datos personales", async () => {
    const res = await request(app)
      .put("/api/users/onboarding/personal")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Juan",
        apellidos: "Pérez",
        nif: "12345678A",
        address: {
          street: "Calle Falsa",
          number: 123,
          postal: 28080,
          city: "Madrid",
          province: "Madrid",
        },
      })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body.message).toBe(
      "Datos personales actualizados correctamente"
    );
    expect(res.body.user.name).toBe("Juan");
    expect(res.body.user.address.city).toBe("Madrid");
  });

  it("Error 404 si el usuario no existe", async () => {
    await UserModel.deleteMany();
    const res = await request(app)
      .put("/api/users/onboarding/personal")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Juan",
        apellidos: "Pérez",
        nif: "12345678A",
        address: {
          street: "Calle Falsa",
          number: 123,
          postal: 28080,
          city: "Madrid",
          province: "Madrid",
        },
      })
      .expect(404);

    expect(res.body.message).toBe("Usuario no encontrado");
  });

  it("Error 422 si falta un campo obligatorio", async () => {
    const res = await request(app)
      .put("/api/users/onboarding/personal")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "",
        apellidos: "Pérez",
        nif: "12345678A",
        address: {
          street: "Calle Falsa",
          number: 123,
          postal: 28080,
          city: "Madrid",
          province: "Madrid",
        },
      })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Error 422 si el número de dirección no es entero", async () => {
    const res = await request(app)
      .put("/api/users/onboarding/personal")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Juan",
        apellidos: "Pérez",
        nif: "12345678A",
        address: {
          street: "Calle Falsa",
          number: "no-es-numero",
          postal: 28080,
          city: "Madrid",
          province: "Madrid",
        },
      })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it("Error 422 si falta el campo address", async () => {
    const res = await request(app)
      .put("/api/users/onboarding/personal")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Juan",
        apellidos: "Pérez",
        nif: "12345678A",
        // sin address
      })
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });
});

describe("Actualización de datos de la compañía", () => {
  let user;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany();

    user = await UserModel.create({
      email: "empresa@example.com",
      password: await bcryptjs.hash("password123", 10),
      name: "Empresa",
      surnames: "S.L.",
      nif: "B12345678",
      address: {
        street: "Calle Central",
        number: 10,
        postal: 28001,
        city: "Madrid",
        province: "Madrid",
      },
      role: "user",
    });

    token = await tokenSign(user);
  });

  it("Actualiza correctamente los datos de compañía (usuario normal)", async () => {
    const res = await request(app)
      .patch("/api/users/onboarding/company")
      .set("Authorization", `Bearer ${token}`)
      .send({
        companyName: "Mi Empresa S.A.",
        cif: "B98765432",
        street: "Gran Vía",
        number: 42,
        postal: 28013,
        city: "Madrid",
        province: "Madrid",
      })
      .expect(200);

    expect(res.body.message).toBe(
      "Datos de la compañía actualizados correctamente"
    );
    expect(res.body.company.name).toBe("Mi Empresa S.A.");
    expect(res.body.company.cif).toBe("B98765432");
  });

  it("Actualiza correctamente datos de compañía si el usuario es autonomo (sin body)", async () => {
    const autonomo = await UserModel.create({
      email: "autonomo@example.com",
      password: await bcryptjs.hash("password123", 10),
      name: "Ana",
      surnames: "López",
      nif: "12345678Z",
      isAutonomo: true,
      address: {
        street: "Calle Libre",
        number: 7,
        postal: 29000,
        city: "Málaga",
        province: "Málaga",
      },
    });

    const tokenAutonomo = await tokenSign(autonomo);

    const res = await request(app)
      .patch("/api/users/onboarding/company")
      .set("Authorization", `Bearer ${tokenAutonomo}`)
      .send({}) // cuerpo vacío
      .expect(200);

    expect(res.body.company.name).toBe("Ana López");
    expect(res.body.company.cif).toBe("12345678Z");
    expect(res.body.company.city).toBe("Málaga");
  });

  it("Error 422 si faltan campos requeridos (usuario no autonomo)", async () => {
    const res = await request(app)
      .patch("/api/users/onboarding/company")
      .set("Authorization", `Bearer ${token}`)
      .send({
        companyName: "",
        cif: "",
        street: "",
        number: null,
        postal: null,
        city: "",
        province: "",
      })
      .expect(422);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("Error 404 si el usuario no existe", async () => {
    await UserModel.deleteMany(); // Elimina al usuario antes del request

    const res = await request(app)
      .patch("/api/users/onboarding/company")
      .set("Authorization", `Bearer ${token}`)
      .send({
        companyName: "Empresa Fantasma",
        cif: "X0000000X",
        street: "Desconocida",
        number: 1,
        postal: 10000,
        city: "Nowhere",
        province: "Desierto",
      })
      .expect(404);

    expect(res.body.error).toBe("Usuario no encontrado");
  });
});

describe("Actualización del logo de usuario", () => {
  let user;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany();

    user = await UserModel.create({
      email: "logo@example.com",
      password: await bcryptjs.hash("password123", 10),
    });

    token = await tokenSign(user);
  });

  it("Sube y actualiza el logo correctamente", async () => {
    const imagePath = path.join(__dirname, "fixtures", "image.png");

    const res = await request(app)
      .patch("/api/users/logo")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", imagePath)
      .expect(200);

    expect(res.body.message).toBe("Logo actualizado correctamente");
    expect(res.body.logo).toContain("https://");
    expect(res.body.logo).toContain("/ipfs/");

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser.logo).toBe(res.body.logo);
  });

  it("Error 400 si no se envía ninguna imagen", async () => {
    const res = await request(app)
      .patch("/api/users/logo")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(res.body.message).toBe("No se ha proporcionado ninguna imagen");
  });
});

describe("Obtener perfil de usuario (/api/users/me)", () => {
  let user;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany();

    user = await UserModel.create({
      email: "profile@example.com",
      password: await bcryptjs.hash("password123", 10),
      name: "Nombre",
      surnames: "Apellido",
    });

    token = await tokenSign(user);
  });

  it("Error el perfil del usuario autenticado", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("profile@example.com");
    expect(res.body.user.name).toBe("Nombre");
  });

  it("Error 404 si el usuario no existe", async () => {
    await UserModel.deleteMany(); // eliminamos el usuario

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.message).toBe("Usuario no encontrado");
  });

  it("Error 401 si no se envía token", async () => {
    const res = await request(app).get("/api/users/me").expect(401);

    expect(res.body.error).toBe("Token no proporcionado");
  });

  it("Error 401 si el token es inválido", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer token-falso")
      .expect(401);

    expect(res.body.error).toBe("Token inválido");
  });
});

describe("Eliminar usuario (/api/users)", () => {
  let user;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany();

    user = await UserModel.create({
      email: "delete@example.com",
      password: await bcryptjs.hash("password123", 10),
    });

    token = await tokenSign(user);
  });

  it("Elimina el usuario con soft delete por defecto", async () => {
    const res = await request(app)
      .delete("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Usuario eliminado (soft delete)");

    const softDeletedUser = await UserModel.findOneWithDeleted({
      _id: user._id,
    });
    expect(softDeletedUser.deleted).toBe(true);
  });

  it("Elimina el usuario con hard delete cuando soft=false", async () => {
    const res = await request(app)
      .delete("/api/users?soft=false")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe("Usuario eliminado (hard delete)");

    const deletedUser = await UserModel.findById(user._id);
    expect(deletedUser).toBeNull();
  });

  it("Error 404 si se intenta eliminar un usuario inexistente (soft)", async () => {
    await UserModel.deleteOne({ _id: user._id }); // hard delete = ya no existe

    const res = await request(app)
      .delete("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.message).toBe("Usuario no encontrado");
  });

  it("Error 404 si se intenta eliminar un usuario inexistente (hard)", async () => {
    await UserModel.deleteOne({ _id: user._id });

    const res = await request(app)
      .delete("/api/users?soft=false")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.message).toBe("Usuario no encontrado");
  });

  it("Error 401 si no se envía token", async () => {
    const res = await request(app).delete("/api/users").expect(401);

    expect(res.body.error).toBe("Token no proporcionado");
  });
});

describe("Invitación de usuario (/api/users/invite)", () => {
  let inviter;
  let token;

  beforeEach(async () => {
    await UserModel.deleteMany();

    inviter = await UserModel.create({
      email: "admin@example.com",
      password: await bcryptjs.hash("password123", 10),
      role: "user",
      nif: "B12345678",
      company: {
        name: "Mi Empresa",
        cif: "B12345678",
        street: "Calle Empresa",
        number: 1,
        postal: 28080,
        city: "Madrid",
        province: "Madrid",
      },
    });

    token = await tokenSign(inviter);
  });

  it("Invita correctamente a un nuevo usuario", async () => {
    const res = await request(app)
      .post("/api/users/invite")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "nuevo@ejemplo.com" })
      .expect(200);

    expect(res.body.message).toBe("Usuario invitado correctamente");
    expect(res.body.tempPassword).toBeDefined();

    const invitedUser = await UserModel.findOne({ email: "nuevo@ejemplo.com" });
    expect(invitedUser).toBeDefined();
    expect(invitedUser.role).toBe("guest");
    expect(invitedUser.companyOwner.toString()).toBe(inviter._id.toString());
  });

  it("El invitado ve los datos de la compañía del invitador en su perfil", async () => {
    const invitedUser =
      (await UserModel.findOne({ email: "nuevo@ejemplo.com" })) ||
      (await request(app)
        .post("/api/users/invite")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "nuevo@ejemplo.com" })
        .then(() => UserModel.findOne({ email: "nuevo@ejemplo.com" })));

    const invitedToken = await tokenSign(invitedUser);

    const resProfile = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${invitedToken}`)
      .expect(200);

    expect(resProfile.body.user.company.cif).toBe("B12345678");
    expect(resProfile.body.user.company.name).toBe("Mi Empresa");
    expect(resProfile.body.user.company.street).toBe("Calle Empresa");
  });

  it("Error 400 si no se proporciona el email", async () => {
    const res = await request(app)
      .post("/api/users/invite")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);

    expect(res.body.message).toBe("El email es obligatorio");
  });

  it("Error 409 si el email ya existe", async () => {
    await UserModel.create({
      email: "yaexiste@ejemplo.com",
      password: await bcryptjs.hash("otra1234", 10),
    });

    const res = await request(app)
      .post("/api/users/invite")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "yaexiste@ejemplo.com" })
      .expect(409);

    expect(res.body.message).toBe("El usuario ya existe");
  });

  it("Error 404 si el invitador no existe", async () => {
    await UserModel.deleteMany();

    const res = await request(app)
      .post("/api/users/invite")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "nuevo@ejemplo.com" })
      .expect(404);

    expect(res.body.message).toBe("Invitador no encontrado");
  });

  it("Error 401 si no se envía token", async () => {
    const res = await request(app)
      .post("/api/users/invite")
      .send({ email: "nuevo@ejemplo.com" })
      .expect(401);

    expect(res.body.error).toBe("Token no proporcionado");
  });

  it("Error 401 si el token es inválido", async () => {
    const res = await request(app)
      .post("/api/users/invite")
      .set("Authorization", "Bearer token-falso")
      .send({ email: "nuevo@ejemplo.com" })
      .expect(401);

    expect(res.body.error).toBe("Token inválido");
  });
});

describe("Recuperación de contraseña (/recover)", () => {
  let user;
  let recoveryToken;
  let recoveryCode;

  beforeEach(async () => {
    await UserModel.deleteMany();

    user = await UserModel.create({
      email: "recover@example.com",
      password: await bcryptjs.hash("password123", 10),
    });
  });

  it("Solicita recuperación y luego resetea la contraseña correctamente", async () => {
    // Paso 1: Solicitud
    const resRequest = await request(app)
      .post("/api/users/recover/request")
      .send({ email: user.email })
      .expect(200);

    expect(resRequest.body.message).toBe("Código de recuperación enviado");
    expect(resRequest.body.recoveryToken).toBeDefined();

    recoveryToken = resRequest.body.recoveryToken;

    const updatedUser = await UserModel.findOne({ email: user.email });
    recoveryCode = updatedUser.passwordRecoveryCode;
    expect(recoveryCode).toHaveLength(6);

    // Paso 2: Reset
    const resReset = await request(app)
      .put("/api/users/recover/reset")
      .set("Authorization", `Bearer ${recoveryToken}`)
      .send({
        code: recoveryCode,
        newPassword: "nuevaSegura123",
      })
      .expect(200);

    expect(resReset.body.message).toBe("Contraseña actualizada correctamente");

    const finalUser = await UserModel.findOne({ email: user.email });
    expect(finalUser.passwordRecoveryCode).toBe("");

    const passwordMatch = await bcryptjs.compare(
      "nuevaSegura123",
      finalUser.password
    );
    expect(passwordMatch).toBe(true);
  });

  it("Error 400 si el código es incorrecto al resetear", async () => {
    const resRequest = await request(app)
      .post("/api/users/recover/request")
      .send({ email: user.email })
      .expect(200);

    recoveryToken = resRequest.body.recoveryToken;

    const resReset = await request(app)
      .put("/api/users/recover/reset")
      .set("Authorization", `Bearer ${recoveryToken}`)
      .send({
        code: "000000",
        newPassword: "otra123456",
      })
      .expect(400);

    expect(resReset.body.message).toBe("Código incorrecto");
  });

  it("Error 404 si el email no existe en la solicitud", async () => {
    const res = await request(app)
      .post("/api/users/recover/request")
      .send({ email: "noexiste@example.com" })
      .expect(404);

    expect(res.body.message).toBe("Usuario no encontrado");
  });

  it("Error 404 si el usuario ya no existe en el reset", async () => {
    const resRequest = await request(app)
      .post("/api/users/recover/request")
      .send({ email: user.email });

    recoveryToken = resRequest.body.recoveryToken;

    await UserModel.deleteMany();

    const resReset = await request(app)
      .put("/api/users/recover/reset")
      .set("Authorization", `Bearer ${recoveryToken}`)
      .send({
        code: "123456",
        newPassword: "otra123456",
      })
      .expect(404);

    expect(resReset.body.message).toBe("Usuario no encontrado");
  });

  it("Error 401 si no se envía token al resetear", async () => {
    await request(app)
      .put("/api/users/recover/reset")
      .send({
        code: "123456",
        newPassword: "otra123456",
      })
      .expect(401);
  });

  it("Error 401 si el token de recuperación es inválido", async () => {
    await request(app)
      .put("/api/users/recover/reset")
      .set("Authorization", "Bearer token-falso")
      .send({
        code: "123456",
        newPassword: "otra123456",
      })
      .expect(401);
  });
});
