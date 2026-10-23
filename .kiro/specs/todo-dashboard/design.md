# Technical Design Document: To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a single-page, browser-based productivity application built with vanilla HTML5, CSS3, and JavaScript. It combines a real-time clock/greeting system, a customizable Pomodoro timer, a task management system, and quick bookmarks functionality into a unified dashboard interface. All data persists via browser localStorage, enabling users to maintain their dashboard state across sessions.

### Key Design Principles
- **Component-based architecture**: Each feature (Clock, Timer, Tasks, Quick Links) is independently managed but shares state
- **Unidirectional data flow**: State changes flow through a central management system
- **Vanilla implementation**: No frameworks, transpilers, or build tools required
- **Static deployment**: GitHub Pages compatible with no server backend
- **Responsive design**: Fluid layout from 320px to 1920px screen widths

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                 index.html (DOM)                        │
├─────────────────────────────────────────────────────────┤
│  Greeting Card   │   Pomodoro Card   │   Tasks Card    │
│  ┌─────────────┐ │ ┌───────────────┐ │ ┌────────────┐  │
│  │ Clock       │ │ │ Timer Display │ │ │ Task List  │  │
│  │ Date        │ │ │ Controls      │ │ │ Add Form   │  │
│  │ Greeting    │ │ │ Duration Input│ │ │ Sort Menu  │  │
│  └─────────────┘ │ └───────────────┘ │ └────────────┘  │
│                  │                   │                  │
│   ┌──────────────────────────────────────────────┐     │
│   │        Quick Links Card                       │     │
│   │        ┌─────────────────────────────────┐   │     │
│   │        │ Link 1  Link 2  Link 3 ...     │   │     │
│   │        └─────────────────────────────────┘   │     │
│   └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│           script.js (State Management)                  │
├─────────────────────────────────────────────────────────┤
│  AppState (Central State Object)                        │
│  ├── tasks: Array<Task>                                │
│  ├── quickLinks: Array<QuickLink>                      │
│  ├── timerDuration: number                             │
│  ├── sortPreference: string                            │
│  └── currentTimer: TimerState                          │
│                                                         │
│  Component Controllers:                                 │
│  ├── GreetingManager                                   │
│  ├── TimerManager                                      │
│  ├── TaskManager                                       │
│  └── QuickLinksManager                                 │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│           localStorage API                              │
├─────────────────────────────────────────────────────────┤
│  appState: JSON string                                 │
│  - tasks                                               │
│  - quickLinks                                          │
│  - timerDuration                                       │
│  - sortPreference                                      │
└─────────────────────────────────────────────────────────┘
```

### High-Level Component Interaction Flow

1. **Application Initialization**
   - Load index.html
   - Parse CSS (style.css)
   - Execute JavaScript (script.js)
   - Load persisted state from localStorage
   - Initialize all component managers
   - Start update loops

2. **User Interaction**
   - User performs action (click button, type in input, etc.)
   - Event handler captures interaction
   - Component manager updates AppState
   - State change persisted to localStorage
   - UI updated to reflect new state

3. **Continuous Updates**
   - Clock updates every 1000ms
   - Greeting updates every 1000ms (checks hour)
   - Timer countdown every 1000ms (if running)
   - All other UI updates event-driven

---

## Components and Interfaces

### 1. Greeting & Clock Component

**Responsibilities:**
- Display current time in HH:MM:SS format (24-hour)
- Display current date in "Weekday, Month Day, Year" format
- Display contextual greeting (Good Morning/Afternoon/Evening)
- Update all displays synchronized every 1000ms

**Public Interface:**
```javascript
class GreetingManager {
  init()                    // Initialize and start update loop
  update()                  // Update all greeting displays
  destroy()                 // Stop update loop
}
```

**Data Requirements:**
- No persistent data needed
- Uses native JavaScript Date API only

**DOM Elements Required:**
```html
<div class="greeting-section">
  <div class="greeting-card">
    <div class="greeting-text"></div>
    <div class="clock"></div>
    <div class="date"></div>
  </div>
</div>
```

**Update Frequency:** 1000ms (every second)

**Implementation Notes:**
- Use single setInterval for all three values to ensure synchronization
- Use Intl.DateTimeFormat for locale-aware date formatting
- Clear interval on component destruction to prevent memory leaks

---

### 2. Pomodoro Timer Component

**Responsibilities:**
- Initialize timer with 25-minute default
- Display current countdown in MM:SS format
- Allow user to customize duration (1-60 minutes)
- Start/Stop/Reset countdown
- Display notification when countdown reaches 00:00
- Persist duration and sort preference

**Public Interface:**
```javascript
class TimerManager {
  init()                              // Initialize timer
  start()                             // Begin countdown
  stop()                              // Pause countdown
  reset()                             // Return to selected duration
  setDuration(minutes: number)        // Update duration (1-60)
  getDuration()                       // Get current duration
  update()                            // Update display (called by timer loop)
  destroy()                           // Stop countdown and cleanup
  isRunning()                         // Check if timer is active
}
```

**Data Model:**
```javascript
appState.currentTimer = {
  isRunning: boolean,        // Is countdown active?
  remaining: number,         // Seconds remaining
  intervalId: number | null  // setInterval ID for cleanup
}

appState.timerDuration = 25  // Persisted to localStorage
```

**DOM Elements Required:**
```html
<div class="timer-card">
  <h2>Focus Timer</h2>
  <div class="timer-display">25:00</div>
  <div class="timer-controls">
    <button class="timer-start">Start</button>
    <button class="timer-stop" disabled>Stop</button>
    <button class="timer-reset">Reset</button>
  </div>
  <div class="timer-duration-input">
    <label>Duration (min):</label>
    <input type="number" class="duration-input" min="1" max="60" value="25">
  </div>
