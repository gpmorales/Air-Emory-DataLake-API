const knex = require('knex');


/* UTILITY FUNCTIONS */

async function createMeasurementTable(database, tableName, schema) {
    try {
        const tableExists = await database.schema.hasTable(tableName);

        if (!tableExists) {
            return { success: false, message: `Table ${tableName} already exists.` };
        }

        await database.schema.createTable(tableName, (table) => {
            table.increments('id').primary();
            for (const [columnName, dataType] of Object.entries(schema)) {
                switch(dataType.toLowerCase()) {
                    case 'string':
                        table.string(columnName);
                        break;
                    case 'number':
                    case 'float':
                        table.float(columnName);
                        break;
                    case 'integer':
                        table.integer(columnName);
                        break;
                    case 'date':
                        table.date(columnName).unique();
                        break;
                    case 'datetime':
                        table.datetime(columnName).unique();
                        break;
                    default:
                        table.text(columnName);
                }
            }
        });

        return { success: true, message: `Sensor Measuremen Table ${tableName} created successfully.` }

    } catch (error) {
        console.error(`Error creating table ${tableName}:`, error);
        throw error; // Optionally, rethrow the error or handle it as needed
    }
}


function createPayload(request) {
    return {
        sensor_id: request.params.sensor_id,
        sensor_brand: request.params.sensor_brand,
        measurement_type: request.params.measurement_type,
        measurement_time_interval: request.params.measurement_time_interval,
        measurement_table_schema: request.body.measurement_table_schema,
        latitude: isNaN(parseFloat(request.params.latitude)) ? null : parseFloat(request.params.latitude),
        longitude: isNaN(parseFloat(request.params.longitude)) ? null : parseFloat(request.params.longitude),
    };
}

async function insertNewSensor(database, sensor_id, sensor_brand, latitude, longitude) {
    const date_uploaded = database.fn.now();
    const last_location_update = database.fn.now();
    const is_active = true;
    await database(SENSOR_TABLE).insert({
        sensor_id,
        sensor_brand,
        latitude,
        longitude,
        is_active,
        date_uploaded,
        last_location_update
    });
}

function validateLocation(existingSensor, latitude, longitude) {
    if (latitude !== null && longitude !== null) {
        if (latitude !== existingSensor.latitude || longitude !== existingSensor.longitude) {
            return "The provided location does not match the Sensor's current longitude & latitude. Please update its location if it has moved.";
        }
    }
    return null;
}


module.exports = {
    validateLocation,
    createMeasurementTable,
    insertNewSensor,
    createPayload,
}
