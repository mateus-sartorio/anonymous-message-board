// Do not change this file
require("dotenv").config();

const { MongoClient } = require("mongodb");

async function getDbClient() {
  try {
    const URI = process.env.DB;
    const client = new MongoClient(URI);
    
    // Connect to the MongoDB cluster
    await client.connect();

    return client;
  } catch (e) {
    console.error(e);
    throw new Error("Unable to Connect to Database");
  }
}

module.exports = {
  getDbClient
};