</div>
```

**Key Behaviors:**
- Timer initializes to 25:00 on startup
- Start button disabled when timer running
- Duration input disabled when timer running
- Timer resets to selected duration when it reaches 00:00 (after notification)
- User can reset mid-session to return to selected duration
- Notification displayed (browser notification) when countdown completes

**State Machine:**
```
STOPPED (initial)
  ├─ click Start → RUNNING
  ├─ click Reset → STOPPED
  └─ duration input enabled

RUNNING
  ├─ click Stop → PAUSED
  ├─ countdown reaches 00:00 → FINISHED
  └─ duration input disabled

PAUSED
  ├─ click Start → RUNNING
  ├─ click Reset → STOPPED
  └─ duration input disabled

FINISHED
  ├─ display notification
  ├─ after user action, reset to STOPPED
  └─ duration input enabled
```

**Update Frequency:** 1000ms (when running)

**Implementation Notes:**
- Only one setInterval instance allowed at a time (prevent duplicate countdowns)
- Always clear previous interval before starting new one
- Convert seconds to MM:SS format for display: `Math.floor(seconds / 60):String(seconds % 60).padStart(2, '0')`
- Use browser Notification API for completion alert
- Persist selected duration immediately on change

---

### 3. Task Manager Component

**Responsibilities:**
- Display all tasks in a list
- Add new tasks (with validation)
- Mark tasks as completed/uncompleted
- Edit task names
- Delete tasks
- Sort tasks by multiple criteria
- Persist task list and sort preference

**Public Interface:**
```javascript
class TaskManager {
  init()                                    // Initialize tasks from localStorage
  addTask(name: string)                     // Add new task
  deleteTask(taskId: string)                // Remove task
  toggleTask(taskId: string)                // Toggle completed status
  editTask(taskId: string, newName: string) // Update task name
  updateSortOrder(sortType: string)         // Change sort order
  getSortedTasks()                          // Get tasks in current sort order
  render()                                  // Update task list display
  destroy()                                 // Cleanup
}
```

**Data Model:**
```javascript
appState.tasks = [
  {
    id: "unique-uuid-string",           // Unique identifier
    name: "Task name",                  // Task description
    completed: false,                   // Completion status
    createdAt: 1699000000000           // Unix timestamp for sorting
  },
  // ... more tasks
]

appState.sortPreference = "newest-first" // Default sort order
// Options: "newest-first", "oldest-first", "active-first", "alphabetical"
```

**DOM Elements Required:**
```html
<div class="tasks-card">
  <h2>To-Do List</h2>
  
  <div class="task-input-group">
    <input type="text" class="task-input" placeholder="Add a new task...">
    <button class="task-add">Add</button>
  </div>
  
  <div class="task-sort-group">
    <select class="task-sort">
      <option value="newest-first">Newest First</option>
      <option value="oldest-first">Oldest First</option>
      <option value="active-first">Active Tasks First</option>
      <option value="alphabetical">Alphabetical A-Z</option>
    </select>
  </div>
  
  <div class="task-list-container">
    <ul class="task-list">
      <!-- Tasks rendered here -->
      <li class="task-item" data-task-id="uuid">
        <input type="checkbox" class="task-checkbox">
        <span class="task-name">Task name</span>
        <button class="task-edit">Edit</button>
        <button class="task-delete">Delete</button>
      </li>
    </ul>
    <div class="task-empty-state">No tasks yet. Add one to get started!</div>
  </div>
</div>
```

**Validation Rules:**
- Task name cannot be empty or whitespace-only
- Task name cannot be a duplicate (case-insensitive comparison)
- Display error message when validation fails
- Preserve current state on validation error

**Sort Implementation:**

| Sort Type    | Behavior                                                          |
| ------------ | ----------------------------------------------------------------- |
| newest-first | Sort by createdAt descending (newest first)                       |
| oldest-first | Sort by createdAt ascending (oldest first)                        |
| active-first | Incomplete tasks first, then completed; secondary: creation order |
| alphabetical | Sort by task name A-Z case-insensitive                            |

**Edit Mode Behavior:**
```
Normal Display:
[✓] Task name          [Edit] [Delete]

Edit Mode:
[<input value="Task name">]  [Save] [Cancel]
```

**localStorage Persistence:**
- Save task list immediately after any change
- Save sort preference immediately after change
- Load all persisted tasks on application startup
- If localStorage is corrupted, start with empty task list

**Sorting Persistence:**
- Remember last selected sort order
- Apply it automatically on app startup
- Default to "newest-first" if no preference saved

---

### 4. Quick Links Component

**Responsibilities:**
- Add new quick links with name and URL
- Display quick links with favicon and hostname
- Open links in new tabs
- Delete quick links
- Persist quick links list
- Handle favicon retrieval and errors

**Public Interface:**
```javascript
class QuickLinksManager {
  init()                                    // Initialize quick links
  addLink(name: string, url: string)        // Add new quick link
  deleteLink(linkId: string)                // Remove quick link
  getFaviconUrl(url: string)                // Get favicon service URL
  render()                                  // Update quick links display
  destroy()                                 // Cleanup
}
```

**Data Model:**
```javascript
appState.quickLinks = [
  {
    id: "unique-uuid-string",           // Unique identifier
    name: "Google",                     // Display name
    url: "https://google.com",          // Full URL
    hostname: "google.com",             // Extracted from URL
    createdAt: 1699000000000           // Unix timestamp
  },
  // ... more links
]
```

**DOM Elements Required:**
```html
<div class="quick-links-card">
  <h2>Quick Links</h2>
  
  <div class="quick-link-input-group">
    <input type="text" class="link-name-input" placeholder="Link name">
    <input type="text" class="link-url-input" placeholder="https://example.com">
    <button class="link-add">Add</button>
  </div>
  
  <div class="quick-links-container">
    <div class="quick-links-grid">
      <!-- Links rendered here -->
      <div class="quick-link" data-link-id="uuid">
        <a href="https://google.com" target="_blank" class="link-button">
          <img class="link-favicon" src="favicon-url" alt="">
          <div class="link-info">
            <div class="link-name">Google</div>
            <div class="link-hostname">google.com</div>
          </div>
        </a>
        <button class="link-delete">×</button>
      </div>
    </div>
    <div class="quick-links-empty-state">No quick links yet.</div>
  </div>
