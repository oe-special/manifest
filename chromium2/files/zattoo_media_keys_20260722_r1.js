(function () {
	"use strict";

	if (window.__chromiumZattooMediaKeysInstalled) {
		return;
	}
	window.__chromiumZattooMediaKeysInstalled = true;

	var KEY_BACKSPACE = 0x08;
	var KEY_ESCAPE = 0x1B;
	var BROWSER_BACK = 0xA6;
	var BROWSER_STOP = 0xA9;
	var VOLUME_MUTE = 0xAD;
	var VOLUME_DOWN = 0xAE;
	var VOLUME_UP = 0xAF;
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
	var SEEK_STEP = 15;
	var VOLUME_STEP = 0.10;
	var EXPANDED_CLASS = "chromium-zattoo-player-expanded";
	var suppressExpandUntil = 0;

	function keyName(event) {
		return event && (event.key || event.code) || "";
	}

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function visible(element) {
		if (!element || !element.isConnected ||
			element.closest("[hidden],[aria-hidden='true']")) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return rect.width > 8 && rect.height > 8 &&
			style.display !== "none" && style.visibility !== "hidden";
	}

	function currentVideo() {
		var video = document.querySelector("video#player_video_node");
		return video && visible(video) && !video.ended && video.currentSrc ? video : null;
	}

	function expandPlayer(reason) {
		if (Date.now() < suppressExpandUntil || !currentVideo()) {
			return false;
		}
		if (!document.documentElement.classList.contains(EXPANDED_CLASS)) {
			document.documentElement.classList.add(EXPANDED_CLASS);
			console.log("[Zattoo Media Keys] expand reason=" + reason);
		}
		return true;
	}

	function collapsePlayer(reason) {
		if (document.documentElement.classList.contains(EXPANDED_CLASS)) {
			document.documentElement.classList.remove(EXPANDED_CLASS);
			console.log("[Zattoo Media Keys] collapse reason=" + reason);
		}
	}

	function monitorPlayer() {
		if (currentVideo() && Date.now() >= suppressExpandUntil) {
			expandPlayer("monitor");
		} else if (!currentVideo()) {
			collapsePlayer("inactive");
		}
	}

	function attachVideo(video) {
		if (!video || video.__chromiumZattooTracked) {
			return;
		}
		video.__chromiumZattooTracked = true;
		["loadedmetadata", "canplay", "playing"].forEach(function (name) {
			video.addEventListener(name, function () {
				expandPlayer(name);
			});
		});
		["ended", "emptied"].forEach(function (name) {
			video.addEventListener(name, function () {
				window.setTimeout(monitorPlayer, 50);
			});
		});
	}

	function scanVideos() {
		Array.prototype.forEach.call(
			document.querySelectorAll("video#player_video_node"),
			attachVideo
		);
		monitorPlayer();
	}

	function play(video) {
		var result = video.play();
		if (result && result.catch) {
			result.catch(function (error) {
				console.log("[Zattoo Media Keys] play rejected " + error);
			});
		}
		expandPlayer("play");
	}

	function togglePlayback(video) {
		if (video.paused || video.ended) {
			if (video.ended && Number.isFinite(video.duration)) {
				video.currentTime = 0;
			}
			play(video);
			return "play";
		}
		video.pause();
		return "pause";
	}

	function seek(video, offset) {
		var wasPlaying = !video.paused && !video.ended;
		var minimum = 0;
		var maximum = video.duration;
		if (video.seekable && video.seekable.length) {
			minimum = video.seekable.start(0);
			maximum = video.seekable.end(video.seekable.length - 1);
		}
		var target = Math.max(minimum, Math.min(maximum, video.currentTime + offset));
		video.currentTime = target;
		if (wasPlaying) {
			window.setTimeout(function () {
				if (video.paused && !video.ended) {
					play(video);
				}
			}, 120);
		}
		return Math.round(target);
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

	function closePlayer(reason, video) {
		suppressExpandUntil = Date.now() + 10000;
		collapsePlayer(reason);
		if (video) {
			video.pause();
			video.removeAttribute("src");
			try {
				video.load();
			} catch (error) {
				console.log("[Zattoo Media Keys] player detach failed " + error);
			}
		}
		window.location.replace(window.location.origin + window.location.pathname);
	}

	function logAction(action, event, detail) {
		console.log(
			"[Zattoo Media Keys] " + action +
			" key=" + keyName(event) +
			" keyCode=" + (event.which || event.keyCode) +
			(detail ? " " + detail : "")
		);
	}

	function handleKey(event) {
		var video = currentVideo();
		if (!video) {
			return;
		}
		var code = event.which || event.keyCode;
		var name = keyName(event);
		var isExit = code === KEY_BACKSPACE || code === KEY_ESCAPE ||
			code === BROWSER_BACK || name === "Backspace" ||
			name === "Escape" || name === "BrowserBack";
		var isStop = code === BROWSER_STOP || code === MEDIA_STOP ||
			name === "MediaStop";

		if (isExit || isStop) {
			if (!event.repeat) {
				closePlayer(isStop ? "stop" : "exit", video);
				logAction(isStop ? "stop/close" : "exit/close", event);
			}
			consume(event);
			return;
		}

		var forward = code === MEDIA_TRACK_NEXT || code === MEDIA_FAST_FORWARD ||
			name === "MediaTrackNext" || name === "MediaFastForward";
		var backward = code === MEDIA_TRACK_PREVIOUS || code === MEDIA_REWIND ||
			name === "MediaTrackPrevious" || name === "MediaRewind";
		if (forward || backward) {
			if (Number.isFinite(video.duration) && video.duration > 0) {
				logAction(forward ? "seek-forward" : "seek-backward", event,
					"position=" + seek(video, forward ? SEEK_STEP : -SEEK_STEP));
			} else {
				logAction("ignore-live-seek", event);
			}
			consume(event);
			return;
		}

		var playPause = code === MEDIA_PLAY_PAUSE || name === "MediaPlayPause";
		var playOnly = code === MEDIA_PLAY || code === LEGACY_PLAY ||
			name === "MediaPlay" || name === "Play";
		var pauseOnly = code === MEDIA_PAUSE || code === LEGACY_PAUSE ||
			name === "MediaPause";
		if (playPause || playOnly || pauseOnly) {
			if (!event.repeat) {
				if (pauseOnly) {
					video.pause();
					logAction("pause", event);
				} else if (playOnly) {
					play(video);
					logAction("play", event);
				} else {
					logAction(togglePlayback(video), event);
				}
			}
			consume(event);
			return;
		}

		var mute = code === VOLUME_MUTE || name === "AudioVolumeMute";
		var down = code === VOLUME_DOWN || name === "AudioVolumeDown";
		var up = code === VOLUME_UP || name === "AudioVolumeUp";
		if (!mute && !down && !up) {
			return;
		}
		if (mute) {
			if (!event.repeat) {
				video.muted = !video.muted;
				if (!video.muted && video.volume <= 0) {
					video.volume = 0.5;
				}
				logAction(video.muted ? "mute" : "unmute", event);
			}
		} else if (down) {
			logAction("volume-down", event,
				"volume=" + changeVolume(video, -VOLUME_STEP));
		} else {
			logAction("volume-up", event,
				"volume=" + changeVolume(video, VOLUME_STEP));
		}
		consume(event);
	}

	var style = document.createElement("style");
	style.id = "chromium-zattoo-player-style";
	style.textContent =
		"html." + EXPANDED_CLASS + ",html." + EXPANDED_CLASS + " body{" +
			"overflow:hidden!important;" +
		"}" +
		"html." + EXPANDED_CLASS + " [data-soul='MEDIA']{" +
			"position:fixed!important;inset:0!important;transform:none!important;" +
			"width:100vw!important;height:100vh!important;" +
			"max-width:none!important;max-height:none!important;margin:0!important;" +
			"background:#000!important;z-index:2147483000!important;" +
		"}" +
		"html." + EXPANDED_CLASS + " [data-soul='MEDIA']>div," +
		"html." + EXPANDED_CLASS + " [data-soul='MEDIA']>div>div," +
		"html." + EXPANDED_CLASS + " #fullscreen_container," +
		"html." + EXPANDED_CLASS + " #fullscreen_container>*," +
		"html." + EXPANDED_CLASS + " #player_container," +
		"html." + EXPANDED_CLASS + " #ima_player_container," +
		"html." + EXPANDED_CLASS + " #player_video_node," +
		"html." + EXPANDED_CLASS + " [data-soul='OSD']{" +
			"inset:0!important;transform:none!important;" +
			"width:100%!important;height:100%!important;" +
			"max-width:none!important;max-height:none!important;margin:0!important;" +
		"}" +
		"html." + EXPANDED_CLASS + " #player_video_node{" +
			"object-fit:contain!important;background:#000!important;" +
		"}";
	(document.head || document.documentElement).appendChild(style);

	window.addEventListener("keydown", handleKey, true);
	new MutationObserver(scanVideos).observe(document.documentElement, {
		childList: true,
		subtree: true
	});
	window.setInterval(scanVideos, 350);
	scanVideos();
	console.log("[Zattoo Media Keys] installed r1 auto-fullscreen");
})();
