import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryDb } from '../src/db/memoryStore.js';

const app = createApp();

describe('Role-Based Access Control (RBAC) Integration Tests', () => {
  let adminToken: string;
  let pm1Token: string; // PM 1 (usr-pm-01, owner of prj-01)
  let pm2Token: string; // PM 2 (usr-pm-02, owner of prj-02)
  let dev1Token: string; // Dev 1 (usr-dev-01, assigned to task 1)
  let dev2Token: string; // Dev 2 (usr-dev-02, assigned to task 2)

  beforeEach(async () => {
    memoryDb.seedInitial();

    const [adminLogin, pm1Login, pm2Login, dev1Login, dev2Login] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@agency.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'pm1@agency.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'pm2@agency.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'dev1@agency.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'dev2@agency.com', password: 'Password123!' }),
    ]);

    adminToken = adminLogin.body.accessToken;
    pm1Token = pm1Login.body.accessToken;
    pm2Token = pm2Login.body.accessToken;
    dev1Token = dev1Login.body.accessToken;
    dev2Token = dev2Login.body.accessToken;
  });

  it('1. ADMIN has access to all resources (clients, users, projects, tasks)', async () => {
    const clientsRes = await request(app).get('/api/clients').set('Authorization', `Bearer ${adminToken}`);
    expect(clientsRes.status).toBe(200);

    const usersRes = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.status).toBe(200);

    const projectsRes = await request(app).get('/api/projects').set('Authorization', `Bearer ${adminToken}`);
    expect(projectsRes.status).toBe(200);

    const tasksRes = await request(app).get('/api/tasks').set('Authorization', `Bearer ${adminToken}`);
    expect(tasksRes.status).toBe(200);
  });

  it("2. PM cannot view another PM's project (returns 404 so existence is not leaked)", async () => {
    // prj-01 belongs to PM 1 (usr-pm-01)
    // PM 2 attempts to access prj-01
    const res = await request(app)
      .get('/api/projects/prj-01')
      .set('Authorization', `Bearer ${pm2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('3. PM can view their own project', async () => {
    const res = await request(app)
      .get('/api/projects/prj-01')
      .set('Authorization', `Bearer ${pm1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.project.id).toBe('prj-01');
  });

  it('4. DEVELOPER cannot access clients (returns 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${dev1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
  });

  it('5. DEVELOPER cannot access projects (returns 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${dev1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
  });

  it("6. DEVELOPER cannot view or change another developer's task (returns 404)", async () => {
    // Task #1 is assigned to Dev 1 (usr-dev-01). Dev 2 (usr-dev-02) tries to change its status.
    const res = await request(app)
      .patch('/api/tasks/1/status')
      .set('Authorization', `Bearer ${dev2Token}`)
      .send({ status: 'IN_REVIEW' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('7. DEVELOPER can update status of their OWN assigned task', async () => {
    // Task #1 is assigned to Dev 1 (usr-dev-01)
    const login = await request(app).post('/api/auth/login').send({ email: 'dev1@agency.com', password: 'Password123!' });
    const token = login.body.accessToken;

    const res = await request(app)
      .patch('/api/tasks/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    if (res.status !== 200) {
      console.error('Test 7 Error Response:', res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('IN_PROGRESS');
  });
});
