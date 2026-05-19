/** Returns the script that overrides the browser Notification API in the renderer. */
export function getNotificationMockScript(): string {
  return `
    (function() {
      if (window.Notification && window.Notification.__electron_override__) return;

      function NotificationOverride(title, options) {
        options = options || {};
        window.postMessage({
          type: '__electron_notification__',
          title: title,
          body: options.body || '',
          icon: options.icon || undefined,
        }, '*');
        this.title = title;
        this.body = options.body || '';
        this.onclick = null;
        this.onclose = null;
        this.onerror = null;
        this.close = function() {};
      }
      NotificationOverride.permission = 'granted';
      NotificationOverride.requestPermission = function(cb) {
        if (cb) cb('granted');
        return Promise.resolve('granted');
      };
      NotificationOverride.__electron_override__ = true;
      Object.defineProperty(window, 'Notification', {
        value: NotificationOverride,
        writable: false,
        configurable: false,
      });
    })();
  `;
}
