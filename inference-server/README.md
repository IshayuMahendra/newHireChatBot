## Inference Server

FastAPI service for LLM-powered chatbot responses.

## Requirements

- Python 3.12+
- pip

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi "uvicorn[standard]" langchain-core langchain-openai python-dotenv openai
```

## Environment Variables

Create `.env` in this directory:

```env
OPENAI_API_KEY=your_api_key_here
```

## Run Locally

```powershell
uvicorn main:app --reload
```

Service endpoints:

- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`


## Project Structure

- `newHireChatBot/`: Vite + React frontend
- `inference-server/`: FastAPI backend for LLM inference
- `server/`: Additional Node service workspace

## Python Inference Server Setup

The backend Python service lives in `inference-server/` and uses FastAPI.

### Prerequisites

- Python 3.12+ (project currently pinned to 3.13 locally)
- `pip` (comes with Python)

### 1. Create and Activate a Virtual Environment

From the repository root:

```powershell
cd inference-server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If your PowerShell execution policy blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 2. Install Dependencies

Install project dependencies from `pyproject.toml`:

```powershell
pip install fastapi "uvicorn[standard]" langchain-core langchain-openai python-dotenv openai
```

### 3. Configure Environment Variables

Create a `.env` file inside `inference-server/` with values like:

```env
OPENAI_API_KEY=your_api_key_here
```

The `.env` file is gitignored and should never be committed.

### 4. Run the Inference API

From `inference-server/` with the virtual environment active:

```powershell
uvicorn main:app --reload
```

Default local URL:

- `http://127.0.0.1:8000`

FastAPI docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 5. Common Troubleshooting

- If `uvicorn` is not recognized, ensure your virtual environment is activated.
- If API key errors occur, confirm `.env` exists and contains `OPENAI_API_KEY`.
- If import errors occur, reinstall dependencies in the currently active environment.
