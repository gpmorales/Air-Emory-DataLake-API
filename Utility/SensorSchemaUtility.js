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
        sensor_data_schema: request.body.sensor_data_schema,
        measurement_type: request.params.measurement_type,
        measurement_time_interval: request.params.measurement_time_interval,
        latitude: isNaN(parseFloat(request.params.latitude)) ? null : parseFloat(request.params.latitude),
        longitude: isNaN(parseFloat(request.params.longitude)) ? null : parseFloat(request.params.longitude),
    };
}


module.exports = { createMeasurementTable, createPayload }
