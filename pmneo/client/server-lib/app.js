import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from './store.js';

// Shared Express app used by BOTH:
//  - localhost (pmneo/server/index.js calls app.listen), and
//  - Vercel serverless (root api/[...all].js exports this app).
// Storage is picked at runtime: Vercel KV when configured, else local data.json.

const app = express();
app.use(cors());
app.use(express.json());

// wrap async handlers so rejections become 500s instead of hanging
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Health check — open <site>/api/health in a browser to verify the
// function is deployed and which storage backend is active.
app.get('/api/health', ah(async (req, res) => {
  const { storageInfo } = await import('./store.js');
  res.json({ ok: true, storage: storageInfo(), time: new Date().toISOString() });
}));

// Projects API
app.get('/api/projects', ah(async (req, res) => {
  const data = await readData();
  res.json(data.projects);
}));

app.post('/api/projects', ah(async (req, res) => {
  const data = await readData();
  const project = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description || '',
    color: req.body.color || '#3B82F6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.projects.push(project);
  await writeData(data);
  res.status(201).json(project);
}));

app.put('/api/projects/:id', ah(async (req, res) => {
  const data = await readData();
  const index = data.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });

  data.projects[index] = {
    ...data.projects[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  await writeData(data);
  res.json(data.projects[index]);
}));

app.delete('/api/projects/:id', ah(async (req, res) => {
  const data = await readData();
  data.projects = data.projects.filter(p => p.id !== req.params.id);
  data.tasks = data.tasks.filter(t => t.projectId !== req.params.id);
  data.columns = data.columns.filter(c => c.projectId !== req.params.id);
  await writeData(data);
  res.status(204).send();
}));

// People registry API (workspace-level, no accounts — just names)
app.get('/api/people', ah(async (req, res) => {
  const data = await readData();
  res.json([...data.people].sort((a, b) => a.name.localeCompare(b.name)));
}));

app.post('/api/people', ah(async (req, res) => {
  const data = await readData();
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const exists = data.people.some(p => p.name.toLowerCase() === name.toLowerCase());
  if (exists) return res.status(409).json({ error: 'That person is already registered' });
  const person = { id: uuidv4(), name, createdAt: new Date().toISOString() };
  data.people.push(person);
  await writeData(data);
  res.status(201).json(person);
}));

app.put('/api/people/:id', ah(async (req, res) => {
  const data = await readData();
  const index = data.people.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Person not found' });
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const clash = data.people.some(p => p.id !== req.params.id && p.name.toLowerCase() === name.toLowerCase());
  if (clash) return res.status(409).json({ error: 'That name is already registered' });

  const oldName = data.people[index].name;
  data.people[index] = { ...data.people[index], name };
  // cascade the rename onto tasks assigned to the old name
  data.tasks.forEach(t => {
    if (t.assignee === oldName) {
      t.assignee = name;
      t.updatedAt = new Date().toISOString();
    }
  });
  await writeData(data);
  res.json(data.people[index]);
}));

app.delete('/api/people/:id', ah(async (req, res) => {
  const data = await readData();
  data.people = data.people.filter(p => p.id !== req.params.id);
  // tasks keep their assignee text — the name simply becomes unregistered
  await writeData(data);
  res.status(204).send();
}));

// Columns API (Kanban columns per project)
app.get('/api/projects/:projectId/columns', ah(async (req, res) => {
  const data = await readData();
  let columns = data.columns.filter(c => c.projectId === req.params.projectId);

  // Create default columns if none exist
  if (columns.length === 0) {
    const defaultColumns = [
      { id: uuidv4(), projectId: req.params.projectId, name: 'Backlog', order: 0, color: '#6B7280' },
      { id: uuidv4(), projectId: req.params.projectId, name: 'To Do', order: 1, color: '#3B82F6' },
      { id: uuidv4(), projectId: req.params.projectId, name: 'In Progress', order: 2, color: '#F59E0B' },
      { id: uuidv4(), projectId: req.params.projectId, name: 'Review', order: 3, color: '#8B5CF6' },
      { id: uuidv4(), projectId: req.params.projectId, name: 'Done', order: 4, color: '#10B981' }
    ];
    data.columns.push(...defaultColumns);
    await writeData(data);
    columns = defaultColumns;
  }

  res.json(columns.sort((a, b) => a.order - b.order));
}));

