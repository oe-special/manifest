(function () {
    "use strict";

    var VOLUME_MUTE = 0xAD;
    var VOLUME_DOWN = 0xAE;
    var VOLUME_UP = 0xAF;
    var BROWSER_BACK = 0xA6;
    var BROWSER_STOP = 0xA9;
    var MEDIA_STOP = 0xB2;
    var MEDIA_TRACK_NEXT = 0xB0;
    var MEDIA_TRACK_PREVIOUS = 0xB1;
    var MEDIA_PLAY_PAUSE = 0xB3;
    var MEDIA_PLAY = 0xE9;
    var LEGACY_FORWARD = 0xE4;
    var LEGACY_BACKWARD = 0xE3;
    var BACKSPACE = 0x08;
    var ESCAPE = 0x1B;
    var VOLUME_STEP = 0.10;
    var SEEK_STEP = 15;
    var AUDIO_ACTIVE_CLASS = "chromium-pluto-audio-active";
    var trackedVideos = new WeakMap();

    function keyName(event) {
        return event && (event.key || event.code) || "";
    }

    function visible(element) {
        if (!element || !element.isConnected) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var style = window.getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 &&
            style.display !== "none" && style.visibility !== "hidden";
    }

    function currentVideo() {
        var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
        var best = null;
        var bestScore = -1;
        videos.forEach(function (video) {
            if (!visible(video) || video.ended) {
                return;
            }
            var rect = video.getBoundingClientRect();
            var score = rect.width * rect.height;
            if (!video.paused) {
                score += window.innerWidth * window.innerHeight;
            }
            if (score > bestScore) {
                best = video;
                bestScore = score;
            }
        });
        return best;
    }

    function updateMuteOverlay() {
        var video = currentVideo();
        document.documentElement.classList.toggle(
            AUDIO_ACTIVE_CLASS,
            Boolean(video && !video.muted && video.volume > 0)
        );
    }

    function autoUnmuteVideo(video, reason) {
        var state = trackedVideos.get(video);
        if (!state || state.autoUnmuted || video.paused || video.ended) {
            updateMuteOverlay();
            return;
        }
        state.autoUnmuted = true;
        if (video.volume <= 0) {
            video.volume = 1;
        }
        if (video.muted) {
            video.muted = false;
        }
        updateMuteOverlay();
        console.log("[PlutoTV Media Keys] auto-unmute reason=" + reason +
            " muted=" + video.muted + " volume=" + video.volume);
    }

    function trackVideo(video) {
        if (trackedVideos.has(video)) {
            return;
        }
        var state = {autoUnmuted: false};
        trackedVideos.set(video, state);
        ["emptied", "loadstart"].forEach(function (eventName) {
            video.addEventListener(eventName, function () {
                state.autoUnmuted = false;
                updateMuteOverlay();
            });
        });
        video.addEventListener("playing", function () {
            autoUnmuteVideo(video, "playing");
        });
        video.addEventListener("volumechange", updateMuteOverlay);
        if (!video.paused && !video.ended) {
            autoUnmuteVideo(video, "install");
        }
    }

    function scanVideos() {
        Array.prototype.slice.call(document.querySelectorAll("video"))
            .forEach(trackVideo);
        updateMuteOverlay();
    }

    function trackAddedVideos(records) {
        records.forEach(function (record) {
            Array.prototype.slice.call(record.addedNodes || []).forEach(function (node) {
                if (!node || node.nodeType !== 1) {
                    return;
                }
                if (node.tagName === "VIDEO") {
                    trackVideo(node);
                }
                if (node.querySelectorAll) {
                    Array.prototype.slice.call(node.querySelectorAll("video"))
                        .forEach(trackVideo);
                }
            });
        });
        updateMuteOverlay();
    }

    function largeVideoIsVisible() {
        var video = currentVideo();
        if (!video) {
            return false;
        }
        var rect = video.getBoundingClientRect();
        return rect.width * rect.height >=
            window.innerWidth * window.innerHeight * 0.45;
    }

    function playerIsExpanded() {
        return Boolean(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.webkitIsFullScreen ||
            visible(document.querySelector(".fullbrowser")) ||
            largeVideoIsVisible());
    }

    function isVodPlayer(video) {
        if (!video) {
            return false;
        }
        if (document.querySelector(
                ".on-demand-movie-details-modal,.on-demand-series-details-modal"
        )) {
            return true;
        }
        return Number.isFinite(video.duration) && video.duration > 0;
    }

    function visibleFullbrowserButton() {
        var buttons = Array.prototype.slice.call(
            document.querySelectorAll(".fullbrowser-btn-atc")
        );
        return buttons.filter(visible)[0] || null;
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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

    function seekVideo(video, offset) {
        var minimum = 0;
        var maximum = Number.isFinite(video.duration) ? video.duration : Infinity;
        if (video.seekable && video.seekable.length) {
            minimum = video.seekable.start(0);
            maximum = video.seekable.end(video.seekable.length - 1);
        }
        var target = Math.max(minimum, Math.min(maximum, video.currentTime + offset));
        video.currentTime = target;
        return Math.round(target);
    }

    function togglePlayback(video) {
        if (video.paused || video.ended) {
            if (video.ended) {
                video.currentTime = 0;
            }
            var promise = video.play();
            if (promise && promise.catch) {
                promise.catch(function (error) {
                    console.log("[PlutoTV Media Keys] play failed " + error);
                });
            }
            return "play";
        }
        video.pause();
        return "pause";
    }

    function logAction(action, event, detail) {
        console.log(
            "[PlutoTV Media Keys] " + action +
                " key=" + keyName(event) +
                " keyCode=" + (event.which || event.keyCode) +
                (detail ? " " + detail : "")
        );
    }

    function leaveExpandedPlayer(event) {
        var button = visibleFullbrowserButton();
        if (button) {
            button.click();
            logAction("exit-fullbrowser", event, "method=button");
            return true;
        }
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen();
            logAction("exit-fullbrowser", event, "method=fullscreen-api");
            return true;
        }
        if (document.webkitExitFullscreen &&
                (document.webkitFullscreenElement || document.webkitIsFullScreen)) {
            document.webkitExitFullscreen();
            logAction("exit-fullbrowser", event, "method=webkit-fullscreen-api");
            return true;
        }
        logAction("exit-fullbrowser-failed", event, "button=missing");
        return false;
    }

    function handleKey(event) {
        var code = event.which || event.keyCode;
        var name = keyName(event);
        var isExit = code === BACKSPACE || code === ESCAPE ||
            code === BROWSER_BACK || name === "Backspace" ||
            name === "Escape" || name === "BrowserBack";
        var isStop = code === BROWSER_STOP || code === MEDIA_STOP ||
            name === "MediaStop";

        if ((isExit || isStop) && playerIsExpanded()) {
            if (!event.repeat) {
                leaveExpandedPlayer(event);
            }
            consume(event);
            return;
        }

        var isForward = code === MEDIA_TRACK_NEXT || code === LEGACY_FORWARD ||
            name === "MediaTrackNext" || name === "MediaFastForward";
        var isBackward = code === MEDIA_TRACK_PREVIOUS || code === LEGACY_BACKWARD ||
            name === "MediaTrackPrevious" || name === "MediaRewind";
        var isPlayPause = code === MEDIA_PLAY_PAUSE || code === MEDIA_PLAY ||
            code === 0x13 || code === 0xFA || name === "MediaPlayPause" ||
            name === "MediaPlay" || name === "MediaPause";

        if ((isForward || isBackward || isPlayPause) && playerIsExpanded()) {
            var playerVideo = currentVideo();
            if (!playerVideo) {
                return;
            }
            if (!isVodPlayer(playerVideo)) {
                logAction("ignored-live-action", event,
                    "duration=" + playerVideo.duration);
                consume(event);
                return;
            }
            if (isPlayPause) {
                if (!event.repeat) {
                    logAction(togglePlayback(playerVideo), event,
                        "position=" + Math.round(playerVideo.currentTime));
                }
                consume(event);
                return;
            }
            logAction(isForward ? "seek-forward" : "seek-backward", event,
                "seconds=" + SEEK_STEP + " position=" +
                seekVideo(playerVideo, isForward ? SEEK_STEP : -SEEK_STEP));
            consume(event);
            return;
        }

        var isMute = code === VOLUME_MUTE || name === "AudioVolumeMute";
        var isDown = code === VOLUME_DOWN || name === "AudioVolumeDown";
        var isUp = code === VOLUME_UP || name === "AudioVolumeUp";
        if (!isMute && !isDown && !isUp) {
            return;
        }

        var video = currentVideo();
        if (!video) {
            return;
        }

        if (isMute) {
            if (!event.repeat) {
                video.muted = !video.muted;
                logAction(video.muted ? "mute" : "unmute", event);
            }
            consume(event);
            return;
        }
        if (isDown) {
            logAction("volume-down", event, "volume=" + changeVolume(video, -VOLUME_STEP));
            consume(event);
            return;
        }
        logAction("volume-up", event, "volume=" + changeVolume(video, VOLUME_STEP));
        consume(event);
    }

    if (window.__chromiumPlutoTvMediaKeysInstalled) {
        return;
    }
    window.__chromiumPlutoTvMediaKeysInstalled = true;
    var style = document.createElement("style");
    style.textContent =
        "html." + AUDIO_ACTIVE_CLASS + " .unmute-btn-atc," +
        "html." + AUDIO_ACTIVE_CLASS + " button[class*='unmuteIconOnlyButton']{" +
        "opacity:0!important;pointer-events:none!important;" +
        "}";
    (document.head || document.documentElement).appendChild(style);
    window.addEventListener("keydown", handleKey, true);
    new MutationObserver(trackAddedVideos).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    scanVideos();
    console.log("[PlutoTV Media Keys] installed 20260722-r4");
}());
