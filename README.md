# Taskflow

## Overview

Taskflow is a Dockerized full-stack task management app. It lets a user register or log in, create projects, create tasks inside those projects, filter and paginate task data, and inspect simple per-project stats.

Tech stack:

- Frontend: React, TypeScript, Vite, Axios
- Backend: Go, Gin, JWT auth, bcrypt password hashing
- Database: PostgreSQL 15
- Local orchestration: Docker Compose

## Architecture Decisions

- I split the app into three services in `docker-compose.yml`: frontend, backend, and Postgres. That keeps the reviewer setup simple and makes the stack reproducible with only Docker installed.
- The backend is a small Gin API with handlers grouped by domain (`auth`, `project`, `task`) instead of a heavier layered architecture. That keeps the code easy to follow for a project of this size, at the cost of less abstraction if the codebase grows significantly.
- I used application-driven versioned migrations in [backend/migrations.go](/c:/Users/vinod/OneDrive/Desktop/Greening/backend/migrations.go) so schema changes are explicit and replayable on startup.
- Pagination logic lives in [backend/pagination.go](/c:/Users/vinod/OneDrive/Desktop/Greening/backend/pagination.go) and is shared by both project and task listing endpoints to avoid duplicating query parsing.
- JWT auth is stateless and simple for a single-page app, but the tradeoff is there is no token refresh or revocation flow yet.
- I intentionally kept authorization coarse-grained: a user can only access their own projects, but there is no team collaboration model, role system, audit logging, or soft delete support.
- I also left out a dedicated API docs collection format like Postman/Bruno and instead documented the routes directly in this README to keep the submission self-contained.

## Running Locally

From a fresh clone, these are the exact commands:

```bash
git clone https://github.com/vandanamv/taskflow-vandanamv
cd taskflow-vandanamv
cp .env.example .env
docker compose up --build
```

Once the containers are healthy:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- Health check: `http://localhost:8080/health`

The frontend is already configured to talk to the backend through `VITE_API_BASE_URL=http://localhost:8080`.

## Running Migrations

Migrations run automatically when the backend container starts. No separate manual command is required for normal local setup.

```bash
docker compose up --build
```

Implementation details:

- Migration definitions: [backend/migrations.go](/c:/Users/vinod/OneDrive/Desktop/Greening/backend/migrations.go)
- Startup hook: [backend/db.go](/c:/Users/vinod/OneDrive/Desktop/Greening/backend/db.go)

## Test Credentials

A seed user is created automatically during backend startup so the reviewer can log in immediately without registering:

- Email: `vas1@gmail.com`
- Password: `1234`

## API Reference

Base URL: `http://localhost:8080`

Protected endpoints require:

```http
Authorization: Bearer <jwt-token>
```

### `GET /health`

Response:

```json
{
  "status": "ok"
}
```

### `POST /auth/register`

Request:

```json
{
  "name": "Jane Reviewer",
  "email": "jane@example.com",
  "password": "Password123!"
}
```

Response:

```json
{
  "message": "user created"
}
```

### `POST /auth/login`

Request:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "<jwt-token>"
}
```

### `GET /protected`

Response:

```json
{
  "message": "you are authorized",
  "user_id": "<user-uuid>"
}
```

### `POST /projects`

Request:

```json
{
  "name": "Website Redesign",
  "description": "Marketing site refresh"
}
```

Response:

```json
{
  "id": "<project-uuid>",
  "name": "Website Redesign",
  "description": "Marketing site refresh"
}
```

### `GET /projects?page=1&limit=10`

Response:

```json
{
  "projects": [
    {
      "id": "<project-uuid>",
      "name": "Website Redesign",
      "description": "Marketing site refresh",
      "total_tasks": 3,
      "counts": {
        "todo": 1,
        "in_progress": 1,
        "done": 1
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

### `GET /projects/:id`

Response:

```json
{
  "id": "<project-uuid>",
  "name": "Website Redesign",
  "description": "Marketing site refresh",
  "tasks": [
    {
      "id": "<task-uuid>",
      "title": "Design homepage",
      "description": "Create first draft",
      "status": "todo",
      "priority": "high",
      "assignee_id": "<user-uuid>",
      "due_date": "2026-04-30"
    }
  ]
}
```

### `GET /projects/:id/stats`

Response:

```json
{
  "project_id": "<project-uuid>",
  "by_status": {
    "todo": 1,
    "in_progress": 1,
    "done": 1
  },
  "by_assignee": {
    "<user-uuid>": 2,
    "unassigned": 1
  }
}
```

### `DELETE /projects/:id`

Response:

```json
{
  "message": "project deleted"
}
```

### `POST /projects/:id/tasks`

Request:

```json
{
  "title": "Design homepage",
  "description": "Create first draft",
  "status": "todo",
  "priority": "high",
  "assignee_id": "<user-uuid>",
  "due_date": "2026-04-30"
}
```

Response:

```json
{
  "id": "<task-uuid>",
  "title": "Design homepage",
  "description": "Create first draft",
  "status": "todo",
  "priority": "high",
  "assignee_id": "<user-uuid>",
  "due_date": "2026-04-30"
}
```

If `assignee_id` is omitted, the backend assigns the task to the authenticated user.

### `GET /projects/:id/tasks?page=1&limit=10&status=todo&assignee=<user-uuid>`

Query params:

- `page` and `limit` for pagination
- `status` to filter by `todo`, `in_progress`, or `done`
- `assignee` to filter by assignee UUID

Response:

```json
{
  "tasks": [
    {
      "id": "<task-uuid>",
      "title": "Design homepage",
      "description": "Create first draft",
      "status": "todo",
      "priority": "high",
      "assignee_id": "<user-uuid>",
      "due_date": "2026-04-30"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

### `PATCH /tasks/:id`

Request:

```json
{
  "status": "done",
  "priority": "medium"
}
```

Response:

```json
{
  "message": "task updated"
}
```

### `DELETE /tasks/:id`

Response:

```json
{
  "message": "task deleted"
}
```

## What You'd Do With More Time

- Add stronger request validation so required fields, enum values, and malformed dates fail with clearer error messages.
- Tighten task update behavior by whitelisting patchable fields instead of dynamically building SQL from arbitrary JSON keys.
- Add a proper integration-test database lifecycle inside Docker so tests can run in one command without relying on an already-available local Postgres instance.
- Improve API documentation by checking in a Postman or Bruno collection alongside the README examples.
- Expand the data model with collaborators, per-project membership, and role-based permissions so projects can be shared safely.
- Add frontend polish around loading, empty, and error states, especially for project stats and filtered task views.