</div>
```

**URL Validation:**
- Must be valid HTTP or HTTPS URL
- Must start with "http://" or "https://"
- Use URL constructor for validation: `new URL(input)`
- Display error message on invalid input
- Normalize URL (remove trailing slashes, ensure protocol)

**Favicon Implementation:**
- Use Google S2 favicon service (free, no API key required)
- Service URL format: `https://www.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE&url=[url]&size=32`
- Fallback: Display globe emoji (🌐) if favicon fails to load
- Use image `onerror` handler to detect load failure

**Hostname Extraction:**
```javascript
// Extract hostname from URL
const url = new URL("https://www.example.com/path");
const hostname = url.hostname; // "www.example.com"
// For display, optionally remove "www." prefix:
const displayHostname = hostname.replace(/^www\./, "");
```

**Opening Links:**
- Use `window.open(url, '_blank')` to open in new tab
- Ensure dashboard remains on current tab
- Icon and name clickable areas

**localStorage Persistence:**
- Save quick links immediately after add/delete
- Load all persisted links on application startup

---

## Data Models

### Central Application State

```javascript
const appState = {
  // Task Management
  tasks: [
    {
      id: string,              // UUID (use crypto.randomUUID() or timestamp-based)
      name: string,            // Task description
      completed: boolean,      // Completion toggle
      createdAt: number       // Unix timestamp in milliseconds
    }
  ],
  
  // Quick Links
  quickLinks: [
    {
      id: string,              // UUID
      name: string,            // Display name
      url: string,             // Full URL with protocol
      hostname: string,        // Extracted hostname
      createdAt: number       // Unix timestamp
    }
  ],
  
  // Timer Settings
  timerDuration: number,       // Selected duration in minutes (1-60)
  
  // Sort Preference
  sortPreference: string,      // One of: "newest-first", "oldest-first", "active-first", "alphabetical"
  
  // Runtime Timer State (NOT persisted)
  currentTimer: {
    isRunning: boolean,
    remaining: number,         // Seconds remaining
    intervalId: number | null  // setInterval ID
  }
}
```

### localStorage Serialization

**Storage Key:** `dashboardAppState`

**Serialized Format (JSON):**
```json
{
  "tasks": [
    {
      "id": "task-1699000000000",
      "name": "Buy groceries",
      "completed": false,
      "createdAt": 1699000000000
    }
  ],
  "quickLinks": [
    {
      "id": "link-1699000000001",
      "name": "Google",
      "url": "https://google.com",
      "hostname": "google.com",
      "createdAt": 1699000000001
    }
  ],
  "timerDuration": 25,
  "sortPreference": "newest-first"
}
```

**Serialization Strategy:**
- Save entire appState as single JSON string
- Exclude runtime `currentTimer` state (not persisted)
- Save immediately on any state change
- Load on app startup with validation

**Deserialization Strategy:**
- Parse JSON from localStorage
- Validate structure of each array
- Initialize missing fields with defaults
- Fall back to empty state if parsing fails
- Reinitialize runtime state (currentTimer)

---

## UI/UX Architecture

### Visual Design System

**Color Palette:**
```css
/* Primary Colors */
--color-primary: #667eea;      /* Purple-blue for interactive elements */
--color-secondary: #764ba2;    /* Deep purple for secondary elements */
--color-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--color-card-bg: #ffffff;      /* Card backgrounds */
--color-text-primary: #333333; /* Main text */
--color-text-secondary: #666666; /* Secondary text */
--color-text-light: #999999;   /* Light text */
--color-border: #e0e0e0;       /* Borders */
--color-success: #4caf50;      /* Task completion */
--color-error: #f44336;        /* Error states */
--color-warning: #ff9800;      /* Warnings */
```

**Typography:**
- Font Family: System stack (e.g., -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)
- Base Font Size: 16px
- Line Height: 1.5
- Clock Display: 3rem (48px) bold
- Date Display: 1.1rem (17.6px)
- Greeting Text: 1.3rem (20.8px)
- Card Headings: 1.5rem (24px)
- Button Text: 1rem (16px)

**Spacing System (based on 8px grid):**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

**Component Styling:**

**Cards:**
```css
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
```

**Buttons:**
```css
.button {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
}
```

**Input Fields:**
```css
input, textarea, select {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 16px;
  transition: all 0.3s ease;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
```

### Layout Architecture

