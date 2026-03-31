# SheenTaskFlow

SheenTaskFlow is a modern, browser-based to-do and time-tracking application built with HTML, CSS, and JavaScript.

It helps you plan tasks, manage dependencies, track time per task, and monitor productivity with a clean dashboard.

## Project Info

- Project Name: SheenTaskFlow
- Developed By: Sohail Qureshi
- Type: Frontend web app (no backend required)

## Core Features

- Create tasks with:
  - title
  - description
  - priority (low, medium, high)
  - due date
  - category
  - dependency
- Edit and delete tasks
- Mark tasks complete and clear completed tasks
- Archive completed tasks for history
- Per-task timer with start, pause, and reset
- Workflow lock:
  - only one independent task can run at a time
  - dependent tasks can run only if their parent task is currently running
- Link a task to the task above in one click
- Search tasks by text
- Filter tasks by status (all, active, done)
- Filter tasks by category
- List view and calendar view
- Pagination for large task lists
- Overdue task detection and visual badges
- Real-time stats:
  - total tasks
  - completed tasks
  - running timers
  - overdue tasks
  - time tracked today
- Import tasks from JSON
- Export tasks to JSON
- Export report to PDF
- Light and dark theme toggle
- In-app notifications and browser notifications
- Local persistence so data remains after refresh
- Responsive design for desktop and mobile

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- jsPDF (CDN)
- Browser Local Storage API

## Project Structure

- index.html: App layout and UI structure
- style.css: App styling, themes, responsiveness, and animations
- script.js: Task state, timers, rendering, filters, import/export, notifications
- images/: Icons and image assets

## How To Run

1. Open the project folder in VS Code.
2. Open index.html in your browser.
3. Optional: use Live Server in VS Code for faster development workflow.

## How Data Is Stored

- Active tasks are saved in browser local storage.
- Archived completed tasks are saved separately in local storage.
- Theme preference is also saved in local storage.

If browser storage is cleared, saved tasks and settings will be removed.

## Usage Flow

1. Add a task with desired details.
2. Optionally set dependency on an existing task.
3. Start timer on the task you are working on.
4. Mark task done when finished.
5. Use filters, category buttons, or search to quickly find tasks.
6. Switch to calendar view to see due dates visually.
7. Export JSON or PDF for backup/reporting.

## Deployment

This is a static frontend project, so you can deploy it on:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

### Quick GitHub Pages Steps

1. Push this project to a GitHub repository.
2. Open repository settings.
3. Go to Pages.
4. Select deploy from branch.
5. Choose main branch and root folder.
6. Save and wait for deployment.

## Future Enhancements

- User accounts and cloud sync
- Team collaboration and shared boards
- Advanced analytics dashboards
- Recurring tasks and reminders
- PWA support for installable offline experience

## Author

Developed by Sohail Qureshi.
