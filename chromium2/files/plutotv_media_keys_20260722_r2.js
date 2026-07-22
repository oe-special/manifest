(function () {
    "use strict";

    var VOLUME_MUTE = 0xAD;
    var VOLUME_DOWN = 0xAE;
    var VOLUME_UP = 0xAF;
    var BROWSER_BACK = 0xA6;
    var BROWSER_STOP = 0xA9;
    var MEDIA_STOP = 0xB2;
    var BACKSPACE = 0x08;
    var ESCAPE = 0x1B;
    var VOLUME_STEP = 0.10;

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
    window.addEventListener("keydown", handleKey, true);
    console.log("[PlutoTV Media Keys] installed 20260722-r2");
}());