**Greeting Section:**
- Full width of viewport
- Positioned at top, above cards
- Purple-blue gradient background
- Centered content (clock, date, greeting)
- Minimum height: 140px
- Padding: 32px 24px

**Main Dashboard Grid:**

Three-column layout (width ≥ 1024px):
```
┌───────────────┬───────────────┬───────────────┐
│   Greeting    │    Greeting   │    Greeting   │
└───────────────┴───────────────┴───────────────┘
┌───────────────┬───────────────┬───────────────┐
│    Focus      │    To-Do      │    Quick      │
│    Timer      │    List       │    Links      │
├───────────────┼───────────────┼───────────────┤
│               │               │               │
└───────────────┴───────────────┴───────────────┘
```

Grid CSS:
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
```

**Responsive Breakpoints:**

| Breakpoint | Width          | Layout    | Description            |
| ---------- | -------------- | --------- | ---------------------- |
| Mobile     | 320px - 639px  | 1 column  | Single column stacking |
| Tablet     | 640px - 1023px | 2 columns | Two-column layout      |
| Desktop    | 1024px +       | 3 columns | Full three-column      |

**Responsive Grid CSS:**
```css
/* Mobile: 320px to 639px */
@media (max-width: 639px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
  
  .card {
    padding: 16px;
  }
}

/* Tablet: 640px to 1023px */
@media (min-width: 640px) and (max-width: 1023px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 20px;
  }
}

/* Desktop: 1024px and up */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding: 24px;
  }
}
```

**Greeting Section Responsive:**
```css
.greeting-section {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 24px;
  text-align: center;
  color: white;
}

@media (max-width: 639px) {
  .greeting-section {
    padding: 24px 16px;
  }
}
```

**Task List Responsive:**
```css
.task-list {
  max-height: 400px;
  overflow-y: auto;
}

@media (max-width: 639px) {
  .task-list {
    max-height: 300px;
  }
}
```

**Quick Links Grid Responsive:**
```css
.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

@media (max-width: 639px) {
  .quick-links-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
  }
}
```

### Visual Hierarchy

1. **Primary Focus: Clock Display** (largest, most prominent)
   - Font size: 3rem
   - Color: White on gradient background
   - Position: Center of greeting section

2. **Secondary Focus: Active Section** (depending on user interaction)
   - Highlighted button or input with primary color
   - Task being edited
   - Timer being adjusted

3. **Tertiary Focus: Supporting Information**
   - Date, greeting text
   - Task names, hostnames
   - Button labels

4. **Lowest Focus: Interactive Elements** (until hovered)
   - Buttons (secondary color until hover)
   - Links and icons
   - Delete buttons (small, subtle)

---

## State Management

### State Update Flow

```
User Action
    ↓
Event Handler (click, input, etc.)
    ↓
Component Manager (e.g., TaskManager)
    ↓
Update appState object
    ↓
Serialize to JSON
    ↓
Write to localStorage
    ↓
Call render() to update DOM
    ↓
Display updated UI
```

### State Synchronization Strategy

**Immediate Persistence Pattern:**
```javascript
function addTask(taskName) {
  // 1. Validate input
  if (!isValidTaskName(taskName)) {
    displayError("Invalid task name");
    return;
  }
  
  // 2. Create new task object
  const newTask = {
    id: generateId(),
    name: taskName,
    completed: false,
    createdAt: Date.now()
  };
  
  // 3. Update state
  appState.tasks.push(newTask);
  
  // 4. Persist immediately
  saveToLocalStorage();
  
  // 5. Update UI
  renderTasks();
  
  // 6. Clear input
  clearTaskInput();
}
```

**Event-Driven Updates:**
- DOM changes do not directly update state
- State changes are the single source of truth
- UI is always synchronized with state
- Changes are atomic (state + localStorage + UI all update together)

### Component State Ownership

| Component       | State Owner       | Persisted            | Update Trigger            |
| --------------- | ----------------- | -------------------- | ------------------------- |
| Greeting        | GreetingManager   | No                   | 1000ms timer              |
| Timer Display   | TimerManager      | Partially (duration) | 1000ms timer + user input |
| Tasks           | TaskManager       | Yes                  | User input + sort change  |
| Quick Links     | QuickLinksManager | Yes                  | User input                |
| Sort Preference | TaskManager       | Yes                  | Sort selection            |

### Multi-Component Synchronization

**Scenario: User edits a task**
1. User clicks Edit button on task
2. TaskManager handles edit submission
3. appState.tasks updated
4. localStorage updated with new task name
5. TaskManager.render() called
6. UI updated to show new task name
7. If sort is "alphabetical", task position may change in display (handled by render)

**Scenario: User changes timer duration while timer running**
1. Duration input is disabled (cannot change)
2. User clicks Stop to pause timer
3. TimerManager.stop() called
4. appState.currentTimer.remaining preserved
5. User now can change duration
6. TimerManager.setDuration() called
7. appState.timerDuration updated
8. localStorage updated
9. Timer display updated to show new MM:SS
10. User can click Start to begin countdown with new duration

---

## Technical Implementation Details

### DOM Manipulation Patterns

**Pattern 1: Rendering a List**
```javascript
function renderTasks() {
  const taskList = document.querySelector('.task-list');
  const tasks = getSortedTasks(); // Get tasks in current sort order
  
  // Clear existing content
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="empty-state">No tasks yet</li>';
    return;
  }
  
  // Create new items
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.taskId = task.id;
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-name">${escapeHtml(task.name)}</span>
      <button class="task-edit">Edit</button>
      <button class="task-delete">Delete</button>
    `;
    taskList.appendChild(li);
  });
}

// Utility to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Pattern 2: Event Delegation**
```javascript
// Add single event listener to parent, handle multiple children
document.addEventListener('click', (event) => {
  // Task checkbox toggle
  if (event.target.classList.contains('task-checkbox')) {
    const taskId = event.target.closest('.task-item').dataset.taskId;
    toggleTask(taskId);
  }
  
  // Task delete
  if (event.target.classList.contains('task-delete')) {
    const taskId = event.target.closest('.task-item').dataset.taskId;
    deleteTask(taskId);
  }
  
  // Task edit
  if (event.target.classList.contains('task-edit')) {
    const taskId = event.target.closest('.task-item').dataset.taskId;
    enterEditMode(taskId);
  }
  
  // Quick link delete
  if (event.target.classList.contains('link-delete')) {
    const linkId = event.target.closest('.quick-link').dataset.linkId;
    deleteLink(linkId);
  }
});
```

**Pattern 3: Form Submission**
```javascript
// Task input form
document.querySelector('.task-input-group').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.querySelector('.task-input');
  const taskName = input.value.trim();
  
  if (addTask(taskName)) {
    input.value = '';
    input.focus();
  }
});

