import db from '../db';

export function sendNotification(userId: number, triggerEvent: string, data: any) {
  try {
    const template: any = db.prepare('SELECT * FROM notification_templates WHERE trigger_event = ? AND is_active = 1').get(triggerEvent);
    
    if (!template) {
      console.log(`No active template for event: ${triggerEvent}`);
      return;
    }

    // Replace placeholders
    let emailBody = template.email_body;
    let emailSubject = template.email_subject;
    let smsBody = template.sms_body;

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      emailBody = emailBody.replace(regex, data[key]);
      emailSubject = emailSubject.replace(regex, data[key]);
      smsBody = smsBody.replace(regex, data[key]);
    });

    // Log "Email"
    db.prepare('INSERT INTO notification_logs (user_id, trigger_event, channel, content) VALUES (?, ?, ?, ?)').run(
      userId, triggerEvent, 'email', `Subject: ${emailSubject}\n\n${emailBody}`
    );

    // Log "SMS"
    db.prepare('INSERT INTO notification_logs (user_id, trigger_event, channel, content) VALUES (?, ?, ?, ?)').run(
      userId, triggerEvent, 'sms', smsBody
    );

    console.log(`Notification sent to User ${userId} for ${triggerEvent}`);

  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
