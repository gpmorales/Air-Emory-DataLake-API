const { validateLocation, createSensorMeasurementsTable, insertNewSensor, createPayload } = require("./Utility.js")
const { AWSRDSInstanceConnection, closeAWSConnection } = require("../Database-Config/AWSRDSInstanceConnection");
const { Parser } = require("json2csv");
const Joi = require("joi");


// GLOBAL VARS, ENUMS, & SCHEMAS
const SENSOR_SCHEMA_TABLE = process.env.SENSOR_SCHEMA_TABLE || "SENSOR_SCHEMAS";
const MEASUREMENT_TYPES = ["RAW", "CORRECTED", "raw", "corrected"];
const MEASUREMENT_TIME_INTERVALS = ["HOURLY", "DAILY", "NIETHER", "daily", "hourly", "neither"];

const sensorMeasurementSchema = Joi.object({
    sensor_id: Joi.string().required(),
    sensor_brand: Joi.string().required(),
    measurement_type: Joi.string().required().valid(...MEASUREMENT_TYPES),
    measurement_time_interval: Joi.string().required().valid(...MEASUREMENT_TIME_INTERVALS),
    measurement_table_schema: Joi.object().required(),
});



/**** API functions ****/

// Get all Sensor Schemas 
async function getAllSensorSchemas(request, response) {
    let RDSdatabase;

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const all_sensor_schemas = await RDSdatabase(SENSOR_SCHEMA_TABLE).select("*")

        await closeAWSConnection(RDSdatabase);

        response.status(200).json(all_sensor_schemas);

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


// Get the Measurement Tables of a particular sensor
async function getSensorSchema(request, response) {
    let RDSdatabase;

    const { sensor_brand, sensor_id } = request.params;

    if (!sensor_brand || sensor_brand === "" || !sensor_id || sensor_id === "") {
        // If either parameter is missing or empty, return a 404 response
        return response.status(404).json({ error: 'sensor_brand and sensor_id are required parameters.' });
    }

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const sensor_schemas = await RDSdatabase(SENSOR_SCHEMA_TABLE)
            .select("*")
            .where("sensor_brand", sensor_brand)
            .andWhere("sensor_id", sensor_id);

        await closeAWSConnection(RDSdatabase);

        response.status(200).json(sensor_tables);

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


// Add a sensor schema (via swagger or programmatically) assuming sensor is present in Sensor Table
// In order to upload data, the sensor measurement table must already exist
async function addSensorSchema(request, response) {
    let RDSdatabase;

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const payload = createPayload(request);
        const { error, value } = sensorMeasurementSchema.validate(payload, { abortEarly: false });

        if (error) {
            return response.status(400).json({ error: error.details.map(detail => detail.message) });
        }

        // Deconstruct the validated payload
        const { 
            sensor_id,
            sensor_brand,
            measurement_type,
            measurement_time_interval,
            measurement_table_schema,
        } = value;

        // Create measurement table
        const measurement_table_name = `${sensor_brand}_${sensor_id}_${measurement_type}_${measurement_time_interval}`;

        const tableCreationResult = await createSensorMeasurementsTable(RDSdatabase, measurement_table_name, measurement_table_schema);

        if (!tableCreationResult.success) {
            return response.status(400).json({ error: tableCreationResult.message });
        }

        // Insert into SENSOR_MEASUREMENT table
        const [insertedId] = await RDSdatabase(SENSOR_MEASUREMENT_TABLE).insert({
            sensor_id,
            sensor_brand,
            measurement_table_name,
            measurement_type,
            measurement_time_interval,
            measurement_table_schema: JSON.stringify(measurement_table_schema),
        });

        response.status(201).json({
            message: `Sensor successfully added with row ID ${insertedId} in measurement table ${measurement_table_name}.`
        });

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


async function downloadSensorSchemas(request, response) {
    let RDSdatabase;

    try {
        // Extract parameters from the request
        const { sensor_brand, sensor_id, measurement_type, time_interval } = request.params;

        if (!sensor_brand || !sensor_id) {
            return response.status(400).json({ message: 'Sensor brand and sensor ID are required.' });
        }

        if (!MEASUREMENT_TYPES.includes(measurement_type)) {
            return response.status(400).json({
                message: `Invalid measurement type. Allowed values are: ${MEASUREMENT_TYPES.join(", ")}.`,
            });
        }

        if (!TIME_INTERVALS.includes(time_interval)) {
            return response.status(400).json({
                message: `Invalid time interval. Allowed values are: ${TIME_INTERVALS.join(", ")}.`,
            });
        }

        RDSdatabase = await AWSRDSInstanceConnection();

        const sensor_table = `${sensor_brand}_${sensor_id}_${measurement_type}_${time_interval}`;

        // Fetch all data from the constructed sensor table
        const sensor_data = await RDSdatabase(sensor_table).select("*");

        // Check if data exists
        if (!sensor_data || sensor_data.length === 0) {
            return response.status(400).json({ message: 'No data found for the specified sensor.' });
        }

        await closeAWSConnection(RDSdatabase);

        // Convert JSON data array to CSV format using json2csv
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(sensor_data);

        response.header('Content-Type', 'text/csv');
        response.header('Content-Disposition', `attachment; filename=${sensor_table}.csv`);

        response.send(csv);

    } catch (err) {
        console.error("Error downloading sensor data: ", err);
        response.status(500).json({ message: 'Error processing your request.' });
    } finally {
        // Ensure the connection is closed in case of an error
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
    }
}



module.exports = {
    getAllSensorSchemas,
    getSensorSchema,
    addSensorSchema,
    downloadSensorSchemas,
};
