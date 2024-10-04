// Handles Sensor Data Routing
const express = require("express");
const SensorDataRouter = express.Router();
const {
    querySensorReadingsToCSV,
    querySensorReadingsToJSON,
    insertJSONSensorReadings,
    insertCSVsensorReadings
} = require("../Controllers/SensorDataController");

/**
 * @swagger
 * /api/v2/readings/csv/{sensor_brand}/{sensor_id}/{measurement_model}/{measurement_type}/{measurement_time_interval}:
 *   get:
 *     summary: Get sensor readings in CSV format
 *     description: Fetch sensor data for a specific sensor within a date range and return as CSV.
 *     tags:
 *       - Readings
 *     parameters:
 *       - name: sensor_brand
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The brand of the sensor.
 *       - name: sensor_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the sensor.
 *       - name: measurement_model
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The model of the sensor measurement.
 *       - name: measurement_type
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of measurement taken by the sensor.
 *       - name: measurement_time_interval
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The time interval of the measurements.
 *       - name: start_date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for fetching data.
 *       - name: end_date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for fetching data.
 *     responses:
 *       200:
 *         description: CSV file containing sensor readings.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request. Invalid parameters or no data found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Details about the validation or data retrieval error.
 *       500:
 *         description: Server error. An issue occurred while retrieving sensor data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message describing the issue.
 */

/**
 * @swagger
 * /api/v2/readings/json/{sensor_brand}/{sensor_id}/{measurement_model}/{measurement_type}/{measurement_time_interval}:
 *   get:
 *     summary: Get sensor readings in JSON format
 *     description: Fetch sensor data for a specific sensor within a date range and return as JSON.
 *     tags:
 *       - Readings
 *     parameters:
 *       ...
 *     responses:
 *       200:
 *         description: JSON array containing sensor readings.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Bad request. Invalid parameters or no data found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message regarding the request failure.
 *       500:
 *         description: Server error. An issue occurred while retrieving sensor data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Detailed error message about the server issue.
 */

/**
 * @swagger
 * /api/v2/readings/json/{sensor_brand}/{sensor_id}/{measurement_model}/{measurement_type}/{measurement_time_interval}:
 *   post:
 *     summary: Insert sensor readings via JSON
 *     description: Insert new sensor data by providing a JSON array.
 *     tags:
 *       - Readings
 *     parameters:
 *       ...
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       201:
 *         description: Sensor data successfully inserted into the database.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *       400:
 *         description: Bad request. Invalid data or schema mismatch.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Validation error or mismatched data structure.
 *       500:
 *         description: Server error. An issue occurred while inserting sensor data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Detailed error message regarding the server issue.
 */

/**
 * @swagger
 * /api/v2/readings/csv/{sensor_brand}/{sensor_id}/{measurement_model}/{measurement_type}/{measurement_time_interval}:
 *   post:
 *     summary: Insert sensor readings via CSV
 *     description: Insert new sensor data by uploading a CSV file.
 *     tags:
 *       - Readings
 *     parameters:
 *       ...
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: CSV file successfully processed and sensor data added.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *       400:
 *         description: Bad request. Invalid CSV data or schema mismatch.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Details about the CSV parsing or validation error.
 *       500:
 *         description: Server error. An issue occurred while processing the CSV file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Detailed error message regarding the server issue.
 */


module.exports = SensorDataRouter;
