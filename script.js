const STORAGE_KEY = 'taskflow-v1';

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const priorityInput = document.getElementById('task-priority');
const dateInput = document.getElementById('task-date');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.btn-filter');
const cancelEditButton = document.getElementById('cancel-edit');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const clearCompletedButton = document.getElementById('clear-completed');
const exportTasksButton = document.getElementById('export-tasks');
const importTasksButton = document.getElementById('import-tasks');
const importFileInput = document.getElementById('import-file');
const taskTemplate = document.getElementById('task-template');

const totalTasksElement = document.getElementById('total-tasks');
const completedTasksElement = document.getElementById('completed-tasks');
const runningTimersElement = document.getElementById('running-timers');
const timeTodayElement = document.getElementById('time-today');

const formSubmitButton = taskForm.querySelector('button[type="submit"]');

let state = {
    tasks: [],
    filter: 'all',
    query: '',
    editingTaskId: null
};

let dragTaskId = null;
let searchDebounce = null;

function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTask(title, priority, dueDate) {
    return {
        id: makeId(),
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
        id: task.id || makeId(),
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

function getTaskById(taskId) {
    return state.tasks.find((task) => task.id === taskId) || null;
}

function getTaskIndex(taskId) {
    return state.tasks.findIndex((task) => task.id === taskId);
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

function renderTasks() {
    const visibleTasks = getVisibleTasks();
    const fragment = document.createDocumentFragment();

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
        resetButton.disabled = task.isRunning;

        fragment.appendChild(clone);
    });

    taskList.innerHTML = '';
    taskList.appendChild(fragment);
    emptyState.classList.toggle('hidden', visibleTasks.length > 0);
}

function updateLiveTimers() {
    const runningTasks = state.tasks.filter((task) => task.isRunning);
    if (runningTasks.length === 0) {
        return;
    }

    runningTasks.forEach((task) => {
        const item = taskList.querySelector(`.task-item[data-id="${task.id}"]`);
        if (!item) {
            return;
        }
        const timerDisplay = item.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = formatDuration(getElapsedMs(task));
        }
    });

    updateStats();
}

function setEditingMode(taskId) {
    state.editingTaskId = taskId;
    formSubmitButton.textContent = 'Update Task';
    cancelEditButton.classList.remove('hidden');
}

function clearEditingMode() {
    state.editingTaskId = null;
    formSubmitButton.textContent = 'Add Task';
    cancelEditButton.classList.add('hidden');
}

function startEditTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        return;
    }

    taskInput.value = task.title;
    priorityInput.value = task.priority;
    dateInput.value = task.dueDate || '';
    setEditingMode(taskId);
    taskInput.focus();
}

function addOrUpdateTask(event) {
    event.preventDefault();

    const title = taskInput.value.trim();
    if (!title) {
        taskInput.focus();
        return;
    }

    const priority = priorityInput.value;
    const dueDate = dateInput.value || null;

    if (state.editingTaskId) {
        const index = getTaskIndex(state.editingTaskId);
        if (index !== -1) {
            state.tasks[index] = {
                ...state.tasks[index],
                title,
                priority,
                dueDate
            };
        }
    } else {
        state.tasks.unshift(createTask(title, priority, dueDate));
    }

    taskForm.reset();
    priorityInput.value = 'medium';
    clearEditingMode();

    saveState();
    renderTasks();
    updateStats();
}

function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    if (state.editingTaskId === taskId) {
        clearEditingMode();
        taskForm.reset();
        priorityInput.value = 'medium';
    }
    saveState();
    renderTasks();
    updateStats();
}

function toggleTaskComplete(taskId, isComplete) {
    const index = getTaskIndex(taskId);
    if (index === -1) {
        return;
    }

    const task = state.tasks[index];
    state.tasks[index] = {
        ...task,
        completed: isComplete,
        isRunning: isComplete ? false : task.isRunning,
        accumulatedMs: isComplete ? getElapsedMs(task) : task.accumulatedMs,
        startedAt: isComplete ? null : task.startedAt
    };

    saveState();
    renderTasks();
    updateStats();
}

function toggleTimer(taskId) {
    const index = getTaskIndex(taskId);
    if (index === -1) {
        return;
    }

    const task = state.tasks[index];
    if (task.completed) {
        return;
    }

    if (task.isRunning) {
        state.tasks[index] = {
            ...task,
            isRunning: false,
            accumulatedMs: getElapsedMs(task),
            startedAt: null
        };
    } else {
        state.tasks[index] = {
            ...task,
            isRunning: true,
            startedAt: Date.now()
        };
    }

    saveState();
    renderTasks();
    updateStats();
}