// Alternative: Button click
document.querySelector('.task-add').addEventListener('click', () => {
  const input = document.querySelector('.task-input');
  const taskName = input.value.trim();
  
  if (addTask(taskName)) {
    input.value = '';
    input.focus();
  }
});

// Support Enter key on input
document.querySelector('.task-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.querySelector('.task-add').click();
  }
});
```

### Event Handling Strategy

**Global Event Listeners:**
```javascript
// Initialize all listeners on app start
function initializeEventListeners() {
  // Delegation on document for most events
  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('keypress', handleGlobalKeypress);
  document.addEventListener('change', handleChange);
  
  // Specific listeners for better performance
  document.querySelector('.task-input').addEventListener('input', validateTaskInput);
  document.querySelector('.duration-input').addEventListener('change', handleDurationChange);
  document.querySelector('.task-sort').addEventListener('change', handleSortChange);
  document.querySelector('.link-url-input').addEventListener('blur', validateUrlInput);
}

// Cleanup on app destroy
function destroyEventListeners() {
  document.removeEventListener('click', handleGlobalClick);
  document.removeEventListener('keypress', handleGlobalKeypress);
  document.removeEventListener('change', handleChange);
}
```

**Event Handler Guidelines:**
- Use event delegation for list items (task list, quick links)
- Attach specific listeners to form inputs for real-time validation
- Always call `e.preventDefault()` on form submissions
- Always call `e.stopPropagation()` if event should not bubble
- Use `event.target` to identify clicked element
- Use `event.target.closest()` to find parent element with data attribute

### localStorage Serialization/Deserialization

**Save Function:**
```javascript
function saveToLocalStorage() {
  try {
    const stateToSave = {
      tasks: appState.tasks,
      quickLinks: appState.quickLinks,
      timerDuration: appState.timerDuration,
      sortPreference: appState.sortPreference
    };
    
    const jsonString = JSON.stringify(stateToSave);
    localStorage.setItem('dashboardAppState', jsonString);
    console.log('State saved to localStorage');
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      displayError('Storage quota exceeded. Please delete some items.');
    }
  }
}
```

**Load Function:**
```javascript
function loadFromLocalStorage() {
  try {
    const jsonString = localStorage.getItem('dashboardAppState');
    
    if (!jsonString) {
      // First time user
      console.log('No saved state found, initializing defaults');
      return getDefaultState();
    }
    
    const savedState = JSON.parse(jsonString);
    
    // Validate structure
    if (!Array.isArray(savedState.tasks)) {
      savedState.tasks = [];
    }
    if (!Array.isArray(savedState.quickLinks)) {
      savedState.quickLinks = [];
    }
    if (typeof savedState.timerDuration !== 'number' || 
        savedState.timerDuration < 1 || 
        savedState.timerDuration > 60) {
      savedState.timerDuration = 25;
    }
    if (!['newest-first', 'oldest-first', 'active-first', 'alphabetical'].includes(savedState.sortPreference)) {
      savedState.sortPreference = 'newest-first';
    }
    
    return savedState;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return getDefaultState();
  }
}

function getDefaultState() {
  return {
    tasks: [],
    quickLinks: [],
    timerDuration: 25,
    sortPreference: 'newest-first'
  };
}
```

**On App Startup:**
```javascript
function initializeApp() {
  // Load persisted state
  const savedState = loadFromLocalStorage();
  Object.assign(appState, savedState);
  
  // Initialize runtime state
  appState.currentTimer = {
    isRunning: false,
    remaining: appState.timerDuration * 60,
    intervalId: null
  };
  
  // Initialize all components
  greetingManager.init();
  timerManager.init();
  taskManager.init();
  quickLinksManager.init();
  
  // Render initial UI
  renderAllUI();
}
```

### Timer Interval Management and Cleanup

**Timer Implementation:**
```javascript
class TimerManager {
  constructor() {
    this.clockIntervalId = null;
    this.countdownIntervalId = null;
  }
  
  init() {
    // Start the update loop
    this.updateDisplay();
    this.clockIntervalId = setInterval(() => this.updateDisplay(), 1000);
  }
  
  start() {
    // Prevent duplicate intervals
    if (appState.currentTimer.isRunning) {
      console.warn('Timer already running');
      return;
    }
    
    // Clear any existing countdown interval
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
    }
    
