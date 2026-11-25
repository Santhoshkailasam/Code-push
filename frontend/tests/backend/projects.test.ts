import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../netlify/functions/db.cjs');
const projects = require('../../netlify/functions/projects.cjs');

describe('projects.cjs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles CORS preflight OPTIONS', async () => {
    const res = await projects.handler({ httpMethod: 'OPTIONS' });
    expect(res.statusCode).toBe(200);
  });

  it('GET returns projects list for userId', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [{ id: 'proj_1', name: 'Demo App', apiKey: 'cp_live_1' }],
    });

    const res = await projects.handler({
      httpMethod: 'GET',
      queryStringParameters: { userId: 'u_1' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.projects).toHaveLength(1);
  });

  it('POST validates required id and name', async () => {
    const res = await projects.handler({
      httpMethod: 'POST',
      body: JSON.stringify({ name: 'Missing ID' }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST upserts project and user stub in PostgreSQL', async () => {
    const querySpy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: [] }) // user stub
      .mockResolvedValueOnce({
        rows: [{ id: 'proj_new', userId: 'u_1', name: 'New App', platform: 'both', apiKey: 'cp_live_new' }],
      });

    const res = await projects.handler({
      httpMethod: 'POST',
      body: JSON.stringify({ id: 'proj_new', userId: 'u_1', name: 'New App', apiKey: 'cp_live_new' }),
    });

    expect(res.statusCode).toBe(200);
    expect(querySpy).toHaveBeenCalledTimes(2);
    expect(JSON.parse(res.body).project.id).toBe('proj_new');
  });

  it('DELETE removes project by id', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] });
    const res = await projects.handler({
      httpMethod: 'DELETE',
      queryStringParameters: { id: 'proj_del' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });
});

