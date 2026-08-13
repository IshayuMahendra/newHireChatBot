import {MongoClient} from 'mongodb';
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
await client.connect();

const db = client.db("chatbotdb");
const userCollection = db.collection("users");
const taskCollection = db.collection("tasks");

class chatbotRespositoryFunctions {
    
}