// ========== LOCAL STORAGE KEYS ==========
const STORAGE_KEYS = {
  TODOS: 'dashboard_todos',
  LINKS: 'dashboard_links',
  POMODORO_TIME: 'pomodoro_time'
};

// ========== APP STATE ==========
let appState = {
  todos: [],
  links: [],
  timerInterval: null,
  timerRunning: false,
  timeRemaining: 25 * 60,  // seconds
  pomodoroTime: 25          // minutes
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  initializeGreeting();
  initializeTimer();
  initializeTodoList();
  initializeQuickLinks();
});

// ========== GREETING ==========
function initializeGreeting() {
  updateGreeting();
  setInterval(updateGreeting, 1000);
}

function updateGreeting() {
  const now = new Date();

  // Clock: HH:MM:SS 24-hour
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;

  // Date: Weekday Month Day, Year
  const dateOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  document.getElementById('date').textContent = now.toLocaleDateString('en-US', dateOptions);

  // Greeting: based on hour
  const hour = now.getHours();
  let greetingText;
  if (hour >= 5 && hour < 12) {
    greetingText = 'Good Morning';
  } else if (hour >= 12 && hour < 18) {
    greetingText = 'Good Afternoon';
  } else {
    greetingText = 'Good Evening';
  }
  document.getElementById('greeting').textContent = greetingText;
}

// ========== TIMER ==========
function initializeTimer() {
  // Load saved duration (already in appState via loadFromLocalStorage)
  document.getElementById('pomodoroTime').value = appState.pomodoroTime;
  appState.timeRemaining = appState.pomodoroTime * 60;
  updateTimerDisplay();

  document.getElementById('startBtn').addEventListener('click', startTimer);
  document.getElementById('stopBtn').addEventListener('click', stopTimer);
  document.getElementById('resetBtn').addEventListener('click', resetTimer);
  document.getElementById('applyTimeBtn').addEventListener('click', applyNewTime);
}

function updateTimerDisplay() {
  const minutes = Math.floor(appState.timeRemaining / 60);
  const seconds = appState.timeRemaining % 60;
  document.getElementById('timer').textContent =
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
  // Prevent duplicate intervals
  if (appState.timerRunning) return;

  appState.timerRunning = true;
  document.getElementById('startBtn').disabled = true;
  document.getElementById('pomodoroTime').disabled = true;

  appState.timerInterval = setInterval(() => {
    if (appState.timeRemaining > 0) {
      appState.timeRemaining--;
      updateTimerDisplay();
    } else {
      clearInterval(appState.timerInterval);
      appState.timerInterval = null;
      appState.timerRunning = false;
      document.getElementById('startBtn').disabled = false;
      document.getElementById('pomodoroTime').disabled = false;
      notifyTimerComplete();
      // Auto-reset to selected duration
      appState.timeRemaining = appState.pomodoroTime * 60;
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
  }
  appState.timerRunning = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pomodoroTime').disabled = false;
}

function resetTimer() {
  stopTimer();
  appState.timeRemaining = appState.pomodoroTime * 60;
  updateTimerDisplay();
}

function applyNewTime() {
  const inputEl = document.getElementById('pomodoroTime');
  const newTime = parseInt(inputEl.value, 10);

  if (isNaN(newTime) || newTime < 1 || newTime > 60) {
    alert('Please enter a valid duration between 1 and 60 minutes.');
    return;
  }

  appState.pomodoroTime = newTime;
  localStorage.setItem(STORAGE_KEYS.POMODORO_TIME, String(newTime));
  resetTimer();
  alert(`Pomodoro timer updated to ${newTime} minute${newTime === 1 ? '' : 's'}.`);
}

function notifyTimerComplete() {
  // Browser notification if permitted, fallback to alert
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Timer', {
      body: '🎉 Focus time complete! Take a break!',
      icon: ''
    });
  } else {
    alert('🎉 Focus time complete! Take a break!');
  }
}

// Request notification permission on load (non-blocking)
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ========== TODO LIST ==========
function initializeTodoList() {
  document.getElementById('addTodoBtn').addEventListener('click', addTodo);
  document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
  });
  document.getElementById('sortSelect').addEventListener('change', renderTodos);
  renderTodos();
}