app.post('/api/projects/:projectId/columns', ah(async (req, res) => {
  const data = await readData();
  const column = {
    id: uuidv4(),
    projectId: req.params.projectId,
    name: req.body.name,
    order: req.body.order || data.columns.filter(c => c.projectId === req.params.projectId).length,
    color: req.body.color || '#6B7280'
  };
  data.columns.push(column);
  await writeData(data);
  res.status(201).json(column);
}));

app.put('/api/columns/:id', ah(async (req, res) => {
  const data = await readData();
  const index = data.columns.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Column not found' });

  data.columns[index] = { ...data.columns[index], ...req.body };
  await writeData(data);
  res.json(data.columns[index]);
}));

app.delete('/api/columns/:id', ah(async (req, res) => {
  const data = await readData();
  data.columns = data.columns.filter(c => c.id !== req.params.id);
  data.tasks = data.tasks.filter(t => t.columnId !== req.params.id);
  await writeData(data);
  res.status(204).send();
}));

// Tasks API
app.get('/api/projects/:projectId/tasks', ah(async (req, res) => {
  const data = await readData();
  const tasks = data.tasks.filter(t => t.projectId === req.params.projectId);
  res.json(tasks);
}));

app.post('/api/projects/:projectId/tasks', ah(async (req, res) => {
  const data = await readData();
  const columns = data.columns.filter(c => c.projectId === req.params.projectId);
  const firstColumn = columns.sort((a, b) => a.order - b.order)[0];

  const requestedColumn = typeof req.body.columnId === 'string' ? req.body.columnId : undefined;
  const knownColumn = columns.some(c => c.id === requestedColumn) ? requestedColumn : undefined;
  const task = {
    id: uuidv4(),
    projectId: req.params.projectId,
    columnId: knownColumn || firstColumn?.id,
    title: req.body.title,
    description: req.body.description || '',
    priority: req.body.priority || 'medium',
    assignee: req.body.assignee || '',
    dueDate: req.body.dueDate || null,
    startDate: req.body.startDate || null,
    estimatedHours: req.body.estimatedHours || 0,
    actualHours: req.body.actualHours || 0,
    tags: req.body.tags || [],
    order: req.body.order || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.tasks.push(task);
  await writeData(data);
  res.status(201).json(task);
}));

// All tasks across projects (for dashboard, calendar, analytics)
app.get('/api/tasks', ah(async (req, res) => {
  const data = await readData();
  res.json(data.tasks);
}));

// Bulk update tasks (for drag and drop)
// NOTE: must be registered BEFORE /api/tasks/:id or "bulk" is treated as an id
app.put('/api/tasks/bulk', ah(async (req, res) => {
  const data = await readData();
  const updates = req.body.updates; // array of { id, columnId?, order? }
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });

  updates.forEach(update => {
    const index = data.tasks.findIndex(t => t.id === update.id);
    if (index !== -1) {
      const patch = {};
      if (typeof update.columnId === 'string') patch.columnId = update.columnId;
      if (typeof update.order === 'number') patch.order = update.order;
      data.tasks[index] = {
        ...data.tasks[index],
        ...patch,
        updatedAt: new Date().toISOString()
      };
    }
  });

  await writeData(data);
  res.json({ success: true });
}));

app.put('/api/tasks/:id', ah(async (req, res) => {
  const data = await readData();
  const index = data.tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  const body = { ...req.body };
  if (body.columnId !== undefined && typeof body.columnId !== 'string') delete body.columnId;
  data.tasks[index] = {
    ...data.tasks[index],
    ...body,
    id: data.tasks[index].id,
    projectId: data.tasks[index].projectId,
    updatedAt: new Date().toISOString()
  };
  await writeData(data);
  res.json(data.tasks[index]);
}));

app.delete('/api/tasks/:id', ah(async (req, res) => {
  const data = await readData();
  data.tasks = data.tasks.filter(t => t.id !== req.params.id);
  await writeData(data);
  res.status(204).send();
}));

// Timeline data for Gantt chart
app.get('/api/projects/:projectId/timeline', ah(async (req, res) => {
  const data = await readData();
  const tasks = data.tasks.filter(t => t.projectId === req.params.projectId && (t.startDate || t.dueDate));
  const columns = data.columns.filter(c => c.projectId === req.params.projectId);

  const timelineData = tasks.map(task => {
    const column = columns.find(c => c.id === task.columnId);
    return {
      ...task,
      columnName: column?.name || 'Unknown',
      columnColor: column?.color || '#6B7280'
    };
  });

  res.json(timelineData);
}));

// last-resort error handler (async storage can fail — never hang the request)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;
