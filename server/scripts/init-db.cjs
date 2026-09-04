const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'chatbotdb';
const COLLECTIONS = ['users', 'tasks', 'flags', 'progressEvents'];

const SEED_USERS = [
	{
		_id: new ObjectId('6a7de7826893b4d54357d99a'),
		id: 1,
		username: 'csmiley',
		password: 'A7m!x19',
		passwordHash: '$2b$10$K7dQfZ1aVxUuR3nLpS9oYeJ4mHtCwB6xNvA2rGkD8sTiQyE5uZbWm',
		userType: 'new_hire',
		role: 'New Hire Engineer',
		department: 'Global Product Technology',
		plan30Day:
			'Focus your first month on getting productive inside the Global Product Technology codebase. Pair with your onboarding buddy to get your local environment, repository access, and CI credentials working end to end, then read through the service you will own until you can describe its request path out loud. Ship at least two small, low-risk pull requests so you learn the review and deploy process on changes where mistakes are cheap. Attend every standup and sprint ceremony as an observer first, and keep a running list of unfamiliar terms to walk through with your manager each week.',
		plan60Day:
			'By day 60 you should be picking up standard sprint tickets without hand-holding. Take ownership of a small feature from design discussion through deployment, including writing tests and updating documentation. Start participating in code review as a reviewer, not just an author, since reading other people\'s changes is the fastest way to learn the wider system. Shadow one on-call rotation to see how incidents are triaged, and meet with two engineers outside your immediate team to understand how your service fits the larger product.',
		plan90Day:
			'In your third month you move from executing work to shaping it. Own a meaningful slice of a roadmap feature, break it into tasks yourself, and communicate progress and risks proactively in sprint planning. Take a primary on-call shift with a backup engineer available. Identify one piece of technical debt or tooling friction you hit during onboarding, write up a short proposal, and drive the fix. By the end of the quarter you and your manager should be able to name the area of the codebase you are becoming the go-to person for.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99b'),
		id: 2,
		username: 'jthomas',
		password: 'Q2v@p83',
		passwordHash: '$2b$10$M9wTgY4bNzXqL8kJhR2vCeP6sD1uF7aOiB3xZrKtQnVyE0cWmSdGu',
		userType: 'manager',
		role: 'HR Associate',
		department: 'Human Resources',
		plan30Day: '',
		plan60Day: '',
		plan90Day: '',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99c'),
		id: 3,
		username: 'arivera',
		password: 'L9k#t41',
		passwordHash: '$2b$10$T4rBvC8mQwZxK1nHjP5oLeS9uD3aF6yNiG7tXcRkVbEqM2sWzYdOu',
		userType: 'new_hire',
		role: 'Data Analyst',
		department: 'Business Intelligence',
		plan30Day:
			'Spend your first 30 days learning where Business Intelligence data actually comes from. Get read access to the warehouse, walk the main pipelines with a senior analyst, and document which tables are authoritative versus which are legacy copies nobody has retired yet. Reproduce two existing recurring reports from scratch so you can verify you understand the definitions behind the metrics, especially anything involving headcount or revenue where the business has specific conventions. Ask about naming standards early rather than inventing your own.',
		plan60Day:
			'Month two is about producing analysis other people rely on. Take over one recurring report end to end, including its refresh schedule and stakeholder communication. Build a dashboard from a real request rather than a practice exercise, and sit with the requester afterward to see whether it actually answered their question. Deepen your SQL and visualization tooling skills on the specific stack this team uses, and start flagging data quality issues you notice instead of quietly working around them.',
		plan90Day:
			'By day 90 you should be trusted to scope an ambiguous question into an answerable analysis. Partner directly with one business stakeholder, translate their vague ask into defined metrics, deliver the analysis, and present the findings yourself. Contribute an improvement to a shared pipeline or data model. Aim to be the person on the team who knows one subject area, such as onboarding funnel or retention, well enough that others route questions about it to you.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99d'),
		id: 4,
		username: 'npatel',
		password: 'R5z$u67',
		passwordHash: '$2b$10$P8hNxD2vLqYwZ5kTjB7oReM4sC1uG9aFiK6tXbRnVcEyQ3sWmZdJu',
		userType: 'new_hire',
		role: 'Finance Specialist',
		department: 'Finance',
		plan30Day:
			'Your first month in Finance is about controls and calendars before it is about analysis. Learn the monthly close calendar and where your work sits inside it, get access to the general ledger and reporting systems, and complete all required compliance and segregation-of-duties training. Shadow a full close cycle without owning any deliverable, taking notes on which reconciliations are manual and why. Understand the approval thresholds that govern what you can process on your own.',
		plan60Day:
			'In month two, own a defined piece of the close. Prepare assigned reconciliations and journal entries with a reviewer checking your work, and get comfortable explaining variances rather than just reporting them. Build working relationships with the business partners whose cost centers you support, since accurate numbers depend on them telling you about changes early. Start learning the reporting tools well enough to answer routine questions without escalating.',
		plan90Day:
			'By the end of the quarter you should close your area with light review rather than close supervision. Deliver variance commentary that a business partner can act on, and support at least one forecast or budget cycle. Identify one manual reconciliation or recurring rework loop you encountered and propose a documented improvement. Accuracy and on-time delivery come first here; process improvement is the bonus once the fundamentals are reliable.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99e'),
		id: 5,
		username: 'mchen',
		password: 'W1d&n24',
		passwordHash: '$2b$10$B3kVzR7mTqXwN9jYhL5oPeD2sF8uC4aGiJ1tZcRbVnEyK6sWmQdHu',
		userType: 'new_hire',
		role: 'UX Designer',
		department: 'Product Design',
		plan30Day:
			'Start by absorbing the existing design language rather than redesigning it. Get into the design system files, learn which components are shipped and supported versus experimental, and read the last two quarters of user research so you inherit what the team already knows. Sit in on customer calls or usability sessions as an observer. Deliver one small, well-scoped design contribution, such as a component variant or a single screen, to learn the critique and handoff process on low-stakes work.',
		plan60Day:
			'Month two, own a full feature flow from problem framing through developer handoff. Run your work through design critique and iterate on the feedback visibly. Partner directly with the engineers implementing your designs so you learn the platform constraints firsthand, and validate at least one design decision with real user input rather than internal opinion. Begin contributing back to the design system instead of only consuming it.',
		plan90Day:
			'By day 90 you should be a design voice in product planning, not just a downstream executor. Lead the design side of a roadmap initiative, including facilitating a workshop or research session with cross-functional partners. Advocate for accessibility and consistency in reviews of other designers\' work. Establish yourself as the design owner of a specific product surface that PMs and engineers come to directly.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d99f'),
		id: 6,
		username: 'dwilson',
		password: 'E8c!r52',
		passwordHash: '$2b$10$X5nQmT9vBqLwZ2kRjH7oCeP4sD6uF1aNiG8tYcVbRkEyM3sWzJdPu',
		userType: 'new_hire',
		role: 'IT Support Technician',
		department: 'IT Operations',
		plan30Day:
			'Your first 30 days center on the ticket queue and the tools behind it. Complete security and access-management training, get your admin credentials provisioned, and learn the escalation tiers so you know what you can resolve and what must go up. Shadow a senior technician for the first two weeks, then start handling password resets, account provisioning, and standard hardware requests yourself. Document every fix you make, since your notes become the knowledge base for the next hire.',
		plan60Day:
			'In month two, take independent ownership of tier-one and routine tier-two tickets with your resolution times tracked against team targets. Learn the imaging and endpoint management tooling well enough to prepare machines without supervision. Participate in a scheduled maintenance window to see how planned changes differ from break-fix work, and start recognizing repeat issues that signal an underlying problem rather than isolated user error.',
		plan90Day:
			'By day 90 you should be handling escalations rather than only receiving them, and covering a support shift on your own. Own one recurring problem end to end: identify the root cause, implement or propose a permanent fix, and write the knowledge base article. Take responsibility for a small piece of infrastructure or a tooling improvement that reduces ticket volume for the whole team.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a0'),
		id: 7,
		username: 'lgarcia',
		password: 'T3h@q90',
		passwordHash: '$2b$10$D7sKvN3mZqYwR8jThB5oLeX2uC9aF4iG6tPcRbVnEyQ1sWmKzJdTu',
		userType: 'new_hire',
		role: 'Marketing Coordinator',
		department: 'Marketing',
		plan30Day:
			'Use your first month to learn the audience and the brand voice before producing anything public-facing. Read the messaging guidelines, review the last two campaigns including their performance data, and get access to the marketing automation, analytics, and asset management tools. Support an in-flight campaign in a coordinating capacity so you see how a project moves from brief to launch. Draft internal-facing copy first, where the review cycle is forgiving.',
		plan60Day:
			'Month two, own the coordination of a small campaign or channel: build the timeline, chase the dependencies, and keep stakeholders informed. Publish external content that has gone through the normal review process, and learn to read the analytics dashboards well enough to report on what your work actually did. Build working relationships with the design and sales counterparts you depend on, since most delays in this role are handoff delays.',
		plan90Day:
			'By the end of the quarter you should be proposing campaigns, not just executing them. Bring a data-supported recommendation to a planning meeting and own the resulting project through launch and post-mortem. Take primary responsibility for one channel or content stream and report on its performance regularly. Aim to be the person who knows the campaign calendar cold and can tell others what is shipping when.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a1'),
		id: 8,
		username: 'bnguyen',
		password: 'Y6p#s38',
		passwordHash: '$2b$10$G2tRvB6mXqZwK9nHjD4oSeP7uC5aF3iN8tYcLbVrEyQ1sWmKzJdBu',
		userType: 'new_hire',
		role: 'Legal Assistant',
		department: 'Legal',
		plan30Day:
			'Begin with confidentiality, privilege, and records management training, because in Legal those rules govern everything else you touch. Learn the matter management and document systems, the filing conventions, and the retention schedule. Shadow attorneys on routine contract intake to see how requests are triaged and what a complete file looks like. Understand clearly where the line sits between administrative support and anything resembling legal advice.',
		plan60Day:
			'In month two, take independent responsibility for contract intake, routing, and tracking on standard agreements, with attorney review at the points that require it. Prepare first drafts of routine documents from approved templates and manage signature workflows end to end. Learn the deadline-tracking process thoroughly, since missed dates are the highest-consequence failure mode in this role.',
		plan90Day:
			'By day 90 you should be running the operational side of a matter type with minimal supervision, keeping files, deadlines, and status reporting accurate without prompting. Support a larger project such as a compliance review or a policy update. Identify one workflow that depends on individual memory rather than a documented process and propose a fix. Reliability and discretion are what earn expanded responsibility here.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a2'),
		id: 9,
		username: 'ksingh',
		password: 'U4j$k75',
		passwordHash: '$2b$10$N6yQwT8vCqBwL3kRjM5oZeD9uF2aG7iX4tPcRbVnEyK1sWmHzJdSu',
		userType: 'new_hire',
		role: 'Sales Development Rep',
		department: 'Sales',
		plan30Day:
			'Your first month is product knowledge and process mechanics. Complete sales onboarding, learn the CRM and sequencing tools until logging activity is automatic, and be able to deliver the core pitch and handle the five most common objections from memory. Listen to recorded calls daily and shadow a senior rep live. Begin light prospecting under supervision so you build the research habit before volume ramps up.',
		plan60Day:
			'Month two you carry a real activity target. Run your own outbound cadences, book qualified meetings, and hand them off cleanly to account executives with notes they can actually use. Get comfortable with discovery questions rather than pitching immediately. Review your own call recordings weekly with your manager and work on one specific skill at a time instead of trying to fix everything at once.',
		plan90Day:
			'By day 90 you should be consistently hitting quota with a self-managed pipeline. Own your territory or segment research, maintain accurate forecasting hygiene in the CRM, and start contributing what is working back to the team, whether that is a message that lands or an objection pattern worth naming. Sustained, predictable activity matters more here than any single big week.',
	},
	{
		_id: new ObjectId('6a7de7826893b4d54357d9a3'),
		id: 10,
		username: 'ojohnson',
		password: 'I0b&v29',
		passwordHash: '$2b$10$V9cKwR4mYqTwB7nZjP3oHeS5uD8aF6iL2tXcRbVnEyQ1sWmGzJdCu',
		userType: 'new_hire',
		role: 'Customer Success Associate',
		department: 'Customer Success',
		plan30Day:
			'Spend your first month learning the product from the customer\'s side. Complete product training, get access to the CRM and support tooling, and shadow renewal and onboarding calls across several account types. Read through recent escalations to understand what actually goes wrong for customers and how the team responds. Start handling low-complexity inbound questions with a teammate reviewing your responses.',
		plan60Day:
			'Month two, take ownership of a small book of accounts. Run your own check-in calls, track health indicators, and document account context so anyone covering for you can pick it up. Learn to spot early churn signals such as declining usage or a departed champion, and escalate them before they become renewals at risk. Build a working relationship with the support and product teams you will need when a customer hits a real problem.',
		plan90Day:
			'By day 90 you should be managing your accounts independently, including leading a renewal or expansion conversation with light coaching. Turn recurring customer feedback into a structured summary for the product team rather than one-off anecdotes. Own the outcomes for your segment: retention, adoption, and the customer relationship itself, and be the person your accounts contact first.',
	},
	{
		_id: new ObjectId('6a7e17949762e1fae9e161f0'),
		username: 'hsapough',
		password: 'abc123',
		passwordHash: '$2b$10$H4mZvQ7bKqXwT2nRjC9oNeP6uD1aF5iY3tLcRbVnEyQ8sWmKzJdIu',
		userType: 'manager',
		role: 'lawyer',
		department: 'intellectual property',
		plan30Day: '',
		plan60Day: '',
		plan90Day: '',
		id: 11,
	},
];

