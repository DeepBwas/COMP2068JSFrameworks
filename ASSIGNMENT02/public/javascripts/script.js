// public/javascripts/script.js

// Password visibility toggle
function togglePasswordVisibility(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const eyeIcon = passwordField.parentElement.querySelector('.password-toggle img');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.src = 'images/eye-off.svg';
    } else {
        passwordField.type = 'password';
        eyeIcon.src = 'images/eye.svg';
    }
}

// Notification System
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => 
                    this._showNotification(message, type, duration));
                return;
            }
            return this._showNotification(message, type, duration);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    static _showNotification(message, type, duration) {
        const container = document.getElementById('notification-container') 
            || this.createContainer();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            ${message}
            <span class="notification-close" onclick="this.parentElement.remove()">✕</span>
        `;
        
        container.appendChild(notification);
        notification.offsetHeight;
        notification.classList.add('show');

        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }

        return notification;
    }

    static createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    static success(message, duration) {
        return this.show(message, 'success', duration);
    }

    static error(message, duration) {
        return this.show(message, 'error', duration);
    }

    static info(message, duration) {
        return this.show(message, 'info', duration);
    }

    static warning(message, duration) {
        return this.show(message, 'warning', duration);
    }
}

// Initialize notification system
window.initNotifications = function() {
    if (typeof notify === 'undefined') {
        console.error('Loading notification system...');
        setTimeout(initNotifications, 100);
        return;
    }
    console.log('Notification system ready');
}

// Make globally available
window.notify = NotificationManager;

// Usage examples:
// notify.success('Operation successful!');
// notify.error('Something went wrong!');
// notify.info('Please check your email');
// notify.warning('Account about to expire');