import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarClock, Check, CheckCircle2, Clock4, FolderOpen, FolderPlus, GripVertical, LayoutList, ListFilter, Pencil, Plus, Repeat2, Search, Sparkles, SquareKanban, Tag, Trash2, WandSparkles, X } from 'lucide-react';
import { equalTo, off, onValue, orderByChild, query, ref, remove, set } from 'firebase/database';
import { useI18n } from '../../i18n/store';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { db } from '../../services/firebase/client';

type Priority = 'low' | 'medium' | 'high';
type TaskStatus = 'todo' | 'in_progress' | 'done';
type RecurringType = 'none' | 'daily' | 'weekly' | 'custom';
type AssignableAdmin = { id: string; displayName: string; role: 'superadmin' | 'admin'; firebaseUid?: string };

type TodoTask = {
  id: string;
  project: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  completed: boolean;
  order: number;
  reminderAt?: string;
  recurring: { type: RecurringType; customDays?: number };
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
  createdAt: string;
  updatedAt: string;
  lastReminderAt?: string;
  assigneeUserId: string;
  assigneeDisplayName: string;
  createdByUserId: string;
  createdByDisplayName: string;
  assigneeFirebaseUid?: string;
  createdByFirebaseUid?: string;
};

type TodoFeatureConfig = {
  kanbanEnabled: boolean;
  subtaskEnabled: boolean;
  reminderEnabled: boolean;
  recurringEnabled: boolean;
  activityLogEnabled: boolean;
  darkModeEnabled: boolean;
  taskDeleteConfirmEnabled: boolean;
};

const storageKey = (base: string, userId: string) => `${base}_${userId}`;
const DEFAULT_PROJECTS = ['Inbox', 'Personal', 'Work'];
const TODO_PROJECTS_KEY = 'hrms_todo_projects_shared_v2';
const TODO_TASKS_KEY = 'hrms_todo_tasks_shared_v2';
const TODO_FB_PROJECTS_PATH = 'todoWorkspace/projects';
const TODO_FB_TASKS_PATH = 'todoWorkspace/tasks';

const mkId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();
const ymd = (d: Date) => d.toISOString().slice(0, 10);

function parseNaturalInput(raw: string): { title: string; dueDate?: string; timeHint?: string } {
  let text = raw.trim();
  if (!text) return { title: '' };
  const lower = text.toLowerCase();
  const tomorrow = lower.includes('besok') || /\btomorrow\b/.test(lower);
  const today = lower.includes('hari ini') || /\btoday\b/.test(lower);
  const nextWeek = lower.includes('minggu depan') || /\bnext week\b/.test(lower);
  const jam = lower.match(/(?:jam|at)\s+(\d{1,2})(?::(\d{2}))?/i);
  let dueDate: string | undefined;
  if (tomorrow) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dueDate = ymd(d);
    text = text.replace(/besok|tomorrow/gi, '').trim();
  } else if (today) {
    dueDate = ymd(new Date());
    text = text.replace(/hari ini|today/gi, '').trim();
  } else if (nextWeek) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    dueDate = ymd(d);
    text = text.replace(/minggu depan|next week/gi, '').trim();
  }
  const timeHint = jam ? `${jam[1].padStart(2, '0')}:${(jam[2] || '00').padStart(2, '0')}` : undefined;
  if (jam) text = text.replace(jam[0], '').trim();
  return { title: text || raw.trim(), dueDate, timeHint };
}