const SEED_TASKS = [
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c150f'),
		id: 1,
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		text: 'Watch onboarding videos',
		completed: true,
		completedAt: new Date('2026-08-15T18:20:00.000Z'),
		createdAt: new Date('2026-08-13T15:55:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1510'),
		id: 2,
		userId: new ObjectId('6a7de7826893b4d54357d99b'),
		text: 'Complete HR paperwork',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:00:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1511'),
		id: 3,
		userId: new ObjectId('6a7de7826893b4d54357d99c'),
		text: 'Set up company email signature',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:05:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1512'),
		id: 4,
		userId: new ObjectId('6a7de7826893b4d54357d99d'),
		text: 'Enroll in benefits portal',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:10:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1513'),
		id: 5,
		userId: new ObjectId('6a7de7826893b4d54357d99e'),
		text: 'Read employee handbook',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:15:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1514'),
		id: 6,
		userId: new ObjectId('6a7de7826893b4d54357d99f'),
		text: 'Join team communication channels',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:20:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1515'),
		id: 7,
		userId: new ObjectId('6a7de7826893b4d54357d9a0'),
		text: 'Schedule manager introduction meeting',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:25:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1516'),
		id: 8,
		userId: new ObjectId('6a7de7826893b4d54357d9a1'),
		text: 'Configure MFA on all accounts',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:30:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1517'),
		id: 9,
		userId: new ObjectId('6a7de7826893b4d54357d9a2'),
		text: 'Review security awareness training',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:35:43.000Z'),
	},
	{
		_id: new ObjectId('6a7de9aab1f9081dd80c1518'),
		id: 10,
		userId: new ObjectId('6a7de7826893b4d54357d9a3'),
		text: 'Submit first-week onboarding checklist',
		completed: false,
		completedAt: null,
		createdAt: new Date('2026-08-13T16:40:43.000Z'),
	},
];