    appState.currentTimer.isRunning = true;
    
    // Start countdown
    this.countdownIntervalId = setInterval(() => {
      appState.currentTimer.remaining--;
      this.updateDisplay();
      
      if (appState.currentTimer.remaining <= 0) {
        this.finishCountdown();
      }
    }, 1000);
    
    this.updateControlButtons();
  }
  
  stop() {
    if (!appState.currentTimer.isRunning) return;
    
    appState.currentTimer.isRunning = false;
    
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    
    this.updateControlButtons();
  }
  
  reset() {
    this.stop();
    appState.currentTimer.remaining = appState.timerDuration * 60;
    this.updateDisplay();
  }
  
  finishCountdown() {
    this.stop();
    appState.currentTimer.remaining = appState.timerDuration * 60;
    this.updateDisplay();
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Session Complete', {
        body: 'Great work! Time to take a break.',
        icon: '🎉'
      });
    }
  }
  
  destroy() {
    this.stop();
    if (this.clockIntervalId !== null) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
  }
}
```

**Notification Permission Request:**
```javascript
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    });
  }
}

// Call during app initialization
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
  initializeApp();
});
```

---

## API and External Services

### Google S2 Favicon Service

**Service URL Format:**
```
https://www.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE&url=[URL_ENCODED_DOMAIN]&size=32
```

**Parameters:**
- `client=SOCIAL`: Always use "SOCIAL"
- `type=FAVICON`: Always use "FAVICON"
- `fallback_opts=TYPE,SIZE`: Fallback options format
- `url`: URL-encoded domain/full URL
- `size=32`: Favicon size in pixels

**Example:**
```javascript
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const encodedUrl = encodeURIComponent(domain);
    
    return `https://www.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE&url=${encodedUrl}&size=32`;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}
```

**Favicon Loading with Fallback:**
```javascript
function loadFavicon(faviconUrl, imgElement) {
  if (!faviconUrl) {
    // Use emoji fallback
    imgElement.style.display = 'none';
    imgElement.parentElement.textContent = '🌐';
    return;
  }
  
  imgElement.src = faviconUrl;
  imgElement.alt = 'Website icon';
  
  imgElement.onerror = () => {
    // Fallback to emoji if service fails
    imgElement.style.display = 'none';
    imgElement.parentElement.innerHTML = '<span class="fallback-icon">🌐</span>';
  };
  
  imgElement.onload = () => {
    imgElement.style.display = 'block';
  };
}
```

**No Authentication Required:**
- Google S2 service is public and free
- No API key needed
- No rate limiting issues for typical user dashboard
- Service is stable and reliable

---

## Error Handling

### Validation Functions

**Task Name Validation:**
```javascript
function isValidTaskName(name) {
  // Check if empty or whitespace-only
  if (!name || name.trim().length === 0) {
    displayError('Task name cannot be empty');
    return false;
  }
  
  // Check for duplicate (case-insensitive)
  const isDuplicate = appState.tasks.some(
    task => task.name.toLowerCase() === name.trim().toLowerCase()
  );
  
  if (isDuplicate) {
    displayError('A task with this name already exists');
    return false;
  }
  
  return true;
}
```

**URL Validation:**
```javascript
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      displayError('URL must start with http:// or https://');
      return false;
    }
    
    // Must have hostname
    if (!url.hostname) {
      displayError('URL must have a valid hostname');
      return false;
    }
    
    return true;
  } catch (error) {
    displayError('Invalid URL format');
    return false;
  }
}
```

**Timer Duration Validation:**
```javascript
function isValidDuration(value) {
  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    displayError('Duration must be a number');
    return false;
  }
  
  if (num < 1 || num > 60) {
    displayError('Duration must be between 1 and 60 minutes');
    return false;
  }
  
  return true;
}
```

### Error Display

**User-Facing Error Messages:**
```javascript
function displayError(message) {
  // Create error notification element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-notification';
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  
  // Show with animation
  setTimeout(() => errorDiv.classList.add('show'), 10);
  
  // Auto-hide after 4 seconds
  setTimeout(() => {
    errorDiv.classList.remove('show');
    setTimeout(() => errorDiv.remove(), 300);
  }, 4000);
}
```

**Error Notification CSS:**
```css
.error-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #f44336;
  color: white;
  padding: 16px 24px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s ease;
  z-index: 1000;
  max-width: 400px;
}

.error-notification.show {
  opacity: 1;
  transform: translateY(0);
}
```

### Try-Catch Error Handling

**localStorage Access:**
```javascript
try {
  localStorage.setItem('key', 'value');
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    displayError('Storage full. Please delete some items.');
  } else {
    console.error('localStorage error:', error);
  }
}
```

**URL Parsing:**
```javascript
try {
  const url = new URL(userInput);
  // Process URL
} catch (error) {
  displayError('Invalid URL format');
}
```

---

## Performance Considerations

### Update Frequency Optimization

**Clock/Greeting Updates:**
- Update every 1000ms (1 second)
- Single setInterval for both clock and greeting to minimize timers
- Use `requestAnimationFrame` alternative if smoother updates needed
- Minimize DOM queries (cache element references)

**Timer Countdown:**
- Only active when timer is running
- Update every 1000ms during countdown
- Stop immediately when countdown finishes
- Only one countdown interval allowed at a time

**Task List Rendering:**
- Full re-render on any task change (add, edit, delete, toggle)
- Partial re-render on sort change (reorder only)
- Use `innerHTML = ''` to clear before re-rendering (acceptable for small lists)
- Cache DOM references to frequently accessed elements

### DOM Query Optimization

**Cache Element References:**
```javascript
// Bad: Query every time
document.querySelector('.clock').textContent = time;
document.querySelector('.clock').textContent = time; // Query again!

