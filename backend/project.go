package main

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateProjectInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func CreateProject(c *gin.Context) {
	var input CreateProjectInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "invalid input"})
		return
	}

	userID, _ := c.Get("user_id")
	id := uuid.New()

	_, err := DB.Exec(
		`INSERT INTO projects (id, name, description, owner_id) VALUES ($1, $2, $3, $4)`,
		id.String(), input.Name, input.Description, userID,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, gin.H{
		"id":          id.String(),
		"name":        input.Name,
		"description": input.Description,
	})
}

func GetProjects(c *gin.Context) {
	userID, _ := c.Get("user_id")
	pagination := getPaginationParams(c)

	var total int
	if err := DB.QueryRow(`SELECT COUNT(*) FROM projects WHERE owner_id=$1`, userID).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "failed to count projects"})
		return
	}

	rows, err := DB.Query(
		`SELECT
			p.id,
			p.name,
			p.description,
			COALESCE(COUNT(t.id), 0) AS total_tasks,
			COALESCE(COUNT(*) FILTER (WHERE t.status = 'todo'), 0) AS todo_count,
			COALESCE(COUNT(*) FILTER (WHERE t.status = 'in_progress'), 0) AS in_progress_count,
			COALESCE(COUNT(*) FILTER (WHERE t.status = 'done'), 0) AS done_count
		FROM projects p
		LEFT JOIN tasks t ON t.project_id = p.id
		WHERE p.owner_id=$1
		GROUP BY p.id, p.name, p.description
		ORDER BY p.name ASC
		LIMIT $2 OFFSET $3`,
		userID, pagination.Limit, pagination.Offset,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch projects"})
		return
	}
	defer rows.Close()

	var projects []gin.H
	for rows.Next() {
		var id, name string
		var description sql.NullString
		var totalTasks, todoCount, inProgressCount, doneCount int
		if err := rows.Scan(&id, &name, &description, &totalTasks, &todoCount, &inProgressCount, &doneCount); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		projects = append(projects, gin.H{
			"id":          id,
			"name":        name,
			"description": description.String,
			"total_tasks": totalTasks,
			"counts": gin.H{
				"todo":        todoCount,
				"in_progress": inProgressCount,
				"done":        doneCount,
			},
		})
	}

	c.JSON(200, gin.H{
		"projects": projects,
		"meta":     paginationMeta(pagination.Page, pagination.Limit, total),
	})
}

func GetProjectByID(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	var name string
	var description sql.NullString
	err := DB.QueryRow(
		`SELECT name, description FROM projects WHERE id=$1 AND owner_id=$2`,
		projectID,
		userID,
	).Scan(&name, &description)

	if err != nil {
		c.JSON(404, gin.H{"error": "project not found"})
		return
	}

	rows, err := DB.Query(
		`SELECT id, title, description, status, priority, assignee_id, due_date
		FROM tasks
		WHERE project_id=$1
		ORDER BY
			CASE status
				WHEN 'todo' THEN 1
				WHEN 'in_progress' THEN 2
				WHEN 'done' THEN 3
				ELSE 4
			END,
			title ASC`,
		projectID,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch tasks"})
		return
	}
	defer rows.Close()

	var tasks []gin.H
	for rows.Next() {
		var id, title, status string
		var taskDescription, priority, assigneeID, dueDate sql.NullString
		if err := rows.Scan(&id, &title, &taskDescription, &status, &priority, &assigneeID, &dueDate); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		tasks = append(tasks, gin.H{
			"id":          id,
			"title":       title,
			"description": taskDescription.String,
			"status":      status,
			"priority":    priority.String,
			"assignee_id": assigneeID.String,
			"due_date":    dueDate.String,
		})
	}

	c.JSON(200, gin.H{
		"id":          projectID,
		"name":        name,
		"description": description.String,
		"tasks":       tasks,
	})
}

func GetProjectStats(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	if err := ensureProjectOwnership(projectID, fmt.Sprint(userID)); err != nil {
		status := 500
		message := "failed to fetch project"
		if errors.Is(err, sql.ErrNoRows) {
			status = 404
			message = "project not found"
		}
		c.JSON(status, gin.H{"error": message})
		return
	}

	statusCounts := gin.H{
		"todo":        0,
		"in_progress": 0,
		"done":        0,
	}

	rows, err := DB.Query(
		`SELECT status, COUNT(*)
		FROM tasks
		WHERE project_id=$1
		GROUP BY status`,
		projectID,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch status counts"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		statusCounts[status] = count
	}

	assigneeCounts := gin.H{}
	assigneeRows, err := DB.Query(
		`SELECT COALESCE(assignee_id::text, 'unassigned') AS assignee_key, COUNT(*)
		FROM tasks
		WHERE project_id=$1
		GROUP BY assignee_key
		ORDER BY assignee_key`,
		projectID,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch assignee counts"})
		return
	}
	defer assigneeRows.Close()

	for assigneeRows.Next() {
		var assigneeKey string
		var count int
		if err := assigneeRows.Scan(&assigneeKey, &count); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		assigneeCounts[assigneeKey] = count
	}

	c.JSON(200, gin.H{
		"project_id":  projectID,
		"by_status":   statusCounts,
		"by_assignee": assigneeCounts,
	})
}

func DeleteProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	var ownerID string
	err := DB.QueryRow(`SELECT owner_id FROM projects WHERE id=$1`, projectID).Scan(&ownerID)
	if err != nil {
		c.JSON(404, gin.H{"error": "project not found"})
		return
	}

	if ownerID != fmt.Sprint(userID) {
		c.JSON(403, gin.H{"error": "not authorized to delete this project"})
		return
	}

	if _, err := DB.Exec(`DELETE FROM tasks WHERE project_id=$1`, projectID); err != nil {
		c.JSON(500, gin.H{"error": "failed to delete project tasks"})
		return
	}

	if _, err := DB.Exec(`DELETE FROM projects WHERE id=$1`, projectID); err != nil {
		c.JSON(500, gin.H{"error": "failed to delete project"})
		return
	}

	c.JSON(200, gin.H{"message": "project deleted"})
}

func ensureProjectOwnership(projectID, userID string) error {
	var ownerID string
	if err := DB.QueryRow(`SELECT owner_id FROM projects WHERE id=$1`, projectID).Scan(&ownerID); err != nil {
		return err
	}

	if ownerID != userID {
		return sql.ErrNoRows
	}

	return nil
}
