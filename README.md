# TaskFlow - To-Do App with Task Timers

TaskFlow is a complete and fully working to-do project built with HTML, CSS, and JavaScript.
It supports task management, per-task timer tracking, filters, search, and local persistence.

## Features

- Add tasks with title, priority, and optional due date
- Mark tasks as completed or active
- Start, pause, and reset a timer for each task
- Edit existing task title, priority, and due date
- Drag-and-drop reorder tasks
- Export tasks to JSON backup
- Export task report to PDF
- Import tasks from JSON backup
- Persistent data using `localStorage` (tasks and timer state survive refresh)
- Filter by all, active, completed
- Search tasks by keyword
- Dashboard stats:
  - Total tasks
  - Completed tasks
  - Running timers
  - Time tracked today
- Clear completed tasks into archive storage (not permanently deleted)
- Responsive UI for desktop and mobile

## Performance and Efficiency

- Uses event delegation for task actions instead of attaching listeners per item
- Uses debounced search input to avoid unnecessary renders
- Updates timer text every second without full list re-rendering
- Renders with `DocumentFragment` for cleaner, faster DOM updates

## Project Structure

- `index.html` - App structure and components
- `style.css` - Full responsive UI styling
- `script.js` - All app logic and state management
- `images/` - Optional image assets

## How to Run Locally

1. Open the project folder in VS Code.
2. Open `index.html` directly in a browser
3. Recommended: use Live Server extension in VS Code for better dev workflow.

## Deploy / Upload as Real Project

You can deploy this app on any static hosting service:

- GitHub Pages
- Netlify
- Vercel (static deploy)
- Cloudflare Pages

### Quick Deploy with GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings > Pages**.
3. Set source to **Deploy from a branch**.
4. Choose branch `main` and folder `/ (root)`.
5. Save and wait for publish.

Your app will be live on a public URL.

## Notes

- Task data is stored in browser `localStorage`.
- Completed tasks removed from the main list are kept in archive storage.
- If you clear site storage, task history will be removed.

## Future Improvements

- Dark mode toggle
- Optional cloud sync with account login
- Multiple task boards (work, personal, study)
