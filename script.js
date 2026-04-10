const STORAGE_KEY = 'taskflow-v1';
const ARCHIVE_STORAGE_KEY = 'taskflow-archive-v1';
const THEME_STORAGE_KEY = 'taskflow-theme';

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskDescription = document.getElementById('task-description');
const priorityInput = document.getElementById('task-priority');
const dateInput = document.getElementById('task-date');
const dependencyInput = document.getElementById('task-dependency');
const categoryInput = document.getElementById('task-category');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.btn-filter');
const categoryButtons = document.querySelectorAll('.btn-category');
const cancelEditButton = document.getElementById('cancel-edit');
const listViewBtn = document.getElementById('list-view-btn');
const calendarViewBtn = document.getElementById('calendar-view-btn');
const calendarContainer = document.getElementById('calendar-container');
const calendarDays = document.getElementById('calendar-days');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarPrevBtn = document.getElementById('calendar-prev');
const calendarNextBtn = document.getElementById('calendar-next');
const paginationContainer = document.getElementById('pagination-container');
const paginationText = document.getElementById('pagination-text');
const paginationPrevBtn = document.getElementById('pagination-prev');
const paginationNextBtn = document.getElementById('pagination-next');
const paginationPages = document.getElementById('pagination-pages');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const clearCompletedButton = document.getElementById('clear-completed');
const exportTasksButton = document.getElementById('export-tasks');
const exportPdfButton = document.getElementById('export-pdf');
const importTasksButton = document.getElementById('import-tasks');
const importFileInput = document.getElementById('import-file');
const taskTemplate = document.getElementById('task-template');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const notificationContainer = document.getElementById('notification-container');

// Modal elements
const taskModal = document.getElementById('task-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalCloseFooter = document.getElementById('modal-close-footer');
const modalEdit = document.getElementById('modal-edit');
const modalTaskTitle = document.getElementById('modal-task-title');
const modalTaskDescription = document.getElementById('modal-task-description');
const modalTaskPriority = document.getElementById('modal-task-priority');
const modalTaskStatus = document.getElementById('modal-task-status');
const modalTaskCategory = document.getElementById('modal-task-category');
const modalTaskDueDate = document.getElementById('modal-task-due-date');
const modalTaskTime = document.getElementById('modal-task-time');
const modalTaskCreated = document.getElementById('modal-task-created');
const modalTaskDependency = document.getElementById('modal-task-dependency');

const totalTasksElement = document.getElementById('total-tasks');
const completedTasksElement = document.getElementById('completed-tasks');
const runningTimersElement = document.getElementById('running-timers');
const overdueTasksElement = document.getElementById('overdue-tasks');
const timeTodayElement = document.getElementById('time-today');

const formSubmitButton = taskForm.querySelector('button[type="submit"]');

let state = {
    tasks: [],
    archivedTasks: [],
    filter: 'all',
    category: 'all',
    query: '',
    editingTaskId: null,
    currentView: 'list',
    calendarDate: new Date(),
    currentPage: 1,
    tasksPerPage: 10
};

let dragTaskId = null;
let searchDebounce = null;
let overdueNotifiedToday = new Set();
let lastOverdueCheckDate = '';

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
    return getLocalDateKey(new Date());
}