const SEED_FLAGS = [
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70001'),
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		reason: 'Confused about what RESTful APIs are',
		resolved: false,
		createdAt: new Date('2026-09-04T13:00:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70002'),
		userId: new ObjectId('6a7de7826893b4d54357d99b'),
		reason: 'Asked the same benefits enrollment question three times',
		resolved: false,
		createdAt: new Date('2026-09-04T13:15:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70003'),
		userId: new ObjectId('6a7de7826893b4d54357d99c'),
		reason: 'Stated they are stuck on setting up the reporting database access',
		resolved: false,
		createdAt: new Date('2026-09-04T13:30:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70004'),
		userId: new ObjectId('6a7de7826893b4d54357d99d'),
		reason: 'No task completed in the last five days',
		resolved: true,
		createdAt: new Date('2026-09-04T13:45:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70005'),
		userId: new ObjectId('6a7de7826893b4d54357d99e'),
		reason: 'Requested a 30-day plan change: design tooling access delayed',
		resolved: false,
		createdAt: new Date('2026-09-04T14:00:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70006'),
		userId: new ObjectId('6a7de7826893b4d54357d99f'),
		reason: 'Unable to complete MFA setup, blocked on IT ticket',
		resolved: true,
		createdAt: new Date('2026-09-04T14:15:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70007'),
		userId: new ObjectId('6a7de7826893b4d54357d9a0'),
		reason: 'Asked assistant to remove required security training task',
		resolved: false,
		createdAt: new Date('2026-09-04T14:30:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70008'),
		userId: new ObjectId('6a7de7826893b4d54357d9a1'),
		reason: 'Repeated questions about document retention policy',
		resolved: false,
		createdAt: new Date('2026-09-04T14:45:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b70009'),
		userId: new ObjectId('6a7de7826893b4d54357d9a2'),
		reason: 'Negotiated 60-day plan to add CRM certification',
		resolved: true,
		createdAt: new Date('2026-09-04T15:00:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfa11c2d3e4f5a6b7000a'),
		userId: new ObjectId('6a7de7826893b4d54357d9a3'),
		reason: 'Explicitly said "I am stuck" on the onboarding checklist',
		resolved: false,
		createdAt: new Date('2026-09-04T15:15:00.000Z'),
	},
];

