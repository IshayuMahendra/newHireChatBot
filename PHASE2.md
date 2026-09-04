# Capstone Phase 2: Intelligent Onboarding Assistant

## Scenario

Your Phase 1 demo worked - a new hire could ask a question and get an answer, and get a generated task list. We want more. A single chat box with no login and no persistent state doesn't hold up once you imagine a manager checking in on dozens of new hires, or a new hire coming back on day 12 expecting the assistant to know where they left off.

This phase picks up where Phase 1 left off. We'll turn your POC (proof of concept) into something closer to a real product. Your Phase 1 login works, but we've taken shortcuts: plaintext passwords and authorization that only exists in the browser. Real security is one of the first things this phase fixes, alongside multiple user types, real accounts, and an assistant that grounds its answers in ADP's actual policy documents instead of guessing.

We're going to add depth. The new hire will not just have tasks, they'll also have 30/60/90-day plans. Since the plans belong to both of them, not just to the manager, a new hire should be able to push back on them - ask for something to be added, argue a timeline is wrong - and have the AI assistant actually reason about the request, not just defer to whatever the manager set.

## Learning Objectives

During this phase, your team will:

- Upgrade a working but insecure login into a properly secured one: hashed passwords, JWT-based sessions, and authentication/authorization enforced as reusable middleware, not ad hoc checks copy-pasted into route handlers
- Design and implement a larger REST API surface with real validation and error handling
- Build an activity log that records key events as they happen, so the app has an audit trail
- Build a Retrieval-Augmented Generation (RAG) pipeline end to end: document ingestion, chunking, embedding, vector storage, and similarity-based retrieval
- Orchestrate a multi-step, stateful agent workflow with LangGraph, chaining context-gathering, retrieval, generation, and adaptation into a single pipeline
- Implement tool-calling (function-calling) in an agentic AI system - an LLM that autonomously decides when to take actions instead of only generating text
- Design grounding and confidence thresholds so agent output is traceable to source data instead of hallucinated
- Apply responsible-AI guardrails to an autonomous agent: scoped tool authority, narrated actions, and declined out-of-scope requests

## Timeline

You have about 4.5 days. You'll close this phase with a presentation to the class and to ADP managers.

Before adding anything new, make sure your Phase 1 foundation is solid - a broken core feature will cost you more here than it did last time, because everything else in this phase builds on top of it.

## Framework and Tools

Same three-part stack as Phase 1, extended:

| Part | Tech |
|---|---|
| Front end | React + TypeScript |
| Database API | Node.js + Express + MongoDB |
| Inference server | Python + FastAPI + LangChain + LangGraph + ChromaDB |

You'll also need a vector store for the RAG pipeline - Chroma is a common lightweight choice that needs no separate server to run.

Keep leaning on GitHub Copilot, especially for the RAG and LangGraph work - both are new this phase and the class coverage of them is brief by design.

## Requirements

Each section below is one capability that's new or changed since Phase 1. Under each, you'll find whichever parts of the stack actually need work - not every requirement touches all four.

### 1. Real, role-aware authentication & authorization

You're going to add real server-side security, and a second user type - `manager` - so the app can enforce who's allowed to see and change what.

**React app**
- Upgrade your existing login to issue and store a real JWT instead of just a plain user object, and add logout
- Unauthenticated users can't reach the app's data

**Database API**
- Add JWT authentication middleware; protect all data routes
- Replace Phase 1's plaintext `password` field with a hashed `passwordHash` - your Phase 1 test accounts won't carry over, since their passwords can't be verified against a hash. Create fresh accounts
- `POST /register` always creates a `new_hire` - never let a client-supplied field set `userType` to `"manager"`, since that would let anyone self-promote to manager. Create at least one manager account by seeding it directly into MongoDB (a script or a manual insert), not through `/register`, so you have one to demo with
- Add authorization on top of authentication, implemented as its own middleware rather than inline checks scattered through your route handlers, and use one rule everywhere: a `new_hire` can only touch their own tasks, plan, and activity log; a `manager` can touch any new hire's tasks, plan, and activity log, plus view and resolve flags. Ownership is the only thing that differs by role - every route uses this same rule
- Your Phase 1 login gate lived entirely in the front end; replace it with real server-side enforcement, so the API itself rejects unauthenticated or unauthorized requests, not just the UI
- Do input validation and error handling on every route in this phase. No silent failures. No unhandled exceptions reaching the client

