# newHireChatBot
Capstone 1 Project for a New Hire Chat Bot that allows the user to generate onboarding tasks, track, them and mark them as complete.

## MongoDB Setup

Use the initialization script in the `server` folder to create the `chatbotdb` database and required collections (`users`, `tasks`).

Important: this script resets data. Each time you run it, it deletes existing documents in `users` and `tasks` and inserts the seed data defined in `server/scripts/init-db.cjs`.

1. Start MongoDB locally (default URI: `mongodb://localhost:27017`).
2. Open a terminal in the `server` directory.
3. Install dependencies:

```bash
npm install
```

4. Initialize the database:

```bash
npm run db:init
```

Expected result:

- `chatbotdb` exists
- `users` and `tasks` collections exist
- existing documents in those collections are replaced with the script's seed data

Optional: to use a different MongoDB connection, set `MONGODB_URI` before running the script.

PowerShell example:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017"
npm run db:init
```
