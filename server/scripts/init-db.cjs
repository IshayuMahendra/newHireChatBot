const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'chatbotdb';
const COLLECTIONS = ['users', 'tasks'];

const SEED_USERS = [
	{
		_id: new ObjectId('6a7de7826893b4d54357d99a'),
		id: 1,
		username: 'csmiley',
		password: 'A7m!x19',
		role: 'New Hire Engineer',
		department: 'Global Product Technology',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99b'),
		id: 2,
		username: 'jthomas',
		password: 'Q2v@p83',
		role: 'HR Associate',
		department: 'Human Resources',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99c'),
		id: 3,
		username: 'arivera',
		password: 'L9k#t41',
		role: 'Data Analyst',
		department: 'Business Intelligence',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99d'),
		id: 4,
		username: 'npatel',
		password: 'R5z$u67',
		role: 'Finance Specialist',
		department: 'Finance',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99e'),
		id: 5,
		username: 'mchen',
		password: 'W1d&n24',
		role: 'UX Designer',
		department: 'Product Design',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99f'),
		id: 6,
		username: 'dwilson',
		password: 'E8c!r52',
		role: 'IT Support Technician',
		department: 'IT Operations',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a0'),
		id: 7,
		username: 'lgarcia',
		password: 'T3h@q90',
		role: 'Marketing Coordinator',
		department: 'Marketing',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a1'),
		id: 8,
		username: 'bnguyen',
		password: 'Y6p#s38',
		role: 'Legal Assistant',
		department: 'Legal',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a2'),
		id: 9,
		username: 'ksingh',
		password: 'U4j$k75',
		role: 'Sales Development Rep',
		department: 'Sales',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a3'),
		id: 10,
		username: 'ojohnson',
		password: 'I0b&v29',
		role: 'Customer Success Associate',
		department: 'Customer Success',
	},
	{
		_id: new ObjectId('6a7e17949762e1fae9e161f0'),
		username: 'hsapough',
		password: 'abc123',
		role: 'lawyer',
		department: 'intellectual property',
		id: 11,
	},
];

const SEED_TASKS = [
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c150f'),
		id: 1,
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		text: 'Watch onboarding videos',
		completed: false,
		createdAt: new Date('2026-08-13T15:55:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1510'),
		id: 2,
		userId: new ObjectId('6a7de7826893b4d54357d99b'),
		text: 'Complete HR paperwork',
		completed: false,
		createdAt: new Date('2026-08-13T16:00:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1511'),
		id: 3,
		userId: new ObjectId('6a7de7826893b4d54357d99c'),
		text: 'Set up company email signature',
		completed: false,
		createdAt: new Date('2026-08-13T16:05:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1512'),
		id: 4,
		userId: new ObjectId('6a7de7826893b4d54357d99d'),
		text: 'Enroll in benefits portal',
		completed: false,
		createdAt: new Date('2026-08-13T16:10:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1513'),
		id: 5,
		userId: new ObjectId('6a7de7826893b4d54357d99e'),
		text: 'Read employee handbook',
		completed: false,
		createdAt: new Date('2026-08-13T16:15:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1514'),
		id: 6,
		userId: new ObjectId('6a7de7826893b4d54357d99f'),
		text: 'Join team communication channels',
		completed: false,
		createdAt: new Date('2026-08-13T16:20:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1515'),
		id: 7,
		userId: new ObjectId('6a7de7826893b4d54357d9a0'),
		text: 'Schedule manager introduction meeting',
		completed: false,
		createdAt: new Date('2026-08-13T16:25:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1516'),
		id: 8,
		userId: new ObjectId('6a7de7826893b4d54357d9a1'),
		text: 'Configure MFA on all accounts',
		completed: false,
		createdAt: new Date('2026-08-13T16:30:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1517'),
		id: 9,
		userId: new ObjectId('6a7de7826893b4d54357d9a2'),
		text: 'Review security awareness training',
		completed: false,
		createdAt: new Date('2026-08-13T16:35:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1518'),
		id: 10,
		userId: new ObjectId('6a7de7826893b4d54357d9a3'),
		text: 'Submit first-week onboarding checklist',
		completed: false,
		createdAt: new Date('2026-08-13T16:40:43.000Z'),
	},
];

async function initDatabase() {
	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();

		const db = client.db(DB_NAME);
		const usersCollection = db.collection('users');
		const tasksCollection = db.collection('tasks');
		const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
		const existingNames = new Set(existingCollections.map((collection) => collection.name));

		for (const collectionName of COLLECTIONS) {
			if (!existingNames.has(collectionName)) {
				await db.createCollection(collectionName);
				console.log(`Created collection: ${collectionName}`);
			} else {
				console.log(`Collection already exists: ${collectionName}`);
			}
		}

		await tasksCollection.deleteMany({});
		await usersCollection.deleteMany({});

		await usersCollection.insertMany(SEED_USERS);
		console.log(`Replaced users collection with ${SEED_USERS.length} documents`);

		await tasksCollection.insertMany(SEED_TASKS);
		console.log(`Replaced tasks collection with ${SEED_TASKS.length} documents`);

		console.log(`Database initialized: ${DB_NAME}`);
	} catch (error) {
		console.error('Database initialization failed.');
		console.error(error);
		process.exitCode = 1;
	} finally {
		await client.close();
	}
}

initDatabase();
