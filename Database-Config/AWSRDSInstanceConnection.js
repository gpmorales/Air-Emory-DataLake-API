const knex = require('knex');

const hostName = 'test-db.c10agk8ae2si.us-east-2.rds.amazonaws.com'
const dbUser=  process.env.RDS_DB_USER || "admin";
const password = process.env.RDS_DB_PASSORD || "abcABC123$%^";

async function AWSRDSInstanceConnection() {
    try {
        console.log("Attempting to connect to AWS RDS MySQL instance at host" + hostName + "\n");

        return knex({
            client: 'mysql2',
            connection: {
                host: hostName,
                user: dbUser,
                password: password,
                database: "Saikawa_Lab_Test",
                port: 3306,
                timezone: "+00:00",
            },
        });

    } catch (err) {
        console.log(err);
        throw err;
    }
}

async function closeAWSConnection(database) {
    await database.destroy();
}

module.exports = { AWSRDSInstanceConnection, closeAWSConnection }
