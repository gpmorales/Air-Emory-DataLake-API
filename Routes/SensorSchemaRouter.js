// Handles Sensor Schema Endpoint Routing
const express = require("express");
const SensorSchemaRouter = express.Router();

const {
    getAllSensorSchemas,
    addSensorSchema,
    getSensorSchema,
    downloadSensorReadings,
    // updateSensorSchema // TODO
} = require("../Controllers/SensorSchemas.js");


/**
 * @swagger
 * /api/v2/sensor-schemas:
 *   get:
 *     summary: Retrieve all sensors schemas 
 *     description: Fetch an array of all uploaded sensor data tables.
 *     tags:
 *       - Sensor Schemas
 *     responses:
 *       200:
 *         description: An array of sensors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sensor_id:
 *                     type: string
 *                     description: Unique identifier for the sensor
 *                   sensor_brand:
 *                     type: string
 *                     description: Brand of the sensor
 *                   sensor_table_name:
 *                     type: string
 *                     description: Table name for the sensor data table
 *                   sensor_data_schema:
 *                     type: object
 *                     description: Schema for the sensors data
 *                   measurement_type:
 *                     type: string
 *                     description: Type of measurement the sensor performs
 *                   measurement_time_interval:
 *                     type: string
 *                     description: Time interval for sensor readings
 *       500:
 *         description: Server error
 */
SensorSchemaRouter.route("").get(getAllSensorSchemas);


/**
 * @swagger
 * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}/{measurement_type}/{measurement_time_interval}:
 *   post:
 *     summary: Add a new sensor measurement table
 *     description: Adds a new sensor measurement table to the system. 
 *     tags:
 *       - Sensor Schemas
 *     parameters:
 *       - in: path
 *         name: sensor_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier for the sensor
 *       - in: path
 *         name: sensor_brand
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand of the sensor
 *       - in: path
 *         name: measurement_type
 *         required: true
 *         schema:
 *           type: string
 *         description: This measurements air quality metric type (RAW or CORRECTED)
 *       - in: path
 *         name: measurement_time_interval
 *         required: true
 *         schema:
 *           type: string
 *         description: The measurements recorded time interval (HOURLY, DAILY, or NIETHER) 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sensor_data_schema:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Schema for the sensor's data table. Keys are column names, values are data types.
 *                 example:
 *                   temperature: "float"
 *                   humidity: "float"
 *                   timestamp: "datetime"
 *     responses:
 *       201:
 *         description: Sensor successfully added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sensor successfully added
 *                 sensor_id:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
SensorSchemaRouter.post(
  "/:sensor_brand/:sensor_id/:measurement_type/:measurement_time_interval", addSensorSchema);


/**
 * @swagger
 * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}:
 *   get:
 *     summary: Retrieve the schemas associated with that sensor
 *     description: Fetches an array of all data tables associated with sensor.
 *     tags:
 *       - Sensor Schemas
 *     responses:
 *       200:
 *         description: An array of sensors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sensor_id:
 *                     type: string
 *                     description: Unique identifier for the sensor
 *                   sensor_brand:
 *                     type: string
 *                     description: Brand of the sensor
 *                   sensor_table_name:
 *                     type: string
 *                     description: Name for the sensor data table
 *                   sensor_data_schema:
 *                     type: object
 *                     description: Schema for the sensors data table
 *                   measurement_type:
 *                     type: string
 *                     description: Type of measurement the sensor performs
 *                   measurement_time_interval:
 *                     type: string
 *                     description: Time interval for sensor readings
 *       500:
 *         description: Server error
 */
SensorSchemaRouter.route("/:sensor_brand/:sensor_id").get(getSensorSchema);


/**
 * @swagger
 * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}/{measurement_type}/{measurement_time_interval}:
 *   get:
 *     summary: Download an entire sensor's data as a CSV file
 *     description: Fetches sensor measurement data based on specified parameters and returns it as a downloadable CSV file.
 *     tags:
 *       - Sensor Schemas
 *     parameters:
 *       - in: path
 *         name: sensor_brand
 *         required: true
 *         schema:
 *           type: string
 *         description: The brand of the sensor.
 *       - in: path
 *         name: sensor_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier for the sensor.
 *       - in: path
 *         name: measurement_type
 *         required: true
 *         schema:
 *           type: string
 *         description: Type of measurement the sensor performs (e.g., RAW or CORRECTED).
 *       - in: path
 *         name: time_interval
 *         required: true
 *         schema:
 *           type: string
 *         description: The time interval of the measurements (e.g., HOURLY, DAILY, or NEITHER).
 *     responses:
 *       200:
 *         description: Sensor data successfully retrieved and returned as CSV.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *               description: CSV file containing the sensor data.
 *       400:
 *         description: Invalid input or no data found for the specified sensor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No data found for the specified sensor.
 *       500:
 *         description: Server error while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error processing your request.
 */
SensorSchemaRouter.route("/:sensor_brand/:sensor_id/:measurement_type/:measurement_time_interval").get(downloadSensorReadings);


module.exports = SensorSchemaRouter;