function addTodo() {
  const input = document.getElementById('todoInput');
  const taskText = input.value.trim();

  if (!taskText) {
    alert('Please enter a task.');
    return;
  }

  // Case-insensitive duplicate check
  const isDuplicate = appState.todos.some(
    todo => todo.text.toLowerCase() === taskText.toLowerCase()
  );
  if (isDuplicate) {
    alert('This task already exists!');
    return;
  }

  const todo = {
    id: Date.now(),
    text: taskText,
    done: false,
    createdAt: Date.now()
  };

  appState.todos.push(todo);
  saveToLocalStorage();
  input.value = '';
  input.focus();
  renderTodos();
}

function deleteTodo(id) {
  appState.todos = appState.todos.filter(todo => todo.id !== id);
  saveToLocalStorage();
  renderTodos();
}

function toggleTodo(id) {
  const todo = appState.todos.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    saveToLocalStorage();
    renderTodos();
  }
}

function startEditTodo(id) {
  const todo = appState.todos.find(t => t.id === id);
  if (!todo) return;

  const todoItem = document.querySelector(`[data-todo-id="${id}"]`);
  if (!todoItem) return;

  const todoText = todoItem.querySelector('.todo-text');
  const actionsDiv = todoItem.querySelector('.todo-actions');

  // Build inline edit container
  const editContainer = document.createElement('div');
  editContainer.className = 'todo-edit-container';
  editContainer.style.display = 'flex';
  editContainer.style.gap = '8px';
  editContainer.style.flex = '1';

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = todo.text;
  editInput.className = 'todo-edit-input';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'save-btn';
  saveBtn.addEventListener('click', () => saveEditTodo(id, editInput.value));

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'cancel-btn';
  cancelBtn.addEventListener('click', () => renderTodos());

  // Keyboard shortcuts inside edit input
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEditTodo(id, editInput.value);
    if (e.key === 'Escape') renderTodos();
  });

  editContainer.appendChild(editInput);
  editContainer.appendChild(saveBtn);
  editContainer.appendChild(cancelBtn);

  // Replace text + actions with edit container
  todoText.replaceWith(editContainer);
  actionsDiv.remove();

  editInput.focus();
  editInput.select();
}

function saveEditTodo(id, newText) {
  const trimmed = newText.trim();

  if (!trimmed) {
    alert('Task cannot be empty.');
    return;
  }

  // Duplicate check, excluding the task being edited
  const isDuplicate = appState.todos.some(
    todo => todo.id !== id && todo.text.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    alert('This task already exists!');
    return;
  }

  const todo = appState.todos.find(t => t.id === id);
  if (todo) {
    todo.text = trimmed;
    saveToLocalStorage();
    renderTodos();
  }
}

