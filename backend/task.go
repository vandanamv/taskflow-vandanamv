package main

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateTaskInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	AssigneeID  string `json:"assignee_id"`
	DueDate     string `json:"due_date"`
}

func CreateTask(c *gin.Context) {
	var input CreateTaskInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "invalid input"})
		return
	}

	projectID := c.Param("id")
	id := uuid.New()
	userID, _ := c.Get("user_id")

	if err := ensureProjectOwnership(projectID, fmt.Sprint(userID)); err != nil {
		statusCode := 500
		message := "failed to create task"
		if errors.Is(err, sql.ErrNoRows) {
			statusCode = 404
			message = "project not found"
		}
		c.JSON(statusCode, gin.H{"error": message})
		return
	}

	var assignee interface{}
	if input.AssigneeID == "" {
		assignee = userID
	} else {
		assignee = input.AssigneeID
	}

	status := input.Status
	if status == "" {
		status = "todo"
	}

	_, err := DB.Exec(
		`INSERT INTO tasks 
		(id, title, description, status, priority, project_id, assignee_id, due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		id.String(), input.Title, input.Description, status, input.Priority,
		projectID, assignee, input.DueDate,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, gin.H{
		"id":          id.String(),
		"title":       input.Title,
		"description": input.Description,
		"status":      status,
		"priority":    input.Priority,
		"assignee_id": assignee,
		"due_date":    input.DueDate,
	})
}

func GetTasks(c *gin.Context) {
	projectID := c.Param("id")
	status := c.Query("status")
	assignee := c.Query("assignee")
	userID, _ := c.Get("user_id")
	pagination := getPaginationParams(c)

	if err := ensureProjectOwnership(projectID, fmt.Sprint(userID)); err != nil {
		statusCode := 500
		message := "failed to fetch tasks"
		if errors.Is(err, sql.ErrNoRows) {
			statusCode = 404
			message = "project not found"
		}
		c.JSON(statusCode, gin.H{"error": message})
		return
	}

	countQuery := "SELECT COUNT(*) FROM tasks WHERE project_id=$1"
	countArgs := []interface{}{projectID}
	query := "SELECT id, title, description, status, priority, assignee_id, due_date FROM tasks WHERE project_id=$1"
	args := []interface{}{projectID}
	argIndex := 2

	if status != "" {
		countQuery += " AND status=$" + fmt.Sprint(argIndex)
		query += " AND status=$" + fmt.Sprint(argIndex)
		countArgs = append(countArgs, status)
		args = append(args, status)
		argIndex++
	}

	if assignee != "" {
		countQuery += " AND assignee_id=$" + fmt.Sprint(argIndex)
		query += " AND assignee_id=$" + fmt.Sprint(argIndex)
		countArgs = append(countArgs, assignee)
		args = append(args, assignee)
		argIndex++
	}

	var total int
	if err := DB.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "failed to count tasks"})
		return
	}

	query += " ORDER BY title ASC LIMIT $" + fmt.Sprint(argIndex) + " OFFSET $" + fmt.Sprint(argIndex+1)
	args = append(args, pagination.Limit, pagination.Offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch tasks"})
		return
	}
	defer rows.Close()

	var tasks []gin.H
	for rows.Next() {
		var id, title, status string
		var description, priority, assigneeID, dueDate sql.NullString
		if err := rows.Scan(&id, &title, &description, &status, &priority, &assigneeID, &dueDate); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		tasks = append(tasks, gin.H{
			"id":          id,
			"title":       title,
			"description": description.String,
			"status":      status,
			"priority":    priority.String,
			"assignee_id": assigneeID.String,
			"due_date":    dueDate.String,
		})
	}

	c.JSON(200, gin.H{
		"tasks": tasks,
		"meta":  paginationMeta(pagination.Page, pagination.Limit, total),
	})
}

func UpdateTask(c *gin.Context) {
	taskID := c.Param("id")

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "invalid input"})
		return
	}

	query := "UPDATE tasks SET "
	args := []interface{}{}
	i := 1

	for key, value := range input {
		query += key + "=$" + fmt.Sprint(i) + ", "
		args = append(args, value)
		i++
	}

	if len(args) == 0 {
		c.JSON(400, gin.H{"error": "no fields to update"})
		return
	}

	query = query[:len(query)-2]
	query += " WHERE id=$" + fmt.Sprint(i)
	args = append(args, taskID)

	_, err := DB.Exec(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "task updated"})
}

func DeleteTask(c *gin.Context) {
	taskID := c.Param("id")

	_, err := DB.Exec("DELETE FROM tasks WHERE id=$1", taskID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to delete task"})
		return
	}

	c.JSON(200, gin.H{"message": "task deleted"})
}
