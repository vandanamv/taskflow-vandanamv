package main

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	InitDB()

	r := gin.Default()

	// ✅ ADD THIS (IMPORTANT)
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/auth/register", Register)
	r.POST("/auth/login", Login)

	protected := r.Group("/")
	protected.Use(AuthMiddleware())

	protected.GET("/protected", func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		c.JSON(200, gin.H{
			"message": "you are authorized",
			"user_id": userID,
		})
	})

	protected.POST("/projects", CreateProject)
	protected.GET("/projects", GetProjects)
	protected.GET("/projects/:id", GetProjectByID)
	protected.DELETE("/projects/:id", DeleteProject)

	protected.POST("/projects/:id/tasks", CreateTask)
	protected.GET("/projects/:id/tasks", GetTasks)
	protected.PATCH("/tasks/:id", UpdateTask)
	protected.DELETE("/tasks/:id", DeleteTask)

	r.Run(":8080")
}