function getSortedTodos() {
  const sortMethod = document.getElementById('sortSelect').value;
  const copy = [...appState.todos];

  switch (sortMethod) {
    case 'date-asc':
      return copy.sort((a, b) => a.createdAt - b.createdAt);
    case 'status':
      return copy.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1; // active first
        return a.createdAt - b.createdAt;
      });
    case 'alphabetical':
      return copy.sort((a, b) =>
        a.text.toLowerCase().localeCompare(b.text.toLowerCase())
      );
    case 'date-desc':
    default:
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function renderTodos() {
  const todoList = document.getElementById('todoList');
  todoList.innerHTML = '';

  if (appState.todos.length === 0) {
    todoList.innerHTML =
      '<li style="text-align:center; color:#999; padding:20px;">No tasks yet. Add one to get started!</li>';
    return;
  }

  const sorted = getSortedTodos();

  sorted.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.setAttribute('data-todo-id', todo.id);

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.done;
    checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.done ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // Text
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'todo-btn edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit task: ${todo.text}`);
    editBtn.addEventListener('click', () => startEditTodo(todo.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-btn delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete task: ${todo.text}`);
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(actionsDiv);

    todoList.appendChild(li);
  });
}

// ========== QUICK LINKS ==========
function initializeQuickLinks() {
  document.getElementById('addLinkBtn').addEventListener('click', addLink);
  document.getElementById('linkUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addLink();
  });
  renderLinks();
}

function addLink() {
  const nameInput = document.getElementById('linkName');
  const urlInput = document.getElementById('linkUrl');
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();

  if (!name || !url) {
    alert('Please enter both a link name and a URL.');
    return;
  }

  // URL validation: must parse AND be http/https
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    alert('Please enter a valid URL (e.g. https://example.com).');
    return;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    alert('Only http:// and https:// URLs are allowed.');
    return;
  }

  const link = {
    id: Date.now(),
    name: name,
    url: url
  };

  appState.links.push(link);
  saveToLocalStorage();
  nameInput.value = '';
  urlInput.value = '';
  renderLinks();
}

function deleteLink(id) {
  appState.links = appState.links.filter(link => link.id !== id);
  saveToLocalStorage();
  renderLinks();
}

function extractHostname(urlString) {
  try {
    return new URL(urlString).hostname;
  } catch (e) {
    return '';
  }
}

function getFaviconUrl(hostname) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}

function renderLinks() {
  const container = document.getElementById('quickLinks');
  container.innerHTML = '';

  if (appState.links.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; color:#999; padding:20px;">No quick links yet. Add one!</p>';
    return;
  }

  appState.links.forEach(link => {
    const hostname = extractHostname(link.url);

    // Anchor element — opens in new tab
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.className = 'link-item';
    anchor.setAttribute('aria-label', `Open ${link.name} — ${hostname}`);

    // Favicon container
    const faviconContainer = document.createElement('div');
    faviconContainer.className = 'link-favicon-container';

    if (hostname) {
      const favicon = document.createElement('img');
      favicon.className = 'link-favicon';
      favicon.src = getFaviconUrl(hostname);
      favicon.alt = '';
      favicon.setAttribute('aria-hidden', 'true');
      favicon.addEventListener('error', () => {
        favicon.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.className = 'link-favicon-fallback';
        fallback.textContent = '🌐';
        faviconContainer.appendChild(fallback);
      });
      faviconContainer.appendChild(favicon);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'link-favicon-fallback';
      fallback.textContent = '🌐';
      faviconContainer.appendChild(fallback);
    }

    // Content: name + domain
    const contentDiv = document.createElement('div');
    contentDiv.className = 'link-content';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'link-name';
    nameSpan.textContent = link.name;

    const domainSpan = document.createElement('span');
    domainSpan.className = 'link-domain';
    domainSpan.textContent = hostname || 'Unknown domain';

    contentDiv.appendChild(nameSpan);
    contentDiv.appendChild(domainSpan);

    // External link indicator
    const extIcon = document.createElement('span');
    extIcon.className = 'link-external-icon';
    extIcon.textContent = '↗';
    extIcon.setAttribute('aria-hidden', 'true');

    // Delete button — must stop propagation so the anchor doesn't navigate
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Remove ${link.name}`);
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteLink(link.id);
    });

    anchor.appendChild(faviconContainer);
    anchor.appendChild(contentDiv);
    anchor.appendChild(extIcon);
    anchor.appendChild(deleteBtn);

    container.appendChild(anchor);
  });
}

// ========== LOCAL STORAGE ==========
function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(appState.todos));
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(appState.links));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const savedTodos = localStorage.getItem(STORAGE_KEYS.TODOS);
    if (savedTodos) {
      const parsed = JSON.parse(savedTodos);
      if (Array.isArray(parsed)) appState.todos = parsed;
    }
  } catch (e) {
    console.warn('Could not load todos from localStorage:', e);
    appState.todos = [];
  }

  try {
    const savedLinks = localStorage.getItem(STORAGE_KEYS.LINKS);
    if (savedLinks) {
      const parsed = JSON.parse(savedLinks);
      if (Array.isArray(parsed)) appState.links = parsed;
    }
  } catch (e) {
    console.warn('Could not load links from localStorage:', e);
    appState.links = [];
  }

  try {
    const savedTime = localStorage.getItem(STORAGE_KEYS.POMODORO_TIME);
    if (savedTime) {
      const t = parseInt(savedTime, 10);
      if (!isNaN(t) && t >= 1 && t <= 60) {
        appState.pomodoroTime = t;
      }
    }
  } catch (e) {
    console.warn('Could not load pomodoro time from localStorage:', e);
  }
}
