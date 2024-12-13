const { RDSInstanceConnection, closeAWSConnection } = require("../Database-Config/RDSInstanceConnection");
const { getDateColumn, compareSets } = require("../Utility/SensorSchemaUtility.js")
const { Parser } = require('json2csv');
const csv = require("csv-parser");

const MEASUREMENT_TYPES = ["RAW", "CORRECTED"] 
const MEASUREMENT_TIME_INTERVALS = ["HOURLY", "DAILY", "OTHER"];


// GET data via date queries (as CSV)
async function exportSensorDataToCSV(request, response) {
    let RDSdatabase;

    // Extract parameters from the request
    const { 
        sensor_brand,
        sensor_id, 
        measurement_type,
        measurement_model,
        measurement_time_interval
    } = request.params;

    let { 
        start_date,
        end_date, 
    } = request.query

    // Make sure start_date and end_date are in DATETIME format yyyy-mm-dd hh:mm:ss
    if (start_date.includes("/")) {
        const [datePart, timePart] = start_date.split(' ');
        const [month, day, year] = datePart.split('/');
        start_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
    }

    if (end_date.includes("/")) {
        const [datePart, timePart] = end_date.split(' ');
        const [month, day, year] = datePart.split('/');
        end_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
    }

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
        const AQ_DATA_TABLE = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(AQ_DATA_TABLE);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, AQ_DATA_TABLE);

        if (!dateColumn) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not have any data OR is missing a datetime column.`
            });
        }

        // Fetch all data from the constructed sensor table
        const sensor_data = await RDSdatabase(AQ_DATA_TABLE)
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
        response.header('Content-Disposition', `attachment; filename=${AQ_DATA_TABLE}.csv`);
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
async function insertSensorDataFromCSV(request, response) {
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
        const AQ_DATA_TABLE = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        // Establish a connection to the RDS database
        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(AQ_DATA_TABLE);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the schema for the specified table
        const tableSchemaQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? 
        `;

        const tableColumns = await RDSdatabase.raw(tableSchemaQuery, [AQ_DATA_TABLE]);

        // Extract column names into a Set for validation
        const schemaColumns = new Set();

        for (let i = 0; i < tableColumns[0].length; i++) {
            let columnPair = tableColumns[0][i];
            if (columnPair["COLUMN_NAME"] != "id") {
                schemaColumns.add(columnPair["COLUMN_NAME"])
            }
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, AQ_DATA_TABLE);

        if (!dateColumn) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not have any data OR is missing a datetime column.`
            });
        }

        // Access the uploaded CSV file in memory
        const csvBuffer = request.file.buffer; // Use buffer instead of file path

        if (!csvBuffer || csvBuffer.length === 0) {
            return response.status(400).json({ error: 'Empty or invalid CSV file' });
        }

        // Read the CSV file from the buffer
        let hasError = false;
        const sensorData = [];

        await new Promise((resolve, reject) => {
            const stream = require("stream")
            .Readable
            .from(csvBuffer.toString().split('\n'))
            .pipe(csv());

            stream
                .on('data', (data) => {
                    const incomingColumns = new Set(Object.keys(data));

                    // Validate incoming columns against schema
                    if (!compareSets(incomingColumns, schemaColumns)) {
                        hasError = true;
                        stream.destroy();
                        reject(new Error('Column names or data types do not match table schema.'));
                        return;
                    }

                    if (!hasError) {
                        if (data[dateColumn] && data[dateColumn].includes("/")) {
                            const [datePart, timePart] = data[dateColumn].split(' ');
                            const [month, day, year] = datePart.split('/');
                            data[dateColumn] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
                        }
                        sensorData.push(data);
                    }
                })
                .on('end', () => {
                    console.log(`Successfully inserted '${sensorData.length}' rows of AQ readings into the '${AQ_DATA_TABLE}`)
                    resolve();
                })
                .on('error', (error) => {
                    console.error("Error processing CSV file: ", error);
                    hasError = true;
                    reject(error)
                });
        });

        // Finish collected rows and insert to table
        if (!hasError && sensorData.length > 0) {
            await RDSdatabase(AQ_DATA_TABLE).insert(sensorData);
            return response.status(200).json({ message: 'Data inserted successfully.' });
        } else {
            return response.status(400).json({ error: 'No valid data found in the CSV file.' });
        }

    } catch (err) {
        console.error("Error processing sensor data: ", err);
        return response.status(500).json({ error: 'Error processing your request.' });
    } finally {
        // Ensure the connection is closed
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
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

    let { 
        start_date,
        end_date, 
    } = request.query

    // Make sure start_date and end_date are in DATETIME format yyyy-mm-dd hh:mm:ss
    if (start_date.includes("/")) {
        const [datePart, timePart] = start_date.split(' ');
        const [month, day, year] = datePart.split('/');
        start_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
    }

    if (end_date.includes("/")) {
        const [datePart, timePart] = end_date.split(' ');
        const [month, day, year] = datePart.split('/');
        end_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
    }

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
        const AQ_DATA_TABLE = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(AQ_DATA_TABLE);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, AQ_DATA_TABLE);

        if (!dateColumn) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not have any data OR is missing a datetime column.`
            });
        }

        // Fetch all data from the constructed sensor table
        const all_data = await RDSdatabase(AQ_DATA_TABLE)
            .select("*")
            .where(dateColumn, '>', start_date)  // Using the dateColumn variable
            .andWhere(dateColumn, '<', end_date); // Using the dateColumn variable
        
        await closeAWSConnection(RDSdatabase);

        if (!all_data || all_data.length === 0) {
            return response.status(400).json({ error: 'No data found for the specified sensor.' });
        }

        // Return JSON data array
        response.status(200).json(all_data);

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
        const AQ_DATA_TABLE = `${sensor_brand}_${sensor_id}_${measurement_model || "RAW-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(AQ_DATA_TABLE);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Fetch the schema for the specified table
        const tableSchemaQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? 
        `;

        const tableColumns = await RDSdatabase.raw(tableSchemaQuery, [AQ_DATA_TABLE]);

        // Extract incoming column names from the request payload
        const incomingColumns = new Set(Object.keys(requestPayload[0]));

        // Compare incoming columns with table columns
        const schemaColumns = new Set();

        for (let i = 0; i < tableColumns[0].length; i++) {
            let columnPair = tableColumns[0][i];
            if (columnPair["COLUMN_NAME"] != "id") {
                schemaColumns.add(columnPair["COLUMN_NAME"])
            }
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, AQ_DATA_TABLE);

        if (!compareSets(incomingColumns, schemaColumns)) {
            return response.status(400).json({ 
                error: 'Error processing your data. Column names or data types do not match table schema.' 
            });
        }

        // Ensure date column has proper formatting
        for (let i = 0; i < requestPayload.length; i++) {
            const data = requestPayload[i];
            if (data[dateColumn] && data[dateColumn].includes("/")) {
                const [datePart, timePart] = data[dateColumn].split(' ');
                const [month, day, year] = datePart.split('/');
                data[dateColumn] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
            }
        }

        // Inserting data
        const insertResult = await RDSdatabase(AQ_DATA_TABLE).insert(requestPayload);

        await closeAWSConnection(RDSdatabase);

        if (insertResult > 0) {
            return response.status(201).json({
                message: `Successfully inserted ${requestPayload.length} rows`,
            });
        } else {
            return response.status(500).json({
                error: 'Failed to insert air quality data into database.'
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
        const AQ_DATA_TABLE = `${sensor_brand}_${sensor_id}_${measurement_model || "NIL-MODEL"}_${measurement_type}_${measurement_time_interval}`;

        RDSdatabase = await RDSInstanceConnection();

        // Ensure table exists
        const tableExists = await RDSdatabase.schema.hasTable(AQ_DATA_TABLE);

        if (!tableExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not exist. Please ensure the parameters were correctly given.`
            });
        }

        // Get the date column
        const dateColumn = await getDateColumn(RDSdatabase, AQ_DATA_TABLE);

        if (!dateColumn) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({
                error: `Table '${AQ_DATA_TABLE}' does not have any data OR is missing a datetime column.`
            });
        }

        // Fetch all data from the constructed sensor table
        const last_row = await RDSdatabase(AQ_DATA_TABLE)
            .select("*")
            .orderBy(dateColumn, 'desc')
            .limit(1)
        
        if (!last_row || last_row.length === 0) {
            return response.status(400).json({ error: 'No data found for the specified sensor.' });
        }

        await closeAWSConnection(RDSdatabase);

        // Return JSON data array
        response.status(200).json(last_row);

    } catch (err) {
        console.error("Error fetching last row of sensor data readings: ", err);
        // Ensure the connection is closed in case of an error
        if (RDSdatabase) {
            await closeAWSConnection(RDSdatabase);
        }
        response.status(500).json({ error: 'Error processing your request.' });
    } 
}


module.exports = {
    exportSensorDataToCSV,
    insertSensorDataFromCSV,
    fetchSensorDataReadings,
    insertSensorDataReadings,
    getLastDataReading,
};
