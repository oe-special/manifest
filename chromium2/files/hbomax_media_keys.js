(function () {
	"use strict";

	var KEY_BACKSPACE = 0x08;
	var KEY_ESCAPE = 0x1B;
	var BROWSER_BACK = 0xA6;
	var BROWSER_STOP = 0xA9;
	var VOLUME_MUTE = 0xAD;
	var MEDIA_TRACK_NEXT = 0xB0;
	var MEDIA_TRACK_PREVIOUS = 0xB1;
	var MEDIA_STOP = 0xB2;
	var MEDIA_PLAY_PAUSE = 0xB3;
	var MEDIA_REWIND = 0xE3;
	var MEDIA_FAST_FORWARD = 0xE4;
	var MEDIA_PLAY = 0xE9;
	var MEDIA_PAUSE = 0xEA;
	var LEGACY_PLAY = 0xFA;
	var LEGACY_PAUSE = 0x13;
	var SEEK_SECONDS = 10;

	function keyName(event) {
		return event && (event.key || event.code) || "";
	}

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function visible(element) {
		if (!element) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return (
			rect.width > 1 &&
			rect.height > 1 &&
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01
		);
	}

	function playerPath() {
		return /^\/(?:video|watch|player)(?:\/|$)/i.test(
			window.location.pathname
		);
	}

	function currentVideo() {
		var videos = document.querySelectorAll("video");
		var best = null;
		var bestScore = -1;
		var i;
		for (i = 0; i < videos.length; i += 1) {
			if (!visible(videos[i]) || videos[i].ended) {
				continue;
			}
			var rect = videos[i].getBoundingClientRect();
			var score = rect.width * rect.height;
			if (videos[i].readyState > 0) {
				score += window.innerWidth * window.innerHeight;
			}
			if (score > bestScore) {
				best = videos[i];
				bestScore = score;
			}
		}
		return best;
	}

	function explicitPlayerRoot(video) {
		return video && video.closest(
			'[data-testid*="player"],[data-testid*="Player"],' +
				'[class*="PlayerContainer"],[class*="PlayerRoot"],' +
				'[class*="VideoPlayer"],[class*="StyledPlayer"]'
		);
	}

	function playerContext() {
		var video = currentVideo();
		if (!video) {
			return null;
		}
		var rect = video.getBoundingClientRect();
		var viewportArea = window.innerWidth * window.innerHeight;
		var largeVideo = rect.width * rect.height > viewportArea * 0.35;
		var root = explicitPlayerRoot(video);
		if (
			!playerPath() &&
			!document.fullscreenElement &&
			!(root && largeVideo)
		) {
			return null;
		}
		return {
			root: root || document,
			video: video
		};
	}

	function logAction(action, keyCode, name, detail) {
		console.log(
			"[HBO Max Media Keys] " +
				action +
				" key=" +
				name +
				" keyCode=" +
				keyCode +
				(detail ? " " + detail : "")
		);
	}

	function play(video) {
		var result = video.play();
		if (result && result.catch) {
			result.catch(function (error) {
				console.log(
					"[HBO Max Media Keys] play rejected: " +
						(error && error.message || error)
				);
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

	function seek(video, offset) {
		var target = video.currentTime + offset;
		target = Math.max(0, target);
		if (isFinite(video.duration)) {
			target = Math.min(video.duration, target);
		}
		video.currentTime = target;
		return target;
	}

	function closePlayer() {
		/*
		 * HBO Max owns the playback state. Pausing the HTMLMediaElement before
		 * activating an inferred close button can deadlock its player state.
		 * Player URLs are pushed by the SPA, so history is the reliable exit.
		 */
		window.history.back();
		return "history";
	}

	function handleKey(event) {
		var context = playerContext();
		if (!context) {
			return;
		}

		var keyCode = event.which || event.keyCode;
		var name = keyName(event);
		var video = context.video;
		var value;

		if (
			keyCode === MEDIA_STOP ||
			keyCode === BROWSER_STOP ||
			name === "MediaStop"
		) {
			if (!event.repeat) {
				value = closePlayer(context);
				logAction("stop/close", keyCode, name, "via=" + value);
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
				value = closePlayer(context);
				logAction("exit/close", keyCode, name, "via=" + value);
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
			if (!event.repeat) {
				var pausedBefore = video.paused || video.ended;
				value = togglePlayback(video);
				logAction(
					value,
					keyCode,
					name,
					"paused-before=" + pausedBefore
				);
			}
			consume(event);
			return;
		}

		if (
			keyCode === LEGACY_PLAY ||
			name === "Play"
		) {
			if (!event.repeat) {
				play(video);
				logAction("play", keyCode, name);
			}
			consume(event);
			return;
		}

		if (
			keyCode === MEDIA_PAUSE ||
			keyCode === LEGACY_PAUSE ||
			name === "MediaPause"
		) {
			video.pause();
			logAction("pause", keyCode, name);
			consume(event);
			return;
		}

		if (keyCode === VOLUME_MUTE || name === "AudioVolumeMute") {
			video.muted = !video.muted;
			logAction(
				video.muted ? "mute" : "unmute",
				keyCode,
				name
			);
			consume(event);
		}
	}

	if (window.__chromiumHboMaxMediaKeysInstalled) {
		return;
	}
	window.__chromiumHboMaxMediaKeysInstalled = true;
	window.addEventListener("keydown", handleKey, true);
	console.log("[HBO Max Media Keys] installed r3 native-volume");
}());
