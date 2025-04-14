const swaggerJsdoc = require("swagger-jsdoc");
const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Tracks - Express API with Swagger (OpenAPI 3.0)",
      version: "0.1.0",
      description:
        "This is a CRUD API application made with Express and documented with Swagger",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
      contact: {
        name: "u-tad",
        url: "https://u-tad.com",
        email: "sergio.mahiarello@gmail.com",
      },
    },
    servers: [{ url: "http://localhost:8080" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "usuario@ejemplo.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "contraseña123",
            },
            status: {
              type: "integer",
              example: 0,
            },
            role: {
              type: "string",
              example: "user",
            },
            verificationCode: {
              type: "string",
              example: "ABC123",
            },
            attempts: {
              type: "integer",
              example: 3,
            },
            name: {
              type: "string",
              example: "Juan",
            },
            surnames: {
              type: "string",
              example: "Pérez García",
            },
            nif: {
              type: "string",
              example: "12345678A",
            },
            address: {
              type: "object",
              properties: {
                street: {
                  type: "string",
                  example: "Calle Falsa",
                },
                number: {
                  type: "integer",
                  example: 123,
                },
                postal: {
                  type: "integer",
                  example: 28080,
                },
                city: {
                  type: "string",
                  example: "Madrid",
                },
                province: {
                  type: "string",
                  example: "Madrid",
                },
              },
            },
            company: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "Acme S.A.",
                },
                cif: {
                  type: "string",
                  example: "A12345678",
                },
                street: {
                  type: "string",
                  example: "Avenida Empresa",
                },
                number: {
                  type: "integer",
                  example: 45,
                },
                postal: {
                  type: "integer",
                  example: 28001,
                },
                city: {
                  type: "string",
                  example: "Barcelona",
                },
                province: {
                  type: "string",
                  example: "Barcelona",
                },
              },
            },
            logo: {
              type: "string",
              example: "https://miapp.com/uploads/logo.png",
            },
            passwordRecoveryCode: {
              type: "string",
              example: "RECOVERY123",
            },
          },
        },

        Project: {
          type: "object",
          required: ["name", "projectCode", "email", "clientId", "createdBy"],
          properties: {
            name: {
              type: "string",
              example: "Instalación de paneles solares",
            },
            projectCode: {
              type: "string",
              example: "PRJ-2024-001",
            },
            email: {
              type: "string",
              format: "email",
              example: "proyecto@empresa.com",
            },
            code: {
              type: "string",
              example: "CÓDIGO-OPCIONAL",
            },
            address: {
              type: "object",
              properties: {
                street: {
                  type: "string",
                  example: "Calle Sol",
                },
                number: {
                  type: "integer",
                  example: 42,
                },
                postal: {
                  type: "integer",
                  example: 28040,
                },
                city: {
                  type: "string",
                  example: "Madrid",
                },
                province: {
                  type: "string",
                  example: "Madrid",
                },
              },
            },
            clientId: {
              type: "string",
              format: "uuid",
              description: "ID del cliente (referencia al modelo Client)",
              example: "64bfa9d9133b5f001e0bba7f",
            },
            createdBy: {
              type: "string",
              format: "uuid",
              description: "ID del usuario creador (referencia al modelo User)",
              example: "64bfa9d9133b5f001e0bba7d",
            },
            companyCif: {
              type: "string",
              example: "A12345678",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T10:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T12:00:00.000Z",
            },
            deleted: {
              type: "boolean",
              example: false,
            },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
          },
        },
        Client: {
          type: "object",
          required: ["name", "email", "createdBy", "cif"],
          properties: {
            name: {
              type: "string",
              example: "Empresa Ejemplo S.L.",
            },
            email: {
              type: "string",
              format: "email",
              example: "contacto@empresa.com",
            },
            phone: {
              type: "string",
              example: "+34 600 123 456",
            },
            address: {
              type: "object",
              properties: {
                street: {
                  type: "string",
                  example: "Calle Mayor",
                },
                number: {
                  type: "integer",
                  example: 15,
                },
                postal: {
                  type: "integer",
                  example: 28001,
                },
                city: {
                  type: "string",
                  example: "Madrid",
                },
                province: {
                  type: "string",
                  example: "Madrid",
                },
              },
            },
            createdBy: {
              type: "string",
              format: "uuid",
              description:
                "ID del usuario que creó el cliente (referencia al modelo User)",
              example: "64bfa9d9133b5f001e0bba7d",
            },
            cif: {
              type: "string",
              example: "B12345678",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T10:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T12:00:00.000Z",
            },
            deleted: {
              type: "boolean",
              example: false,
            },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
          },
        },
        DeliveryNote: {
          type: "object",
          required: ["projectId", "createdBy"],
          properties: {
            projectId: {
              type: "string",
              format: "uuid",
              description: "ID del proyecto asociado (referencia a Project)",
              example: "64bfa9d9133b5f001e0bba7e",
            },
            createdBy: {
              type: "string",
              format: "uuid",
              description:
                "ID del usuario que creó la nota (referencia a User)",
              example: "64bfa9d9133b5f001e0bba7d",
            },
            description: {
              type: "string",
              example: "Revisión de instalación eléctrica",
            },
            workEntries: {
              type: "array",
              items: {
                type: "object",
                required: ["person", "hours"],
                properties: {
                  person: {
                    type: "string",
                    example: "Luis Martínez",
                  },
                  hours: {
                    type: "number",
                    example: 5.5,
                  },
                },
              },
            },
            materialEntries: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "quantity"],
                properties: {
                  name: {
                    type: "string",
                    example: "Cable coaxial",
                  },
                  quantity: {
                    type: "number",
                    example: 25,
                  },
                },
              },
            },
            date: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T09:00:00.000Z",
            },
            signature: {
              type: "string",
              example: "https://gateway.pinata.cloud/ipfs/Qm...Firma123.png",
            },
            pdfUrl: {
              type: "string",
              example: "https://gateway.pinata.cloud/ipfs/Qm...Albaran123.pdf",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T10:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-04-14T12:00:00.000Z",
            },
          },
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};
module.exports = swaggerJsdoc(options);
