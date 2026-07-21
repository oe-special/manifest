(function () {
	"use strict";

	var VOLUME_MUTE = 0xAD;
	var VOLUME_DOWN = 0xAE;
	var VOLUME_UP = 0xAF;
	var MEDIA_TRACK_NEXT = 0xB0;
	var MEDIA_TRACK_PREVIOUS = 0xB1;
	var MEDIA_FAST_FORWARD = 0xE4;
	var MEDIA_REWIND = 0xE3;
	var SEEK_SECONDS = 10;
	var VOLUME_STEP = 0.10;

	function playerPage() {
		return /\/shows\/video\//i.test(window.location.pathname);
	}

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function currentVideo() {
		var videos = document.querySelectorAll("video");
		var best = null;
		var bestScore = -1;
		var i;
		for (i = 0; i < videos.length; i += 1) {
			if (videos[i].ended) {
				continue;
			}
			var rect = videos[i].getBoundingClientRect();
			var score = Math.max(0, rect.width * rect.height);
			if (videos[i].readyState >= 2) {
				score += 1000000000;
			}
			if (!videos[i].paused) {
				score += 100000000;
			}
			if (score > bestScore) {
				best = videos[i];
				bestScore = score;
			}
		}
		return best;
	}

	function logAction(action, event, detail) {
		console.log(
			"[Paramount+ Media Keys] " + action +
				" key=" + (event.key || event.code || "") +
				" keyCode=" + (event.which || event.keyCode) +
				(detail ? " " + detail : "")
		);
	}

	function seek(video, offset) {
		var target = Math.max(0, video.currentTime + offset);
		if (video.seekable && video.seekable.length) {
			var first = video.seekable.start(0);
			var last = video.seekable.end(video.seekable.length - 1);
			target = Math.max(first, Math.min(last, target));
		} else if (isFinite(video.duration)) {
			target = Math.min(video.duration, target);
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
		if (!playerPage()) {
			return;
		}
		var code = event.which || event.keyCode;
		var name = event.key || event.code || "";
		var video;
		var value;

		if (
			code === MEDIA_TRACK_NEXT ||
			code === MEDIA_FAST_FORWARD ||
			name === "MediaTrackNext" ||
			name === "MediaFastForward"
		) {
			video = currentVideo();
			if (video) {
				value = seek(video, SEEK_SECONDS);
				logAction("seek-forward", event, "time=" + value);
				consume(event);
			}
			return;
		}

		if (
			code === MEDIA_TRACK_PREVIOUS ||
			code === MEDIA_REWIND ||
			name === "MediaTrackPrevious" ||
			name === "MediaRewind"
		) {
			video = currentVideo();
			if (video) {
				value = seek(video, -SEEK_SECONDS);
				logAction("seek-backward", event, "time=" + value);
				consume(event);
			}
			return;
		}

		if (code === VOLUME_UP || name === "AudioVolumeUp") {
			video = currentVideo();
			if (video) {
				value = changeVolume(video, VOLUME_STEP);
				logAction("volume-up", event, "volume=" + value);
				consume(event);
			}
			return;
		}

		if (code === VOLUME_DOWN || name === "AudioVolumeDown") {
			video = currentVideo();
			if (video) {
				value = changeVolume(video, -VOLUME_STEP);
				logAction("volume-down", event, "volume=" + value);
				consume(event);
			}
			return;
		}

		if (code === VOLUME_MUTE || name === "AudioVolumeMute") {
			video = currentVideo();
			if (video) {
				video.muted = !video.muted;
				logAction(video.muted ? "mute" : "unmute", event);
				consume(event);
			}
		}
	}

	if (window.__chromiumParamountMediaKeysInstalled) {
		return;
	}
	window.__chromiumParamountMediaKeysInstalled = true;
	window.addEventListener("keydown", handleKey, true);
	console.log("[Paramount+ Media Keys] installed r1 volume-seek");
}());
