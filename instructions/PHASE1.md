# Capstone Phase 1: Intelligent Onboarding Assistant

## Scenario

ADP hires thousands of people a year. Every new hire needs role-specific guidance, a task list for their first few weeks, and a clear plan for their first 30-90 days. Today, most of that comes from a scattered mix of PDFs, emails, and asking a manager who's a very busy person.

Your team is building the first version of an AI-powered Onboarding Assistant that generates a personalized onboarding task list for new hires. New hires can ask questions and get natural language answers through a chat interface. You know this problem better than most people who'd build it - you're living it right now!

This phase is about proving the idea works end to end. Simple beats clever. Every piece of the app should be small, real, and connected.

## Learning Objectives

By the end of this phase, your team will:

- Build a React front end that collects user input and displays AI-generated responses
- Use client-side routing to make your React app a multi-page app and control which pages a visitor can reach
- Implement a REST API with Node.js, Express, and MongoDB to persist application data
- Build a Python/FastAPI service that uses LangChain to generate responses from an LLM
- Connect the three independently-running parts into one working application
- Use GitHub Copilot to work productively in tech you're still learning

## Team and Timeline

Your instructor will assign you to a team of 2-5. This team continues into Phase 2, so the decisions you make now - architecture, naming, structure, style - are ones you'll live with later.

You have about 3.5 days. You'll present a working demo to the class and to ADP managers at the end of this phase.

## Framework and Tools

| Part | Tech |
|---|---|
| Front end | React + TypeScript |
| Database API | Node.js + Express + MongoDB |
| Inference server | Python + FastAPI + LangChain |

Your three parts run on different ports, which means CORS - configure each server to send a CORS header, or your calls will fail silently in the browser console before they ever reach your own code.

There's no starter repo. Set up each piece from scratch - `npm create vite`, `npm init`, a Python virtual environment, whatever your team is comfortable with. Use GitHub Copilot freely, **especially** for the Python/LangChain/FastAPI pieces - the class has only briefly covered that stack, and Copilot can close that gap. Using Copilot is exactly the point of this exercise.

## Requirements

Build three parts that run independently and talk to each other over HTTP. Every requirement below is required - there is no optional tier in this phase. Get all of it working before you polish anything or add anything extra.

### Front end (React + TypeScript)

A small multi-page app with four views:

- **Home** - a landing page with links to Plan, Login, and Register
- **Register** - a form collecting username, password, role, and department. On success, log the new hire in and go straight to the Plan view - no need to make them log in again right after registering
- **Login** - a form collecting username and password. On success, go to the Plan view; on failure, show an error
- **Plan** - only reachable once someone has registered or logged in this session (otherwise, send them to Login). Combines the chat interface (ask a question, see the assistant's response) with the generated task list, where each task has a checkbox to mark it complete

### Database API (Node/Express + MongoDB)

- `POST /register` - create a new hire account (username, password, role, department); reject a duplicate username
- `POST /login` - check a username/password pair against MongoDB; return the matching user's profile if found, an error if not
- `GET /users/:id/tasks` - fetch the task list for a user
- `POST /users/:id/tasks` - save an AI-generated task list for a user
- `PATCH /tasks/:id/complete` - update a task's completed status (true or false, so a checkbox can be checked and unchecked)
- Everything persisted in MongoDB, passwords stored as plain text

This is intentionally not secure: no password hashing, no sessions, no tokens, and nothing stops one browser from calling another user's routes directly. That's fine for this phase - it exists to make the demo flow (register, log in, see your plan) feel real, not to be an actual security boundary. Phase 2 replaces this with the real thing.

### Suggested Data Model

This is a **suggested** starting structure, not a requirement. MongoDB doesn't force a schema, and your team is free to design something different - just make sure whatever you build can support the routes above.

**`users`**

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `username` | string | unique; used to log in |
| `password` | string | stored as plain text this phase - see note above |
| `role` | string | job title, e.g. "Software Engineer" - used as context for the LLM |
| `department` | string | |

**`tasks`**

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | references `users._id` |
| `text` | string | one onboarding task |
| `completed` | boolean | defaults to `false` |
| `createdAt` | Date | |

One document per task, referencing its owner by `userId`, rather than an array of tasks embedded in the user document. This keeps each task individually addressable and easy to query.

### Inference server (Python/FastAPI + LangChain)

- `POST /ask` - accepts role/department context and a question, returns an AI-generated answer
- `POST /plan` - accepts role/department context, returns a generated onboarding task list
- Built with a straightforward LangChain chain: prompt template to LLM to output parser
- No retrieval, no agent framework needed - plain prompt engineering is the goal here

### Wiring it together

- The front end calls the database API to register, log in, and store/fetch/complete tasks
- The front end calls the inference server (directly or via the database API - your team's choice) to get answers and generated plans
- A user can, in one sitting: register or log in, ask a question, get an answer, see a generated task list, and check a task off as complete

## Out of Scope

This phase is deliberately narrow. None of the following are missing requirements. They're excluded on purpose, and building them now won't earn extra credit:

- **Real security** - no password hashing, no JWT, no sessions, no server-side enforcement. The login you build only gates the front end; the API itself still answers anyone who calls it directly. That gets fixed next phase.
- **Memory of past conversations** - each question can be answered on its own, with no history to store or recall.
- **Looking things up in outside documents** - the assistant should answer from the prompt alone.
- **Multiple reasoning steps or decision points in the inference server** - one chain (prompt to LLM to parser) is the whole thing.
- **A second kind of user, like an admin or manager view** - there's exactly one kind of user this phase: the new hire.
- **Deployment, containers, or CI/CD** - running all three parts locally is enough for your demo.

If you finish early, don't fill the extra time with anything on this list.

## Definition of Done

Your app is done when a new hire can open the front end, register (or log back in), ask a question and get an LLM-generated answer, see a generated task list, and check tasks off as they're done - with nothing hardcoded and no layer faked out. All three parts should be running and actually talking to each other during your demo.

**Finish everything above before you build anything extra.** A complete, simple app that meets every requirement will score better than an impressive feature bolted onto a broken pipeline. If your team finishes early, hold onto your ideas for improvements - you'll get a chance to come back to this app and take it much further.

## Presentation

Your team will demo the working app to the class and to ADP managers. Be ready to:

- Present using a slide deck with an introduction to your team, the application you built, challenges you faced, and things you learned. Your audience includes non-technical ADP managers - the deck carries the story; only walk through code if there's a specific part your team is proud of.
- Explain the three parts and show them running.
- Demo the golden path: register a user, ask a question, view a generated task list, and check off a few tasks

## Additional Resources

- [LangChain documentation](https://python.langchain.com/)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [React documentation](https://react.dev/)
- [React Router documentation](https://reactrouter.com/)
- [MongoDB Node.js driver documentation](https://www.mongodb.com/docs/drivers/node/current/)
