import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
await client.connect();

const db = client.db('chatbotdb');

export const userCollection = db.collection('users');
export const taskCollection = db.collection('tasks');
export const flagCollection = db.collection('flags');
