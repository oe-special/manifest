(function () {
	"use strict";

	var MEDIA_STOP = 0xB2;
	var BROWSER_STOP = 0xA9;
	var MEDIA_PLAY_PAUSE = 0xB3;
	var PLAY = 0xFA;
	var PAUSE = 0x13;
	var installAttempts = 0;
	var maxInstallAttempts = 300;

	function consume(event) {
		if (event && typeof event.preventDefault === "function")
			event.preventDefault();
		if (event && typeof event.stopImmediatePropagation === "function")
			event.stopImmediatePropagation();
		else if (event && typeof event.stopPropagation === "function")
			event.stopPropagation();
	}

	function currentApplication(api) {
		if (api && typeof api.get_cur_app === "function")
			return api.get_cur_app();
		return null;
	}

	function install() {
		var api = window.netflix_api;
		if (!api || typeof api.event_handler !== "function") {
			installAttempts += 1;
			if (installAttempts < maxInstallAttempts)
				window.setTimeout(install, 100);
			return;
		}
		if (api.__openatvMediaKeysInstalled)
			return;

		var originalEventHandler = api.event_handler;
		api.event_handler = function (event) {
			var keyCode = event && (event.which || event.keyCode);
			var application;

			if (keyCode === MEDIA_STOP || keyCode === BROWSER_STOP) {
				application = currentApplication(this);
				if (application && typeof application.event_exit === "function") {
					application.event_exit();
					consume(event);
					return;
				}
			}

			if (keyCode === MEDIA_PLAY_PAUSE ||
					keyCode === PLAY || keyCode === PAUSE) {
				application = currentApplication(this);
				if (application &&
						typeof application.event_key_play_pause === "function") {
					application.event_key_play_pause();
					consume(event);
					return;
				}
			}

			return originalEventHandler.call(this, event);
		};
		api.__openatvMediaKeysInstalled = true;
	}

	install();
}());
