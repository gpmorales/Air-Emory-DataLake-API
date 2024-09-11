const { AWSRDSInstanceConnection, closeAWSConnection } = require("../Database-Config/AWSRDSInstanceConnection");
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

        if (error.code === 'ER_DUP_ENTRY') {
            response.status(400).json({ message: `Error: A sensor with ID '${sensorData.sensor_id}' and brand '${sensorData.sensor_brand}' already exists.`});
        } else {
            response.status(500).json({ message: 'An error occurred while adding the sensor.\n' + err.message });
        }
    }
}


// Update a sensors location 
async function updateSensorLocation(request, response) {
    let RDSdatabase;

    const { sensor_brand, sensor_id, new_latitude, new_longitude } = request.params;

    if (!sensor_brand || sensor_brand === "" || !sensor_id || sensor_id === "") {
        return response.status(400).json({ error: 'sensor_brand and sensor_id are required parameters.' });
    }

    // Check if new_latitude (sic) and new_longitude are provided
    if (new_latitude === undefined || new_longitude === undefined) {
        return response.status(400).json({ error: 'new_latitude and new_longitude are required parameters.' });
    }

    // Parse and validate latitude and longitude
    const newLatitude = parseFloat(new_latitude);
    const newLongitude = parseFloat(new_longitude);

    if (isNaN(newLatitude) || isNaN(newLongitude) || 
        newLatitude < -90 || newLatitude > 90 || 
        newLongitude < -180 || newLongitude > 180) {
        return response.status(400).json({ error: 'Invalid latitude or longitude values.' });
    }

    try {
        RDSdatabase = await AWSRDSInstanceConnection();

        // Check if the sensor exists
        const sensorExists = await RDSdatabase(SENSOR_TABLE)
            .where({ sensor_brand, sensor_id })
            .first();

        if (!sensorExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({ error: 'Sensor not found.' });
        }

        // Update the sensor's location
        const updatedRows = await RDSdatabase(SENSOR_TABLE)
            .where({ sensor_brand, sensor_id })
            .update({
                latitude: newLatitude,
                longitude: newLongitude,
                last_latitude: sensorExists.latitude,
                last_longitude: sensorExists.longitude,
                last_location_update: RDSdatabase.fn.now()
            });

        await closeAWSConnection(RDSdatabase);

        if (updatedRows === 0) {
            return response.status(500).json({ error: 'Failed to update sensor location.' });
        }

        response.status(200).json({ 
            message: 'Sensor location updated successfully.',
            updated: {
                sensor_brand,
                sensor_id,
                new_latitude: newLatitude,
                new_longitude: newLongitude,
                previous_latitude: sensorExists.latitude,
                previous_longitude: sensorExists.longitude
            }
        });
    } catch (err) {
        console.error('Error updating sensor location:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }
        response.status(500).json({ error: 'An error occurred while updating the sensor location' });
    }
}


// Flag a sensor inactive but do not remove its data
async function deprecateSensor(request, response) {
    let RDSdatabase;

    const { sensor_brand, sensor_id } = request.params;

    if (!sensor_brand || sensor_brand === "" || !sensor_id || sensor_id === "") {
        return response.status(400).json({ error: 'sensor_brand and sensor_id are required parameters.' });
    }

    try {
        RDSdatabase = await AWSRDSInstanceConnection();
        
        const sensorExists = await RDSdatabase(SENSOR_TABLE)
            .where({ sensor_brand, sensor_id })
            .first();
        
        if (!sensorExists) {
            await closeAWSConnection(RDSdatabase);
            return response.status(400).json({ error: 'Sensor not found.' });
        }
        
        // Update the sensor to inactive
        const updatedRows = await RDSdatabase(SENSOR_TABLE)
            .where({ sensor_brand, sensor_id })
            .update({ 
                is_active: false,
                last_location_update: RDSdatabase.fn.now() // Update the last_location_update timestamp
            });
        
        await closeAWSConnection(RDSdatabase);
        
        if (updatedRows === 0) {
            return response.status(500).json({ error: 'Failed to update sensor status.' });
        }
        
        response.status(200).json({ message: 'Sensor successfully marked as inactive.' });

    } catch (err) {
        console.error('Error deprecating sensor:', err);

        if (RDSdatabase) {
            try {
                await closeAWSConnection(RDSdatabase);
            } catch (closeErr) {
                console.error('Error closing database connection:', closeErr);
            }
        }

        response.status(500).json({ error: 'An error occurred while deprecating the sensor' });
    }
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
    updateSensorLocation, 
    deprecateSensor,
    getSensorInfo,
    getSensorsByBrand,
};
