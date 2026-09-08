import {MongoClient} from 'mongodb';
import jwt from 'jsonwebtoken';
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
        const token = jwt.sign({id: newUser.id, username: newUser.username, userType: newUser.userType, department: newUser.department, role: newUser.role}, process.env.JWT_SECRET, { expiresIn: '1h' });
        return { ...newUser, jwt: token };
    }

    async getUserByUsername(username) {
        return await userCollection.findOne({ username });
    }

    async getAllUsers() {
        return await userCollection.find().toArray();
    }

    async getUserTasks(userId) {
        const user = await userCollection.findOne({ id: userId });
        if (!user) {
            return null;
        }

        return await taskCollection
            .find({
                $or: [
                    { userId },
                    { userId: user._id }
                ]
            })
            .sort({ id: 1, _id: 1 })
            .toArray();
    }

    async loginUser(username, password) {
        const user = await userCollection.findOne({ username, password });
        if (!user) {
            return { authenticated: false, error: 'Invalid username or password', jwt: null};
        }
        return { authenticated: true, jwt: jwt.sign({id: user.id, username: user.username, userType: user.userType, department: user.department, role: user.role}, process.env.JWT_SECRET, { expiresIn: '1h' }) };
    }

    async addTask(userId, newTask) {
        const user = await userCollection.findOne({ id: userId });
        if (!user) {
            return null;
        }
        const taskId = await this.getNextTaskId();
        const completed = typeof newTask.completed === 'boolean' ? newTask.completed : false;
        const taskToInsert = {
            ...newTask,
            id: taskId,
            userId: user._id,
            completed,
            createdAt: newTask.createdAt ? new Date(newTask.createdAt) : new Date()
        };

        await taskCollection.insertOne(taskToInsert);
        return taskToInsert;
    }

    async updateTaskCompletion(taskId, completed) {
        await taskCollection.updateOne(
            { id: taskId },
            { $set: { completed } }
        );
        const updatedTask = await taskCollection.findOne({ id: taskId });
        return updatedTask;
    }

    async getTaskOwnerId(taskId) {
        const task = await taskCollection.findOne({ id: taskId });
        if (!task) {
            return null;
        }
        const owner = await userCollection.findOne({ _id: task.userId });
        return owner ? owner.id : null;
    }

    async getNextUserId() {
        const topUser = await userCollection.find().sort({ id: -1 }).limit(1).toArray();
        if (topUser.length === 0) {
            return 1;
        }
        return topUser[0].id + 1;
    }
    async getNextTaskId() {
        const topTask = await taskCollection.find().sort({ id: -1 }).limit(1).toArray();
        if (topTask.length === 0) {
            return 1;
        }
        return topTask[0].id + 1;
    }
}

export default new chatbotRepositoryFunctions();