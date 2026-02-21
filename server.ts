import crypto from 'crypto';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { initDb } from './src/db';

import { sendNotification } from './src/services/notificationService';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const upload = multer({ dest: UPLOAD_DIR });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1); // Trust first proxy (required for secure cookies behind nginx)

  // Initialize Database
  initDb();

  // Helper: Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  // --- API ROUTES ---

  // ... Auth Routes (Register/Login/Logout/Me) ...
  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, role, full_name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password, role, full_name) VALUES (?, ?, ?, ?)');
      const info = stmt.run(email, hashedPassword, role || 'applicant', full_name);
      
      const user = { id: info.lastInsertRowid, email, role: role || 'applicant', full_name };
      const token = jwt.sign(user, JWT_SECRET);
      
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (await bcrypt.compare(password, user.password)) {
      const tokenUser = { id: user.id, email: user.email, role: user.role, full_name: user.full_name };
      const token = jwt.sign(tokenUser, JWT_SECRET);
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: tokenUser });
    } else {
      res.status(403).json({ error: 'Invalid password' });
    }
  });

  // Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  // Auth: Forgot Password
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      // For security, do not reveal if user exists
      return res.json({ message: 'If your email is registered, you will receive a reset link.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

    // Send Notification
    // In a real app, this link would point to the frontend URL
    // Since we are in a container, we use the APP_URL env var if available, or just a relative path for the demo
    // The user will see the link in the "Notification History" (simulated email inbox)
    const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    sendNotification(user.id, 'password_reset', {
      full_name: user.full_name,
      reset_link: resetLink,
      token: token
    });

    res.json({ message: 'If your email is registered, you will receive a reset link.' });
  });

  // Auth: Reset Password
  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, new_password } = req.body;

    const resetRecord: any = db.prepare('SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1').get(token);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update password
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, resetRecord.user_id);
    
    // Delete used token (and all other tokens for this user for security)
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(resetRecord.user_id);

    res.json({ message: 'Password reset successful' });
  });

  // Auth: Me
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Notifications: List Logs
  app.get('/api/notifications/logs', authenticateToken, (req: any, res) => {
    const logs = db.prepare('SELECT * FROM notification_logs WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(logs);
  });

  // Notifications: List Templates (Admin only)
  app.get('/api/notifications/templates', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const templates = db.prepare('SELECT * FROM notification_templates').all();
    res.json(templates);
  });

  // Notifications: Update Template (Admin only)
  app.put('/api/notifications/templates/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { email_subject, email_body, sms_body, is_active } = req.body;
    db.prepare(`
      UPDATE notification_templates 
      SET email_subject = ?, email_body = ?, sms_body = ?, is_active = ? 
      WHERE id = ?
    `).run(email_subject, email_body, sms_body, is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Applications: List (filtered by role)
  app.get('/api/applications', authenticateToken, (req: any, res) => {
    if (req.user.role === 'applicant') {
      const apps = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
      res.json(apps);
    } else {
      const apps = db.prepare(`
        SELECT a.*, u.full_name as applicant_name 
        FROM applications a 
        JOIN users u ON a.user_id = u.id 
        ORDER BY a.created_at DESC
      `).all();
      res.json(apps);
    }
  });

  // Applications: Create
  app.post('/api/applications', authenticateToken, (req: any, res) => {
    const { business_name, business_type, address, form_data } = req.body;
    const stmt = db.prepare(`
      INSERT INTO applications (user_id, business_name, business_type, address, form_data, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `);
    const info = stmt.run(req.user.id, business_name, business_type, address, JSON.stringify(form_data));
    const appId = info.lastInsertRowid;

    // Log history
    db.prepare('INSERT INTO application_history (application_id, status, changed_by, notes) VALUES (?, ?, ?, ?)').run(appId, 'draft', req.user.id, 'Application created');

    res.json({ id: appId });
  });

  // Applications: Get Single
  app.get('/api/applications/:id', authenticateToken, (req: any, res) => {
    const app: any = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    
    if (req.user.role === 'applicant' && app.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const docs = db.prepare('SELECT * FROM documents WHERE application_id = ?').all(app.id);
    
    // Get history with user names
    const history = db.prepare(`
      SELECT h.*, u.full_name as changed_by_name 
      FROM application_history h 
      LEFT JOIN users u ON h.changed_by = u.id 
      WHERE h.application_id = ? 
      ORDER BY h.created_at DESC
    `).all(app.id);

    app.documents = docs;
    app.history = history;
    app.form_data = JSON.parse(app.form_data);
    res.json(app);
  });

  // Applications: Update Status
  app.patch('/api/applications/:id/status', authenticateToken, (req: any, res) => {
    const { status, notes } = req.body;
    const appId = req.params.id;
    
    // Get application and user details for notification
    const app: any = db.prepare('SELECT a.*, u.full_name, u.email FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?').get(appId);
    if (!app) return res.status(404).json({ error: 'Not found' });

    const updateStatus = (newStatus: string, note: string) => {
      db.prepare('UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, appId);
      db.prepare('INSERT INTO application_history (application_id, status, changed_by, notes) VALUES (?, ?, ?, ?)').run(appId, newStatus, req.user.id, note);
    };

    // Role checks
    if (['staff', 'treasurer', 'admin'].includes(req.user.role)) {
      updateStatus(status, notes || `Status updated to ${status}`);
      
      // Send Notification
      const triggerEvent = `status_${status}`;
      sendNotification(app.user_id, triggerEvent, {
        full_name: app.full_name,
        business_name: app.business_name,
        application_id: app.id,
        amount: '5,000.00' // Mock amount
      });

      res.json({ success: true });
    } else if (req.user.role === 'applicant' && status === 'submitted') {
       updateStatus(status, 'Application submitted by applicant');
       
       // Send Notification
       sendNotification(req.user.id, 'application_submitted', {
         full_name: req.user.full_name,
         business_name: app.business_name,
         application_id: app.id
       });

       res.json({ success: true });
    } else if (req.user.role === 'applicant' && status === 'paid') {
        // Self-payment simulation
        updateStatus(status, 'Payment completed by applicant');
        
        sendNotification(req.user.id, 'status_paid', {
            full_name: req.user.full_name,
            business_name: app.business_name,
            application_id: app.id
        });
        res.json({ success: true });
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  });

  // Documents: Upload
  app.post('/api/documents/upload', authenticateToken, upload.single('file'), (req: any, res) => {
    const { application_id, type } = req.body;
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const stmt = db.prepare('INSERT INTO documents (application_id, type, filename, path) VALUES (?, ?, ?, ?)');
    stmt.run(application_id, type, file.originalname, file.path);
    
    res.json({ success: true, file });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
