const { validateLocation, insertNewSensor, createPayload } = require("./Utility.js")
const { AWSRDSInstanceConnection, closeAWSConnection } = require("../Database-Config/AWSRDSInstanceConnection");
const { Parser } = require("json2csv");
const Joi = require("joi");


// GLOBAL VARS, ENUMS, & SCHEMAS
const SENSOR_TABLE = process.env.SENSOR_TABLE || "SENSORS";

const sensorUploadSchema = Joi.object({
    sensor_id: Joi.string().required(),
    sensor_brand: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
});



/**** API functions ****/

// Get all Sensors and their information
async function getAllSensors(request, response) {
    let RDSdatabase;

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const sensors = await RDSdatabase(SENSOR_TABLE).select("*")

        await closeAWSConnection(RDSdatabase);

        response.status(200).json(sensors);

    } catch (err) {
        console.error('Error fetching sensors:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }

        response.status(500).json({ message: 'An error occurred while fetching sensors' });
    }
}


// Get a particular sensor's meta data and information
async function getSensorInfo(request, response) {
    let RDSdatabase;

    const { sensor_brand, sensor_id } = request.params;

    if (!sensor_brand || sensor_brand === "" || !sensor_id || sensor_id === "") {
        // If either parameter is missing or empty, return a 404 response
        return response.status(404).json({ error: 'sensor_brand and sensor_id are required parameters.' });
    }

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const sensor_info = await RDSdatabase(SENSOR_TABLE)
            .select("*")
            .where("sensor_brand", sensor_brand)
            .andWhere("sensor_id", sensor_id);

        await closeAWSConnection(RDSdatabase);

        response.status(200).json(sensor_info);

    } catch (err) {
        console.error('Error fetching sensors:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }

        response.status(500).json({ message: 'An error occurred while fetching sensors' });
    }
}


// Add a sensor 
async function addNewSensor(request, response) {
    let RDSdatabase;

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const payload = {
            sensor_id: request.params.sensor_id,
            sensor_brand: request.params.sensor_brand,
            latitude: parseFloat(request.params.latitude),
            longitude: parseFloat(request.params.longitude)
        };

        const { error, value } = sensorUploadSchema.validate(payload, { abortEarly: false });

        if (error) {
            return response.status(400).json({ error: error.details.map(detail => detail.message) });
        }

        // Deconstruct the validated payload
        const { 
            sensor_id,
            sensor_brand,
            latitude,
            longitude,
        } = value;

        // Check if the sensor already exists in the SENSORS table
        const existingSensor = await RDSdatabase(SENSOR_TABLE)
            .where({ sensor_id, sensor_brand })
            .first();

        if (existingSensor) {
            return response.status(201).json({ message: "This Sensor has already been previously registered." });
        } 

        // Define additional fields for insertion
        const date_uploaded = RDSdatabase.fn.now();
        const last_location_update = RDSdatabase.fn.now(); 
        const is_active = true;

        // Insert the new sensor into the SENSORS table
        await RDSdatabase(SENSOR_TABLE).insert({
            sensor_id,
            sensor_brand,
            latitude,
            longitude,
            is_active,
            date_uploaded,
            last_location_update
        });

        // Respond with success
        response.status(201).json({ message: "Sensor successfully added to the SENSORS table." });

    } catch (err) {
        console.error('Error adding sensor:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }

        response.status(500).json({ message: 'An error occurred while adding the sensor.' });
    }
}


// Upate or Remove a sensor (flag as inactive)
async function updateSensor(request, response) {

}


// Get all Sensors of the same brand and their information
async function getSensorsByBrand(request, response) {
    let RDSdatabase;

    const { sensor_brand } = request.params;

    if (!sensor_brand || sensor_brand === "") {
        return response.status(404).json({ error: 'sensor_brand is a required parameter.' });
    }

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const brand_sensors = await RDSdatabase(SENSOR_TABLE)
            .select("*")
            .where("sensor_brand", request.params.sensor_brand);

        await closeAWSConnection(RDSdatabase);

        response.status(200).json(brand_sensors);

    } catch (err) {
        console.error('Error fetching sensors:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }

        response.status(500).json({ message: 'An error occurred while fetching sensors' });
    }
}



module.exports = {
  getAllSensors,
  addNewSensor,
  updateSensor,
  getSensorInfo,
  getSensorsByBrand,
};