function resetTimer(taskId) {
    const index = getTaskIndex(taskId);
    if (index === -1) {
        return;
    }

    state.tasks[index] = {
        ...state.tasks[index],
        accumulatedMs: 0,
        isRunning: false,
        startedAt: null
    };

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

function reorderTasks(dragId, dropId) {
    const visibleIds = getVisibleTasks().map((task) => task.id);
    if (!visibleIds.includes(dragId) || !visibleIds.includes(dropId)) {
        return;
    }

    const reorderedVisible = visibleIds.slice();
    const from = reorderedVisible.indexOf(dragId);
    const to = reorderedVisible.indexOf(dropId);

    reorderedVisible.splice(from, 1);
    reorderedVisible.splice(to, 0, dragId);

    const reorderedSet = new Set(reorderedVisible);
    const reorderedQueue = reorderedVisible.slice();

    state.tasks = state.tasks.map((task) => {
        if (!reorderedSet.has(task.id)) {
            return task;
        }
        const nextId = reorderedQueue.shift();
        return getTaskById(nextId);
    });

    saveState();
    renderTasks();
}

function exportTasks() {
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks: state.tasks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `taskflow-${today}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}

function importTasksFromText(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        alert('Invalid JSON file.');
        return;
    }

    const importedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(importedTasks)) {
        alert('JSON must contain a tasks array.');
        return;
    }

    state.tasks = importedTasks.map(normalizeTask);
    clearEditingMode();
    taskForm.reset();
    priorityInput.value = 'medium';

    saveState();
    renderTasks();
    updateStats();
}

function handleListClick(event) {
    const button = event.target.closest('button');
    if (!button) {
        return;
    }

    const taskItem = event.target.closest('.task-item');
    if (!taskItem) {
        return;
    }

    const taskId = taskItem.dataset.id;
    if (!taskId) {
        return;
    }

    if (button.classList.contains('start-pause-btn')) {
        toggleTimer(taskId);
    } else if (button.classList.contains('reset-btn')) {
        resetTimer(taskId);
    } else if (button.classList.contains('delete-btn')) {
        deleteTask(taskId);
    } else if (button.classList.contains('edit-btn')) {
        startEditTask(taskId);
    }
}

function handleListChange(event) {
    if (!event.target.classList.contains('task-check')) {
        return;
    }

    const taskItem = event.target.closest('.task-item');
    if (!taskItem || !taskItem.dataset.id) {
        return;
    }

    toggleTaskComplete(taskItem.dataset.id, event.target.checked);
}

function clearDragMarkers() {
    taskList.querySelectorAll('.drag-over').forEach((item) => item.classList.remove('drag-over'));
}

taskForm.addEventListener('submit', addOrUpdateTask);

cancelEditButton.addEventListener('click', () => {
    clearEditingMode();
    taskForm.reset();
    priorityInput.value = 'medium';
});

searchInput.addEventListener('input', (event) => {
    const nextQuery = event.target.value;
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
        state.query = nextQuery;
        renderTasks();
    }, 140);
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
});

taskList.addEventListener('click', handleListClick);
taskList.addEventListener('change', handleListChange);

taskList.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.task-item');
    if (!item || !item.dataset.id) {
        return;
    }
    dragTaskId = item.dataset.id;
    item.classList.add('dragging');
});

taskList.addEventListener('dragover', (event) => {
    event.preventDefault();
    const item = event.target.closest('.task-item');
    clearDragMarkers();
    if (item && item.dataset.id !== dragTaskId) {
        item.classList.add('drag-over');
    }
});

taskList.addEventListener('dragleave', (event) => {
    const item = event.target.closest('.task-item');
    if (item) {
        item.classList.remove('drag-over');
    }
});

taskList.addEventListener('drop', (event) => {
    event.preventDefault();
    const item = event.target.closest('.task-item');
    if (!item || !item.dataset.id || !dragTaskId || item.dataset.id === dragTaskId) {
        clearDragMarkers();
        return;
    }
    reorderTasks(dragTaskId, item.dataset.id);
    clearDragMarkers();
});

taskList.addEventListener('dragend', () => {
    dragTaskId = null;
    taskList.querySelectorAll('.dragging').forEach((item) => item.classList.remove('dragging'));
    clearDragMarkers();
});

clearCompletedButton.addEventListener('click', clearCompleted);

exportTasksButton.addEventListener('click', exportTasks);
importTasksButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }
    const text = await file.text();
    importTasksFromText(text);
    importFileInput.value = '';
});

loadState();
renderTasks();
updateStats();

setInterval(() => {
    updateLiveTimers();
}, 1000);