const SEED_PROGRESS_EVENTS = [
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80001'),
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		type: 'plan_created',
		detail: 'Assistant generated initial 30/60/90-day plan for New Hire Engineer',
		timestamp: new Date('2026-08-13T15:55:43.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80002'),
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		type: 'task_added',
		detail: 'Assistant added task "Watch onboarding videos"',
		timestamp: new Date('2026-08-13T15:56:10.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80003'),
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		type: 'task_completed',
		detail: 'Task "Watch onboarding videos" marked complete',
		timestamp: new Date('2026-08-15T18:20:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80004'),
		userId: new ObjectId('6a7de7826893b4d54357d99a'),
		type: 'flag_raised',
		detail: 'Assistant flagged new hire: confused about what RESTful APIs are',
		timestamp: new Date('2026-09-04T13:00:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80005'),
		userId: new ObjectId('6a7de7826893b4d54357d99c'),
		type: 'flag_raised',
		detail: 'Assistant flagged new hire: stuck on setting up reporting database access',
		timestamp: new Date('2026-09-04T13:30:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80006'),
		userId: new ObjectId('6a7de7826893b4d54357d99d'),
		type: 'flag_raised',
		detail: 'Assistant flagged new hire: no task completed in the last five days',
		timestamp: new Date('2026-09-04T13:45:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80007'),
		userId: new ObjectId('6a7de7826893b4d54357d99d'),
		type: 'flag_resolved',
		detail: 'Manager marked flag about five days of no task completion as resolved',
		timestamp: new Date('2026-09-04T16:10:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80008'),
		userId: new ObjectId('6a7de7826893b4d54357d99e'),
		type: 'plan_updated',
		detail: 'Assistant revised plan30Day after design tooling access was delayed',
		timestamp: new Date('2026-09-04T14:00:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c80009'),
		userId: new ObjectId('6a7de7826893b4d54357d99f'),
		type: 'flag_resolved',
		detail: 'Manager marked flag about blocked MFA setup as resolved',
		timestamp: new Date('2026-09-04T16:25:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c8000a'),
		userId: new ObjectId('6a7de7826893b4d54357d9a0'),
		type: 'task_edited',
		detail: 'Manager reworded task "Schedule manager introduction meeting"',
		timestamp: new Date('2026-09-04T14:35:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c8000b'),
		userId: new ObjectId('6a7de7826893b4d54357d9a2'),
		type: 'plan_updated',
		detail: 'Assistant added CRM certification to plan60Day after new hire pushed back',
		timestamp: new Date('2026-09-04T15:00:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c8000c'),
		userId: new ObjectId('6a7de7826893b4d54357d9a2'),
		type: 'flag_resolved',
		detail: 'Manager marked flag about the 60-day plan negotiation as resolved',
		timestamp: new Date('2026-09-04T16:40:00.000Z'),
	},
	{
		_id: new ObjectId('6a7dfb22d3e4f5a6b7c8000d'),
		userId: new ObjectId('6a7de7826893b4d54357d9a3'),
		type: 'task_deleted',
		detail: 'Manager removed a duplicate onboarding checklist task',
		timestamp: new Date('2026-09-04T15:20:00.000Z'),
	},
];

async function initDatabase() {
	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();

		const db = client.db(DB_NAME);
		const usersCollection = db.collection('users');
		const tasksCollection = db.collection('tasks');
		const flagsCollection = db.collection('flags');
		const progressEventsCollection = db.collection('progressEvents');
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
		await flagsCollection.deleteMany({});
		await progressEventsCollection.deleteMany({});

		await usersCollection.insertMany(SEED_USERS);
		console.log(`Replaced users collection with ${SEED_USERS.length} documents`);

		await tasksCollection.insertMany(SEED_TASKS);
		console.log(`Replaced tasks collection with ${SEED_TASKS.length} documents`);

		await flagsCollection.insertMany(SEED_FLAGS);
		console.log(`Replaced flags collection with ${SEED_FLAGS.length} documents`);

		await progressEventsCollection.insertMany(SEED_PROGRESS_EVENTS);
		console.log(`Replaced progressEvents collection with ${SEED_PROGRESS_EVENTS.length} documents`);

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
