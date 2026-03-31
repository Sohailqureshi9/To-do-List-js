const STORAGE_KEY = 'taskflow-v1';

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const priorityInput = document.getElementById('task-priority');
const dateInput = document.getElementById('task-date');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.btn-filter');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const clearCompletedButton = document.getElementById('clear-completed');
const taskTemplate = document.getElementById('task-template');

const totalTasksElement = document.getElementById('total-tasks');
const completedTasksElement = document.getElementById('completed-tasks');
const runningTimersElement = document.getElementById('running-timers');
const timeTodayElement = document.getElementById('time-today');

let state = {
    tasks: [],
    filter: 'all',
    query: ''
};

const timerTicker = setInterval(() => {
    renderTasks();
    updateStats();
}, 1000);

window.addEventListener('beforeunload', () => {
    clearInterval(timerTicker);
});

function createTask(title, priority, dueDate) {
    return {
        id: crypto.randomUUID(),
        title,
        priority,
        dueDate: dueDate || null,
        completed: false,
        createdAt: Date.now(),
        accumulatedMs: 0,
        isRunning: false,
        startedAt: null
    };
}

function normalizeTask(task) {
    return {
        id: task.id || crypto.randomUUID(),
        title: typeof task.title === 'string' ? task.title : '',
        priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
        dueDate: task.dueDate || null,
        completed: Boolean(task.completed),
        createdAt: Number(task.createdAt) || Date.now(),
        accumulatedMs: Number(task.accumulatedMs) || 0,
        isRunning: Boolean(task.isRunning),
        startedAt: task.startedAt ? Number(task.startedAt) : null
    };
}

function getElapsedMs(task) {
    if (task.isRunning && task.startedAt) {
        return task.accumulatedMs + Math.max(0, Date.now() - task.startedAt);
    }
    return task.accumulatedMs;
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function formatDate(dateString) {
    if (!dateString) {
        return 'No due date';
    }
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function isOverdue(task) {
    if (!task.dueDate || task.completed) {
        return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${task.dueDate}T00:00:00`);
    return due < today;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            state.tasks = parsed.map(normalizeTask);
        }
    } catch (error) {
        console.error('Failed to parse saved tasks:', error);
        state.tasks = [];
    }
}

function updateStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.completed).length;
    const running = state.tasks.filter((task) => task.isRunning).length;

    const todayKey = new Date().toISOString().slice(0, 10);
    const timeToday = state.tasks.reduce((sum, task) => {
        const createdDay = new Date(task.createdAt).toISOString().slice(0, 10);
        if (createdDay === todayKey) {
            return sum + getElapsedMs(task);
        }
        return sum;
    }, 0);

    totalTasksElement.textContent = String(total);
    completedTasksElement.textContent = String(completed);
    runningTimersElement.textContent = String(running);
    timeTodayElement.textContent = formatDuration(timeToday);
}

function getVisibleTasks() {
    const query = state.query.trim().toLowerCase();

    return state.tasks.filter((task) => {
        const matchesFilter =
            state.filter === 'all' ||
            (state.filter === 'active' && !task.completed) ||
            (state.filter === 'completed' && task.completed);

        const matchesQuery = task.title.toLowerCase().includes(query);

        return matchesFilter && matchesQuery;
    });
}

function renderTasks() {
    taskList.innerHTML = '';

    const visibleTasks = getVisibleTasks();

    emptyState.classList.toggle('hidden', visibleTasks.length > 0);

    visibleTasks.forEach((task) => {
        const clone = taskTemplate.content.cloneNode(true);
        const item = clone.querySelector('.task-item');
        const check = clone.querySelector('.task-check');
        const title = clone.querySelector('.task-title');
        const priority = clone.querySelector('.priority-pill');
        const meta = clone.querySelector('.task-meta');
        const timerDisplay = clone.querySelector('.timer-display');
        const startPauseButton = clone.querySelector('.start-pause-btn');
        const resetButton = clone.querySelector('.reset-btn');
        const deleteButton = clone.querySelector('.delete-btn');

        item.dataset.id = task.id;
        item.classList.toggle('completed', task.completed);

        check.checked = task.completed;
        title.textContent = task.title;
        priority.textContent = task.priority;
        priority.classList.add(`priority-${task.priority}`);

        const dueDateText = formatDate(task.dueDate);
        const overdueText = isOverdue(task) ? 'Overdue' : 'On schedule';
        meta.innerHTML = `<span>Due: ${dueDateText}</span><span>${overdueText}</span>`;

        timerDisplay.textContent = formatDuration(getElapsedMs(task));
        startPauseButton.textContent = task.isRunning ? 'Pause' : 'Start';
        startPauseButton.disabled = task.completed;
        resetButton.disabled = task.isRunning && !task.completed;

        check.addEventListener('change', () => toggleTaskComplete(task.id));
        startPauseButton.addEventListener('click', () => toggleTimer(task.id));
        resetButton.addEventListener('click', () => resetTimer(task.id));
        deleteButton.addEventListener('click', () => deleteTask(task.id));

        taskList.appendChild(clone);
    });
}

function addTask(event) {
    event.preventDefault();
    const title = taskInput.value.trim();

    if (!title) {
        taskInput.focus();
        return;
    }

    const task = createTask(title, priorityInput.value, dateInput.value);
    state.tasks.unshift(task);

    taskForm.reset();
    priorityInput.value = 'medium';

    saveState();
    renderTasks();
    updateStats();
}

function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    saveState();
    renderTasks();
    updateStats();
}

function toggleTaskComplete(taskId) {
    state.tasks = state.tasks.map((task) => {
        if (task.id !== taskId) {
            return task;
        }

        if (!task.completed) {
            return {
                ...task,
                completed: true,
                isRunning: false,
                accumulatedMs: getElapsedMs(task),
                startedAt: null
            };
        }

        return {
            ...task,
            completed: false
        };
    });

    saveState();
    renderTasks();
    updateStats();
}

function toggleTimer(taskId) {
    state.tasks = state.tasks.map((task) => {
        if (task.id !== taskId || task.completed) {
            return task;
        }

        if (task.isRunning) {
            return {
                ...task,
                isRunning: false,
                accumulatedMs: getElapsedMs(task),
                startedAt: null
            };
        }

        return {
            ...task,
            isRunning: true,
            startedAt: Date.now()
        };
    });

    saveState();
    renderTasks();
    updateStats();
}

function resetTimer(taskId) {
    state.tasks = state.tasks.map((task) => {
        if (task.id !== taskId) {
            return task;
        }

        return {
            ...task,
            accumulatedMs: 0,
            isRunning: false,
            startedAt: null
        };
    });

    saveState();
    renderTasks();
    updateStats();
}

function clearCompleted() {
    state.tasks = state.tasks.filter((task) => !task.completed);
    saveState();
    renderTasks();
    updateStats();
}

function setFilter(nextFilter) {
    state.filter = nextFilter;
    filterButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.filter === nextFilter);
    });
    renderTasks();
}

taskForm.addEventListener('submit', addTask);
searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    renderTasks();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
});

clearCompletedButton.addEventListener('click', clearCompleted);

loadState();
renderTasks();
updateStats();