// Good: Cache references
const clockElement = document.querySelector('.clock');
clockElement.textContent = time;
```

**Initial Setup:**
```javascript
const cacheDOM = {
  clock: document.querySelector('.clock'),
  date: document.querySelector('.date'),
  greeting: document.querySelector('.greeting-text'),
  timerDisplay: document.querySelector('.timer-display'),
  taskList: document.querySelector('.task-list'),
  quickLinksGrid: document.querySelector('.quick-links-grid'),
  taskInput: document.querySelector('.task-input'),
  durationInput: document.querySelector('.duration-input'),
  sortSelect: document.querySelector('.task-sort'),
  // ... etc
};

// Use throughout app
cacheDOM.clock.textContent = formatTime(now);
```

### Event Listener Optimization

**Use Event Delegation:**
```javascript
// Bad: Add listener to each item
document.querySelectorAll('.task-item').forEach(item => {
  item.addEventListener('click', handleTaskClick); // Many listeners!
});

// Good: Single listener on parent
document.querySelector('.task-list').addEventListener('click', (e) => {
  if (e.target.closest('.task-item')) {
    handleTaskClick(e);
  }
});
```

### localStorage Performance

**Batch Updates:**
```javascript
// Bad: Save after each change
addTask(task1);  // Save 1
addTask(task2);  // Save 2
addTask(task3);  // Save 3

// Good: Batch operations then save once
appState.tasks.push(task1);
appState.tasks.push(task2);
appState.tasks.push(task3);
saveToLocalStorage(); // Save once
```

**Don't Store Unnecessary Data:**
- Don't store currentTimer state (runtime only)
- Don't store computed values (sort order can be computed from tasks array)
- Store only: tasks, quickLinks, timerDuration, sortPreference

### String Formatting Optimization

**Time Formatting:**
```javascript
// Pre-compile format functions
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Use Intl API for locale-aware formatting
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

function formatDate(date) {
  return dateFormatter.format(date);
}
```

### Memory Management

**Interval Cleanup:**
```javascript
// Always clear intervals when done
if (this.intervalId !== null) {
  clearInterval(this.intervalId);
  this.intervalId = null;
}
```

**Event Listener Cleanup:**
```javascript
// Remove listeners if app can be destroyed
function destroyApp() {
  document.removeEventListener('click', globalClickHandler);
  document.removeEventListener('keypress', globalKeypressHandler);
  timerManager.destroy();
  greetingManager.destroy();
}
```

---

## File Structure and Organization

### Project File Layout

```
project-root/
├── index.html           # Main HTML file
├── css/
│   └── style.css       # All styles
└── js/
    └── script.js       # All JavaScript logic
```

### index.html Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>To-Do List Life Dashboard</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Greeting Section -->
  <section class="greeting-section">
    <div class="greeting-card">
      <div class="greeting-text"></div>
      <div class="clock"></div>
      <div class="date"></div>
    </div>
  </section>
  
  <!-- Main Dashboard -->
  <main class="dashboard-grid">
    <!-- Timer Card -->
    <div class="card timer-card">
      <!-- Timer content -->
    </div>
    
    <!-- Tasks Card -->
    <div class="card tasks-card">
      <!-- Tasks content -->
    </div>
    
    <!-- Quick Links Card -->
    <div class="card quick-links-card">
      <!-- Quick links content -->
    </div>
  </main>
  
  <!-- JavaScript -->
  <script src="js/script.js"></script>
</body>
</html>
```

### css/style.css Structure

```css
/* ========== CSS Structure ========== */

/* 1. Reset and Base Styles */
/* - CSS reset */
/* - Base typography */
/* - Base element styling */

/* 2. Variables and Utilities */
/* - CSS custom properties (colors, spacing, etc.) */
/* - Utility classes */

/* 3. Layout */
/* - Grid layout */
/* - Flexbox utilities */
/* - Positioning */

/* 4. Component Styles */
/* - Greeting section */
/* - Cards and containers */
/* - Buttons */
/* - Input fields */
/* - Task list */
/* - Quick links */

/* 5. State Styles */
/* - Hover states */
/* - Active states */
/* - Disabled states */
/* - Completed states */

/* 6. Responsive Design */
/* - Mobile styles (320px) */
/* - Tablet styles (640px) */
/* - Desktop styles (1024px) */

/* 7. Animations and Transitions */
/* - Fade effects */
/* - Slide effects */
/* - Hover animations */

/* 8. Accessibility */
/* - Focus states */
/* - High contrast mode */
/* - Reduced motion preferences */
```

### js/script.js Structure

```javascript
/* ========== JavaScript Structure ========== */

// 1. Global State Object
const appState = { ... };

// 2. Utility Functions
function saveToLocalStorage() { ... }
function loadFromLocalStorage() { ... }
function generateId() { ... }
// ... more utilities

// 3. Validation Functions
function isValidTaskName() { ... }
function isValidUrl() { ... }
function isValidDuration() { ... }
// ... more validators

// 4. DOM Cache (after DOM loaded)
const cacheDOM = { ... };

// 5. Component Managers
class GreetingManager { ... }
class TimerManager { ... }
class TaskManager { ... }
class QuickLinksManager { ... }

// 6. Event Handlers
function handleGlobalClick() { ... }
function handleGlobalKeypress() { ... }
function handleChange() { ... }

// 7. Initialization
function initializeApp() { ... }

// 8. DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => { ... });
```