**Database schema** (`users`, extends Phase 1)

| Field | Type | Notes |
|---|---|---|
| `passwordHash` | string | replaces Phase 1's plaintext `password` |
| `userType` | string | `"new_hire"` or `"manager"` |

### 2. Manager oversight: Team view & flags

A manager needs a way to see all their new hires at once and who needs attention. The Team view lists everyone, flagging the new hires that the AI assistant judges to be stuck.

**React app**
- **Team** (new, manager-only) - the one screen a new hire never sees. Lists every new hire, spotlighting those who have one or more open flags, and is how a manager picks whose Plan or Dashboard to open next. A new hire has no equivalent screen - there's only ever one person for them to look at: themselves
- The only screen a manager has that a new hire doesn't is Team. Past that, Plan and Dashboard are the same screens for both - a manager's edit controls just render on top of them

**Database API**
- `GET /users` - list new hires. A new hire never needs this - there's only ever themselves to look at - so in practice only a manager's front end calls it, to pick who to review
- `POST /flags` - raise a flag on a new hire, called by the inference server when the assistant decides someone needs manager attention
- `GET /flags` - manager-only: list flags so a manager can see who needs attention
- `PATCH /flags/:id` - manager marks a flag resolved
- Log a `progressEvents` entry every time a flag is raised or resolved

**Database schema** (`flags`, new)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | the new hire being flagged |
| `reason` | string | why the assistant raised it |
| `resolved` | boolean | defaults to `false` |
| `createdAt` | Date | |

### 3. Full task management

Phase 1 could only generate a task list and toggle a task complete. Phase 2 lets tasks be added, edited, and removed - directly by a manager, or through the AI assistant for a new hire.

**React app**
- **Plan** - the chat-plus-task-list screen for one specific new hire, same purpose as Phase 1, now shared: a new hire sees their own; a manager sees whichever new hire they picked on Team, with extra controls. A new hire may change their own tasks only by talking to the AI assistant - there's no edit form on their side. A manager instead gets direct add/edit/delete buttons on tasks, skipping the assistant entirely. Marking a task complete looks and works the same for both

**Database API**
- `POST /tasks` - add a task to a new hire's list. New this phase - Phase 1 only ever generated the whole list at once
- `PATCH /tasks/:id` - edit a task's text
- `DELETE /tasks/:id` - remove a task
- Log a `progressEvents` entry every time a task is added, edited, completed, or deleted

**Database schema** (`tasks`, extends Phase 1)

| Field | Type | Notes |
|---|---|---|
| `completedAt` | Date \| null | set when `completed` flips to true - powers the progress timeline |

### 4. 30/60/90-day onboarding plan

New hires now get a narrative plan for their first 30, 60, and 90 days, generated by the assistant. A manager can edit it directly. A new hire can only negotiate changes by talking to the assistant.

**React app**
- The Plan view also shows each new hire's 30/60/90-day plan. A new hire may change it only by talking to the AI assistant - there's no edit form on their side. A manager gets direct edit controls on the plan too, the same as tasks

**Database API**
- `PATCH /users/:id/plan30Day`, `PATCH /users/:id/plan60Day`, `PATCH /users/:id/plan90Day` - one route per window. Each writes exactly one field (`plan30Day`, `plan60Day`, `plan90Day`); never let any of them become a general `PATCH /users/:id`
- Log a `progressEvents` entry every time a plan is created or updated

**Database schema** (`users`, extends Phase 1)

| Field | Type | Notes |
|---|---|---|
| `plan30Day` | string | narrative guidance, not a list. Independent of the other two windows |
| `plan60Day` | string | same idea, days 31-60 |
| `plan90Day` | string | same idea, days 61-90 |

