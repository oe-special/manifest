(function () {
	"use strict";

	var MEDIA_STOP = 0xB2;
	var BROWSER_STOP = 0xA9;
	var MEDIA_PLAY_PAUSE = 0xB3;
	var MEDIA_PLAY = 0xE9;
	var MEDIA_PAUSE = 0xEA;
	var LEGACY_PLAY = 0xFA;
	var LEGACY_PAUSE = 0x13;

	function keyName(event) {
		return event && (event.key || event.code) || "";
	}

	function consume(event) {
		if (event && event.preventDefault) {
			event.preventDefault();
		}
		if (event && event.stopPropagation) {
			event.stopPropagation();
		}
		if (event && event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		}
	}

	function playerRoot() {
		return document.querySelector(".dv-player-fullscreen, #dv-web-player");
	}

	function isWatching() {
		return !!playerRoot();
	}

	function currentVideo() {
		var videos = document.querySelectorAll("video");
		var fallback = null;
		var i;
		for (i = 0; i < videos.length; i += 1) {
			if (!fallback) {
				fallback = videos[i];
			}
			var rect = videos[i].getBoundingClientRect();
			if (
				rect.width > 0 &&
				rect.height > 0 &&
				videos[i].readyState > 0 &&
				!videos[i].ended
			) {
				return videos[i];
			}
		}
		return fallback;
	}

	function logAction(action, keyCode, name) {
		if (window.console && window.console.log) {
			window.console.log(
				"[Prime Media Keys] " +
					action +
					" key=" +
					name +
					" keyCode=" +
					keyCode
			);
		}
	}

	function play(video) {
		var result = video.play();
		if (result && result.catch) {
			result.catch(function (error) {
				if (window.console && window.console.log) {
					window.console.log(
						"[Prime Media Keys] play rejected: " +
							(error && error.message || error)
					);
				}
			});
		}
	}

	function togglePlayback(video) {
		if (video.paused || video.ended) {
			play(video);
			return "play";
		}
		video.pause();
		return "pause";
	}

	function closeControl(root) {
		var oldControl = root.querySelector(
			".closeButtonWrapper .imageButton"
		);
		if (oldControl) {
			return oldControl;
		}

		var controls = root.querySelectorAll(
			"button[aria-label],a[aria-label],[role=\"button\"][aria-label]," +
			"[data-testid*=\"close\"],[data-testid*=\"back\"]"
		);
		var pattern =
			/(^|[\s_-])(close|back|exit|zurück|schließen|beenden)([\s_-]|$)/i;
		var i;
		for (i = 0; i < controls.length; i += 1) {
			var description = [
				controls[i].getAttribute("aria-label") || "",
				controls[i].getAttribute("title") || "",
				controls[i].getAttribute("data-testid") || ""
			].join(" ");
			if (pattern.test(description)) {
				return controls[i];
			}
		}
		return null;
	}

	function stopPlayback(video) {
		if (video && !video.paused) {
			video.pause();
		}

		var root = playerRoot();
		var control = root && closeControl(root);
		if (control && control.click) {
			control.click();
			window.setTimeout(function () {
				if (isWatching()) {
					window.history.back();
				}
			}, 400);
			return;
		}
		window.history.back();
	}

	function handleKey(event) {
		if (!isWatching()) {
			return;
		}

		var keyCode = event.which || event.keyCode;
		var name = keyName(event);
		var video;
		var action;

		if (
			keyCode === MEDIA_STOP ||
			keyCode === BROWSER_STOP ||
			name === "MediaStop"
		) {
			if (event.repeat) {
				consume(event);
				return;
			}
			video = currentVideo();
			stopPlayback(video);
			logAction("stop", keyCode, name);
			consume(event);
			return;
		}

		if (
			keyCode === MEDIA_PLAY_PAUSE ||
			keyCode === MEDIA_PLAY ||
			name === "MediaPlay" ||
			name === "MediaPlayPause"
		) {
			if (event.repeat) {
				consume(event);
				return;
			}
			video = currentVideo();
			if (!video) {
				return;
			}
			action = togglePlayback(video);
			logAction(action, keyCode, name);
			consume(event);
			return;
		}

		if (
			keyCode === MEDIA_PAUSE ||
			keyCode === LEGACY_PAUSE ||
			name === "MediaPause"
		) {
			video = currentVideo();
			if (!video) {
				return;
			}
			video.pause();
			logAction("pause", keyCode, name);
			consume(event);
			return;
		}

		if (keyCode === LEGACY_PLAY) {
			video = currentVideo();
			if (!video) {
				return;
			}
			play(video);
			logAction("play", keyCode, name);
			consume(event);
		}
	}

	if (window.__chromiumPrimeMediaKeysInstalled) {
		return;
	}
	window.__chromiumPrimeMediaKeysInstalled = true;
	window.addEventListener("keydown", handleKey, true);
	console.log("[Prime Media Keys] installed");
}());
