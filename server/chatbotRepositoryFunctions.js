import {MongoClient} from 'mongodb';
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
await client.connect();

const db = client.db("chatbotdb");
const userCollection = db.collection("users");
const taskCollection = db.collection("tasks");

class chatbotRepositoryFunctions {
    async registerUser(newUser) {
        const id = await this.getNextUserId();
        newUser.id = id;
        await userCollection.insertOne(newUser);
        return newUser;
    }

    async getUserTasks(userId) {
        return await taskCollection.find({ userId }).toArray();
    }

    async loginUser(username, password) {
        const user = await userCollection.findOne({ username, password });
        if (!user) {
            return { "authenticated": false, "message": "Invalid username or password" };
        }
        return { "authenticated": true, "message": "Successfully logged in" };
    }

    async addTask(userId, newTask) {
        const user = await userCollection.findOne({ id: userId });
    }

    async getNextUserId() {
        const topUser = await userCollection.find().sort({ id: -1 }).limit(1).toArray();
        if (topUser.length === 0) {
            return 1;
        }
        return topUser[0].id + 1;
    }
}

export default new chatbotRepositoryFunctions();