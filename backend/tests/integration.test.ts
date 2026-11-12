/**
 * Project 29 — End-to-end integration suite (runs against the real Express app
 * in-process via supertest and the real MongoDB `project29` database).
 *
 * All test data is clearly identified: names prefixed `P29-INTG`, emails prefixed
 * `p29itest@itest.local`. Only records created by THIS run are removed in
 * afterAll — pre-existing data (Demo Montessori Centre etc.) is never touched.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { env } from '../src/config/env';
import { DaycareCentre } from '../src/models/DaycareCentre';
import { User, IUser } from '../src/models/User';
import { Parent } from '../src/models/Parent';
import { Child } from '../src/models/Child';
import { Staff } from '../src/models/Staff';
import { Attendance, startOfUtcDay } from '../src/models/Attendance';
import { MontessoriLog } from '../src/models/MontessoriLog';
import { FeeRecord } from '../src/models/FeeRecord';
import { Notification } from '../src/models/Notification';
import { AuditLog } from '../src/models/AuditLog';

const RUN = Date.now().toString(36);
const PW = 'P29integ!pass1';

type Ctx = {
  hq: IUser;
  hqCookie: string;
  centreA: { id: string };
  centreB: { id: string };
  managerA: { userId: string; cookie: string; email: string };
  managerB: { userId: string; cookie: string; email: string };
  teacherA: { userId: string; cookie: string; staffId: string; email: string };
  teacherB: { userId: string; cookie: string; staffId: string; email: string };
  parentA: { userId: string; cookie: string; parentId: string; email: string };
  parentB: { userId: string; cookie: string; parentId: string; email: string };
  childA: { id: string };
  childB: { id: string };
  teacherC: { userId: string; staffId: string };
  createdIds: {
    centres: string[];
    users: string[];
    parents: string[];
    children: string[];
    staff: string[];
    attendance: string[];
    montessori: string[];
    fees: string[];
    notifications: string[];
  };
};

const ctx: Ctx = {} as Ctx;

const login = async (email: string, password: string) => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  const raw = res.headers['set-cookie'];
  const setCookie = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  const token = setCookie.map((c) => c.split(';')[0]).join('; ');
  // Extract refreshToken cookie value if present
  const refreshMatch = setCookie.find((c) => c.startsWith('refreshToken='));
  const refreshToken = refreshMatch ? refreshMatch.split('=')[1].split(';')[0] : undefined;
  return { res, cookie: token, refreshToken };
};

const after = <T extends { id?: string; _id?: unknown }>(rec: T): string =>
  String(rec.id ?? rec._id);

describe('P29 integration suite', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);

    // Fixture: a dedicated P29-INTG super admin (created directly so the suite
    // never depends on pre-existing demo credentials).
    ctx.hq = await User.create({
      email: `p29itest-hq-${RUN}@itest.local`,
      passwordHash: await bcrypt.hash(PW, 10),
      name: `P29-INTG HQ ${RUN}`,
      role: 'super_admin',
    });
    ctx.createdIds.users.push(String(ctx.hq._id));
    const { cookie } = await login(ctx.hq.email, PW);
    ctx.hqCookie = cookie;
  }, 30000);

  afterAll(async () => {
    const ids = ctx.createdIds;
    await Attendance.deleteMany({ _id: { $in: ids.attendance } });
    await MontessoriLog.deleteMany({ _id: { $in: ids.montessori } });
    await FeeRecord.deleteMany({ _id: { $in: ids.fees } });
    await Notification.deleteMany({ _id: { $in: ids.notifications } });
    await AuditLog.deleteMany({ centreId: { $in: ids.centres } });
    await Child.deleteMany({ _id: { $in: ids.children } });
    await Staff.deleteMany({ _id: { $in: ids.staff } });
    await Parent.deleteMany({ _id: { $in: ids.parents } });
    await User.deleteMany({ _id: { $in: ids.users } });
    await DaycareCentre.deleteMany({ _id: { $in: ids.centres } });
    await mongoose.disconnect();
  }, 30000);

  const ids = ctx.createdIds ?? (ctx.createdIds = {
    centres: [],
    users: [],
    parents: [],
    children: [],
    staff: [],
    attendance: [],
    montessori: [],
    fees: [],
    notifications: [],
  });

  // ------------------------------------------------------------------
  // 1 + fixtures: centres, role accounts (all via the real API)
  // ------------------------------------------------------------------
  describe('fixtures: two centres + role accounts', () => {
    it('creates two isolated test centres (super_admin only)', async () => {
      const a = await request(app)
        .post('/api/v1/centres')
        .set('Cookie', ctx.hqCookie)
        .send({ name: `P29-INTG Centre A ${RUN}`, address: `P29-INTG A street ${RUN}` });
      expect(a.status).toBe(201);
      ctx.centreA = { id: after(a.body.data) };
      ids.centres.push(ctx.centreA.id);

      const b = await request(app)
        .post('/api/v1/centres')
        .set('Cookie', ctx.hqCookie)
        .send({ name: `P29-INTG Centre B ${RUN}`, address: `P29-INTG B street ${RUN}` });
      expect(b.status).toBe(201);
      ctx.centreB = { id: after(b.body.data) };
      ids.centres.push(ctx.centreB.id);
      expect(ctx.centreA.id).not.toBe(ctx.centreB.id);
    });

    it('registers centre managers for both centres (via /auth/register)', async () => {
      const ma = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', ctx.hqCookie)
        .send({
          email: `p29itest-mgr-a-${RUN}@itest.local`,
          password: PW,
          name: `P29-INTG Manager A ${RUN}`,
          role: 'centre_manager',
          centreId: ctx.centreA.id,
        });
      expect(ma.status).toBe(201);
      expect(ma.body.data.centreId).toBe(ctx.centreA.id);
      const mgrAEmail = `p29itest-mgr-a-${RUN}@itest.local`;
      ctx.managerA = { userId: ma.body.data.id, cookie: '', email: mgrAEmail };
      ids.users.push(ctx.managerA.userId);
      const la = await login(mgrAEmail, PW);
      ctx.managerA.cookie = la.cookie;

      const mb = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', ctx.hqCookie)
        .send({
          email: `p29itest-mgr-b-${RUN}@itest.local`,
          password: PW,
          name: `P29-INTG Manager B ${RUN}`,
          role: 'centre_manager',
          centreId: ctx.centreB.id,
        });
      expect(mb.status).toBe(201);
      const mgrBEmail = `p29itest-mgr-b-${RUN}@itest.local`;
      ctx.managerB = { userId: mb.body.data.id, cookie: '', email: mgrBEmail };
      ids.users.push(ctx.managerB.userId);
      const lb = await login(mgrBEmail, PW);
      ctx.managerB.cookie = lb.cookie;
    });

    it('creates a teacher per centre (via /staff) and logs in', async () => {
      const ta = await request(app)
        .post('/api/v1/staff')
        .set('Cookie', ctx.managerA.cookie)
        .send({
          name: `P29-INTG Teacher A ${RUN}`,
          email: `p29itest-teach-a-${RUN}@itest.local`,
          password: PW,
          role: 'teacher',
        });
      expect(ta.status).toBe(201);
      ctx.teacherA = { userId: String(ta.body.data.userId), cookie: '', staffId: after(ta.body.data), email: `p29itest-teach-a-${RUN}@itest.local` };
      ids.users.push(ctx.teacherA.userId);
      ids.staff.push(ctx.teacherA.staffId);
      const la = await login(ctx.teacherA.email, PW);
      ctx.teacherA.cookie = la.cookie;

      const tb = await request(app)
        .post('/api/v1/staff')
        .set('Cookie', ctx.managerB.cookie)
        .send({
          name: `P29-INTG Teacher B ${RUN}`,
          email: `p29itest-teach-b-${RUN}@itest.local`,
          password: PW,
          role: 'teacher',
        });
      expect(tb.status).toBe(201);
      ctx.teacherB = { userId: String(tb.body.data.userId), cookie: '', staffId: after(tb.body.data), email: `p29itest-teach-b-${RUN}@itest.local` };
      ids.users.push(ctx.teacherB.userId);
      ids.staff.push(ctx.teacherB.staffId);
      const lb = await login(ctx.teacherB.email, PW);
      ctx.teacherB.cookie = lb.cookie;
    });

    it('creates a parent per centre (via /parents: user + guardian doc)', async () => {
      const pa = await request(app)
        .post('/api/v1/parents')
        .set('Cookie', ctx.managerA.cookie)
        .send({
          name: `P29-INTG Parent A ${RUN}`,
          email: `p29itest-parent-a-${RUN}@itest.local`,
          password: PW,
          phone: '+919800000001',
        });
      expect(pa.status).toBe(201);
      ctx.parentA = { userId: String(pa.body.data.userId), cookie: '', parentId: after(pa.body.data), email: `p29itest-parent-a-${RUN}@itest.local` };
      ids.users.push(ctx.parentA.userId);
      ids.parents.push(ctx.parentA.parentId);
      const la = await login(ctx.parentA.email, PW);
      ctx.parentA.cookie = la.cookie;

      const pb = await request(app)
        .post('/api/v1/parents')
        .set('Cookie', ctx.managerB.cookie)
        .send({
          name: `P29-INTG Parent B ${RUN}`,
          email: `p29itest-parent-b-${RUN}@itest.local`,
          password: PW,
          phone: '+919800000002',
        });
      expect(pb.status).toBe(201);
      ctx.parentB = { userId: String(pb.body.data.userId), cookie: '', parentId: after(pb.body.data), email: `p29itest-parent-b-${RUN}@itest.local` };
      ids.users.push(ctx.parentB.userId);
      ids.parents.push(ctx.parentB.parentId);
      const lb = await login(ctx.parentB.email, PW);
      ctx.parentB.cookie = lb.cookie;
    });

    it('enrols one child per centre linked to the parent', async () => {
      const ca = await request(app)
        .post('/api/v1/children')
        .set('Cookie', ctx.managerA.cookie)
        .send({ name: `P29-INTG Child A ${RUN}`, dob: '2021-04-01', parentIds: [ctx.parentA.userId] });
      expect(ca.status).toBe(201);
      ctx.childA = { id: after(ca.body.data) };
      ids.children.push(ctx.childA.id);

      const cb = await request(app)
        .post('/api/v1/children')
        .set('Cookie', ctx.managerB.cookie)
        .send({ name: `P29-INTG Child B ${RUN}`, dob: '2022-08-15', parentIds: [ctx.parentB.userId] });
      expect(cb.status).toBe(201);
      ctx.childB = { id: after(cb.body.data) };
      ids.children.push(ctx.childB.id);
    });
  });

  // ------------------------------------------------------------------
  // 1. Authentication
  // ------------------------------------------------------------------
  describe('1. Authentication', () => {
    it('login sets an httpOnly cookie and returns the user (no secrets)', async () => {
      const user = await User.findById(ctx.managerA.userId);
      const { res } = await login(user!.email, PW);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(user!.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      const sc = res.headers['set-cookie'];
      const setCookies = Array.isArray(sc) ? sc : sc ? [String(sc)] : [];
      expect(setCookies[0]).toContain('HttpOnly');
      expect(setCookies[0]).toContain('SameSite=Lax');
    });

    it('rejects a wrong password (401 UNAUTHORIZED)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: ctx.managerA.email, password: 'wrong-password-1' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects an unknown email (401, no existence leak)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `nobody-${RUN}@itest.local`, password: PW });
      expect(res.status).toBe(401);
    });

    it('GET /auth/me returns the current user', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ctx.managerA.userId);
      expect(res.body.data.role).toBe('centre_manager');
      expect(res.body.data.centreId).toBe(ctx.centreA.id);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('GET /auth/me without a token → 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /auth/me with a tampered token → 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'token=tampered.token.value');
      expect(res.status).toBe(401);
    });

    it('an EXPIRED token is rejected (token-expiry behaviour)', async () => {
      const expired = jwt.sign(
        { id: ctx.hq._id.toString(), role: 'super_admin', email: ctx.hq.email },
        env.JWT_SECRET,
        { expiresIn: -10 }
      );
      const res = await request(app).get('/api/v1/auth/me').set('Cookie', `token=${expired}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('logout clears the cookie (stateless note: JWT stays valid until TTL)', async () => {
      const res = await request(app).post('/api/v1/auth/logout').set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(200);
      const raw = res.headers['set-cookie'];
      const cleared = Array.isArray(raw) ? raw[0] : String(raw);
      expect(cleared).toMatch(/token=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/);
      // Design fact: no server-side revocation — the same token still authenticates.
      const still = await request(app).get('/api/v1/auth/me').set('Cookie', ctx.managerA.cookie);
      expect(still.status).toBe(200);
    });

    it('logout clears both auth cookies and revokes the refresh token', async () => {
      // First login to get a refresh token
      const { refreshToken } = await login(ctx.managerA.email, PW);
      expect(refreshToken).toBeDefined();

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', ctx.managerA.cookie);
      expect(logoutRes.status).toBe(200);

      // Verify cookies are cleared (set-cookie is an array of both cookies)
      const raw = logoutRes.headers['set-cookie'];
      const cleared: string = Array.isArray(raw) ? raw.join(' | ') : String(raw);
      expect(cleared).toMatch(/token=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/);
      expect(cleared).toMatch(/refreshToken=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/);
    });

    it('POST /auth/refresh rotates tokens and returns a new access token', async () => {
      // Login to get a fresh token pair
      const { refreshToken: rt1, res: loginRes } = await login(ctx.managerA.email, PW);
      expect(loginRes.status).toBe(200);
      expect(rt1).toBeDefined();

      // Extract the new access token cookie from login response
      const raw = loginRes.headers['set-cookie'];
      const setCookies = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
      const accessCookie = setCookies.find((c) => c.startsWith('token='));
      expect(accessCookie).toBeDefined();

      // Call refresh with the refresh token
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${rt1}; token=${accessCookie?.split('=')[1].split(';')[0]}`);
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.user.id).toBe(ctx.managerA.userId);

      // Verify new cookies are set
      const rawNew = refreshRes.headers['set-cookie'];
      const newCookies: string[] = Array.isArray(rawNew) ? rawNew : rawNew ? [String(rawNew)] : [];
      const newAccess = newCookies.find((c) => c.startsWith('token='));
      const newRefresh = newCookies.find((c) => c.startsWith('refreshToken='));
      expect(newAccess).toBeDefined();
      expect(newRefresh).toBeDefined();
    });

    it('refresh with an EXPIRED refresh token → 401 and clears cookies', async () => {
      // Login first
      const { refreshToken } = await login(ctx.managerA.email, PW);
      expect(refreshToken).toBeDefined();

      // Call refresh (should succeed)
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);
      expect(refreshRes.status).toBe(200);

      // Now try to reuse the SAME refresh token (should fail with 401)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('UNAUTHORIZED');

      // Verify cookies are cleared
      const raw = reuseRes.headers['set-cookie'];
      expect(raw).toBeDefined();
    });

    it('refresh with a REVOKED refresh token → 401 (reuse detection)', async () => {
      // Login first
      const { refreshToken } = await login(ctx.managerA.email, PW);
      expect(refreshToken).toBeDefined();

      // Manually revoke the refresh token via logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`);

      // Try to use the revoked refresh token → 401
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);
      expect(res.status).toBe(401);
    });
  });

  // ------------------------------------------------------------------
  // 2. RBAC
  // ------------------------------------------------------------------
  describe('2. RBAC — every implemented role', () => {
    it('teacher cannot: create centres, read audit logs, create staff/fees/parents/children, see HQ dashboard', async () => {
      expect(
        (await request(app).post('/api/v1/centres').set('Cookie', ctx.teacherA.cookie).send({ name: 'x', address: 'y' })).status
      ).toBe(403);
      expect((await request(app).get('/api/v1/audit-logs').set('Cookie', ctx.teacherA.cookie)).status).toBe(403);
      expect(
        (await request(app).post('/api/v1/staff').set('Cookie', ctx.teacherA.cookie).send({ name: 'x', email: 'x@x.xx', password: PW, role: 'teacher' })).status
      ).toBe(403);
      expect(
        (await request(app).post('/api/v1/fees').set('Cookie', ctx.teacherA.cookie).send({ childId: ctx.childA.id, amount: 1, dueDate: '2026-12-01' })).status
      ).toBe(403);
      expect(
        (await request(app).post('/api/v1/parents').set('Cookie', ctx.teacherA.cookie).send({ name: 'x', email: 'x@x.xx', password: PW, phone: '12345678' })).status
      ).toBe(403);
      expect(
        (await request(app).post('/api/v1/children').set('Cookie', ctx.teacherA.cookie).send({ name: 'x', dob: '2021-01-01' })).status
      ).toBe(403);
      expect((await request(app).get('/api/v1/dashboard/hq').set('Cookie', ctx.teacherA.cookie)).status).toBe(403);
      expect(
        (await request(app).patch(`/api/v1/children/${ctx.childA.id}`).set('Cookie', ctx.teacherA.cookie).send({ status: 'inactive' })).status
      ).toBe(403);
      // Allowed: read own centre's children, centre dashboard
      expect((await request(app).get('/api/v1/children').set('Cookie', ctx.teacherA.cookie)).status).toBe(200);
      expect((await request(app).get('/api/v1/dashboard/centre').set('Cookie', ctx.teacherA.cookie)).status).toBe(200);
    });

    it('parent cannot mutate anything or cross into staff/fees/centres/audit/dashboards', async () => {
      expect(
        (await request(app).post('/api/v1/children').set('Cookie', ctx.parentA.cookie).send({ name: 'x', dob: '2021-01-01' })).status
      ).toBe(403);
      expect(
        (await request(app).patch(`/api/v1/children/${ctx.childA.id}`).set('Cookie', ctx.parentA.cookie).send({ status: 'inactive' })).status
      ).toBe(403);
      expect(
        (await request(app).delete(`/api/v1/children/${ctx.childA.id}`).set('Cookie', ctx.parentA.cookie)).status
      ).toBe(403);
      expect(
        (await request(app).post('/api/v1/staff').set('Cookie', ctx.parentA.cookie).send({ name: 'x', email: 'x@x.xx', password: PW, role: 'teacher' })).status
      ).toBe(403);
      expect(
        (await request(app).post('/api/v1/fees').set('Cookie', ctx.parentA.cookie).send({ childId: ctx.childA.id, amount: 1, dueDate: '2026-12-01' })).status
      ).toBe(403);
      expect((await request(app).get('/api/v1/centres').set('Cookie', ctx.parentA.cookie)).status).toBe(403);
      expect((await request(app).get('/api/v1/parents').set('Cookie', ctx.parentA.cookie)).status).toBe(403);
      expect((await request(app).get('/api/v1/audit-logs').set('Cookie', ctx.parentA.cookie)).status).toBe(403);
      expect((await request(app).get('/api/v1/dashboard/centre').set('Cookie', ctx.parentA.cookie)).status).toBe(403);
      expect((await request(app).get('/api/v1/dashboard/hq').set('Cookie', ctx.parentA.cookie)).status).toBe(403);
      // Allowed: read own children, read-only fees/logs/notifications
      expect((await request(app).get('/api/v1/parents/me/children').set('Cookie', ctx.parentA.cookie)).status).toBe(200);
      expect((await request(app).get('/api/v1/fees').set('Cookie', ctx.parentA.cookie)).status).toBe(200);
    });

    it('centre_manager cannot create centres or read HQ dashboard', async () => {
      expect(
        (await request(app).post('/api/v1/centres').set('Cookie', ctx.managerA.cookie).send({ name: 'x', address: 'y' })).status
      ).toBe(403);
      expect((await request(app).get('/api/v1/dashboard/hq').set('Cookie', ctx.managerA.cookie)).status).toBe(403);
    });

    it('a manager cannot create a super_admin and is locked to their own centre', async () => {
      const denied = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', ctx.managerA.cookie)
        .send({ email: `p29itest-hq2-${RUN}@itest.local`, password: PW, name: 'X', role: 'super_admin' });
      expect(denied.status).toBe(400);

      // Manager passes centre B in the body; server must force centre A.
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', ctx.managerA.cookie)
        .send({
          email: `p29itest-lock-a-${RUN}@itest.local`,
          password: PW,
          name: 'Locked To A',
          role: 'teacher',
          centreId: ctx.centreB.id,
        });
      expect(reg.status).toBe(201);
      expect(reg.body.data.centreId).toBe(ctx.centreA.id);
      ids.users.push(reg.body.data.id);
    });

    it('super_admin can create centres and read HQ dashboard + audit logs', async () => {
      expect((await request(app).get('/api/v1/dashboard/hq').set('Cookie', ctx.hqCookie)).status).toBe(200);
      expect(
        (await request(app).get(`/api/v1/audit-logs?centreId=${ctx.centreA.id}`).set('Cookie', ctx.hqCookie)).status
      ).toBe(200);
      expect((await request(app).get('/api/v1/audit-logs').set('Cookie', ctx.hqCookie)).status).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // 3. Tenant isolation
  // ------------------------------------------------------------------
  describe('3. Tenant isolation (two centres)', () => {
    it('manager A only sees centre A in /centres and gets 404 for centre B', async () => {
      const list = await request(app).get('/api/v1/centres').set('Cookie', ctx.managerA.cookie);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]._id).toBe(ctx.centreA.id);

      const cross = await request(app).get(`/api/v1/centres/${ctx.centreB.id}`).set('Cookie', ctx.managerA.cookie);
      expect(cross.status).toBe(404); // 404, never 403
    });

    it('manager A cannot see or touch centre B children (404, not 403)', async () => {
      const cross = await request(app).get(`/api/v1/children/${ctx.childB.id}`).set('Cookie', ctx.managerA.cookie);
      expect(cross.status).toBe(404);
      const list = await request(app).get('/api/v1/children').set('Cookie', ctx.managerA.cookie);
      expect(list.body.data.every((c: { _id: unknown }) => String(c._id) === ctx.childA.id)).toBe(true);
    });

    it('parent A cannot read centre B child or logs', async () => {
      const cross = await request(app).get(`/api/v1/children/${ctx.childB.id}`).set('Cookie', ctx.parentA.cookie);
      expect(cross.status).toBe(404);
      const mine = await request(app).get('/api/v1/children').set('Cookie', ctx.parentA.cookie);
      expect(mine.body.data.map((c: { _id: unknown }) => String(c._id))).toEqual([ctx.childA.id]);
      const crossLogs = await request(app)
        .get(`/api/v1/montessori-logs?childId=${ctx.childB.id}`)
        .set('Cookie', ctx.parentA.cookie);
      expect(crossLogs.status).toBe(404);
    });

    it('teacher A cannot log attendance or montessori for centre B child', async () => {
      const att = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childB.id, status: 'present' });
      expect(att.status).toBe(404);
      const log = await request(app)
        .post('/api/v1/montessori-logs')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childB.id, area: 'Language', observation: 'x' });
      expect(log.status).toBe(404);
    });

    it('manager B cannot create fees for a centre A child', async () => {
      const res = await request(app)
        .post('/api/v1/fees')
        .set('Cookie', ctx.managerB.cookie)
        .send({ childId: ctx.childA.id, amount: 100, dueDate: '2026-12-01' });
      expect(res.status).toBe(404);
    });

    it('a centre cannot link a parent user from another centre', async () => {
      const res = await request(app)
        .post('/api/v1/children')
        .set('Cookie', ctx.managerA.cookie)
        .send({ name: 'Should Fail', dob: '2021-01-01', parentIds: [ctx.parentB.userId] });
      expect(res.status).toBe(400);
    });

    it('staff lists are centre-scoped', async () => {
      const a = await request(app).get('/api/v1/staff').set('Cookie', ctx.managerA.cookie);
      expect(a.body.data.some((s: { _id: unknown }) => String(s._id) === ctx.teacherB.staffId)).toBe(false);
      const b = await request(app).get('/api/v1/staff').set('Cookie', ctx.managerB.cookie);
      expect(b.body.data.some((s: { _id: unknown }) => String(s._id) === ctx.teacherA.staffId)).toBe(false);
    });

    it('super_admin must pass centreId explicitly for centre-scoped reads', async () => {
      expect(
        (await request(app).get('/api/v1/attendance').set('Cookie', ctx.hqCookie)).status
      ).toBe(400);
      expect(
        (await request(app).get('/api/v1/attendance?centreId=' + ctx.centreA.id).set('Cookie', ctx.hqCookie)).status
      ).toBe(200);
      expect(
        (await request(app).get('/api/v1/montessori-logs').set('Cookie', ctx.hqCookie)).status
      ).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // 4. Child enrolment + DB relationships
  // ------------------------------------------------------------------
  describe('4. Child enrolment (parent → child → relationships)', () => {
    it('verifies DB relationships: Child.parentIds → User, Parent.userId → User, both centre-scoped', async () => {
      const childDoc = await Child.findById(ctx.childA.id);
      expect(String(childDoc!.parentIds[0])).toBe(ctx.parentA.userId);
      expect(String(childDoc!.centreId)).toBe(ctx.centreA.id);
      expect(childDoc!.status).toBe('active');

      const parentDoc = await Parent.findById(ctx.parentA.parentId);
      expect(String(parentDoc!.userId)).toBe(ctx.parentA.userId);
      expect(String(parentDoc!.centreId)).toBe(ctx.centreA.id);

      const userDoc = await User.findById(ctx.parentA.userId);
      expect(userDoc!.role).toBe('parent');
      expect(String(userDoc!.centreId)).toBe(ctx.centreA.id);
    });

    it('parent sees exactly their own children via /parents/me/children', async () => {
      const res = await request(app).get('/api/v1/parents/me/children').set('Cookie', ctx.parentA.cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.map((c: { _id: unknown }) => String(c._id))).toEqual([ctx.childA.id]);
    });

    it('manager can update and re-activate the child', async () => {
      const off = await request(app)
        .patch(`/api/v1/children/${ctx.childA.id}`)
        .set('Cookie', ctx.managerA.cookie)
        .send({ status: 'inactive' });
      expect(off.status).toBe(200);
      expect((await Child.findById(ctx.childA.id))!.status).toBe('inactive');

      const on = await request(app)
        .patch(`/api/v1/children/${ctx.childA.id}`)
        .set('Cookie', ctx.managerA.cookie)
        .send({ status: 'active' });
      expect(on.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 5. Attendance
  // ------------------------------------------------------------------
  describe('5. Attendance', () => {
    it('teacher logs attendance; duplicate same-day log is deduped (unique child+date)', async () => {
      const today = startOfUtcDay(new Date()).toISOString();
      const p1 = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childA.id, status: 'present', date: today });
      expect(p1.status).toBe(201);
      ctx.createdIds.attendance.push(after(p1.body.data));

      const p2 = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childA.id, status: 'late', date: today });
      expect(p2.status).toBe(201);

      const docs = await Attendance.find({ childId: ctx.childA.id, date: startOfUtcDay(new Date(today)) });
      expect(docs).toHaveLength(1);
      expect(docs[0].status).toBe('late'); // upsert updated, no duplicate row
    });

    it('a second day creates a second record', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childA.id, status: 'absent', date: '2026-11-01T00:00:00.000Z' });
      expect(res.status).toBe(201);
      ctx.createdIds.attendance.push(after(res.body.data));
      const count = await Attendance.countDocuments({ childId: ctx.childA.id });
      expect(count).toBe(2);
    });

    it('retrieval: manager lists attendance for the centre (and child filter works)', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance?childId=${ctx.childA.id}&date=2026-11-01`)
        .set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('absent');
    });
  });

  // ------------------------------------------------------------------
  // 6. Montessori records
  // ------------------------------------------------------------------
  describe('6. Montessori learning observations', () => {
    it('teacher creates a learning observation; parent retrieves it', async () => {
      const created = await request(app)
        .post('/api/v1/montessori-logs')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childA.id, area: 'Language', observation: 'P29-INTG: formed simple sentences' });
      expect(created.status).toBe(201);
      ctx.createdIds.montessori.push(after(created.body.data));

      const list = await request(app).get('/api/v1/montessori-logs').set('Cookie', ctx.parentA.cookie);
      expect(list.status).toBe(200);
      expect(list.body.data.some((l: { observation: string }) => l.observation.includes('P29-INTG'))).toBe(true);
    });

    it('rejects an invalid Montessori area (400)', async () => {
      const res = await request(app)
        .post('/api/v1/montessori-logs')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childA.id, area: 'NotAnArea', observation: 'x' });
      expect(res.status).toBe(400);
    });

    it('centre manager can filter by area', async () => {
      const res = await request(app)
        .get('/api/v1/montessori-logs?area=Language')
        .set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.every((l: { area: string }) => l.area === 'Language')).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 7. Fees
  // ------------------------------------------------------------------
  describe('7. Fees (calculations and status)', () => {
    let pendingId = '';
    let overdueId = '';

    it('manager creates fee records; default status is pending', async () => {
      const p1 = await request(app)
        .post('/api/v1/fees')
        .set('Cookie', ctx.managerA.cookie)
        .send({ childId: ctx.childA.id, amount: 4500, dueDate: '2026-12-01' });
      expect(p1.status).toBe(201);
      expect(p1.body.data.status).toBe('pending');
      pendingId = after(p1.body.data);
      ctx.createdIds.fees.push(pendingId);

      const p2 = await request(app)
        .post('/api/v1/fees')
        .set('Cookie', ctx.managerA.cookie)
        .send({ childId: ctx.childA.id, amount: 2000, status: 'overdue', dueDate: '2026-10-01' });
      expect(p2.status).toBe(201);
      expect(p2.body.data.status).toBe('overdue');
      overdueId = after(p2.body.data);
      ctx.createdIds.fees.push(overdueId);
    });

    it('manager marks a fee paid (manual status transition, no gateway)', async () => {
      const res = await request(app)
        .patch(`/api/v1/fees/${pendingId}`)
        .set('Cookie', ctx.managerA.cookie)
        .send({ status: 'paid' });
      expect(res.status).toBe(200);
      const doc = await FeeRecord.findById(pendingId);
      expect(doc!.status).toBe('paid');
      expect(doc!.amount).toBe(4500);
    });

    it('rejects non-positive amounts (validation)', async () => {
      const zero = await request(app)
        .post('/api/v1/fees')
        .set('Cookie', ctx.managerA.cookie)
        .send({ childId: ctx.childA.id, amount: 0, dueDate: '2026-12-01' });
      expect(zero.status).toBe(422);
      const neg = await request(app)
        .post('/api/v1/fees')
        .set('Cookie', ctx.managerA.cookie)
        .send({ childId: ctx.childA.id, amount: -100, dueDate: '2026-12-01' });
      expect(neg.status).toBe(422);
    });

    it('parent sees only their own child fees; other parents see nothing of theirs', async () => {
      const mine = await request(app).get('/api/v1/fees').set('Cookie', ctx.parentA.cookie);
      expect(mine.status).toBe(200);
      expect(mine.body.data).toHaveLength(2);
      expect(mine.body.data.every((f: { childId: unknown }) => String(f.childId) === ctx.childA.id)).toBe(true);

      const theirs = await request(app).get('/api/v1/fees').set('Cookie', ctx.parentB.cookie);
      expect(theirs.status).toBe(200);
      expect(theirs.body.data).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  // 8. Staff
  // ------------------------------------------------------------------
  describe('8. Staff (creation, centre assignment, login)', () => {
    it('manager creates a second teacher; user+staff docs agree; new teacher can log in', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Cookie', ctx.managerA.cookie)
        .send({
          name: `P29-INTG Teacher C ${RUN}`,
          email: `p29itest-teach-c-${RUN}@itest.local`,
          password: PW,
          role: 'teacher',
        });
      expect(res.status).toBe(201);
      ctx.teacherC = { userId: String(res.body.data.userId), staffId: after(res.body.data) };
      ids.users.push(ctx.teacherC.userId);
      ids.staff.push(ctx.teacherC.staffId);

      const userDoc = await User.findById(ctx.teacherC.userId);
      expect(userDoc!.role).toBe('teacher');
      expect(String(userDoc!.centreId)).toBe(ctx.centreA.id);
      const staffDoc = await Staff.findById(ctx.teacherC.staffId);
      expect(String(staffDoc!.userId)).toBe(ctx.teacherC.userId);
      expect(String(staffDoc!.centreId)).toBe(ctx.centreA.id);

      const li = await login(`p29itest-teach-c-${RUN}@itest.local`, PW);
      expect(li.res.status).toBe(200);
    });

    it('a manager cannot create another manager', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Cookie', ctx.managerA.cookie)
        .send({
          name: `P29-INTG Mgr X ${RUN}`,
          email: `p29itest-mgr-x-${RUN}@itest.local`,
          password: PW,
          role: 'centre_manager',
        });
      expect(res.status).toBe(400);
    });

    it('manager can assign child to teacher via PATCH /staff/:id/assignments', async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/${ctx.teacherA.staffId}/assignments`)
        .set('Cookie', ctx.managerA.cookie)
        .send({ childIds: [ctx.childA.id] });
      expect(res.status).toBe(200);
      expect(res.body.data.assignedChildren).toEqual([ctx.childA.id]);
    });

    it('teacher with assignment can access the assigned child', async () => {
      // Teacher should see child A in list (assigned)
      const list = await request(app).get('/api/v1/children').set('Cookie', ctx.teacherA.cookie);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((c: { _id: unknown }) => String(c._id));
      expect(ids).toContain(ctx.childA.id);

      // Teacher can get child A detail
      const get = await request(app)
        .get(`/api/v1/children/${ctx.childA.id}`)
        .set('Cookie', ctx.teacherA.cookie);
      expect(get.status).toBe(200);
    });

    it('teacher cannot access unassigned child from same centre → 404', async () => {
      // Create a second child in centre A not assigned to teacher A
      const extraChild = await request(app)
        .post('/api/v1/children')
        .set('Cookie', ctx.managerA.cookie)
        .send({ name: `P29-INTG Child Unassigned ${RUN}`, dob: '2023-01-01' });
      expect(extraChild.status).toBe(201);
      const extraId = after(extraChild.body.data);
      ctx.createdIds.children.push(extraId);

      // Teacher should NOT see unassigned child in list
      const list = await request(app).get('/api/v1/children').set('Cookie', ctx.teacherA.cookie);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((c: { _id: unknown }) => String(c._id));
      expect(ids).not.toContain(extraId);

      // Teacher gets 404 for unassigned child detail
      const get = await request(app)
        .get(`/api/v1/children/${extraId}`)
        .set('Cookie', ctx.teacherA.cookie);
      expect(get.status).toBe(404);
    });

    it('teacher cannot access cross-centre child → 404 (still enforced)', async () => {
      const cross = await request(app)
        .get(`/api/v1/children/${ctx.childB.id}`)
        .set('Cookie', ctx.teacherA.cookie);
      expect(cross.status).toBe(404);
    });

    it('teacher assignment enforcement works in attendance and montessori logs', async () => {
      // Create a second child in centre A, assign to teacher B instead
      const childForB = await request(app)
        .post('/api/v1/children')
        .set('Cookie', ctx.managerA.cookie)
        .send({ name: `P29-INTG Child B only ${RUN}`, dob: '2023-02-01' });
      expect(childForB.status).toBe(201);
      const childBId = after(childForB.body.data);
      ctx.createdIds.children.push(childBId);

      // Assign child to teacher B
      await request(app)
        .patch(`/api/v1/staff/${ctx.teacherB.staffId}/assignments`)
        .set('Cookie', ctx.managerB.cookie)
        .send({ childIds: [ctx.childB.id] });

      // Teacher A cannot log attendance for child assigned to teacher B
      const attRes = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childB.id, status: 'present' });
      expect(attRes.status).toBe(404);

      // Teacher A cannot create montessori log for child assigned to teacher B
      const montRes = await request(app)
        .post('/api/v1/montessori-logs')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: ctx.childB.id, area: 'Language', observation: 'test' });
      expect(montRes.status).toBe(404);
    });
  });

  // ------------------------------------------------------------------
  // 9. Notifications and audit logs
  // ------------------------------------------------------------------
  describe('9. Notifications & audit logs (DB writes + retrieval)', () => {
    it('the earlier operations wrote real audit rows for centre A', async () => {
      const childAudit = await AuditLog.countDocuments({
        centreId: ctx.centreA.id,
        resourceType: 'Child',
        resourceId: ctx.childA.id,
        action: 'CREATE',
      });
      expect(childAudit).toBeGreaterThanOrEqual(1);
      const feeAudit = await AuditLog.countDocuments({
        centreId: ctx.centreA.id,
        resourceType: 'FeeRecord',
      });
      expect(feeAudit).toBeGreaterThanOrEqual(2);
      const attAudit = await AuditLog.countDocuments({
        centreId: ctx.centreA.id,
        resourceType: 'Attendance',
      });
      expect(attAudit).toBeGreaterThanOrEqual(1);
    });

    it('manager retrieves the centre audit trail; teacher is denied', async () => {
      const ok = await request(app).get('/api/v1/audit-logs').set('Cookie', ctx.managerA.cookie);
      expect(ok.status).toBe(200);
      expect(ok.body.data.some((l: { resourceType: string }) => l.resourceType === 'Child')).toBe(true);
      const denied = await request(app).get('/api/v1/audit-logs').set('Cookie', ctx.teacherA.cookie);
      expect(denied.status).toBe(403);
    });

    it('notification: write → retrieve → mark-read, recipient-only access', async () => {
      const note = await Notification.create({
        centreId: ctx.centreA.id,
        recipientId: ctx.parentA.userId,
        message: `P29-INTG notice ${RUN}`,
        read: false,
      });
      ctx.createdIds.notifications.push(String(note._id));

      const list = await request(app).get('/api/v1/notifications').set('Cookie', ctx.parentA.cookie);
      expect(list.status).toBe(200);
      expect(list.body.data.some((n: { message: string }) => n.message.includes('P29-INTG'))).toBe(true);

      const read = await request(app)
        .patch(`/api/v1/notifications/${String(note._id)}/read`)
        .set('Cookie', ctx.parentA.cookie);
      expect(read.status).toBe(200);
      expect(read.body.data.read).toBe(true);

      const notMine = await request(app)
        .patch(`/api/v1/notifications/${String(note._id)}/read`)
        .set('Cookie', ctx.parentB.cookie);
      expect(notMine.status).toBe(404);
    });
  });

  // ------------------------------------------------------------------
  // 10. Dashboards
  // ------------------------------------------------------------------
  describe('10. Dashboards (role-specific + centre aggregation)', () => {
    it('centre dashboard reflects the day’s data for centre A', async () => {
      const res = await request(app).get('/api/v1/dashboard/centre').set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.centreId).toBe(ctx.centreA.id);
      expect(d.activeChildren).toBeGreaterThanOrEqual(1);
      expect(d.staffCount).toBeGreaterThanOrEqual(2);
      expect(d.fees.pending).toBe(0); // paid in the fees section
      expect(d.fees.overdue).toBe(1);
    });

    it('super admin can view a specific centre dashboard and the HQ aggregate', async () => {
      const one = await request(app)
        .get(`/api/v1/dashboard/centre?centreId=${ctx.centreA.id}`)
        .set('Cookie', ctx.hqCookie);
      expect(one.status).toBe(200);
      expect(one.body.data.centreId).toBe(ctx.centreA.id);

      const missing = await request(app).get('/api/v1/dashboard/centre').set('Cookie', ctx.hqCookie);
      expect(missing.status).toBe(400);

      const hq = await request(app).get('/api/v1/dashboard/hq').set('Cookie', ctx.hqCookie);
      expect(hq.status).toBe(200);
      expect(hq.body.data.totalCentres).toBeGreaterThanOrEqual(3); // existing demo + A + B
      const a = hq.body.data.centres.find((c: { id: string }) => c.id === ctx.centreA.id);
      expect(a).toBeDefined();
      expect(a.activeChildren).toBeGreaterThanOrEqual(1);
      expect(a.staffCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ------------------------------------------------------------------
  // 12. Security (invalid tokens, bad input, injection shapes, envelope)
  // ------------------------------------------------------------------
  describe('12. Security hardening checks', () => {
    it('rejects NoSQL-shaped login payloads (422, not 500)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: { $gt: '' }, password: PW });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed objectIds in params (422)', async () => {
      const res = await request(app).get('/api/v1/children/not-an-id').set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(422);
    });

    it('rejects invalid childId in attendance body (422)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', ctx.teacherA.cookie)
        .send({ childId: 'nope', status: 'present' });
      expect(res.status).toBe(422);
    });

    it('unknown /api/v1 routes return the 404 envelope (no 500, no route leak)', async () => {
      const res = await request(app).post('/api/v1/does-not-exist').set('Cookie', ctx.hqCookie).send({});
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('malformed JSON bodies are rejected with 400 (not 500)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "broken');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('every response carries X-Request-Id', async () => {
      const res = await request(app).get('/api/v1/health').set('X-Request-Id', `p29-integ-${RUN}`);
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(`p29-integ-${RUN}`);
    });

    it('error envelopes never leak stack traces', async () => {
      const res = await request(app)
        .get('/api/v1/centres/ffffffffffffffffffffffff')
        .set('Cookie', ctx.managerA.cookie);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toMatch(/at .+\(.*line \d+/);
    });
  });
});
