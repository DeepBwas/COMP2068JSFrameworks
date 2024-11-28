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
        res.locals.notifications = instance.notifications;
        
        res.notify = {
            show: (message, type) => instance.add(res, message, type),
            success: (message) => instance.add(res, message, 'success'),
            error: (message) => instance.add(res, message, 'error'),
            info: (message) => instance.add(res, message, 'info'),
            warning: (message) => instance.add(res, message, 'warning')
        };
        
        next();
    }

    add(res, message, type) {
        if (!res.locals.notifications) {
            res.locals.notifications = [];
        }
        res.locals.notifications.push({ message, type });
    }
}

module.exports = NotificationManager;