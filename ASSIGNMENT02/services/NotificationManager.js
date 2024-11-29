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
    const oldRender = res.render;
    res.render = function (view, options = {}) {
      options.notifications = res.locals.notifications;
      oldRender.call(this, view, options);
    };
    if (req.session.notifications) {
      delete req.session.notifications;
    }

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

    const notification = {
      message,
      type,
      duration: duration || 5000,
    };
    req.session.notifications.push(notification);

    if (req.session.save) {
      req.session.save((err) => {
        if (err) console.error("Error saving session:", err);
      });
    }
  }
}

module.exports = NotificationManager;
