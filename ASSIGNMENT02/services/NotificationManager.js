class NotificationManager {
  constructor() {
    this.notifications = [];
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationManager();
    }
    return this.instance;
  }

  static setup(req, res, next) {
    const instance = this.getInstance();
    res.locals.notifications = req.session.notifications || [];

    res.notify = {
      show: (message, type, duration = 5000) =>
        instance.add(req, res, message, type, duration),
      success: (message, duration = 5000) =>
        instance.add(req, res, message, "success", duration),
      error: (message, duration = 5000) =>
        instance.add(req, res, message, "error", duration),
      info: (message, duration = 5000) =>
        instance.add(req, res, message, "info", duration),
      warning: (message, duration = 5000) =>
        instance.add(req, res, message, "warning", duration),
    };

    next();
  }

  add(req, res, message, type, duration) {
    if (!req.session.notifications) {
      req.session.notifications = [];
    }
    const notification = { message, type, duration, id: Date.now() };
    req.session.notifications.push(notification);
    setTimeout(() => {
      this.remove(req, notification.id);
    }, duration);
  }

  remove(req, id) {
    if (req.session.notifications) {
      req.session.notifications = req.session.notifications.filter(
        (n) => n.id !== id
      );
    }
  }

  static clearSessionNotifications(req, res, next) {
    if (req.session) {
      delete req.session.notifications;
    }
    next();
  }
}

module.exports = NotificationManager;
