const { RDSInstanceConnection, closeAWSConnection, compareSets } = require("../Database-Config/RDSInstanceConnection");
const { getDateColumn } = require("../Utility/SensorSchemaUtility.js")
const csv = require("csv-parser");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const MEASUREMENT_TYPES = ["RAW", "CORRECTED"] 
const MEASUREMENT_TIME_INTERVALS = ["HOURLY", "DAILY", "OTHER"];


// GET data via date queries (as CSV)
async function exportSensorDataReadingsToCSV(request, response) {
    let RDSdatabase;

    // Extract parameters from the request
    const { 
        sensor_brand,
        sensor_id, 
        measurement_type,
        measurement_model,
        measurement_time_interval
    } = request.params;

    const { 
        start_date,
        end_date, 
    } = request.query

    if (!sensor_brand || !sensor_id) {
        return response.status(400).json({ error: 'Sensor brand and sensor ID are required.' });
    }

    if (!MEASUREMENT_TYPES.includes(measurement_type)) {
        console.log(request.params)
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
        // Define the table name
        const aq_readings_table = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(aq_readings_table);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${aq_readings_table}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, aq_readings_table);

        if (!dateColumn) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${aq_readings_table}' does not have any data OR is missing a datetime column.`
            });
        }

        // Fetch all data from the constructed sensor table
        const sensor_data = await RDSdatabase(aq_readings_table)
            .select("*")
            .where(dateColumn, '>=', start_date)  // Using the dateColumn variable
            .andWhere(dateColumn, '<=', end_date); // Using the dateColumn variable
        
        await closeAWSConnection(RDSdatabase);

        if (!sensor_data || sensor_data.length === 0) {
            return response.status(400).json({ error: 'No data found for the specified sensor.' });
        }

        // Convert JSON data array to CSV format using json2csv
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(sensor_data);

        response.header('Content-Type', 'text/csv');
        response.header('Content-Disposition', `attachment; filename=${aq_readings_table}.csv`);
        response.send(csv);

    } catch (err) {
        console.error("Error downloading sensor data: ", err);
        // Ensure the connection is closed in case of an error
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
        response.status(500).json({ error: `Error processing your request: ${err.sqlMessage || err.message}` });
    } 
}


// POST data via CSV file
async function insertSensorDataReadingsFromCSV(request, response) {
    let RDSdatabase;

    // Extract parameters from the request
    const { 
        sensor_brand,
        sensor_id, 
        measurement_model,
        measurement_type,
        measurement_time_interval
    } = request.params;

    if (!sensor_brand || !sensor_id) {
        return response.status(400).json({ error: 'Sensor brand and sensor ID are required.' });
    }

    if (!MEASUREMENT_TYPES.includes(measurement_type)) {
        return response.status(400).json({
            error: `Invalid measurement type. Allowed values are: ${MEASUREMENT_TYPES.join(", ")}.`
        });
    }

    if (!MEASUREMENT_TIME_INTERVALS.includes(measurement_time_interval)) {
        return response.status(400).json({
            error: `Invalid time interval. Allowed values are: ${MEASUREMENT_TIME_INTERVALS.join(", ")}.`
        });
    }

    try {
        // Define the table name based on parameters
        const aq_readings_table = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        // Establish a connection to the RDS database
        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(aq_readings_table);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${aq_readings_table}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the schema for the specified table
        const tableSchemaQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? 
        `;

        const tableColumns = await RDSdatabase.raw(tableSchemaQuery, [measurement_table]);

        // Extract column names into a Set for validation
        const schemaColumns = new Set(tableColumns.map(col => col.COLUMN_NAME));

        // Access the uploaded CSV file in memory
        const csvBuffer = request.file.buffer; // Use buffer instead of file path

        // Read the CSV file from the buffer
        const sensorData = [];
        require("stream")
            .Readable
            .from(csvBuffer.toString().split('\n')) // Convert buffer to a readable stream
            .pipe(csv())
            .on('data', (data) => {
                const incomingColumns = new Set(Object.keys(data));
                
                // Validate incoming columns against schema
                if (!compareSets(incomingColumns, schemaColumns)) {
                    return response.status(400).json({ 
                        error: 'Column names or data types do not match table schema.' 
                    });
                }

                sensorData.push(data);
            })
            .on('end', async () => {
                // Insert the data into the database
                if (sensorData.length > 0) {
                    await RDSdatabase(measurement_table).insert(sensorData);
                    response.status(200).json({ message: 'Data inserted successfully.' });
                } else {
                    response.status(400).json({ error: 'No valid data found in the CSV file.' });
                }
            })
            .on('error', (error) => {
                console.error("Error processing CSV file: ", error);
                response.status(500).json({ error: 'Error processing the CSV file.' });
            });

    } catch (err) {
        console.error("Error processing sensor data: ", err);
        // Ensure the connection is closed
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
        return response.status(500).json({ error: 'Error processing your request.' });
    } 
}


// GET data via date queries (as JSON)
async function fetchSensorDataReadings(request, response) {
    let RDSdatabase;

    // Extract parameters from the request
    const { 
        sensor_brand,
        sensor_id, 
        measurement_model,
        measurement_type,
        measurement_time_interval
    } = request.params;

    const { 
        start_date,
        end_date, 
    } = request.query

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

    try {
        // Define the table name
        const aq_readings_table = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(aq_readings_table);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${aq_readings_table}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, measurement_table);

        if (!dateColumn) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${aq_readings_table}' does not have any data OR is missing a datetime column.`
            });
        }

        // Fetch all data from the constructed sensor table
        const measurement_data = await RDSdatabase(measurement_table)
            .select("*")
            .where(dateColumn, '>', start_date)  // Using the dateColumn variable
            .andWhere(dateColumn, '<', end_date); // Using the dateColumn variable
        
        if (!measurement_data || measurement_data.length === 0) {
            return response.status(400).json({ error: 'No data found for the specified sensor.' });
        }

        await closeAWSConnection(RDSdatabase);

        // Return JSON data array
        response.status(200).json(measurement_data.length > 0 ? 
            measurement_data : { message: "No data has been recorded for this table" });

    } catch (err) {
        console.error("Error fetching sensor data: ", err);
        // Ensure the connection is closed in case of an error
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
        response.status(500).json({ error: 'Error processing your request.' });
    } 
}


