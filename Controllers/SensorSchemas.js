const { createSensorMeasurementsTable, createPayload } = require("../Utility/SensorSchemaUtility.js")
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
    sensor_data_schema: Joi.object().required(),
    measurement_type: Joi.string().required().valid(...MEASUREMENT_TYPES),
    measurement_time_interval: Joi.string().required().valid(...MEASUREMENT_TIME_INTERVALS),
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
        // If either parameter is missing or empty, return a 400 response
        return response.status(400).json({ error: 'sensor_brand and sensor_id are required parameters.' });
    }

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        const sensor_schemas = await RDSdatabase(SENSOR_SCHEMA_TABLE)
            .select("*")
            .where("sensor_brand", sensor_brand)
            .andWhere("sensor_id", sensor_id);

        await closeAWSConnection(RDSdatabase);

        response.status(200).json(sensor_schemas);

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
            return response.status(400).json({ message : "Request parameters incorrect: \n" + error.details.map(detail => detail.message) });
        }

        // Deconstruct the validated payload
        const { 
            sensor_id,
            sensor_brand,
            sensor_data_schema,
            measurement_type,
            measurement_time_interval,
        } = value;

        // Create measurement table
        const sensor_table_name = `${sensor_brand}_${sensor_id}_${measurement_type}_${measurement_time_interval}`;

        // Insert into SENSOR_MEASUREMENT table
        const [insertedId] = await RDSdatabase(SENSOR_SCHEMA_TABLE).insert({
            sensor_id,
            sensor_brand,
            sensor_table_name,
            ssensor_data_schema: JSON.stringify(sensor_data_schema),
            measurement_type,
            measurement_time_interval,
        });

        const tableCreationResult = await createSensorMeasurementsTable(RDSdatabase, sensor_table_name, sensor_data_schema);

        if (!tableCreationResult.success) {
            return response.status(400).json({ error: tableCreationResult.message });
        }

        response.status(201).json({
            message: `Sensor successfully added with row ID ${insertedId} in measurement table ${sensor_table_name}.`
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


async function downloadSensorReadings(request, response) {
    let RDSdatabase;

    try {
        // Extract parameters from the request
        const { sensor_brand, sensor_id, measurement_type, measurement_time_interval } = request.params;

        if (!sensor_brand || !sensor_id) {
            return response.status(400).json({ error: 'Sensor brand and sensor ID are required.' });
        }

        if (!MEASUREMENT_TYPES.includes(measurement_type)) {
            return response.status(400).json({
                error: `Invalid measurement type. Allowed values are: ${MEASUREMENT_TYPES.join(", ")}.`,
            });
        }

        if (!MEASUREMENT_TIME_INTERVALS.includes(measurement_time_interval)) {
            return response.status(400).json({
                error: `Invalid time interval. Allowed values are: ${MEASUREMENT_TIME_INTERVALS.join(", ")}.`,
            });
        }

        RDSdatabase = await AWSRDSInstanceConnection();

        const sensor_table = `${sensor_brand}_${sensor_id}_${measurement_type}_${time_interval}`;

        // Fetch all data from the constructed sensor table
        const sensor_data = await RDSdatabase(sensor_table).select("*");

        // Check if data exists
        if (!sensor_data || sensor_data.length === 0) {
            return response.status(400).json({ error: 'No data found for the specified sensor.' });
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
        response.status(500).json({ error: 'Error processing your request.' });
    } finally {
        // Ensure the connection is closed in case of an error
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
    }
}


async function updateSensorSchema(request, response) {
    let RDSdatabase;

    const { sensor_brand, sensor_id, measurement_type, measurement_time_interval } = request.params;

    // Validate required parameters
    if (!sensor_brand || !sensor_id) {
        return response.status(400).json({ error: 'Sensor brand and sensor ID are required.' });
    }

    // Validate measurement type and time interval
    if (!MEASUREMENT_TYPES.includes(measurement_type)) {
        return response.status(400).json({
            error: `Invalid measurement type. Allowed values are: ${MEASUREMENT_TYPES.join(", ")}.`,
        });
    }

    if (!MEASUREMENT_TIME_INTERVALS.includes(measurement_time_interval)) {
        return response.status(400).json({
            error: `Invalid time interval. Allowed values are: ${MEASUREMENT_TIME_INTERVALS.join(", ")}.`,
        });
    }

    try {
        // Parse request body
        const payload = await request.body; 
        
        const { new_columns_dict, rename_column_dict } = payload;

        // Validate the presence of new_columns_dict or rename_column_dict
        if ((!new_columns_dict || Object.keys(new_columns_dict).length === 0) && (!rename_column_dict || Object.keys(rename_column_dict).length === 0)) {
            return response.status(400).json({ error: 'Either new columns or rename columns must be provided.' });
        }

        const sensor_table_name = `${sensor_brand}_${sensor_id}_${measurement_type}_${measurement_time_interval}`;

        // Check if the sensor data table exists in the schema
        const sensor_schema = await RDSdatabase(SENSOR_SCHEMA_TABLE)
            .where({ sensor_table_name: sensor_table_name })
            .first();

        if (!sensor_schema) {
            await closeAWSConnection(RDSdatabase);
            return response.status(404).json({ error: 'Sensor not found.' });
        }

        // Add new columns to the sensor data table
        await RDSdatabase.schema.alterTable(sensor_table_name, (table) => {
            for (const [columnName, columnType] of Object.entries(new_columns_dict)) {
                if (VALID_COL_TYPES.includes(columnType)) {
                    table.specificType(columnName, columnType); 
                } else {
                    // TODO
                }
            }
        });

        // Rename columns 
        await RDSdatabase.schema.alterTable(sensor_table_name, (table) => {
            for (const [oldColumnName, newColumnName] of Object.entries(rename_column_dict)) {
                table.renameColumn(oldColumnName, newColumnName);
            }
        });

        // Update the schema in the SENSOR_SCHEMA_TABLE
        const old_sensor_schema_entry = await RDSdatabase(SENSOR_SCHEMA_TABLE)
            .select("sensor_data_schema")
            .where({ sensor_table_name: sensor_table_name })
            .first();

        // Updating the schema for new columns
        if (old_sensor_schema_entry.sensor_data_schema || old_sensor_schema_entry.sensor_data_schema === undefined) {
            for (const [columnName, columnType] of Object.entries(new_columns_dict)) {
                old_sensor_schema.sensor_data_schema[columnName] = columnType;
            }

            // Renaming columns in the schema
            for (const [oldColumnName, newColumnName] of Object.entries(rename_column_dict)) {
                if (old_sensor_schema.sensor_data_schema[oldColumnName]) {
                    old_sensor_schema.sensor_data_schema[newColumnName] = old_sensor_schema.sensor_data_schema[oldColumnName];
                    delete old_sensor_schema.sensor_data_schema[oldColumnName];
                }
            }
        } else {
            response.status(500).json({ message: 'Sensor schema could not be updated because the field is empty in \'SENSOR_SCHEMAS\'.' });
        }

        // Save the updated schema back to the SENSOR_SCHEMA_TABLE
        await RDSdatabase(SENSOR_SCHEMA_TABLE)
            .where({ sensor_table_name: sensor_data_table })
            .update({ sensor_data_schema: old_sensor_schema.sensor_data_schema });

        response.status(200).json({ message: 'Sensor schema updated successfully.' });

    } catch (err) {
        console.error('Error updating sensor schema:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }

        if (err.code === 'ER_DUP_FIELDNAME') {
            return response.status(400).json({ message: `One of the provided column names already exists in the table '${sensor_data_table}'.` });
        }

        response.status(500).json({ message: 'An error occurred while updating the sensor schema.' });
    }
}


module.exports = {
    getAllSensorSchemas,
    getSensorSchema,
    addSensorSchema,
    updateSensorSchema,
    downloadSensorReadings,
};
