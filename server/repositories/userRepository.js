import bcrypt from 'bcrypt';
import { userCollection } from '../db.js';
import { getNextId } from '../utils/idGenerator.js';
import { signAuthToken } from '../utils/jwtUtils.js';

const SALT_ROUNDS = 10;

export const userRepository = {
    async registerUser(newUser) {
        const id = await getNextId(userCollection);
        newUser.id = id;
        newUser.userType = 'new_hire';
        newUser.plan30Day = '';
        newUser.plan60Day = '';
        newUser.plan90Day = '';
        newUser.password = await bcrypt.hash(newUser.password, SALT_ROUNDS);
        await userCollection.insertOne(newUser);
        const token = signAuthToken(newUser);
        const { password, ...userWithoutPassword } = newUser;
        return { ...userWithoutPassword, jwt: token };
    },

    async getUserByUsername(username) {
        return await userCollection.findOne({ username });
    },

    async getAllUsers() {
        return await userCollection.find().toArray();
    },

    async loginUser(username, password) {
        const user = await userCollection.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return { authenticated: false, error: 'Invalid username or password', jwt: null };
        }
        return { authenticated: true, jwt: signAuthToken(user) };
    },
    async updateUserPlan30Day(userId, plan30Day) {
        const result = await userCollection.updateOne(
            { id: userId },
            { $set: { plan30Day } }
        );
        if (result.matchedCount === 0) {
            return null;
        }
        return await userCollection.findOne({ id: userId });
    },
    async updateUserPlan60Day(userId, plan60Day) {
        const result = await userCollection.updateOne(
            { id: userId },
            { $set: { plan60Day } }
        );
        if (result.matchedCount === 0) {
            return null;
        }
        return await userCollection.findOne({ id: userId });
    },
    async updateUserPlan90Day(userId, plan90Day) {
        const result = await userCollection.updateOne(
            { id: userId },
            { $set: { plan90Day } }
        );
        if (result.matchedCount === 0) {
            return null;
        }
        return await userCollection.findOne({ id: userId });
    },
    async getUserById(userId) {
        return await userCollection.findOne({ id: userId });
    }
};

export default userRepository;