// POST data via JSON object
async function insertSensorDataReadings(request, response) {
    let RDSdatabase;

    // Extract parameters from the request
    const {
        sensor_brand,
        sensor_id,
        measurement_model,
        measurement_type,
        measurement_time_interval
    } = request.params;

    const requestPayload = await request.body;

    // Validate required parameters
    if (!sensor_brand || !sensor_id) {
        return response.status(400).json({ error: 'Sensor brand and sensor ID are required.' });
    }

    if (!MEASUREMENT_TYPES.includes(measurement_type)) {
        return response.status(400).json({
            error: `Invalid measurement type. Allowed values are: ${MEASUREMENT_TYPES.join(", ")}.`
        });
    }

    if (!MEASUREMENT_TIME_INTERVALS.includes(measurement_time_interval)) {
        return response.status(400).json({
            error: `Invalid time interval. Allowed values are: ${MEASUREMENT_TIME_INTERVALS.join(", ")}.`
        });
    }

    try {
        // Define the table name
        const aq_readings_table = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(aq_readings_table);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${aq_readings_table}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Establish a connection to the RDS database
        RDSdatabase = await AWSRDSInstanceConnection();

        // Fetch the schema for the specified table
        const tableSchemaQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? 
        `;

        const tableColumns = await RDSdatabase.raw(tableSchemaQuery, [measurement_table]);

        // Extract incoming column names from the request payload
        const incomingColumns = new Set(Object.keys(requestPayload[0]));

        // Compare incoming columns with table columns
        const schemaColumns = new Set(tableColumns.map(col => col.COLUMN_NAME));

        if (!compareSets(incomingColumns, schemaColumns)) {
            return response.status(400).json({ 
                error: 'Error processing your data. Column names or data types do not match table schema.' 
            });
        }

        // Inserting data
        const insertResult = await RDSdatabase(measurement_table).insert(requestPayload);

        await closeAWSConnection(RDSdatabase);

        if (insertResult && insertResult === requestPayload.length) {
            return response.status(200).json({
                message: `Successfully inserted ${insertResult} rows`,
            });
        } else {
            return response.status(500).json({
                error: 'Failed to insert data into database'
            });
        } 

    } catch (err) {
        console.error("Error processing sensor data: ", err);
        // Ensure the connection is closed
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
        return response.status(500).json({ error: 'Error processing your request.' });
    } 
}


// GET last row of a table
async function getLastDataReading(request, response) {
    let RDSdatabase;

    // Extract parameters from the request
    const { 
        sensor_brand,
        sensor_id, 
        measurement_model,
        measurement_type,
        measurement_time_interval
    } = request.params;

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

    try {
        // Define the table name
        const measurement_table = `${sensor_brand}_${sensor_id}_${measurement_model || "NIL-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await AWSRDSInstanceConnection();

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, measurement_table);

        // Fetch all data from the constructed sensor table
        const last_row = await RDSdatabase(measurement_table)
            .select("*")
            .orderBy(dateColumn, 'asc')
            .limit("1")
        
        if (!measurement_data || measurement_data.length === 0) {
            return response.status(400).json({ error: 'No data found for the specified sensor.' });
        }

        await closeAWSConnection(RDSdatabase);

        // Return JSON data array
        response.status(200).json(last_row);

    } catch (err) {
        console.error("Error fetching last row of sensor measurement data: ", err);
        // Ensure the connection is closed in case of an error
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
        response.status(500).json({ error: 'Error processing your request.' });
    } 
}

module.exports = {
    exportSensorDataReadingsToCSV,
    insertSensorDataReadingsFromCSV,
    fetchSensorDataReadings,
    insertSensorDataReadings,
    getLastDataReading
};
