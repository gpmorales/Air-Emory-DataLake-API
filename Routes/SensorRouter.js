// Handles Sensor Endpoint Routing
const express = require("express");
const SensorRouter = express.Router();

const {
  getAllSensors,
  addNewSensor, 
  updateSensor, // TODO
  getSensorInfo,
  getSensorsByBrand,
  getAllMeasurementTables,
  getSensorMeasurementTables,
  addSensorMeasurementTable,
  downloadSensorMeasurements,
} = require("../Controllers/Sensors");



// GET api/v2/sensors
/**
 * @swagger
 * /api/v2/sensors:
 *   get:
 *     summary: Retrieve all sensors
 *     description: Fetch an array of all sensors from the database.
 *     tags:
 *       - Sensors
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
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: Latitude coordinate of the sensor
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: Longitude coordinate of the sensor
 *                   last_location_update:
 *                     type: boolean
 *                     description: The previous date the sensors location was updated
 *                   date_uploaded:
 *                     type: boolean
 *                     description: The creation date of a measurement table associated with this sensor 
 *                   is_active:
 *                     type: boolean
 *                     description: Whether the sensor is currently active
 *       500:
 *         description: Server error
 */
SensorRouter.route("").get(getAllSensors);


/**
 * @swagger
 * /api/v1/sensors/{sensor_brand}/{sensor_id}:
 *   post:
 *     summary: Add a new sensor
 *     description: Adds a new sensor to the database. The sensor must have a unique sensor_id and sensor_brand.
 *     tags:
 *       - Sensors
 *     parameters:
 *       - in: path
 *         name: sensor_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier for the sensor.
 *       - in: path
 *         name: sensor_brand
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand of the sensor.
 *       - in: query
 *         name: latitude
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *         description: Latitude coordinate of the sensor. Optional but must be a valid float if provided.
 *       - in: query
 *         name: longitude
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *         description: Longitude coordinate of the sensor. Optional but must be a valid float if provided.
 *     responses:
 *       201:
 *         description: Sensor successfully added to the SENSORS table.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *       400:
 *         description: Bad request. Validation error or sensor already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of validation error messages or sensor registration error.
 *       500:
 *         description: Server error. An error occurred while adding the sensor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message describing the issue.
 */
SensorRouter.route("/:sensor_brand/:sensor_id").get(addNewSensor);


/**
 * @swagger
 * /api/v2/sensors/{sensor_brand}/{sensor_id}:
 *   get:
 *     summary: Retrieve a sensors meta data
 *     description: Fetches a sensors info including brand, id, location, and other meta data
 *     tags:
 *       - Sensors
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
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: Latitude coordinate of the sensor
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: Longitude coordinate of the sensor
 *                   last_location_update:
 *                     type: boolean
 *                     description: The previous date the sensors location was updated
 *                   date_uploaded:
 *                     type: boolean
 *                     description: The creation date of a measurement table associated with this sensor 
 *                   is_active:
 *                     type: boolean
 *                     description: Whether the sensor is currently active
 *       500:
 *         description: Server error
 */
SensorRouter.route("/:sensor_brand/:sensor_id").get(getSensorInfo);


// GET api/v2/sensors
/**
 * @swagger
 * /api/v2/sensors/{sensor_brand}:
 *   get:
 *     summary: Retrieve all sensors of the specified brand type
 *     description: Fetch an array of all sensors from the database.
 *     tags:
 *       - Sensors
 *     parameters:
 *       - in: path
 *         name: sensor_brand
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand of the sensors to retrieve
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
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: Latitude coordinate of the sensor
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: Longitude coordinate of the sensor
 *                   last_location_update:
 *                     type: boolean
 *                     description: The previous date the sensors location was updated
 *                   date_uploaded:
 *                     type: boolean
 *                     description: The creation date of a measurement table associated with this sensor 
 *                   is_active:
 *                     type: boolean
 *                     description: Whether the sensor is currently active
 *       500:
 *         description: Server error
 */
SensorRouter.route("/:sensor_brand").get(getSensorsByBrand);


// GET api/v2/sensors/measurements
/**
 * @swagger
 * /api/v2/sensors/measurements:
 *   get:
 *     summary: Retrieve all sensors measurement tables
 *     description: Fetch an array of all uploaded sensor measurementtables.
 *     tags:
 *       - Sensors
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
 *                   measurement_table_name:
 *                     type: string
 *                     description: Table name for the sensor measurement table
 *                   measurement_type:
 *                     type: string
 *                     description: Type of measurement the sensor performs
 *                   measurement_time_interval:
 *                     type: string
 *                     description: Time interval for sensor readings
 *                   measurement_table_schema:
 *                     type: object
 *                     description: Schema for the measurement table
 *       500:
 *         description: Server error
 */
SensorRouter.route("/measurements").get(getAllMeasurementTables);


/**
 * @swagger
 * /api/v2/sensors/measurement/{sensor_brand}/{sensor_id}:
 *   get:
 *     summary: Retrieve the measurement tables corresponding to that sensor
 *     description: Fetches an array of all measurement tables associated with sensor.
 *     tags:
 *       - Sensors
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
 *                   measurement_table_name:
 *                     type: string
 *                     description: Table name for the sensor measurement table
 *                   measurement_type:
 *                     type: string
 *                     description: Type of measurement the sensor performs
 *                   measurement_time_interval:
 *                     type: string
 *                     description: Time interval for sensor readings
 *                   measurement_table_schema:
 *                     type: object
 *                     description: Schema for the measurement table
 *       500:
 *         description: Server error
 */
SensorRouter.route("/measurements/:sensor_brand/:sensor_id").get(getSensorMeasurementTables);


// POST api/v2/sensors
/**
 * @swagger
 * /api/v2/sensors/{sensor_brand}/{sensor_id}/{measurement_type}/{measurement_time_interval}:
 *   post:
 *     summary: Add a new sensor measurement table
 *     description: Adds a new sensor measurement table to the system. 
 *     tags:
 *       - Sensors
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
 *         name: time_interval
 *         required: true
 *         schema:
 *           type: string
 *         description: The measurements recorded time interval (HOURLY, DAILY, or NIETHER) 
 *       - in: path
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Latitude coordinate of the sensor
 *       - in: path
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Longitude coordinate of the sensor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               measurement_table_schema:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Schema for the measurement table. Keys are column names, values are data types.
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
SensorRouter.post(
  "/:sensor_brand/:sensor_id/:measurement_type/:time_interval", addSensorMeasurementTable
);



// GET api/v2/sensors/{sensor_brand}/{sensor_id}/{measurement_type}/{time_interval}
/**
 * @swagger
 * /api/v2/sensors/{sensor_brand}/{sensor_id}/{measurement_type}/{time_interval}:
 *   get:
 *     summary: Download sensor measurement data as a CSV file
 *     description: Fetches sensor measurement data based on specified parameters and returns it as a downloadable CSV file.
 *     tags:
 *       - Sensors
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
SensorRouter.route("/:sensor_brand/:sensor_id/:measurement_type/:time_interval").get(downloadSensorMeasurements);



module.exports = SensorRouter;
