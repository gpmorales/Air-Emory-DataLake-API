const express = require("express");
const SensorRouter = require("./Routes/SensorRouter.js");
const SensorSchemaRouter = require("./Routes/SensorSchemaRouter.js");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "32mb" }));
app.use(express.json());

// Base URI and Router to map endpoints is initialized here
app.use("/api/v2/sensors", SensorRouter);
app.use("/api/v2/sensor-schemas", SensorSchemaRouter);
app.use("/api/v2/readings", SensorSchemaRouter);

// Serve Swagger documentation
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Saikawa Labs AWS-RDS Air Quality API",
      version: "1.0.0",
      description:
        "An Express-based REST API that fetches and pushes air quality data to a AWS RDS MySQL instance",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
    ],
    tags: [
      {
        name: "Sensors",
        description: "API endpoints for sensor operations"
      },
      {
        name: "Sensor Schemas",
        description: "API endpoints for sensor schema operations"
      },
      {
        name: "Readings",
        description: "API endpoints for sensor data operations"
      }
    ],
  },
  apis: [
    "./Routes/SensorRouter.js", 
    "./Routes/SensorSchemaRouter.js",
    "./Routes/MeasurementRouter.js"
  ],
};

const swaggerSpec = swaggerJsDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Entry Point
async function StartServer() {
  try {
    app.listen(PORT, () => {
      console.log("\n Listening to Port " + PORT + " ...\n");
    });
  } catch (err) {
    console.error('Error starting server:', err);
  }
}

StartServer();