function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTask(title, priority, dueDate, dependencyId, category, description = '') {
    return {
        id: makeId(),
        title,
        description,
        priority,
        dueDate: dueDate || null,
        dependencyId: dependencyId || null,
        category: category || null,
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
        description: typeof task.description === 'string' ? task.description : '',
        priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
        dueDate: task.dueDate || null,
        dependencyId: task.dependencyId || null,
        category: task.category || null,
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

function isPastDate(dateString) {
    if (!dateString) {
        return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(`${dateString}T00:00:00`);
    return selectedDate < today;
}

function showNotification(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-icon">${icons[type]}</span>
            <span class="notification-title">${title}</span>
            <button class="notification-close" aria-label="Close notification">×</button>
        </div>
        <div class="notification-message">${message}</div>
    `;

    notificationContainer.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        hideNotification(notification);
    });

    // Auto-hide after duration
    if (duration > 0) {
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
    }

    return notification;
}

function hideNotification(notification) {
    if (!notification || !notification.parentNode) {
        return;
    }

    notification.classList.add('hide');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotification('Browser Notifications Enabled', 'You will receive browser notifications for important task events.', 'success');
                }
            });
        }
    }
}

function showBrowserNotification(title, message, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: message,
            icon: 'images/icon.png',
            badge: 'images/icon.png',
            tag: 'taskflow',
            ...options
        });

        notification.onclick = function () {
            window.focus();
            notification.close();
        };

        setTimeout(() => {
            notification.close();
        }, 5000);
    }
}

function notifyTaskCreated(task) {
    const title = 'Task Created';
    const message = `"${task.title}" has been added to your tasks.`;

    showNotification(title, message, 'success');
    showBrowserNotification(title, message);
}

function notifyTaskCompleted(task) {
    const title = 'Task Completed';
    const message = `Congratulations! You completed "${task.title}".`;

    showNotification(title, message, 'success');
    showBrowserNotification(title, message);
}

function notifyTaskDeleted(task) {
    const title = 'Task Deleted';
    const message = `"${task.title}" has been removed from your tasks.`;

    showNotification(title, message, 'info');
    showBrowserNotification(title, message);
}

function notifyTaskOverdue(task) {
    const title = 'Task Overdue';
    const message = `"${task.title}" is overdue! Please complete it soon.`;

    showNotification(title, message, 'warning');
    showBrowserNotification(title, message, { urgency: 'high' });
}

function notifyTimerStarted(task) {
    const title = 'Timer Started';
    const message = `Timer started for "${task.title}".`;

    showNotification(title, message, 'info');
}

function notifyTimerStopped(task) {
    const elapsed = formatDuration(getElapsedMs(task));
    const title = 'Timer Stopped';
    const message = `Timer stopped for "${task.title}". Total time: ${elapsed}`;

    showNotification(title, message, 'info');
}

function checkOverdueTasks() {
    const todayKey = getLocalDateKey();
    if (lastOverdueCheckDate !== todayKey) {
        overdueNotifiedToday = new Set();
        lastOverdueCheckDate = todayKey;
    }

    const overdueTasks = state.tasks.filter(task => isOverdue(task) && !task.completed);
    const newlyOverdue = overdueTasks.filter((task) => !overdueNotifiedToday.has(task.id));

    newlyOverdue.forEach(task => {
        notifyTaskOverdue(task);
        overdueNotifiedToday.add(task.id);
    });
}

// Modal functions
function showTaskModal(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        return;
    }

    // Set modal content
    modalTaskTitle.textContent = task.title;
    modalTaskDescription.textContent = task.description || 'No description provided';

    // Priority with styling
    modalTaskPriority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    modalTaskPriority.className = `modal-value priority-${task.priority}`;

    // Status with styling
    let status = 'Active';
    let statusClass = 'status-active';
    if (task.completed) {
        status = 'Completed';
        statusClass = 'status-completed';
    } else if (isOverdue(task)) {
        status = 'Overdue';
        statusClass = 'status-overdue';
    }
    modalTaskStatus.textContent = status;
    modalTaskStatus.className = `modal-value ${statusClass}`;

    // Category
    modalTaskCategory.textContent = task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1) : 'No category';

    // Due date
    modalTaskDueDate.textContent = formatDate(task.dueDate);

    // Time tracked
    modalTaskTime.textContent = formatDuration(getElapsedMs(task));

    // Created date
    const createdDate = new Date(task.createdAt);
    modalTaskCreated.textContent = createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString();

    // Dependency
    modalTaskDependency.textContent = getDependencyLabel(task);

    // Store current task ID for edit button
    modalEdit.dataset.taskId = task.id;

    // Show modal
    taskModal.classList.add('show');
    taskModal.setAttribute('aria-hidden', 'false');

    // Focus management
    modalClose.focus();
}

function hideTaskModal() {
    taskModal.classList.remove('show');
    taskModal.setAttribute('aria-hidden', 'true');
}

function openTaskDetails(taskId) {
    showTaskModal(taskId);
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(state.archivedTasks));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const archivedRaw = localStorage.getItem(ARCHIVE_STORAGE_KEY);

    if (!raw) {
        state.tasks = [];
    } else {
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

    try {
        const parsedArchive = archivedRaw ? JSON.parse(archivedRaw) : [];
        if (Array.isArray(parsedArchive)) {
            state.archivedTasks = parsedArchive.map((task) => ({
                ...normalizeTask(task),
                clearedAt: Number(task.clearedAt) || Date.now()
            }));
        } else {
            state.archivedTasks = [];
        }
    } catch (error) {
        console.error('Failed to parse archived tasks:', error);
        state.archivedTasks = [];
    }

    const taskIds = new Set(state.tasks.map((task) => task.id));
    state.tasks = state.tasks.map((task) => ({
        ...task,
        dependencyId: task.dependencyId && taskIds.has(task.dependencyId) ? task.dependencyId : null
    }));
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.querySelector('.theme-icon').textContent = '☀️';
        themeToggleBtn.querySelector('.theme-text').textContent = 'Light';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.querySelector('.theme-icon').textContent = '🌙';
        themeToggleBtn.querySelector('.theme-text').textContent = 'Dark';
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);

function getVisibleTasks() {
    const query = state.query.trim().toLowerCase();

    return state.tasks.filter((task) => {
        const matchesFilter =
            state.filter === 'all' ||
            (state.filter === 'active' && !task.completed) ||
            (state.filter === 'completed' && task.completed);

        const matchesCategory =
            state.category === 'all' ||
            task.category === state.category;

        const matchesQuery =
            task.title.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query);

        return matchesFilter && matchesCategory && matchesQuery;
    });
}

function getRunningTasks() {
    return state.tasks.filter((task) => task.isRunning);
}

function canStartTask(task) {
    const running = getRunningTasks();
    if (task.dependencyId) {
        const dependencyRunning = running.some((item) => item.id === task.dependencyId);
        if (dependencyRunning) {
            return { allowed: true, reason: '' };
        }

        return {
            allowed: false,
            reason: 'Dependent task can only start when its parent task is currently running.'
        };
    }

    if (running.length === 0) {
        return { allowed: true, reason: '' };
    }

    return {
        allowed: false,
        reason: 'Another task is already running. Only its dependent task can be started.'
    };
}

function getDependencyLabel(task) {
    if (!task.dependencyId) {
        return 'No dependency';
    }
    const parentTask = getTaskById(task.dependencyId);
    return parentTask ? `Depends on: ${parentTask.title}` : 'Dependency removed';
}

function refreshDependencyOptions() {
    const selected = dependencyInput.value;
    dependencyInput.innerHTML = '<option value="">No dependency</option>';

    state.tasks.forEach((task) => {
        if (state.editingTaskId && task.id === state.editingTaskId) {
            return;
        }

        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        dependencyInput.appendChild(option);
    });

    if (selected && state.tasks.some((task) => task.id === selected) && selected !== state.editingTaskId) {
        dependencyInput.value = selected;
    } else {
        dependencyInput.value = '';
    }
}

function updateStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.completed).length;
    const running = state.tasks.filter((task) => task.isRunning).length;
    const overdue = state.tasks.filter((task) => isOverdue(task)).length;

    const todayKey = getLocalDateKey();
    const timeToday = state.tasks.reduce((sum, task) => {
        const createdDay = getLocalDateKey(new Date(task.createdAt));
        if (createdDay === todayKey) {
            return sum + getElapsedMs(task);
        }
        return sum;
    }, 0);

    totalTasksElement.textContent = String(total);
    completedTasksElement.textContent = String(completed);
    runningTimersElement.textContent = String(running);
    timeTodayElement.textContent = formatDuration(timeToday);
    overdueTasksElement.textContent = String(overdue);
}

function updateOverdueStatus() {
    const todayKey = getLocalDateKey();
    if (lastOverdueCheckDate !== todayKey) {
        lastOverdueCheckDate = todayKey;
        renderTasks();
        updateStats();
    }
}

function ensureValidCurrentPage() {
    const totalPages = getTotalPages();
    if (totalPages === 0) {
        state.currentPage = 1;
        return;
    }
    if (state.currentPage > totalPages) {
        state.currentPage = totalPages;
    }
    if (state.currentPage < 1) {
        state.currentPage = 1;
    }
}

function renderTasks() {
    if (state.currentView === 'calendar') {
        renderCalendar();
        return;
    }

    ensureValidCurrentPage();
    const paginatedTasks = getPaginatedTasks();
    const fragment = document.createDocumentFragment();

    paginatedTasks.forEach((task) => {
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
        item.classList.toggle('is-running', task.isRunning);
        item.classList.toggle('overdue', isOverdue(task));

        check.checked = task.completed;

        // Add overdue badge to title
        title.textContent = task.title;
        if (isOverdue(task)) {
            const overdueBadge = document.createElement('span');
            overdueBadge.className = 'overdue-badge';
            overdueBadge.textContent = 'OVERDUE';
            title.appendChild(overdueBadge);
        }

        priority.textContent = task.priority;
        priority.classList.add(`priority-${task.priority}`);

        const dueDateText = formatDate(task.dueDate);
        const overdueText = isOverdue(task) ? 'Overdue' : 'On schedule';
        const dependencyText = getDependencyLabel(task);
        const categoryText = task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1) : 'No category';
        meta.innerHTML = `<span>Due: ${dueDateText}</span><span>${overdueText}</span><span>${dependencyText}</span><span>Category: ${categoryText}</span>`;

        timerDisplay.textContent = formatDuration(getElapsedMs(task));
        startPauseButton.textContent = task.isRunning ? 'Pause' : 'Start';
        const startGuard = canStartTask(task);
        startPauseButton.disabled = task.completed || (!task.isRunning && !startGuard.allowed);
        startPauseButton.title = task.isRunning ? 'Pause timer' : (startGuard.allowed ? 'Start timer' : startGuard.reason);
        resetButton.disabled = false;

        fragment.appendChild(clone);
    });

    taskList.innerHTML = '';
    taskList.appendChild(fragment);
    emptyState.classList.toggle('hidden', paginatedTasks.length > 0);
    renderPagination();
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
    refreshDependencyOptions();
}

function clearEditingMode() {
    state.editingTaskId = null;
    formSubmitButton.textContent = 'Add Task';
    cancelEditButton.classList.add('hidden');
    refreshDependencyOptions();
}

function startEditTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        return;
    }

    taskInput.value = task.title;
    taskDescription.value = task.description || '';
    priorityInput.value = task.priority;
    dateInput.value = task.dueDate || '';
    categoryInput.value = task.category || '';
    setEditingMode(taskId);
    dependencyInput.value = task.dependencyId || '';
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
    const category = categoryInput.value || null;
    const description = taskDescription.value.trim();

    // Validate that due date is not in the past
    if (dueDate && isPastDate(dueDate)) {
        alert('Due date cannot be in the past. Please select today or a future date.');
        dateInput.focus();
        return;
    }

    let dependencyId = dependencyInput.value || null;

    if (dependencyId && dependencyId === state.editingTaskId) {
        alert('A task cannot depend on itself.');
        return;
    }

    if (state.editingTaskId) {
        const index = getTaskIndex(state.editingTaskId);
        if (index !== -1) {
            state.tasks[index] = {
                ...state.tasks[index],
                title,
                description,
                priority,
                dueDate,
                dependencyId,
                category
            };
        }
    } else {
        const newTask = createTask(title, priority, dueDate, dependencyId, category, description);
        state.tasks.unshift(newTask);
        notifyTaskCreated(newTask);
    }

    taskForm.reset();
    priorityInput.value = 'medium';
    dependencyInput.value = '';
    categoryInput.value = '';
    clearEditingMode();

    saveState();
    renderTasks();
    updateStats();
}

function deleteTask(taskId) {
    const taskToDelete = getTaskById(taskId);
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    state.tasks = state.tasks.map((task) => {
        if (task.dependencyId === taskId) {
            return {
                ...task,
                dependencyId: null
            };
        }
        return task;
    });
    if (state.editingTaskId === taskId) {
        clearEditingMode();
        taskForm.reset();
        priorityInput.value = 'medium';
        dependencyInput.value = '';
        categoryInput.value = '';
    }
    if (taskToDelete) {
        notifyTaskDeleted(taskToDelete);
    }
    saveState();
    refreshDependencyOptions();
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

    if (isComplete) {
        notifyTaskCompleted(state.tasks[index]);
    }

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
        notifyTimerStopped(state.tasks[index]);
    } else {
        const startGuard = canStartTask(task);
        if (!startGuard.allowed) {
            alert(startGuard.reason);
            return;
        }

        state.tasks[index] = {
            ...task,
            isRunning: true,
            startedAt: Date.now()
        };
        notifyTimerStarted(state.tasks[index]);
    }

    saveState();
    renderTasks();
    updateStats();
}

function linkToAboveTask(taskId) {
    const visibleTasks = getVisibleTasks();
    const index = visibleTasks.findIndex((t) => t.id === taskId);
    if (index > 0) {
        const aboveTask = visibleTasks[index - 1];
        const stateIndex = getTaskIndex(taskId);
        if (stateIndex !== -1) {
            if (aboveTask.id === state.tasks[stateIndex].dependencyId) {
                alert('Already linked to the task above.');
                return;
            }
            if (aboveTask.id === taskId) {
                return;
            }
            state.tasks[stateIndex] = {
                ...state.tasks[stateIndex],
                dependencyId: aboveTask.id
            };
            saveState();
            renderTasks();
            updateStats();
        }
    } else {
        alert('This is the topmost task, cannot link to an above task.');
    }
}

function resetTimer(taskId) {
    const index = getTaskIndex(taskId);
    if (index === -1) {
        return;
    }

    const task = state.tasks[index];
    const keepRunning = task.isRunning && !task.completed;

    state.tasks[index] = {
        ...task,
        accumulatedMs: 0,
        isRunning: keepRunning,
        startedAt: keepRunning ? Date.now() : null
    };

    saveState();
    renderTasks();
    updateStats();
}

function clearCompleted() {
    const removedIds = new Set(state.tasks.filter((task) => task.completed).map((task) => task.id));
    const completed = state.tasks
        .filter((task) => task.completed)
        .map((task) => ({
            ...task,
            isRunning: false,
            startedAt: null,
            clearedAt: Date.now()
        }));

    if (completed.length === 0) {
        return;
    }

    state.archivedTasks = [...completed, ...state.archivedTasks];
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.tasks = state.tasks.map((task) => {
        if (task.dependencyId && removedIds.has(task.dependencyId)) {
            return {
                ...task,
                dependencyId: null
            };
        }
        return task;
    });

    saveState();
    refreshDependencyOptions();
    renderTasks();
    updateStats();
}

function setFilter(nextFilter) {
    state.filter = nextFilter;
    state.currentPage = 1; // Reset to first page when filter changes
    filterButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.filter === nextFilter);
    });
    renderTasks();
}

function setCategory(nextCategory) {
    state.category = nextCategory;
    state.currentPage = 1; // Reset to first page when category changes
    categoryButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.category === nextCategory);
    });
    renderTasks();
}

function setView(viewType) {
    state.currentView = viewType;
    listViewBtn.classList.toggle('is-active', viewType === 'list');
    calendarViewBtn.classList.toggle('is-active', viewType === 'calendar');
    taskList.classList.toggle('hidden', viewType === 'calendar');
    calendarContainer.classList.toggle('hidden', viewType === 'list');

    if (viewType === 'calendar') {
        renderCalendar();
    } else {
        renderTasks();
    }
}

function renderCalendar() {
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();

    // Update month/year display
    calendarMonthYear.textContent = new Date(year, month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Clear calendar days
    calendarDays.innerHTML = '';

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createCalendarDay(day, true, new Date(year, month - 1, day));
        calendarDays.appendChild(dayElement);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createCalendarDay(day, false, new Date(year, month, day));
        calendarDays.appendChild(dayElement);
    }

    // Add next month's leading days
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createCalendarDay(day, true, new Date(year, month + 1, day));
        calendarDays.appendChild(dayElement);
    }
}

function createCalendarDay(day, isOtherMonth, date) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }

    // Check if today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }

    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);

    // Add tasks for this day
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'calendar-tasks';

    const visibleTasks = getVisibleTasks();
    const dayTasks = visibleTasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(`${task.dueDate}T00:00:00`);
        return taskDate.toDateString() === date.toDateString();
    });

    dayTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `calendar-task priority-${task.priority}`;
        if (isOverdue(task)) {
            taskElement.classList.add('overdue');
        }
        taskElement.textContent = task.title;
        taskElement.title = task.title + (isOverdue(task) ? ' (OVERDUE)' : '');
        taskElement.addEventListener('click', () => startEditTask(task.id));
        tasksContainer.appendChild(taskElement);
    });

    dayElement.appendChild(tasksContainer);
    return dayElement;
}

function changeCalendarMonth(direction) {
    const newMonth = state.calendarDate.getMonth() + direction;
    const newYear = state.calendarDate.getFullYear();

    if (newMonth < 0) {
        state.calendarDate = new Date(newYear - 1, 11, 1);
    } else if (newMonth > 11) {
        state.calendarDate = new Date(newYear + 1, 0, 1);
    } else {
        state.calendarDate = new Date(newYear, newMonth, 1);
    }

    renderCalendar();
}

function getPaginatedTasks() {
    ensureValidCurrentPage();
    const visibleTasks = getVisibleTasks();
    const startIndex = (state.currentPage - 1) * state.tasksPerPage;
    const endIndex = startIndex + state.tasksPerPage;
    return visibleTasks.slice(startIndex, endIndex);
}

function getTotalPages() {
    const visibleTasks = getVisibleTasks();
    return Math.ceil(visibleTasks.length / state.tasksPerPage);
}

function setPage(page) {
    const totalPages = getTotalPages();
    if (totalPages === 0) {
        state.currentPage = 1;
        renderTasks();
        return;
    }
    if (page < 1 || page > totalPages) {
        return;
    }
    state.currentPage = page;
    renderTasks();
    renderPagination();
}

function renderPagination() {
    const visibleTasks = getVisibleTasks();
    const totalPages = getTotalPages();

    if (totalPages <= 1 || state.currentView === 'calendar') {
        paginationContainer.classList.add('hidden');
        return;
    }

    paginationContainer.classList.remove('hidden');

    // Update pagination info
    const startItem = (state.currentPage - 1) * state.tasksPerPage + 1;
    const endItem = Math.min(state.currentPage * state.tasksPerPage, visibleTasks.length);
    paginationText.textContent = `Showing ${startItem}-${endItem} of ${visibleTasks.length} tasks`;

    // Update prev/next buttons
    paginationPrevBtn.disabled = state.currentPage === 1;
    paginationNextBtn.disabled = state.currentPage === totalPages;

    // Update page buttons
    paginationPages.innerHTML = '';

    // Show page numbers with ellipsis for many pages
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, state.currentPage + 2);

    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 0.5rem';
            paginationPages.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 0.5rem';
            paginationPages.appendChild(ellipsis);
        }
        addPageButton(totalPages);
    }
}

function addPageButton(pageNum) {
    const button = document.createElement('button');
    button.className = 'btn btn-ghost pagination-page';
    button.textContent = pageNum;
    button.type = 'button';
    button.classList.toggle('is-active', pageNum === state.currentPage);
    button.addEventListener('click', () => setPage(pageNum));
    paginationPages.appendChild(button);
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
        tasks: state.tasks,
        archivedTasks: state.archivedTasks
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

function exportPdf() {
    const jsPdfFactory = window.jspdf && window.jspdf.jsPDF;
    if (!jsPdfFactory) {
        alert('PDF library failed to load. Please check your internet and refresh.');
        return;
    }

    const doc = new jsPdfFactory({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const lineHeight = 16;
    let y = margin;

    function ensureSpace(extra = lineHeight) {
        if (y + extra > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    }

    function writeLine(text, options = {}) {
        const size = options.size || 11;
        const weight = options.bold ? 'bold' : 'normal';
        const lines = doc.splitTextToSize(String(text), pageWidth - margin * 2);

        doc.setFont('helvetica', weight);
        doc.setFontSize(size);

        lines.forEach((line) => {
            ensureSpace(lineHeight);
            doc.text(line, margin, y);
            y += lineHeight;
        });
    }

    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.completed).length;

    writeLine('TaskFlow Report', { size: 18, bold: true });
    writeLine(`Generated: ${new Date().toLocaleString()}`);
    writeLine(`Active Tasks: ${total}`);
    writeLine(`Completed (in active list): ${completed}`);
    writeLine(`Archived Completed: ${state.archivedTasks.length}`);
    y += 8;

    writeLine('Current Tasks', { size: 13, bold: true });
    if (state.tasks.length === 0) {
        writeLine('No tasks available.');
    } else {
        state.tasks.forEach((task, idx) => {
            const status = task.completed ? 'Done' : 'Pending';
            const timer = formatDuration(getElapsedMs(task));
            const due = formatDate(task.dueDate);
            writeLine(`${idx + 1}. ${task.title}`, { bold: true });
            writeLine(`   Status: ${status} | Priority: ${task.priority} | Due: ${due} | Time: ${timer}`);
        });
    }

    y += 8;
    writeLine('Archived Completed Tasks', { size: 13, bold: true });
    if (state.archivedTasks.length === 0) {
        writeLine('No archived completed tasks.');
    } else {
        state.archivedTasks.forEach((task, idx) => {
            const due = formatDate(task.dueDate);
            const timer = formatDuration(task.accumulatedMs || 0);
            const clearedAtText = task.clearedAt
                ? new Date(task.clearedAt).toLocaleString()
                : 'Unknown';
            writeLine(`${idx + 1}. ${task.title}`, { bold: true });
            writeLine(`   Priority: ${task.priority} | Due: ${due} | Time: ${timer} | Archived: ${clearedAtText}`);
        });
    }

    const today = new Date().toISOString().slice(0, 10);
    doc.save(`taskflow-report-${today}.pdf`);
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
    const taskIds = new Set(state.tasks.map((task) => task.id));
    state.tasks = state.tasks.map((task) => ({
        ...task,
        dependencyId: task.dependencyId && taskIds.has(task.dependencyId) ? task.dependencyId : null
    }));
    const importedArchived = Array.isArray(parsed.archivedTasks) ? parsed.archivedTasks : [];
    state.archivedTasks = importedArchived.map((task) => ({
        ...normalizeTask(task),
        clearedAt: Number(task.clearedAt) || Date.now()
    }));
    clearEditingMode();
    taskForm.reset();
    priorityInput.value = 'medium';
    dependencyInput.value = '';
    refreshDependencyOptions();

    saveState();
    refreshDependencyOptions();
    renderTasks();
    updateStats();
}

function handleListClick(event) {
    const button = event.target.closest('button');
    const taskTitle = event.target.closest('.task-title');

    const taskItem = event.target.closest('.task-item');
    if (!taskItem) {
        return;
    }

    const taskId = taskItem.dataset.id;
    if (!taskId) {
        return;
    }

    // Check if task title was clicked
    if (taskTitle) {
        openTaskDetails(taskId);
        return;
    }

    // Handle button clicks
    if (!button) {
        return;
    }

    if (button.classList.contains('start-pause-btn')) {
        toggleTimer(taskId);
    } else if (button.classList.contains('link-above-btn')) {
        linkToAboveTask(taskId);
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
    dependencyInput.value = '';
});

searchInput.addEventListener('input', (event) => {
    const nextQuery = event.target.value;
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
        state.query = nextQuery;
        state.currentPage = 1; // Reset to first page when search changes
        renderTasks();
    }, 140);
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
});

categoryButtons.forEach((button) => {
    button.addEventListener('click', () => setCategory(button.dataset.category));
});

listViewBtn.addEventListener('click', () => setView('list'));
calendarViewBtn.addEventListener('click', () => setView('calendar'));
calendarPrevBtn.addEventListener('click', () => changeCalendarMonth(-1));
calendarNextBtn.addEventListener('click', () => changeCalendarMonth(1));

paginationPrevBtn.addEventListener('click', () => setPage(state.currentPage - 1));
paginationNextBtn.addEventListener('click', () => setPage(state.currentPage + 1));

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
exportPdfButton.addEventListener('click', exportPdf);
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

const today = getTodayInputValue();
dateInput.setAttribute('min', today);

setInterval(() => {
    updateLiveTimers();
    updateOverdueStatus();
    checkOverdueTasks();
}, 1000);

loadState();
loadTheme();
refreshDependencyOptions();
renderTasks();
updateStats();

// Initialize notifications
requestNotificationPermission();
checkOverdueTasks();

// Modal event listeners
modalClose.addEventListener('click', hideTaskModal);
modalCloseFooter.addEventListener('click', hideTaskModal);
modalOverlay.addEventListener('click', hideTaskModal);

modalEdit.addEventListener('click', () => {
    const taskId = modalEdit.dataset.taskId;
    if (taskId) {
        hideTaskModal();
        startEditTask(taskId);
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && taskModal.classList.contains('show')) {
        hideTaskModal();
    }
});