**Inference server**
- Build on your LangGraph workflow that, given a new hire's context, moves through these steps: gather context (role, department, day in onboarding, their current tasks and plan) → retrieve relevant policy/task content via RAG → generate or update a personalized 30/60/90-day plan → adapt the plan as the hire progresses. Each window's plan content is a narrative paragraph. It should read differently for a Software Engineer in Engineering than a Payroll Specialist in Finance. Their current tasks and plan aren't just for this step - the tools in "Agentic actions during conversation" below need that same context to know what they're acting on
- `POST /plan` - your Phase 1 endpoint that generated the initial task list. Extend it to also generate the initial 30/60/90-day plan (`plan30Day`, `plan60Day`, `plan90Day`) through this same workflow - a new hire's first plan shouldn't come from anywhere else
- `POST /plan/update` - re-evaluate and update a hire's plan based on their progress

### 5. Progress dashboard & activity log

For AI transparency, every meaningful change in the app now gets logged. The new Dashboard view turns that log into a visible timeline of a new hire's progress.

**React app**
- **Dashboard** (new) - a second screen for one specific new hire, following the same rule as Plan: a new hire sees their own, a manager sees whichever new hire they picked. Shows that person's task completion, milestones, and a timeline, built from their activity log

**Database API**
- `GET /users/:id/activity` - fetch a user's activity log (their `progressEvents`), for the dashboard timeline and for a manager reviewing a new hire
- Every `progressEvents` entry logged elsewhere in this phase - task changes, plan changes, flag changes - is what this timeline displays. This is a major part of the transparency in responsible AI

**Database schema** (`progressEvents`, new)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `type` | string | e.g. `"task_completed"`, `"plan_updated"` |
| `detail` | string | |
| `timestamp` | Date | |

### 6. Policy-grounded answers (RAG)

Instead of answering policy questions from the model's own guess, the assistant now retrieves and cites ADP's actual HR policy documents.

**React app**
- The chat reply in Plan now includes a citation alongside a grounded policy answer

