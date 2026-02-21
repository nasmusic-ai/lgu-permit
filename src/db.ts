import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'database.sqlite'));

export function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('applicant', 'staff', 'treasurer', 'admin')),
      full_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Applications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_name TEXT NOT NULL,
      business_type TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'under_review', 'payment_pending', 'paid', 'approved', 'rejected')),
      form_data TEXT, -- JSON string of full form details
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    )
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_id TEXT,
      paid_at DATETIME,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    )
  `);

  // Notification Templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_event TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email_subject TEXT,
      email_body TEXT,
      sms_body TEXT,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Notification Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trigger_event TEXT NOT NULL,
      channel TEXT NOT NULL,
      content TEXT NOT NULL,
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Password Resets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Application History table
  db.exec(`
    CREATE TABLE IF NOT EXISTS application_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      changed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `);

  // Seed Notification Templates
  const templates = [
    {
      trigger_event: 'password_reset',
      name: 'Password Reset Request',
      email_subject: 'Reset Your Password',
      email_body: 'Dear {{full_name}},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{{reset_link}}\n\nIf you did not request this, please ignore this email.',
      sms_body: 'LGU Portal: Use this token to reset your password: {{token}}'
    },
    {
      trigger_event: 'application_submitted',
      name: 'Application Submitted',
      email_subject: 'Application Received: {{business_name}}',
      email_body: 'Dear {{full_name}},\n\nYour application for {{business_name}} has been received and is now under review.\n\nReference ID: {{application_id}}',
      sms_body: 'LGU Portal: Your application for {{business_name}} has been received. Ref: {{application_id}}'
    },
    {
      trigger_event: 'status_under_review',
      name: 'Application Under Review',
      email_subject: 'Update: Application Under Review',
      email_body: 'Dear {{full_name}},\n\nYour application for {{business_name}} is now being reviewed by our staff.',
      sms_body: 'LGU Portal: Your application for {{business_name}} is now under review.'
    },
    {
      trigger_event: 'status_payment_pending',
      name: 'Payment Required',
      email_subject: 'Action Required: Payment for Business Permit',
      email_body: 'Dear {{full_name}},\n\nYour application has been approved for payment. Please log in to the portal to proceed.\n\nAmount Due: {{amount}}',
      sms_body: 'LGU Portal: Your application is approved for payment. Please log in to pay.'
    },
    {
      trigger_event: 'status_paid',
      name: 'Payment Confirmed',
      email_subject: 'Payment Received',
      email_body: 'Dear {{full_name}},\n\nWe have received your payment for {{business_name}}. We are now processing your permit.',
      sms_body: 'LGU Portal: Payment received for {{business_name}}. Processing permit.'
    },
    {
      trigger_event: 'status_approved',
      name: 'Permit Issued',
      email_subject: 'Congratulations! Business Permit Issued',
      email_body: 'Dear {{full_name}},\n\nYour Business Permit for {{business_name}} has been issued. You may now download it from the portal.',
      sms_body: 'LGU Portal: Your Business Permit for {{business_name}} has been issued. Log in to download.'
    },
    {
      trigger_event: 'status_rejected',
      name: 'Application Rejected',
      email_subject: 'Update on your Application',
      email_body: 'Dear {{full_name}},\n\nUnfortunately, your application for {{business_name}} has been rejected. Please log in for more details.',
      sms_body: 'LGU Portal: Your application for {{business_name}} was rejected. Please log in for details.'
    }
  ];

  const insertTemplate = db.prepare(`
    INSERT OR IGNORE INTO notification_templates (trigger_event, name, email_subject, email_body, sms_body)
    VALUES (?, ?, ?, ?, ?)
  `);

  templates.forEach(t => {
    insertTemplate.run(t.trigger_event, t.name, t.email_subject, t.email_body, t.sms_body);
  });

  // Seed admin user if not exists
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@lgu.gov.ph');
  if (!admin) {
    // Password is 'admin123' - in a real app, use bcrypt. We will use bcrypt in the auth routes.
    // For now, we'll handle seeding in the main server startup if needed, or just let the first register work.
    // Actually, let's just leave it empty and allow registration for demo purposes, 
    // or I'll add a seed function in server.ts that uses the hash function.
  }
}

export default db;
