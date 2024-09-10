const express = require("express");
const cors = require("cors");
const LegacyRouter = require("./Routes/LegacyRouter");
const SensorRouter = require("./Routes/SensorRouter");
const app = express();

const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "32mb" }));
app.use(express.json());

// Base URI and Router to map endpoints is initialized here
app.use("/api/v1", LegacyRouter);
app.use("/api/v2/sensors", SensorRouter);


// Serve Swagger documentation
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Saikawa Labs Air Quality Visualization API",
      version: "1.0.0",
      description:
        "An Express-based REST API that fetches and pushes air quality data to a Google Cloud SQL instance",
    },
    servers: [
      //{
        //url: "https://saikawalab-427516.uc.r.appspot.com/api/v1",
        //description: "Production Server",
      //},
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
    ],
  },
  apis: ["./Controllers/API.js", "./Routes/LegacyRouter.js", "./Controllers/Sensors.js", "./Routes/SensorRouter.js"],
};

const swaggerSpec = swaggerJsDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));



// Entry Point
app.get("/", (req, res) => {
  res.send("Welcome to Saikawa Labs Air Quality Visualization API");
});


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
