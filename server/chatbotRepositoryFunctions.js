import {MongoClient} from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const url = 'mongodb://localhost:27017';
const SALT_ROUNDS = 10;
const client = new MongoClient(url);
await client.connect();

const db = client.db("chatbotdb");
const userCollection = db.collection("users");
const taskCollection = db.collection("tasks");
const flagCollection = db.collection("flags");

class chatbotRepositoryFunctions {
    async registerUser(newUser) {
        const id = await this.getNextId(userCollection);
        newUser.id = id;
        newUser.userType = 'new_hire';
        newUser.plan30Day = '';
        newUser.plan60Day = '';
        newUser.plan90Day = '';
        newUser.password = await bcrypt.hash(newUser.password, SALT_ROUNDS);
        await userCollection.insertOne(newUser);
        const token = jwt.sign({id: newUser.id, username: newUser.username, userType: newUser.userType, department: newUser.department, role: newUser.role}, process.env.JWT_SECRET, { expiresIn: '1h' });
        const { password, ...userWithoutPassword } = newUser;
        return { ...userWithoutPassword, jwt: token };
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
        const user = await userCollection.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return { authenticated: false, error: 'Invalid username or password', jwt: null};
        }
        return { authenticated: true, jwt: jwt.sign({id: user.id, username: user.username, userType: user.userType, department: user.department, role: user.role}, process.env.JWT_SECRET, { expiresIn: '1h' }) };
    }

    async addTask(userId, newTask) {
        const user = await userCollection.findOne({ id: userId });
        if (!user) {
            return null;
        }
        const taskId = await this.getNextId(taskCollection);
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

    async addFlag(newFlag) {
        const id = await this.getNextId(flagCollection);
        newFlag.id = id;
        newFlag.createdAt = newFlag.createdAt ? new Date(newFlag.createdAt) : new Date();
        await flagCollection.insertOne(newFlag);
        const token = jwt.sign({id: newFlag.id, userId: newFlag.userId, _id: newFlag._id, reason: newFlag.reason, resolved: newFlag.resolved, createdAt: newFlag.createdAt}, process.env.JWT_SECRET, { expiresIn: '1h' });
        return { ...newFlag, jwt: token };
    }

    async getAllFlags() {
        return await flagCollection.find().toArray();
    }

    async getFlagById(flagId) {
        return await flagCollection.findOne({ id: flagId });
    }

    async updateFlagResolution(flagId, resolved) {
        await flagCollection.updateOne(
            { id: flagId },
            { $set: { resolved } }
        );
        return await flagCollection.findOne({ id: flagId });
    }


    async getTaskOwnerId(taskId) {
        const task = await taskCollection.findOne({ id: taskId });
        if (!task) {
            return null;
        }
        const owner = await userCollection.findOne({ _id: task.userId });
        return owner ? owner.id : null;
    }

    async getNextId(collection) {
        const topItem = await collection.find().sort({ id: -1 }).limit(1).toArray();
        if (topItem.length === 0) {
            return 1;
        }
        return topItem[0].id + 1;
    }
}

export default new chatbotRepositoryFunctions();