**Inference server**
- Build a RAG ingestion pipeline for the ADP HR policy documents your instructor provides (you don't need to source or write these yourself): convert them to plain text, clean up formatting artifacts, chunk the text into retrievable pieces, embed the chunks, and store them in a ChromaDB vector database. Tag each chunk with the name of the document it came from as metadata - a citation is only possible if you capture that at ingestion time, since the vector store doesn't track it for you
- Build the retrieval side: given a question, fetch the most relevant chunks from the vector database and have the model answer grounded in them. A citation means naming the source document(s) the answer drew from
- `POST /ask` - your Phase 1 chat endpoint, now answering using the RAG pipeline above, with citations, instead of the plain LangChain chain it used before

### 7. Agentic actions during conversation

The AI assistant isn't just answering questions anymore. You're going to prompt it to reason about and act on a new hire's own tasks, plan, and flags mid-conversation, deciding for itself when an action is warranted.

**Inference server**
- Using LangChain/LangGraph's tool use, give the AI assistant three tools it can call on its own during a conversation:
  - **Manage tasks** - lets the AI assistant add, edit, mark complete, or remove a task on the requesting new hire's own list, based on what they say in conversation. To act on an existing task ("I finished setting up my laptop," "actually drop the mentor intro"), the AI assistant has to resolve that description to a specific task - which is why it needs the new hire's current task list as context. Marking something complete is just executing a stated fact, no reasoning needed. Adding, editing, or removing a task is a judgment call the same way a plan change is: the AI assistant reasons about the request and acts when it holds up, explains why not when it doesn't (see the guardrails below), and raises a flag summarizing what changed. Once it decides to act, it calls `POST /tasks`, `PATCH /tasks/:id`, `PATCH /tasks/:id/complete`, or `DELETE /tasks/:id`, whichever fits
  - **Negotiate the plan** - lets the AI assistant revise one window (`plan30Day`, `plan60Day`, or `plan90Day`) of the requesting new hire's own plan when they push back or ask for something to be added. It identifies which window is being discussed, judges whether the reasoning holds up, and if so, calls that window's `PATCH` route and raises a flag. If the reasoning doesn't hold up, it says why not and writes nothing
  - **Flag for manager review** - lets the AI assistant escalate to a manager when it judges, from the conversation itself, that a new hire is stuck (repeated questions, an explicit "I'm stuck," no progress in days) - independent of whether it's also changing a task or the plan. It calls `POST /flags` with a reason describing what it noticed. This is a separate, standalone tool - Manage tasks and Negotiate the plan don't call it as a sub-step. Each of those creates its own flag directly when it makes a change; this one exists for the "stuck" case on its own
- The AI assistant decides when to use these tools from the conversation itself - don't just wire them to fixed keywords
- **How the assistant decides:** bind all three tools to the model as callable functions (LangChain's `.bind_tools()`), each with a name, description, and parameter schema. The model sees the full tool set on every turn, alongside the conversation. On each turn, the model itself decides whether to reply with plain text or emit a tool call, reasoning from what the new hire actually said. Branch on that decision with a conditional edge in your LangGraph: no tool call in the response means it's the final answer; one or more tool calls means route to a tool-execution node, which does the reasoning-gated write and raises a flag
- **Suggestion:** every data route now requires a valid JWT, but the inference server doesn't have one of its own - it's never logged in. One clean way to let its tools call those routes anyway: have the front end forward its JWT to `/ask`, and have the inference server reuse that same token when a tool calls the database API on the user's behalf
- When the AI assistant manages a task, revises a plan, or raises a flag during a conversation, make sure it's a real write to MongoDB via the database API and not merely a line in the chat reply

### 8. Responsible-AI guardrails

Since the AI can now take agentic actions, you're going to raise guardrails for the AI. You'll limit what it is allowed to touch, when it has to say no, and how it stays transparent about what it did.

**Inference server**
- **Route by topic first.** Questions that read as ADP policy go through RAG. Everything else (how the tools work, general how-do-I questions) can be answered directly - no retrieval, no confidence check needed
- **Ground, cite, and confidence-gate policy answers.** Cite the source document(s) a policy answer drew from, taken from the retrieved chunks' metadata - never let the model generate the citation freely. Pick a similarity-score threshold those chunks must clear; if the best match doesn't clear it, or nothing comes back, that's low confidence - say so instead of guessing
- **Decline certain topics outright.** Legal advice, personal medical questions, compensation negotiation, and the like get declined, regardless of confidence
- **Narrate every autonomous action.** If the assistant adds, edits, completes, or removes a task, changes a plan, or raises a flag, it says so in the same turn - never silently
- **Scope every tool to the requester.** All three tools only ever act on the authenticated new hire making the request, never on someone named in the conversation text
- **Cap the assistant's authority.** Routine, reversible bookkeeping only - tasks and plan revisions. Nothing HR-consequential (time off, pay, benefits), and nothing that reads as a compliance or mandatory requirement (security training, required paperwork), no matter how good the argument. Anything beyond that goes to a human

## Definition of Done

Your app is done when two different logged-in users - one new hire, one manager - can each use the app end to end. The manager picks a new hire and lands on the same Plan view that new hire sees, with edit controls the new hire doesn't have; a direct change the manager makes there is visible to the new hire, and a change the new hire negotiates through the assistant is visible to the manager. The AI assistant answers policy questions with citations, the onboarding plan updates as tasks are completed, and when the assistant manages a task, revises a new hire's plan, or flags them as stuck during a conversation, that shows up in the manager's view.

## Presentation

Your team will demo the app to ADP managers. Be ready to:

- Present using a slide deck with an introduction to your team, the application you built, challenges you faced, and things you learned. Your audience may include non-technical ADP managers who would be lost looking at your code. Use the deck to tell the story; only walk through code if there's a specific part your team is particularly proud of.
- Show the same Plan view from both sides - a manager's direct edit controls, and a new hire without them
- Show a direct API call without a valid token getting rejected, to prove the security upgrade is real and not just hidden in the UI
- Demo a few policy questions answered with citations, and explain how the RAG pipeline found that source
- Demo the AI assistant taking real actions mid-conversation like managing a task, revising a plan, or raising a flag
- Demo a new hire pushing back on their plan or task list and the assistant reasoning about whether to change it, then show the resulting flag in the manager's view

## Additional Resources

- [LangGraph documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain RAG tutorial](https://python.langchain.com/docs/tutorials/rag/)
- [React Router documentation](https://reactrouter.com/)
- [JWT introduction](https://jwt.io/introduction)
- [Chroma documentation](https://docs.trychroma.com/)
- [bcrypt (npm)](https://www.npmjs.com/package/bcrypt)