export function TodoPage({
  featureConfig,
  userId,
  userDisplayName,
  currentUserFirebaseUid,
  currentUserRole,
  assignableAdmins,
}: {
  featureConfig: TodoFeatureConfig;
  userId: string;
  userDisplayName: string;
  currentUserFirebaseUid: string;
  currentUserRole: 'superadmin' | 'admin' | 'viewer';
  assignableAdmins: AssignableAdmin[];
}) {
  const { t } = useI18n();
  const [isAppDark, setIsAppDark] = useState(false);
  const [simplePanelHidden, setSimplePanelHidden] = useState(false);
  const [simpleInput, setSimpleInput] = useState('');
  const [simpleMode, setSimpleMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey('hrms_todo_simple_mode_v1', userId)) === '1';
    } catch {
      return false;
    }
  });
  const [projects, setProjects] = useState<string[]>(() => {
    try {
      const scoped = localStorage.getItem(TODO_PROJECTS_KEY);
      const parsed = scoped ? JSON.parse(scoped) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return [...DEFAULT_PROJECTS];
    } catch { return [...DEFAULT_PROJECTS]; }
  });
  const [activeProject, setActiveProject] = useState<string>(() => localStorage.getItem(storageKey('hrms_todo_active_project_v1', userId)) || 'Inbox');
  const [tasksByProject, setTasksByProject] = useState<Record<string, TodoTask[]>>(() => {
    try {
      const shared = localStorage.getItem(TODO_TASKS_KEY);
      if (shared) return JSON.parse(shared);
      return JSON.parse(localStorage.getItem(storageKey('hrms_todo_tasks_v1', userId)) || '{}');
    } catch { return {}; }
  });
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(userId);
  const [quickInput, setQuickInput] = useState('');
  const [quickInputError, setQuickInputError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'today' | 'overdue' | 'week'>('all');
  const [view, setView] = useState<'list' | 'kanban'>(() => (localStorage.getItem(storageKey('hrms_todo_view_v1', userId)) as 'list' | 'kanban') || 'list');
  const [activity, setActivity] = useState<string[]>([]);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [listDropTargetId, setListDropTargetId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectError, setNewProjectError] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectError, setEditingProjectError] = useState('');
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<string | null>(null);
  const [taskDeleteTarget, setTaskDeleteTarget] = useState<TodoTask | null>(null);
  const [taskCompleteTarget, setTaskCompleteTarget] = useState<TodoTask | null>(null);
  const [undoState, setUndoState] = useState<{ project: string; tasks: TodoTask[]; activeWasDeleted: boolean } | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);
  const undoTimerRef = useRef<number | null>(null);
  const undoProgressTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const todoLoadedRef = useRef(false);
  const lastProjectsSyncedRef = useRef('');
  const pageDark = featureConfig.darkModeEnabled && isAppDark;
  const assignTargetOptions = useMemo(() => {
    const mine = assignableAdmins.find((admin) => admin.id === userId)
      || { id: userId, displayName: userDisplayName, role: currentUserRole, firebaseUid: currentUserFirebaseUid };
    const others = assignableAdmins.filter((admin) => admin.id !== userId);
    return mine ? [mine, ...others] : others;
  }, [assignableAdmins, userId, currentUserFirebaseUid, userDisplayName, currentUserRole]);

  const tasks = useMemo(() => (tasksByProject[activeProject] || []).sort((a, b) => a.order - b.order), [tasksByProject, activeProject]);
  const visibleTasks = useMemo(() => tasks.filter((t) => !t.assigneeUserId || t.assigneeUserId === userId), [tasks, userId]);
  const tags = useMemo(() => Array.from(new Set(visibleTasks.flatMap((t) => t.tags))).sort(), [visibleTasks]);

  useEffect(() => {
    if (!currentUserFirebaseUid) {
      try {
        const cachedProjects = localStorage.getItem(TODO_PROJECTS_KEY);
        const cachedTasks = localStorage.getItem(TODO_TASKS_KEY);
        if (cachedProjects) {
          const parsedProjects = JSON.parse(cachedProjects);
          if (Array.isArray(parsedProjects) && parsedProjects.length) setProjects(parsedProjects);
        }
        if (cachedTasks) {
          const parsedTasks = JSON.parse(cachedTasks);
          if (parsedTasks && typeof parsedTasks === 'object') setTasksByProject(parsedTasks);
        }
      } catch {
        // ignore local cache parse errors
      }
      todoLoadedRef.current = true;
      return;
    }
    const projectsRef = ref(db, TODO_FB_PROJECTS_PATH);
    const tasksQuery = query(ref(db, TODO_FB_TASKS_PATH), orderByChild('assigneeUserId'), equalTo(userId));
    let gotProjects = false;
    let gotTasks = false;
    const hydrateDone = () => {
      if (gotProjects && gotTasks) todoLoadedRef.current = true;
    };
    onValue(projectsRef, (snap) => {
      const data = snap.val() as string[] | null;
      if (Array.isArray(data) && data.length > 0) {
        const normalized = Array.from(new Set(data.filter(Boolean)));
        const serialized = JSON.stringify(normalized);
        lastProjectsSyncedRef.current = serialized;
        setProjects(normalized);
      } else {
        try {
          const cached = localStorage.getItem(TODO_PROJECTS_KEY);
          const parsed = cached ? JSON.parse(cached) : null;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = Array.from(new Set(parsed.filter(Boolean)));
            lastProjectsSyncedRef.current = JSON.stringify(normalized);
            setProjects(normalized);
          }
        } catch {
          // ignore fallback cache parse errors
        }
      }
      gotProjects = true;
      hydrateDone();
    });
    onValue(tasksQuery, (snap) => {
      const data = snap.val() as Record<string, TodoTask> | null;
      const grouped: Record<string, TodoTask[]> = {};
      if (data && typeof data === 'object') {
        for (const task of Object.values(data)) {
          const project = task.project || 'Inbox';
          grouped[project] = grouped[project] || [];
          grouped[project].push({ ...task, project });
        }
      }
      for (const project of Object.keys(grouped)) {
        grouped[project].sort((a, b) => a.order - b.order);
      }
      setTasksByProject(grouped);
      gotTasks = true;
      hydrateDone();
    });
    return () => {
      off(projectsRef);
      off(tasksQuery);
    };
  }, [userId, currentUserFirebaseUid]);
  useEffect(() => {
    localStorage.setItem(TODO_PROJECTS_KEY, JSON.stringify(projects));
    if (!todoLoadedRef.current) return;
    const nextSerialized = JSON.stringify(projects);
    if (nextSerialized === lastProjectsSyncedRef.current) return;
    lastProjectsSyncedRef.current = nextSerialized;
    if (!currentUserFirebaseUid) return;
    void set(ref(db, TODO_FB_PROJECTS_PATH), projects);
  }, [projects, currentUserFirebaseUid]);
  useEffect(() => {
    localStorage.setItem(TODO_TASKS_KEY, JSON.stringify(tasksByProject));
    localStorage.setItem(storageKey('hrms_todo_tasks_v1', userId), JSON.stringify(tasksByProject));
  }, [tasksByProject, userId]);
  useEffect(() => { localStorage.setItem(storageKey('hrms_todo_active_project_v1', userId), activeProject); }, [activeProject, userId]);
  useEffect(() => { localStorage.setItem(storageKey('hrms_todo_view_v1', userId), view); }, [view, userId]);
  useEffect(() => {
    if (assignTargetOptions.some((admin) => admin.id === selectedAssigneeId)) return;
    setSelectedAssigneeId(userId);
  }, [assignTargetOptions, selectedAssigneeId, userId]);
  useEffect(() => {
    // Ensure every account always has baseline default projects.
    if (projects.length === 0) {
      setProjects([...DEFAULT_PROJECTS]);
      setActiveProject('Inbox');
      return;
    }
    setTasksByProject((prev) => {
      let touched = false;
      const next = { ...prev };
      for (const project of projects) {
        if (!next[project]) {
          next[project] = [];
          touched = true;
        }
      }
      return touched ? next : prev;
    });
  }, [projects]);
  useEffect(() => {
    localStorage.setItem(storageKey('hrms_todo_simple_mode_v1', userId), simpleMode ? '1' : '0');
  }, [simpleMode, userId]);
  useEffect(() => {
    const readTheme = () => setIsAppDark(document.documentElement.getAttribute('data-theme') === 'dark');
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeydown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (ev.key === '/' && !typing) {
        ev.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((ev.key === 'n' || ev.key === 'N') && !typing) {
        ev.preventDefault();
        quickInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  useEffect(() => {
    if (!featureConfig.reminderEnabled) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTasksByProject((prev) => {
        const clone = { ...prev };
        let touched = false;
        for (const project of Object.keys(clone)) {
          clone[project] = clone[project].map((task) => {
            if (!task.reminderAt || task.completed) return task;
            if (task.lastReminderAt) return task;
            const reminderMs = new Date(task.reminderAt).getTime();
            if (!Number.isFinite(reminderMs) || reminderMs > now) return task;
            if (Notification.permission === 'granted') {
              new Notification(`Reminder: ${task.title}`, { body: `Project: ${project}` });
            }
            touched = true;
            return { ...task, lastReminderAt: nowIso() };
          });
        }
        return touched ? clone : prev;
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [featureConfig.reminderEnabled]);

  useEffect(() => {
    if (!featureConfig.recurringEnabled) return;
    const today = ymd(new Date());
    setTasksByProject((prev) => {
      const clone = { ...prev };
      let touched = false;
      for (const project of Object.keys(clone)) {
        for (const task of clone[project]) {
          if (task.completed || task.recurring.type === 'none' || !task.dueDate) continue;
          if (task.dueDate >= today) continue;
          const next = { ...task };
          if (task.recurring.type === 'daily') next.dueDate = today;
          if (task.recurring.type === 'weekly') {
            const d = new Date(task.dueDate);
            d.setDate(d.getDate() + 7);
            next.dueDate = ymd(d);
          }
          if (task.recurring.type === 'custom') {
            const step = Math.max(1, task.recurring.customDays || 1);
            const d = new Date(task.dueDate);
            d.setDate(d.getDate() + step);
            next.dueDate = ymd(d);
          }
          Object.assign(task, next);
          touched = true;
        }
      }
      return touched ? clone : prev;
    });
  }, [featureConfig.recurringEnabled]);

  const filtered = useMemo(() => {
    const today = ymd(new Date());
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = ymd(weekEnd);
    const q = search.trim().toLowerCase();
    return visibleTasks.filter((t) => {
      if (q && !`${t.title} ${t.description || ''} ${t.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (tagFilter !== 'all' && !t.tags.includes(tagFilter)) return false;
      if (dueFilter === 'today' && t.dueDate !== today) return false;
      if (dueFilter === 'overdue' && (!t.dueDate || t.dueDate >= today)) return false;
      if (dueFilter === 'week' && (!t.dueDate || t.dueDate < today || t.dueDate > weekEndStr)) return false;
      return true;
    });
  }, [visibleTasks, search, statusFilter, priorityFilter, tagFilter, dueFilter]);

  const saveTaskToFirebase = (task: TodoTask) => {
    if (!currentUserFirebaseUid) return Promise.resolve();
    return set(ref(db, `${TODO_FB_TASKS_PATH}/${task.id}`), task);
  };

  const updateTask = (id: string, fn: (task: TodoTask) => TodoTask) => {
    let updatedTask: TodoTask | null = null;
    setTasksByProject((prev) => {
      const nextList = (prev[activeProject] || []).map((task) => {
        if (task.id !== id) return task;
        updatedTask = fn(task);
        return updatedTask;
      });
      return { ...prev, [activeProject]: nextList };
    });
    if (updatedTask) void saveTaskToFirebase(updatedTask);
  };
  const createTaskFromInput = (raw: string): TodoTask | null => {
    const parsed = parseNaturalInput(raw);
    if (!parsed.title) return null;
    const list = tasksByProject[activeProject] || [];
    const selectedAssignee = assignTargetOptions.find((admin) => admin.id === selectedAssigneeId);
    const currentUserFirebaseUidResolved = currentUserFirebaseUid || assignTargetOptions.find((admin) => admin.id === userId)?.firebaseUid || '';
    return {
      id: mkId(),
      project: activeProject,
      title: parsed.title,
      description: '',
      dueDate: parsed.dueDate,
      priority: 'medium',
      status: 'todo',
      tags: [],
      completed: false,
      order: list.length + 1,
      reminderAt: parsed.dueDate && parsed.timeHint ? `${parsed.dueDate}T${parsed.timeHint}:00` : undefined,
      recurring: { type: 'none' },
      subtasks: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      assigneeUserId: selectedAssignee?.id || userId,
      assigneeDisplayName: selectedAssignee?.displayName || userDisplayName,
      createdByUserId: userId,
      createdByDisplayName: userDisplayName,
      assigneeFirebaseUid: selectedAssignee?.firebaseUid || currentUserFirebaseUidResolved || undefined,
      createdByFirebaseUid: currentUserFirebaseUidResolved || undefined,
    };
  };

  const addTask = () => {
    const item = createTaskFromInput(quickInput);
    if (!item) {
      setQuickInputError(t('Isi judul task dulu.', 'Please enter a task title first.'));
      quickInputRef.current?.focus();
      return;
    }
    setTasksByProject((prev) => ({ ...prev, [activeProject]: [...(prev[activeProject] || []), item] }));
    void saveTaskToFirebase(item);
    setQuickInput('');
    setQuickInputError('');
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDueFilter('all');
    setTagFilter('all');
    if (featureConfig.activityLogEnabled) setActivity((a) => [`${t('Task dibuat', 'Task created')}: ${item.title}`, ...a].slice(0, 20));
  };
  const addProject = () => {
    const clean = newProjectName.trim();
    if (!clean) {
      setNewProjectError(t('Nama proyek tidak boleh kosong.', 'Project name cannot be empty.'));
      return;
    }
    if (projects.some((p) => p.toLowerCase() === clean.toLowerCase())) {
      setNewProjectError(t('Nama proyek sudah ada.', 'Project name already exists.'));
      return;
    }
    setProjects((p) => [...p, clean]);
    setTasksByProject((prev) => ({ ...prev, [clean]: prev[clean] || [] }));
    setNewProjectName('');
    setNewProjectError('');
    setActiveProject(clean);
  };
  const startRenameProject = (project: string) => {
    setEditingProject(project);
    setEditingProjectName(project);
    setEditingProjectError('');
  };
  const saveRenameProject = () => {
    const oldName = editingProject;
    const newName = editingProjectName.trim();
    if (!oldName) return;
    if (!newName) {
      setEditingProjectError(t('Nama proyek tidak boleh kosong.', 'Project name cannot be empty.'));
      return;
    }
    if (oldName === newName) {
      setEditingProject(null);
      setEditingProjectName('');
      setEditingProjectError('');
      return;
    }
    if (projects.some((p) => p.toLowerCase() === newName.toLowerCase() && p !== oldName)) {
      setEditingProjectError(t('Nama proyek sudah ada.', 'Project name already exists.'));
      return;
    }
    setProjects((prev) => prev.map((p) => (p === oldName ? newName : p)));
    const movedTasks = (tasksByProject[oldName] || []).map((task) => ({ ...task, project: newName, updatedAt: nowIso() }));
    setTasksByProject((prev) => {
      const copy = { ...prev };
      copy[newName] = movedTasks;
      delete copy[oldName];
      return copy;
    });
    movedTasks.forEach((task) => { void saveTaskToFirebase(task); });
    if (activeProject === oldName) setActiveProject(newName);
    setEditingProject(null);
    setEditingProjectName('');
    setEditingProjectError('');
  };
  const deleteProject = (project: string) => {
    if (projects.length <= 1) return;
    const deletedTasks = tasksByProject[project] || [];
    const activeWasDeleted = activeProject === project;
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (undoProgressTimerRef.current) {
      window.clearInterval(undoProgressTimerRef.current);
      undoProgressTimerRef.current = null;
    }
    setUndoState({ project, tasks: deletedTasks, activeWasDeleted });
    setUndoProgress(100);
    setProjects((prev) => prev.filter((p) => p !== project));
    setTasksByProject((prev) => {
      const copy = { ...prev };
      delete copy[project];
      return copy;
    });
    if (currentUserFirebaseUid) deletedTasks.forEach((task) => { void remove(ref(db, `${TODO_FB_TASKS_PATH}/${task.id}`)); });
    if (activeProject === project) {
      const next = projects.find((p) => p !== project) || 'Inbox';
      setActiveProject(next);
    }
    undoTimerRef.current = window.setTimeout(() => {
      setUndoState(null);
      setUndoProgress(100);
      undoTimerRef.current = null;
      if (undoProgressTimerRef.current) {
        window.clearInterval(undoProgressTimerRef.current);
        undoProgressTimerRef.current = null;
      }
    }, 5000);
    const startedAt = Date.now();
    undoProgressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, 100 - (elapsed / 5000) * 100);
      setUndoProgress(next);
    }, 80);
  };
  const undoDeleteProject = () => {
    if (!undoState) return;
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (undoProgressTimerRef.current) {
      window.clearInterval(undoProgressTimerRef.current);
      undoProgressTimerRef.current = null;
    }
    setProjects((prev) => (prev.includes(undoState.project) ? prev : [...prev, undoState.project]));
    setTasksByProject((prev) => ({ ...prev, [undoState.project]: undoState.tasks }));
    undoState.tasks.forEach((task) => { void saveTaskToFirebase(task); });
    if (undoState.activeWasDeleted) setActiveProject(undoState.project);
    setUndoState(null);
    setUndoProgress(100);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (undoProgressTimerRef.current) window.clearInterval(undoProgressTimerRef.current);
    };
  }, []);
  const addSimpleTask = () => {
    const item = createTaskFromInput(simpleInput);
    if (!item) return;
    setTasksByProject((prev) => ({ ...prev, [activeProject]: [...(prev[activeProject] || []), item] }));
    void saveTaskToFirebase(item);
    setSimpleInput('');
  };

  const removeTask = (id: string) => {
    setTasksByProject((prev) => ({ ...prev, [activeProject]: (prev[activeProject] || []).filter((t) => t.id !== id) }));
    if (currentUserFirebaseUid) void remove(ref(db, `${TODO_FB_TASKS_PATH}/${id}`));
  };
  const requestRemoveTask = (task: TodoTask) => {
    if (!featureConfig.taskDeleteConfirmEnabled) {
      removeTask(task.id);
      return;
    }
    setTaskDeleteTarget(task);
  };
  const setTaskCompleted = (id: string, completed: boolean) => {
    updateTask(id, (t) => ({ ...t, completed, status: completed ? 'done' : 'todo', updatedAt: nowIso() }));
  };
  const requestToggleCompleteTask = (task: TodoTask) => {
    if (task.completed) {
      setTaskCompleted(task.id, false);
      return;
    }
    setTaskCompleteTarget(task);
  };
  const statusCols: TaskStatus[] = ['todo', 'in_progress', 'done'];

  const moveOrder = (from: number, to: number) => {
    const list = [...tasks];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    const reordered = list.map((t, idx) => ({ ...t, order: idx + 1, updatedAt: nowIso() }));
    setTasksByProject((prev) => ({ ...prev, [activeProject]: reordered }));
    reordered.forEach((task) => { void saveTaskToFirebase(task); });
  };
  const moveById = (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const from = tasks.findIndex((t) => t.id === dragId);
    const to = tasks.findIndex((t) => t.id === targetId);
    if (from < 0 || to < 0) return;
    moveOrder(from, to);
  };

  const priorityClass: Record<Priority, string> = {
    low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    high: 'bg-rose-50 text-rose-700 border border-rose-200',
  };

  return (
    <div className={`todo-page flex-1 min-h-0 overflow-y-auto p-4 ${pageDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(320px,440px)] gap-3 lg:items-center shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 inline-flex items-center justify-center">
              <ContentLucideIcon icon={SquareKanban} size={16} variant="toolbar" className="text-[#005A9E]" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">Task Workspace</h2>
              <p className="text-xs text-slate-500">{t('Task board modern, clean, dan fleksibel', 'Modern, clean, and flexible task board')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-center">
            <button
              type="button"
              onClick={() => setSimpleMode((v) => !v)}
              className={`h-9 px-3 rounded-xl border text-sm font-semibold transition inline-flex items-center gap-1.5 ${
                simpleMode ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ContentLucideIcon icon={simpleMode ? WandSparkles : LayoutList} size={13} variant="toolbar" />
              {simpleMode ? t('Simple Mode', 'Simple Mode') : t('Full Mode', 'Full Mode')}
            </button>
            {featureConfig.kanbanEnabled && (
              <button onClick={() => setView((v) => (v === 'list' ? 'kanban' : 'list'))} className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-1.5">
                <ContentLucideIcon icon={view === 'list' ? SquareKanban : LayoutList} size={13} variant="toolbar" />
                {view === 'list' ? t('Ganti: Kanban', 'Switch: Kanban') : t('Ganti: List', 'Switch: List')}
              </button>
            )}
            <button onClick={addTask} className="h-9 px-3 rounded-xl bg-[#005A9E] hover:bg-[#004880] text-white text-sm font-semibold inline-flex items-center gap-1 transition"><ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Tambah Task', 'Add Task')}</button>
          </div>
          <div className="w-full flex flex-col gap-1">
            {(currentUserRole === 'admin' || currentUserRole === 'superadmin') && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">{t('Tujuan Admin', 'Target Admin')}</span>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  disabled={assignTargetOptions.length === 0}
                  className="h-8 border border-slate-200 rounded-lg text-xs px-2 bg-slate-50 min-w-52"
                >
                  {assignTargetOptions.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.displayName}{admin.id === userId ? ` (${t('Saya', 'Me')})` : ''}
                    </option>
                  ))}
                  {assignTargetOptions.length === 0 && (
                    <option value={userId}>{t('Belum ada admin siap assign', 'No assignable admin yet')}</option>
                  )}
                </select>
              </div>
            )}
            <div className="flex-1 relative">
              <ContentLucideIcon icon={Plus} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={quickInputRef}
                value={quickInput}
                onChange={(e) => {
                  setQuickInput(e.target.value);
                  if (quickInputError && e.target.value.trim()) setQuickInputError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder={t('Tulis task baru...', 'Write a new task...')}
                className={`w-full h-10 pl-9 pr-8 rounded-xl border bg-slate-50 text-sm outline-none transition ${
                  quickInputError
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10'
                }`}
              />
              {quickInput && (
                <button type="button" onClick={() => setQuickInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 inline-flex items-center justify-center">
                  <X size={12} />
                </button>
              )}
            </div>
            {quickInputError && <p className="text-[11px] text-rose-600">{quickInputError}</p>}
          </div>
        </div>

        <div className={`grid gap-4 ${simpleMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[240px_1fr_280px]'}`}>
          {!simpleMode && (
          <aside className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <p className="text-xs text-slate-500 mb-2 inline-flex items-center gap-1"><ContentLucideIcon icon={FolderOpen} size={12} variant="toolbar" /> {t('Proyek', 'Projects')}</p>
            <p className="text-[10px] text-slate-400 mb-2">{t('Task yang tampil hanya untuk admin', 'Visible tasks are only for admin')}: <span className="font-semibold">{userDisplayName}</span></p>
            <div className="space-y-1">
              {projects.map((p) => (
                <div key={p} className={`group h-9 px-2 rounded-xl flex items-center gap-1 transition border ${p === activeProject ? 'bg-[#005A9E] text-white border-[#005A9E] shadow-sm' : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}>
                  {editingProject === p ? (
                    <>
                      <input
                        value={editingProjectName}
                        onChange={(e) => {
                          setEditingProjectName(e.target.value);
                          if (editingProjectError && e.target.value.trim()) setEditingProjectError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && saveRenameProject()}
                        className={`flex-1 h-7 px-2 rounded-lg text-xs text-slate-800 border ${
                          editingProjectError ? 'border-rose-300' : 'border-slate-200'
                        }`}
                      />
                      <button type="button" onClick={saveRenameProject} className="h-6 w-6 rounded-md bg-emerald-500 text-white inline-flex items-center justify-center"><Check size={12} /></button>
                      <button type="button" onClick={() => { setEditingProject(null); setEditingProjectName(''); setEditingProjectError(''); }} className="h-6 w-6 rounded-md bg-slate-300 text-slate-700 inline-flex items-center justify-center"><X size={12} /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setActiveProject(p)} className="flex-1 text-left text-sm truncate px-1">{p}</button>
                      <button type="button" onClick={() => startRenameProject(p)} className={`h-6 w-6 rounded-md inline-flex items-center justify-center ${p === activeProject ? 'hover:bg-white/20 text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'} opacity-0 group-hover:opacity-100 transition-opacity`}><Pencil size={11} /></button>
                      <button type="button" disabled={projects.length <= 1} onClick={() => setProjectDeleteTarget(p)} className={`h-6 w-6 rounded-md inline-flex items-center justify-center ${p === activeProject ? 'hover:bg-white/20 text-white' : 'text-rose-400 hover:bg-rose-100 hover:text-rose-600'} opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed`}><Trash2 size={11} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    if (newProjectError && e.target.value.trim()) setNewProjectError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addProject()}
                  placeholder={t('Nama proyek baru...', 'New project name...')}
                  className={`flex-1 h-9 px-2 rounded-xl border bg-slate-50 text-xs outline-none ${
                    newProjectError ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-[#005A9E]'
                  }`}
                />
                <button type="button" onClick={addProject} className="h-9 w-9 rounded-xl bg-[#005A9E] text-white inline-flex items-center justify-center hover:bg-[#004880] transition">
                  <FolderPlus size={14} />
                </button>
              </div>
              {newProjectError && <p className="text-[11px] text-rose-600">{newProjectError}</p>}
              <p className="text-[10px] text-slate-400">{t('Tips: hover item proyek untuk edit/hapus.', 'Tip: hover project item to edit/delete.')}</p>
              {editingProjectError && <p className="text-[11px] text-rose-600">{editingProjectError}</p>}
            </div>
          </aside>
          )}

          {!simpleMode && (
          <main className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">{t('Filter & Search', 'Filter & Search')}</span>
                <span className="text-[10px] text-slate-400">{t('Shortcut: / cari, N task baru', 'Shortcut: / search, N new task')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_160px_160px_160px] gap-2">
              <div className="relative">
                <ContentLucideIcon icon={Search} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input ref={searchInputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Cari task...', 'Search task...')} className="w-full h-9 pl-8 pr-8 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 inline-flex items-center justify-center">
                    <X size={12} />
                  </button>
                )}
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-9 border border-slate-200 rounded-xl text-sm px-2 bg-slate-50"><option value="all">{t('Status', 'Status')}</option><option value="todo">Todo</option><option value="in_progress">{t('Diproses', 'In Progress')}</option><option value="done">{t('Selesai', 'Done')}</option></select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="h-9 border border-slate-200 rounded-xl text-sm px-2 bg-slate-50"><option value="all">{t('Prioritas', 'Priority')}</option><option value="low">{t('Rendah', 'Low')}</option><option value="medium">{t('Sedang', 'Medium')}</option><option value="high">{t('Tinggi', 'High')}</option></select>
              <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as any)} className="h-9 border border-slate-200 rounded-xl text-sm px-2 bg-slate-50"><option value="all">{t('Jatuh Tempo', 'Due')}</option><option value="today">{t('Hari Ini', 'Today')}</option><option value="overdue">{t('Lewat', 'Overdue')}</option><option value="week">{t('Minggu Ini', 'This week')}</option></select>
              </div>
            </div>
            <div className="mb-3">
              <div className="inline-flex items-center gap-2">
                <ContentLucideIcon icon={Tag} size={12} variant="toolbar" className="text-slate-400" />
                <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="h-9 border border-slate-200 rounded-xl text-sm px-2 min-w-44 bg-slate-50"><option value="all">{t('Semua tag', 'All tags')}</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
              </div>
            </div>

            {view === 'kanban' && featureConfig.kanbanEnabled ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {statusCols.map((col) => (
                  <div key={col} className="rounded-xl border border-slate-200 bg-slate-50 p-2 min-h-72" onDragOver={(e) => e.preventDefault()} onDrop={() => dragTaskId && updateTask(dragTaskId, (t) => ({ ...t, status: col, completed: col === 'done' }))}>
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-wide text-slate-500">{col === 'todo' ? 'Todo' : col === 'in_progress' ? t('Diproses', 'In Progress') : t('Selesai', 'Done')}</h3>
                    <div className="space-y-2">
                      {filtered.filter((t) => t.status === col).length === 0 ? (
                        <div className="h-[220px] rounded-xl border border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center text-center px-4">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 inline-flex items-center justify-center mb-2">
                            <ContentLucideIcon icon={SquareKanban} size={14} variant="toolbar" className="text-[#005A9E]" />
                          </div>
                          <p className="text-xs font-semibold text-slate-600">{t('Belum ada task', 'No task yet')}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{t('Drag task ke kolom ini atau tambah task baru.', 'Drag a task here or add a new one.')}</p>
                        </div>
                      ) : (
                        filtered.filter((t) => t.status === col).map((task) => (
                          <article key={task.id} draggable onDragStart={() => setDragTaskId(task.id)} className="todo-card-enter p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                            <input value={task.title} onChange={(e) => updateTask(task.id, (t) => ({ ...t, title: e.target.value, updatedAt: nowIso() }))} className="w-full text-sm font-semibold outline-none" />
                            <div className="mt-1 flex items-center justify-between">
                              <p className="text-xs text-slate-500 inline-flex items-center gap-1"><ContentLucideIcon icon={Clock4} size={11} variant="toolbar" /> {task.dueDate || t('Tanpa due date', 'No due date')}</p>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${priorityClass[task.priority]}`}>{task.priority === 'low' ? t('Rendah', 'Low') : task.priority === 'medium' ? t('Sedang', 'Medium') : t('Tinggi', 'High')}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">{t('Untuk', 'For')}: <span className="font-semibold">{task.assigneeDisplayName || userDisplayName}</span></p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <select
                                value={task.priority}
                                onChange={(e) => updateTask(task.id, (t) => ({ ...t, priority: e.target.value as Priority, updatedAt: nowIso() }))}
                                className="h-7 text-[11px] border border-slate-200 rounded-md px-1.5 bg-slate-50"
                              >
                                <option value="low">{t('Rendah', 'Low')}</option>
                                <option value="medium">{t('Sedang', 'Medium')}</option>
                                <option value="high">{t('Tinggi', 'High')}</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => requestRemoveTask(task)}
                                className="h-7 w-7 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center"
                                title={t('Hapus task', 'Delete task')}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 inline-flex items-center justify-center mb-3">
                      <ContentLucideIcon icon={Sparkles} size={20} variant="toolbar" className="text-[#005A9E]" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">{t('Belum ada task ditemukan', 'No task found yet')}</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      {t('Mulai dengan menambah task pertama Anda atau ubah filter pencarian agar task muncul.', 'Start by creating your first task or adjust filters to show existing tasks.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('all');
                        setPriorityFilter('all');
                        setDueFilter('all');
                        setTagFilter('all');
                      }}
                      className="mt-3 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition inline-flex items-center gap-1.5"
                    >
                      <ContentLucideIcon icon={LayoutList} size={13} variant="toolbar" />
                      {t('Reset Filter', 'Reset Filters')}
                    </button>
                  </div>
                ) : (
                  filtered.map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => {
                        setDragTaskId(task.id);
                        setListDropTargetId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragTaskId && dragTaskId !== task.id) setListDropTargetId(task.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragTaskId) moveById(dragTaskId, task.id);
                        setDragTaskId(null);
                        setListDropTargetId(null);
                      }}
                      onDragEnd={() => {
                        setDragTaskId(null);
                        setListDropTargetId(null);
                      }}
                      className={`todo-card-enter p-3 rounded-xl border hover:border-[#005A9E]/30 hover:shadow-sm transition ${
                        listDropTargetId === task.id ? 'border-[#005A9E] ring-2 ring-[#005A9E]/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button onClick={() => requestToggleCompleteTask(task)} className="mt-0.5 text-emerald-600 active:scale-95 transition-transform"><CheckCircle2 size={16} /></button>
                        <div className="flex-1 min-w-0 space-y-2">
                          <input value={task.title} onChange={(e) => updateTask(task.id, (t) => ({ ...t, title: e.target.value, updatedAt: nowIso() }))} className="w-full text-sm font-semibold outline-none" />
                          <textarea value={task.description || ''} onChange={(e) => updateTask(task.id, (t) => ({ ...t, description: e.target.value }))} placeholder={t('Deskripsi...', 'Description...')} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50" />
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="h-8 px-2 rounded-lg border border-indigo-200 bg-indigo-50 text-[11px] inline-flex items-center">
                              {t('Untuk', 'For')}: <span className="font-semibold ml-1">{task.assigneeDisplayName || userDisplayName}</span>
                            </span>
                            <input type="date" value={task.dueDate || ''} onChange={(e) => updateTask(task.id, (t) => ({ ...t, dueDate: e.target.value || undefined }))} className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50" />
                            <select value={task.priority} onChange={(e) => updateTask(task.id, (t) => ({ ...t, priority: e.target.value as Priority }))} className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50"><option value="low">{t('Rendah', 'Low')}</option><option value="medium">{t('Sedang', 'Medium')}</option><option value="high">{t('Tinggi', 'High')}</option></select>
                            <select value={task.status} onChange={(e) => updateTask(task.id, (t) => ({ ...t, status: e.target.value as TaskStatus }))} className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50"><option value="todo">Todo</option><option value="in_progress">{t('Diproses', 'In Progress')}</option><option value="done">{t('Selesai', 'Done')}</option></select>
                            <input value={task.tags.join(', ')} onChange={(e) => updateTask(task.id, (t) => ({ ...t, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder={t('tag: backend, urgent', 'tags: backend, urgent')} className="h-8 text-xs border border-slate-200 rounded-lg px-2 min-w-44 bg-slate-50" />
                            {featureConfig.reminderEnabled && <input type="datetime-local" value={task.reminderAt ? task.reminderAt.slice(0, 16) : ''} onChange={(e) => updateTask(task.id, (t) => ({ ...t, reminderAt: e.target.value ? `${e.target.value}:00` : undefined, lastReminderAt: undefined }))} className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50" />}
                            {featureConfig.recurringEnabled && (
                              <div className="inline-flex items-center gap-1.5">
                                <ContentLucideIcon icon={Repeat2} size={12} variant="toolbar" className="text-slate-400" />
                                <select value={task.recurring.type} onChange={(e) => updateTask(task.id, (t) => ({ ...t, recurring: { ...t.recurring, type: e.target.value as RecurringType } }))} className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50">
                                  <option value="none">{t('Tanpa pengulangan', 'No repeat')}</option><option value="daily">{t('Harian', 'Daily')}</option><option value="weekly">{t('Mingguan', 'Weekly')}</option><option value="custom">{t('Custom hari', 'Custom days')}</option>
                                </select>
                              </div>
                            )}
                            {featureConfig.recurringEnabled && task.recurring.type === 'custom' && (
                              <input type="number" min={1} value={task.recurring.customDays || 1} onChange={(e) => updateTask(task.id, (t) => ({ ...t, recurring: { ...t.recurring, customDays: Number(e.target.value) || 1 } }))} className="h-8 w-20 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50" />
                            )}
                          </div>
                          {featureConfig.subtaskEnabled && (
                            <div className="space-y-1">
                              {task.subtasks.map((s) => (
                                <label key={s.id} className="flex items-center gap-2 text-xs">
                                  <input type="checkbox" checked={s.completed} onChange={() => updateTask(task.id, (t) => ({ ...t, subtasks: t.subtasks.map((it) => it.id === s.id ? { ...it, completed: !it.completed } : it) }))} />
                                  <input value={s.title} onChange={(e) => updateTask(task.id, (t) => ({ ...t, subtasks: t.subtasks.map((it) => it.id === s.id ? { ...it, title: e.target.value } : it) }))} className="flex-1 outline-none" />
                                </label>
                              ))}
                              <button onClick={() => updateTask(task.id, (t) => ({ ...t, subtasks: [...t.subtasks, { id: mkId(), title: t('Subtask baru', 'New subtask'), completed: false }] }))} className="text-xs text-[#005A9E] font-semibold">+ {t('Tambah subtask', 'Add subtask')}</button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span title={t('Drag untuk urutkan', 'Drag to reorder')} className="h-7 w-7 border border-slate-200 rounded-lg inline-flex items-center justify-center text-slate-500 bg-slate-50 cursor-grab active:cursor-grabbing"><ContentLucideIcon icon={GripVertical} size={12} variant="toolbar" /></span>
                          <button onClick={() => requestRemoveTask(task)} className="h-7 w-7 border border-rose-200 rounded-lg inline-flex items-center justify-center text-rose-600 hover:bg-rose-50"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </main>
          )}

          <aside className={`bg-white border border-slate-200 rounded-2xl p-3 space-y-3 shadow-sm ${simpleMode ? 'max-w-2xl mx-auto w-full' : ''}`}>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <button type="button" onClick={() => setSimplePanelHidden((v) => !v)} className="text-[11px] text-slate-600 font-semibold">
                  {simplePanelHidden ? t('Tampilkan panel catatan', 'Show todo note panel') : t('Sembunyikan panel catatan', 'Hide todo list panel')}
                </button>
              </div>
              {!simplePanelHidden && (
                <div className="p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 inline-flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </button>
                    <input
                      value={simpleInput}
                      onChange={(e) => setSimpleInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSimpleTask()}
                      placeholder={t('Tulis catatan cepat...', 'Write something...')}
                      className="flex-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-[#005A9E]"
                    />
                    <button
                      type="button"
                      onClick={addSimpleTask}
                      className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white inline-flex items-center justify-center shadow"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 quick-notes-list">
                    {visibleTasks.filter((task) => !task.completed).slice(0, 4).map((task, idx) => (
                      <button
                        type="button"
                        key={task.id}
                        onClick={() => requestToggleCompleteTask(task)}
                        className="w-full py-1.5 text-left text-xs text-slate-700 inline-flex items-center gap-2 hover:bg-slate-50 quick-note-item"
                        style={{ animationDelay: `${idx * 45}ms` }}
                      >
                        <span className="h-5 w-5 rounded border border-slate-200 bg-white inline-flex items-center justify-center text-emerald-600"><CheckCircle2 size={12} /></span>
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {visibleTasks.filter((task) => !task.completed).length === 0 && (
                      <p className="py-2 text-[11px] text-slate-400 quick-notes-empty">{t('Belum ada catatan', 'No notes yet')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {simpleMode && (
              <p className="text-[11px] text-slate-400">
                {t('Mode sederhana aktif. Hanya panel catatan cepat yang ditampilkan.', 'Simple mode is active. Only the quick notes panel is shown.')}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm font-semibold"><ContentLucideIcon icon={ListFilter} size={14} variant="toolbar" /> {t('Ringkasan', 'Overview')}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-200"><p>{t('Total', 'Total')}</p><p className="font-bold text-lg text-slate-800">{visibleTasks.length}</p></div>
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-200"><p>{t('Selesai', 'Done')}</p><p className="font-bold text-lg text-emerald-700">{visibleTasks.filter((t) => t.completed).length}</p></div>
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-200"><p>{t('Diproses', 'In Progress')}</p><p className="font-bold text-lg text-blue-700">{visibleTasks.filter((t) => t.status === 'in_progress').length}</p></div>
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-200"><p>{t('Prioritas Tinggi', 'High')}</p><p className="font-bold text-lg text-rose-700">{visibleTasks.filter((t) => t.priority === 'high').length}</p></div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 border border-slate-200">
              <div className="flex items-center gap-1 text-xs mb-1"><ContentLucideIcon icon={CalendarClock} size={12} variant="toolbar" /> {t('Progres', 'Progress')}</div>
              <div className="h-2 rounded bg-slate-200 overflow-hidden"><div className="h-full bg-[#005A9E]" style={{ width: `${visibleTasks.length ? Math.round((visibleTasks.filter((t) => t.completed).length / visibleTasks.length) * 100) : 0}%` }} /></div>
            </div>
            {featureConfig.reminderEnabled && (
              <button onClick={() => Notification.requestPermission()} className="w-full h-9 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs inline-flex items-center justify-center gap-1 transition"><ContentLucideIcon icon={Bell} size={12} variant="toolbar" /> {t('Aktifkan notifikasi browser', 'Enable browser notification')}</button>
            )}
            {featureConfig.activityLogEnabled && (
              <div>
                <p className="text-xs font-semibold mb-1">{t('Log Aktivitas', 'Activity Log')}</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {activity.length === 0 ? <p className="text-xs text-slate-400">{t('Belum ada aktivitas', 'No activity yet')}</p> : activity.map((a, i) => <p key={`${a}-${i}`} className="text-xs text-slate-600">{a}</p>)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
      <ConfirmDialog
        open={!!projectDeleteTarget}
        title={t('Hapus proyek?', 'Delete project?')}
        msg={t(
          `Project "${projectDeleteTarget || ''}" beserta semua task di dalamnya akan dihapus permanen.\n\nLanjutkan?`,
          `Project "${projectDeleteTarget || ''}" and all tasks inside it will be permanently deleted.\n\nContinue?`,
        )}
        danger
        onCancel={() => setProjectDeleteTarget(null)}
        onOk={() => {
          if (projectDeleteTarget) deleteProject(projectDeleteTarget);
          setProjectDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!taskDeleteTarget}
        title={t('Hapus task?', 'Delete task?')}
        msg={t(
          `Task "${taskDeleteTarget?.title || ''}" akan dihapus permanen.\n\nLanjutkan?`,
          `Task "${taskDeleteTarget?.title || ''}" will be permanently deleted.\n\nContinue?`,
        )}
        danger
        onCancel={() => setTaskDeleteTarget(null)}
        onOk={() => {
          if (taskDeleteTarget) removeTask(taskDeleteTarget.id);
          setTaskDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!taskCompleteTarget}
        title={t('Tandai task selesai?', 'Mark task as done?')}
        msg={t(
          `Task "${taskCompleteTarget?.title || ''}" akan ditandai selesai.\n\nLanjutkan?`,
          `Task "${taskCompleteTarget?.title || ''}" will be marked as done.\n\nContinue?`,
        )}
        onCancel={() => setTaskCompleteTarget(null)}
        onOk={() => {
          if (taskCompleteTarget) setTaskCompleted(taskCompleteTarget.id, true);
          setTaskCompleteTarget(null);
        }}
      />
      {undoState && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900 text-white rounded-xl shadow-lg min-w-[260px] overflow-hidden">
          <div className="px-4 pt-3 pb-2 inline-flex items-center gap-3 w-full">
            <div className="text-xs flex-1">
              {t('Project dihapus.', 'Project deleted.')} <span className="font-semibold">{undoState.project}</span>
            </div>
            <button
              type="button"
              onClick={undoDeleteProject}
              className="h-7 px-2 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold transition"
            >
              {t('Undo', 'Undo')}
            </button>
          </div>
          <div className="h-1.5 bg-white/10">
            <div className="h-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${undoProgress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