### Code Organization Best Practices

**File Size Targets:**
- index.html: ~200 lines (structure only, no logic)
- css/style.css: ~600-800 lines (all styling)
- js/script.js: ~1000-1200 lines (all logic)

**Separation of Concerns:**
- HTML: Structure only, no inline scripts or styles
- CSS: All visual styling, no layout logic
- JavaScript: All behavior and state management

**Naming Conventions:**
- CSS classes: kebab-case (`.timer-card`, `.task-item`)
- JavaScript variables: camelCase (`timerDuration`, `appState`)
- JavaScript functions: camelCase (`formatTime`, `isValidUrl`)
- JavaScript classes: PascalCase (`TimerManager`, `TaskManager`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_TIMER_DURATION = 25`)

---

## Testing Strategy

### Unit Testing Categories

**1. Validation Functions (Example-Based Tests)**
- Test valid task names
- Test empty/whitespace task names
- Test duplicate task names
- Test valid URLs
- Test invalid URLs
- Test timer durations in range
- Test timer durations out of range

**2. Sorting Functions (Example-Based Tests)**
- Test "newest-first" sort
- Test "oldest-first" sort
- Test "active-first" sort
- Test "alphabetical" sort
- Test with empty task list
- Test with single task
- Test with mixed completed/active tasks

**3. Data Persistence (Example-Based Tests)**
- Test save to localStorage
- Test load from localStorage
- Test corruption handling
- Test empty storage (first time user)

**4. State Management (Example-Based Tests)**
- Test state update on task add
- Test state update on task delete
- Test state update on sort change
- Test state update on timer duration change

### Integration Testing Categories

**1. Task Workflow (Example-Based Tests)**
- Add task → verify displays → verify persists → reload → verify restores
- Edit task → verify updates → verify persists
- Delete task → verify removed → verify persists
- Toggle completion → verify visual change → verify persists

**2. Timer Workflow (Example-Based Tests)**
- Start timer → verify counts down → verify updates display
- Stop timer → verify countdown pauses → verify time preserved
- Reset timer → verify returns to duration
- Duration change (timer stopped) → verify display updates
- Countdown finishes → verify notification shown

**3. Quick Links Workflow (Example-Based Tests)**
- Add link → verify displays → verify favicon loads or shows fallback
- Delete link → verify removed → verify persists
- Click link → verify opens in new tab
- Multiple links → verify correct order and layout

**4. Responsive Layout (Example-Based Tests)**
- Verify 3-column layout on desktop (1024px+)
- Verify 2-column layout on tablet (640px-1023px)
- Verify 1-column layout on mobile (320px-639px)
- Verify no data loss on resize

### Manual Testing Scenarios

**Scenario 1: First-Time User**
- Open app in new browser (cleared localStorage)
- Verify greeting displays current time
- Verify timer shows 25:00
- Verify task list shows empty state
- Verify quick links shows empty state

**Scenario 2: Add and Manage Tasks**
- Add task "Buy groceries"
- Verify task appears in list
- Add task "Call mom"
- Verify both tasks appear
- Mark first task as completed
- Verify visual change (strikethrough)
- Delete second task
- Verify task removed
- Close browser and reopen
- Verify tasks persisted correctly

**Scenario 3: Use Timer**
- Verify timer shows 25:00
- Change duration to 5 minutes
- Verify timer shows 05:00
- Click Start
- Verify Start button disabled
- Verify countdown active
- Wait 5 seconds
- Verify timer shows 04:55
- Click Stop
- Verify Stop button works
- Verify time preserved
- Click Start again
- Verify resumes from 04:55
- Wait for timer to finish
- Verify notification shows

**Scenario 4: Save and Restore**
- Add task, quick link
- Change timer duration to 10
- Set sort to "alphabetical"
- Close browser
- Clear cookies/cache
- Reopen app
- Verify task still exists
- Verify quick link still exists
- Verify timer duration is 10
- Verify sort is alphabetical

### Performance Testing

**1. DOM Update Performance**
- Add 50 tasks
- Verify list renders smoothly
- Toggle all 50 tasks completion
- Verify smooth visual updates

**2. localStorage Performance**
- Add 100 tasks
- Verify localStorage save < 50ms
- Verify localStorage load < 50ms

**3. Memory Usage**
- Monitor memory with DevTools
- Verify no memory leaks after 5 minutes of interaction
- Verify intervals are properly cleaned up on reset

---

## Summary and Next Steps

This design document provides comprehensive specifications for implementing the To-Do List Life Dashboard. Key deliverables:

1. **Component Architecture**: Four independent managers coordinated through central AppState
2. **Data Model**: Flat, serializable state structure for localStorage persistence
3. **UI/UX**: Responsive 3-column grid layout with gradient background
4. **State Management**: Event-driven updates with immediate persistence
5. **Implementation Patterns**: DOM manipulation, event handling, and interval management strategies
6. **Error Handling**: Comprehensive validation with user-friendly error messages
7. **Performance**: Optimized updates, cached DOM references, and event delegation
8. **File Organization**: Vanilla HTML/CSS/JavaScript with clear separation of concerns

The implementation should follow these specifications closely to ensure:
- Consistent user experience
- Reliable data persistence
- Optimal performance
- Easy maintenance and future extensions

All code should be written in vanilla JavaScript without frameworks, keeping the application lightweight and deployable to GitHub Pages.
