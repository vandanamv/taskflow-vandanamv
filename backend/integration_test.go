package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	setTestEnv()
	InitDB()

	code := m.Run()
	_ = DB.Close()
	os.Exit(code)
}

func setTestEnv() {
	_ = os.Setenv("DB_HOST", "localhost")
	_ = os.Setenv("DB_PORT", "5432")
	_ = os.Setenv("DB_USER", "postgres")
	_ = os.Setenv("DB_PASSWORD", "postgres")
	_ = os.Setenv("DB_NAME", "taskflow")
	_ = os.Setenv("JWT_SECRET", "integration-test-secret")
}

func resetDatabase(t *testing.T) {
	t.Helper()

	if _, err := DB.Exec(`TRUNCATE TABLE tasks, projects, users RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("reset database: %v", err)
	}
}

func performJSONRequest(t *testing.T, router http.Handler, method, path string, body any, token string) *httptest.ResponseRecorder {
	t.Helper()

	var payload []byte
	if body != nil {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(payload))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func decodeJSON[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()

	var value T
	if err := json.Unmarshal(rec.Body.Bytes(), &value); err != nil {
		t.Fatalf("decode response: %v body=%s", err, rec.Body.String())
	}

	return value
}

func registerAndLogin(t *testing.T, router http.Handler, email string) string {
	t.Helper()

	registerRec := performJSONRequest(t, router, http.MethodPost, "/auth/register", map[string]string{
		"name":     "Test User",
		"email":    email,
		"password": "Password123!",
	}, "")
	if registerRec.Code != http.StatusCreated {
		t.Fatalf("register failed: status=%d body=%s", registerRec.Code, registerRec.Body.String())
	}

	loginRec := performJSONRequest(t, router, http.MethodPost, "/auth/login", map[string]string{
		"email":    email,
		"password": "Password123!",
	}, "")
	if loginRec.Code != http.StatusOK {
		t.Fatalf("login failed: status=%d body=%s", loginRec.Code, loginRec.Body.String())
	}

	payload := decodeJSON[struct {
		Token string `json:"token"`
	}](t, loginRec)
	if payload.Token == "" {
		t.Fatal("expected token in login response")
	}

	return payload.Token
}

func createProjectForTest(t *testing.T, router http.Handler, token, name string) string {
	t.Helper()

	rec := performJSONRequest(t, router, http.MethodPost, "/projects", map[string]string{
		"name":        name,
		"description": "Integration test project",
	}, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create project failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	payload := decodeJSON[struct {
		ID string `json:"id"`
	}](t, rec)
	return payload.ID
}

func createTaskForTest(t *testing.T, router http.Handler, token, projectID string, body map[string]any) string {
	t.Helper()

	rec := performJSONRequest(t, router, http.MethodPost, fmt.Sprintf("/projects/%s/tasks", projectID), body, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create task failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	payload := decodeJSON[struct {
		ID string `json:"id"`
	}](t, rec)
	return payload.ID
}

func TestRegisterAndLoginIntegration(t *testing.T) {
	resetDatabase(t)
	router := setupRouter()

	token := registerAndLogin(t, router, "auth.integration@example.com")
	if token == "" {
		t.Fatal("expected auth token")
	}
}

func TestProjectsPaginationIntegration(t *testing.T) {
	resetDatabase(t)
	router := setupRouter()
	token := registerAndLogin(t, router, "projects.integration@example.com")

	for i := 1; i <= 3; i++ {
		createProjectForTest(t, router, token, fmt.Sprintf("Project %d", i))
	}

	rec := performJSONRequest(t, router, http.MethodGet, "/projects?page=2&limit=2", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get projects failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	payload := decodeJSON[struct {
		Projects []map[string]any `json:"projects"`
		Meta     struct {
			Page       int `json:"page"`
			Limit      int `json:"limit"`
			Total      int `json:"total"`
			TotalPages int `json:"total_pages"`
		} `json:"meta"`
	}](t, rec)

	if len(payload.Projects) != 1 {
		t.Fatalf("expected 1 project on page 2, got %d", len(payload.Projects))
	}
	if payload.Meta.Page != 2 || payload.Meta.Limit != 2 || payload.Meta.Total != 3 || payload.Meta.TotalPages != 2 {
		t.Fatalf("unexpected pagination meta: %+v", payload.Meta)
	}
}

func TestTaskPaginationAndProjectStatsIntegration(t *testing.T) {
	resetDatabase(t)
	router := setupRouter()
	token := registerAndLogin(t, router, "tasks.integration@example.com")
	projectID := createProjectForTest(t, router, token, "Stats Project")

	var userID string
	if err := DB.QueryRow(`SELECT id FROM users WHERE email=$1`, "tasks.integration@example.com").Scan(&userID); err != nil {
		t.Fatalf("fetch user id: %v", err)
	}

	createTaskForTest(t, router, token, projectID, map[string]any{
		"title":       "Alpha task",
		"description": "todo item",
		"status":      "todo",
		"priority":    "medium",
		"assignee_id": userID,
	})
	createTaskForTest(t, router, token, projectID, map[string]any{
		"title":       "Beta task",
		"description": "in progress item",
		"status":      "in_progress",
		"priority":    "high",
		"assignee_id": userID,
	})
	createTaskForTest(t, router, token, projectID, map[string]any{
		"title":       "Gamma task",
		"description": "done item",
		"status":      "done",
		"priority":    "low",
	})

	tasksRec := performJSONRequest(t, router, http.MethodGet, fmt.Sprintf("/projects/%s/tasks?page=2&limit=2", projectID), nil, token)
	if tasksRec.Code != http.StatusOK {
		t.Fatalf("get tasks failed: status=%d body=%s", tasksRec.Code, tasksRec.Body.String())
	}

	tasksPayload := decodeJSON[struct {
		Tasks []map[string]any `json:"tasks"`
		Meta  struct {
			Page       int `json:"page"`
			Limit      int `json:"limit"`
			Total      int `json:"total"`
			TotalPages int `json:"total_pages"`
		} `json:"meta"`
	}](t, tasksRec)

	if len(tasksPayload.Tasks) != 1 {
		t.Fatalf("expected 1 task on page 2, got %d", len(tasksPayload.Tasks))
	}
	if tasksPayload.Meta.Total != 3 || tasksPayload.Meta.Page != 2 || tasksPayload.Meta.TotalPages != 2 {
		t.Fatalf("unexpected task pagination meta: %+v", tasksPayload.Meta)
	}

	statsRec := performJSONRequest(t, router, http.MethodGet, fmt.Sprintf("/projects/%s/stats", projectID), nil, token)
	if statsRec.Code != http.StatusOK {
		t.Fatalf("get stats failed: status=%d body=%s", statsRec.Code, statsRec.Body.String())
	}

	statsPayload := decodeJSON[struct {
		ByStatus   map[string]int `json:"by_status"`
		ByAssignee map[string]int `json:"by_assignee"`
	}](t, statsRec)

	if statsPayload.ByStatus["todo"] != 1 || statsPayload.ByStatus["in_progress"] != 1 || statsPayload.ByStatus["done"] != 1 {
		t.Fatalf("unexpected status counts: %+v", statsPayload.ByStatus)
	}
	if statsPayload.ByAssignee[userID] != 2 || statsPayload.ByAssignee["unassigned"] != 1 {
		t.Fatalf("unexpected assignee counts: %+v", statsPayload.ByAssignee)
	}
}
