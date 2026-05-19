/**
 * Returns the script that mocks the PushManager API in the renderer.
 * Intercepts push subscribe/unsubscribe XHR and fetch calls so the
 * web app's push toggle works without errors in the Electron shell.
 */
export function getPushMockScript(): string {
  return `
    (function() {
      if (typeof PushManager === 'undefined') return;
      if (window.__electron_push_mock__) return;
      window.__electron_push_mock__ = true;

      var endpoint = 'https://electron-desktop.local/push-mock';
      var p256dh = '';
      var auth = '';

      var mockSub = {
        endpoint: endpoint,
        expirationTime: null,
        options: { applicationServerKey: null, userVisibleOnly: true },
        getKey: function(name) {
          if (name === 'p256dh' && p256dh) {
            var raw = atob(p256dh.replace(/-/g, '+').replace(/_/g, '/'));
            var arr = new Uint8Array(raw.length);
            for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
            return arr.buffer;
          }
          if (name === 'auth' && auth) {
            var raw = atob(auth.replace(/-/g, '+').replace(/_/g, '/'));
            var arr = new Uint8Array(raw.length);
            for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
            return arr.buffer;
          }
          return null;
        },
        toJSON: function() { return { endpoint: endpoint, keys: { p256dh: p256dh, auth: auth } }; },
        unsubscribe: function() { return Promise.resolve(true); }
      };

      PushManager.prototype.subscribe = function() { return Promise.resolve(mockSub); };
      PushManager.prototype.getSubscription = function() { return Promise.resolve(null); };
      PushManager.prototype.permissionState = function() { return Promise.resolve('granted'); };

      var origXHROpen = XMLHttpRequest.prototype.open;
      var origXHRSend = XMLHttpRequest.prototype.send;
      var pushUrlPattern = /\\/api\\/v1\\/notifications\\/push\\/(subscribe|unsubscribe)/;

      XMLHttpRequest.prototype.open = function(method, url) {
        this._isPushMock = pushUrlPattern.test(String(url));
        if (!this._isPushMock) {
          return origXHROpen.apply(this, arguments);
        }
        this._mockMethod = method;
        this._mockUrl = url;
        return origXHROpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function(body) {
        if (this._isPushMock) {
          var self = this;
          setTimeout(function() {
            Object.defineProperty(self, 'status', { get: function() { return 200; } });
            Object.defineProperty(self, 'readyState', { get: function() { return 4; } });
            Object.defineProperty(self, 'responseText', { get: function() { return JSON.stringify({ success: true }); } });
            Object.defineProperty(self, 'response', { get: function() { return JSON.stringify({ success: true }); } });
            if (self.onreadystatechange) self.onreadystatechange(new Event('readystatechange'));
            if (self.onload) self.onload(new ProgressEvent('load'));
            self.dispatchEvent(new Event('load'));
            self.dispatchEvent(new Event('loadend'));
          }, 10);
          return;
        }
        return origXHRSend.apply(this, arguments);
      };

      var origFetch = window.fetch;
      window.fetch = function(input, init) {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (pushUrlPattern.test(url)) {
          return Promise.resolve(new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        return origFetch.apply(this, arguments);
      };
    })();
  `;
}
