// Handles Sensor Endpoint Routing
const express = require("express");
const SensorRouter = express.Router();

const {
  getAllSensors,
  addNewSensor, 
  updateSensor, // TODO
  getSensorInfo,
  getSensorsByBrand
} = require("../Controllers/Sensors.js");


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
 * /api/v2/sensors/{sensor_brand}/{sensor_id}:
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


module.exports = SensorRouter;
