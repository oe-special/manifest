(function () {
	"use strict";

	var KEY_BACKSPACE = 0x08;
	var KEY_ESCAPE = 0x1B;
	var BROWSER_BACK = 0xA6;
	var BROWSER_STOP = 0xA9;
	var VOLUME_DOWN = 0xAE;
	var VOLUME_UP = 0xAF;
	var MEDIA_TRACK_NEXT = 0xB0;
	var MEDIA_TRACK_PREVIOUS = 0xB1;
	var MEDIA_STOP = 0xB2;
	var MEDIA_PLAY_PAUSE = 0xB3;
	var MEDIA_FAST_FORWARD = 0xE4;
	var MEDIA_REWIND = 0xE3;
	var MEDIA_PLAY = 0xE9;
	var MEDIA_PAUSE = 0xEA;
	var LEGACY_PLAY = 0xFA;
	var LEGACY_PAUSE = 0x13;
	var VOLUME_MUTE = 0xAD;
	var SEEK_SECONDS = 10;
	var VOLUME_STEP = 0.05;

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

	function isVisible(element) {
		if (!element) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return (
			rect.width > 0 &&
			rect.height > 0 &&
			style.display !== "none" &&
			style.visibility !== "hidden"
		);
	}

	function playerRoot() {
		var roots = document.querySelectorAll(
			".dv-player-fullscreen, [id^=\"dv-web-player\"]"
		);
		var i;
		for (i = 0; i < roots.length; i += 1) {
			if (isVisible(roots[i])) {
				return roots[i];
			}
		}
		return null;
	}

	function isWatching() {
		return !!playerRoot();
	}

	function currentVideo(root) {
		root = root || playerRoot();
		if (!root) {
			return null;
		}

		var videos = root.querySelectorAll("video");
		var fallback = null;
		var i;
		for (i = 0; i < videos.length; i += 1) {
			if (!isVisible(videos[i])) {
				continue;
			}
			if (!fallback) {
				fallback = videos[i];
			}
			if (videos[i].readyState > 0 && !videos[i].ended) {
				return videos[i];
			}
		}
		return fallback;
	}

	function logAction(action, keyCode, name, detail) {
		if (window.console && window.console.log) {
			window.console.log(
				"[Prime Media Keys] " +
					action +
					" key=" +
					name +
					" keyCode=" +
					keyCode +
					(detail ? " " + detail : "")
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
		var wasPaused = video.paused || video.ended;
		if (wasPaused) {
			play(video);
			return "play";
		}
		video.pause();
		return "pause";
	}

	function closeControl(root) {
		var control = root.querySelector(
			"button[aria-label=\"Player schließen\"]," +
			"button[aria-label=\"Close player\"]," +
			".closeButtonWrapper .imageButton"
		);
		if (control && isVisible(control)) {
			return control;
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
			if (isVisible(controls[i]) && pattern.test(description)) {
				return controls[i];
			}
		}
		return null;
	}

	function closePlayer(root, video) {
		if (video && !video.paused) {
			video.pause();
		}

		var control = root && closeControl(root);
		if (control && control.click) {
			control.click();
			return true;
		}
		window.history.back();
		return false;
	}

	function seek(video, offset) {
		var target = video.currentTime + offset;
		if (target < 0) {
			target = 0;
		}
		if (isFinite(video.duration) && target > video.duration) {
			target = video.duration;
		}
		video.currentTime = target;
		return target;
	}

	function changeVolume(video, offset) {
		var target = Math.round((video.volume + offset) * 100) / 100;
		target = Math.max(0, Math.min(1, target));
		video.volume = target;
		if (offset > 0 && video.muted) {
			video.muted = false;
		}
		return target;
	}

	function handleKey(event) {
		var root = playerRoot();
		if (!root) {
			return;
		}

		var keyCode = event.which || event.keyCode;
		var name = keyName(event);
		var video;
		var action;
		var value;

		if (
			keyCode === MEDIA_STOP ||
			keyCode === BROWSER_STOP ||
			name === "MediaStop"
		) {
			if (!event.repeat) {
				video = currentVideo(root);
				closePlayer(root, video);
				logAction("stop/close", keyCode, name);
			}
			consume(event);
			return;
		}

		if (
			keyCode === KEY_BACKSPACE ||
			keyCode === BROWSER_BACK ||
			keyCode === KEY_ESCAPE ||
			name === "Backspace" ||
			name === "BrowserBack" ||
			name === "Escape"
		) {
			if (!event.repeat) {
				video = currentVideo(root);
				closePlayer(root, video);
				logAction("exit/close", keyCode, name);
			}
			consume(event);
			return;
		}

		if (
			keyCode === MEDIA_TRACK_NEXT ||
			keyCode === MEDIA_FAST_FORWARD ||
			name === "MediaTrackNext" ||
			name === "MediaFastForward"
		) {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			value = seek(video, SEEK_SECONDS);
			logAction("seek-forward", keyCode, name, "time=" + value);
			consume(event);
			return;
		}

		if (
			keyCode === MEDIA_TRACK_PREVIOUS ||
			keyCode === MEDIA_REWIND ||
			name === "MediaTrackPrevious" ||
			name === "MediaRewind"
		) {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			value = seek(video, -SEEK_SECONDS);
			logAction("seek-backward", keyCode, name, "time=" + value);
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
			video = currentVideo(root);
			if (!video) {
				return;
			}
			action = togglePlayback(video);
			logAction(action, keyCode, name, "paused-before=" + (action === "play"));
			consume(event);
			return;
		}

		if (
			keyCode === MEDIA_PAUSE ||
			keyCode === LEGACY_PAUSE ||
			name === "MediaPause"
		) {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			video.pause();
			logAction("pause", keyCode, name);
			consume(event);
			return;
		}

		if (keyCode === LEGACY_PLAY) {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			play(video);
			logAction("play", keyCode, name);
			consume(event);
			return;
		}

		if (keyCode === VOLUME_UP || name === "AudioVolumeUp") {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			value = changeVolume(video, VOLUME_STEP);
			logAction("volume-up", keyCode, name, "volume=" + value);
			consume(event);
			return;
		}

		if (keyCode === VOLUME_DOWN || name === "AudioVolumeDown") {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			value = changeVolume(video, -VOLUME_STEP);
			logAction("volume-down", keyCode, name, "volume=" + value);
			consume(event);
			return;
		}

		if (keyCode === VOLUME_MUTE || name === "AudioVolumeMute") {
			video = currentVideo(root);
			if (!video) {
				return;
			}
			video.muted = !video.muted;
			logAction(
				video.muted ? "mute" : "unmute",
				keyCode,
				name
			);
			consume(event);
		}
	}

	if (window.__chromiumPrimeMediaKeysInstalled) {
		return;
	}
	window.__chromiumPrimeMediaKeysInstalled = true;
	window.addEventListener("keydown", handleKey, true);
	console.log("[Prime Media Keys] installed r16");
}());
