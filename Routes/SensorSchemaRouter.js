// Handles Sensor Schema Endpoint Routing
const express = require("express");
const SensorSchemaRouter = express.Router();

const {
    getAllSchemas,
    addSensorSchema,
    getSensorSchemas,
    getSensorMeasurementTableSchema, // TODO
    //updateSensorSchema,
    downloadSensorReadings,
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
 *                     description: Unique identifier for the sensor (Serial Number)
 *                   sensor_brand:
 *                     type: string
 *                     description: Brand of the sensor
 *                   sensor_table_name:
 *                     type: string
 *                     description: Table name for the sensor data table
 *                   sensor_data_schema:
 *                     type: object
 *                     description: Schema for the sensors data
 *                   measurement_model:
 *                     type: string
 *                     description: The name of the model applied to the measurements (this ONLY applies to CORRECTED data) 
 *                   measurement_type:
 *                     type: string
 *                     description: Type of measurement the sensor performs
 *                   measurement_time_interval:
 *                     type: string
 *                     description: Time interval for sensor readings
 *       500:
 *         description: Server error
 */
SensorSchemaRouter.route("").get(getAllSchemas);


/**
 * @swagger
 * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}/{measurement_type}/{measurement_time_interval}/{measurement_model?}:
 *   post:
 *     summary: Add a new sensor measurement table
 *     description: Adds a new sensor measurement table to the system. 
 *     tags:
 *       - Sensor Schemas
 *     parameters:
 *       - in: path
 *         name: sensor_brand
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand of the sensor
 *       - in: path
 *         name: sensor_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier for the sensor (Serial Number)
 *       - in: path
 *         name: measurement_model
 *         required: false
 *         schema:
 *           type: string
 *         description: The name of the model applied to the measurements (this ONLY applies to CORRECTED data) 
 *       - in: path
 *         name: measurement_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [RAW, CORRECTED, raw, corrected]
 *         description: This measurements air quality metric type (RAW or CORRECTED)
 *       - in: path
 *         name: measurement_time_interval
 *         required: true
 *         schema:
 *           type: string
 *           enum: [HOURLY, DAILY, NIETHER, daily, hourly, neither]
 *         description: The measurements recorded time interval (HOURLY, DAILY, or NIL if RAW data) 
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
  "/:sensor_brand/:sensor_id/:measurement_type/:measurement_time_interval/:measurement_model?", addSensorSchema);


/**
 * @swagger
 * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}:
 *   get:
 *     summary: Retrieve the schemas associated with a specific sensor
 *     description: Fetches an array of all data tables associated with the specified sensor.
 *     tags:
 *       - Sensor Schemas
 *     parameters:
 *       - in: path
 *         name: sensor_brand
 *         required: true
 *         schema:
 *           type: string
 *         description: The brand of the sensor
 *       - in: path
 *         name: sensor_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier for the sensor (Serial Number)
 *     responses:
 *       200:
 *         description: An array of sensor schemas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sensor_id:
 *                     type: string
 *                     description: Unique identifier for the sensor (Serial Number)
 *                   sensor_brand:
 *                     type: string
 *                     description: Brand of the sensor
 *                   measurement_table_name:
 *                     type: string
 *                     description: Name of the sensor data table
 *                   measurement_table_schema:
 *                     type: object
 *                     description: Schema for the sensor's data table
 *                   measurement_type:
 *                     type: string
 *                     description: Type of measurement the sensor performs
 *                   measurement_time_interval:
 *                     type: string
 *                     description: Time interval for sensor readings
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: sensor_brand and sensor_id are required parameters.
 *       404:
 *         description: Sensor not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: An error occurred while fetching sensors
 */
SensorSchemaRouter.route("/:sensor_brand/:sensor_id").get(getSensorSchemas);


///**
// * @swagger
// * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}/{measurement_type}/{measurement_time_interval}/{measurement_model?}/schema:
// *   put:
// *     summary: Update sensor schema
// *     description: Update the schema of a specific sensor's measurement table by adding new columns or renaming existing ones.
// *     tags:
// *       - Sensor Schemas
// *     parameters:
// *       - in: path
// *         name: sensor_brand
// *         required: true
// *         schema:
// *           type: string
// *         description: The brand of the sensor
// *       - in: path
// *         name: sensor_id
// *         required: true
// *         schema:
// *           type: string
// *         description: Unique identifier for the sensor (Serial Number)
// *       - in: path
// *         name: measurement_model
// *         required: false
// *         schema:
// *           type: string
// *         description: For CORRECTED data, the model applied on the measurements
// *       - in: path
// *         name: measurement_type
// *         required: true
// *         schema:
// *           type: string
// *           enum: [RAW, CORRECTED, raw, corrected]
// *         description: The type of measurement
// *       - in: path
// *         name: measurement_time_interval
// *         required: true
// *         schema:
// *           type: string
// *           enum: [HOURLY, DAILY, NIETHER, daily, hourly, neither]
// *         description: The time interval of measurements
// *     requestBody:
// *       required: true
// *       content:
// *         application/json:
// *           schema:
// *             type: object
// *             properties:
// *               new_columns_dict:
// *                 type: object
// *                 additionalProperties:
// *                   type: string
// *                 description: Dictionary of new column names and their types
// *               rename_column_dict:
// *                 type: object
// *                 additionalProperties:
// *                   type: string
// *                 description: Dictionary of old column names and their new names
// *             example:
// *               new_columns_dict:
// *                 new_column1: "varchar(50)"
// *                 new_column2: "int"
// *               rename_column_dict:
// *                 old_column_name: "new_column_name"
// *     responses:
// *       200:
// *         description: Sensor schema updated successfully
// *         content:
// *           application/json:
// *             schema:
// *               type: object
// *               properties:
// *                 message:
// *                   type: string
// *                   example: Sensor schema updated successfully.
// *       400:
// *         description: Bad request - missing or invalid parameters
// *         content:
// *           application/json:
// *             schema:
// *               type: object
// *               properties:
// *                 error:
// *                   type: string
// *                   example: Sensor brand and sensor ID are required.
// *       404:
// *         description: Sensor not found
// *         content:
// *           application/json:
// *             schema:
// *               type: object
// *               properties:
// *                 error:
// *                   type: string
// *                   example: Sensor not found.
// *       500:
// *         description: Internal server error
// *         content:
// *           application/json:
// *             schema:
// *               type: object
// *               properties:
// *                 message:
// *                   type: string
// *                   example: An error occurred while updating the sensor schema.
// */
//SensorSchemaRouter.route("/:sensor_brand/:sensor_id/:measurement_type/:measurement_time_interval").put(updateSensorSchema);


/**
 * @swagger
 * /api/v2/sensor-schemas/{sensor_brand}/{sensor_id}/{measurement_type}/{measurement_time_interval}/{measurement_model?}:
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
 *         name: measurement_model
 *         required: false
 *         schema:
 *           type: string
 *         description: The name of the model applied to the measurements (this ONLY applies to CORRECTED data) 
 *       - in: path
 *         name: measurement_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [RAW, CORRECTED, raw, corrected]
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
SensorSchemaRouter.route("/:sensor_brand/:sensor_id/:measurement_type/:measurement_time_interval/:measurement_model?").get(downloadSensorReadings);


module.exports = SensorSchemaRouter;
