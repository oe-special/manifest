(function () {
    "use strict";

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
    var LEGACY_PLAY_PAUSE = 0xFA;
    var LEGACY_PAUSE = 0x13;
    var SEEK_SECONDS = 10;
    var VOLUME_STEP = 0.10;

    function keyName(event) {
        return event && (event.key || event.code) || "";
    }

    function visible(element) {
        if (!element) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var style = window.getComputedStyle(element);
        return rect.width > 1 && rect.height > 1 &&
            style.display !== "none" && style.visibility !== "hidden";
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
            if (!visible(videos[i]) || videos[i].ended) {
                continue;
            }
            var rect = videos[i].getBoundingClientRect();
            var score = rect.width * rect.height;
            if (!videos[i].paused) {
                score += window.innerWidth * window.innerHeight;
            }
            if (score > bestScore) {
                best = videos[i];
                bestScore = score;
            }
        }
        return best;
    }

    function playerContext() {
        var video = currentVideo();
        if (!video) {
            return null;
        }
        var rect = video.getBoundingClientRect();
        var largeVideo = rect.width * rect.height >
            window.innerWidth * window.innerHeight * 0.35;
        var playerRoot = video.closest("[role='application']");
        if (!/^\/streamen-tv\//i.test(window.location.pathname) &&
                !(playerRoot && largeVideo)) {
            return null;
        }
        return {video: video, root: playerRoot || document};
    }

    function liveTvPlayer() {
        return visible(document.getElementById("PLAYER-NEXT-CHANNEL")) ||
            visible(document.getElementById("PLAYER-PREVIOUS-CHANNEL"));
    }

    function logAction(action, event, detail) {
        console.log(
            "[MagentaTV Media Keys] " + action +
                " key=" + keyName(event) +
                " keyCode=" + (event.which || event.keyCode) +
                (detail ? " " + detail : "")
        );
    }

    function clickPlayerButton(id) {
        var button = document.getElementById(id);
        if (!visible(button)) {
            return false;
        }
        button.click();
        return true;
    }

    function play(video) {
        var result = video.play();
        if (result && result.catch) {
            result.catch(function (error) {
                console.log(
                    "[MagentaTV Media Keys] play rejected: " +
                        (error && error.message || error)
                );
            });
        }
    }

    function togglePlayback(video) {
        var wasPaused = video.paused || video.ended;
        if (clickPlayerButton("PLAYER-PLAY")) {
            return wasPaused ? "play" : "pause";
        }
        if (video.paused || video.ended) {
            play(video);
            return "play";
        }
        video.pause();
        return "pause";
    }

    function seek(video, offset, buttonId) {
        if (clickPlayerButton(buttonId)) {
            return "via=" + buttonId;
        }
        var target = video.currentTime + offset;
        var ranges = video.seekable;
        var i;

        if (ranges && ranges.length) {
            var rangeIndex = ranges.length - 1;
            for (i = 0; i < ranges.length; i += 1) {
                if (video.currentTime >= ranges.start(i) &&
                        video.currentTime <= ranges.end(i)) {
                    rangeIndex = i;
                    break;
                }
            }
            var start = ranges.start(rangeIndex);
            var end = ranges.end(rangeIndex);
            target = Math.max(start, Math.min(end, target));
        } else {
            target = Math.max(0, target);
            if (isFinite(video.duration)) {
                target = Math.min(video.duration, target);
            }
        }

        video.currentTime = target;
        return "time=" + (Math.round(target * 10) / 10);
    }

    function closePlayer() {
        var close = document.getElementById("PLAYER-CLOSE");
        if (visible(close)) {
            close.click();
            return "PLAYER-CLOSE";
        }
        window.history.back();
        return "history";
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
        var context = playerContext();
        if (!context) {
            return;
        }

        var code = event.which || event.keyCode;
        var name = keyName(event);
        var video = context.video;
        var value;

        if (code === VOLUME_MUTE || name === "AudioVolumeMute") {
            if (!event.repeat) {
                if (!clickPlayerButton("PLAYER-VOLUME")) {
                    video.muted = !video.muted;
                }
                logAction("mute-toggle", event);
            }
            consume(event);
            return;
        }

        if (code === VOLUME_DOWN || name === "AudioVolumeDown") {
            value = changeVolume(video, -VOLUME_STEP);
            logAction("volume-down", event, "volume=" + value);
            consume(event);
            return;
        }

        if (code === VOLUME_UP || name === "AudioVolumeUp") {
            value = changeVolume(video, VOLUME_STEP);
            logAction("volume-up", event, "volume=" + value);
            consume(event);
            return;
        }

        if (code === MEDIA_STOP || code === BROWSER_STOP ||
                name === "MediaStop") {
            if (!event.repeat) {
                value = closePlayer();
                logAction("stop/close", event, "via=" + value);
            }
            consume(event);
            return;
        }

        if (code === MEDIA_TRACK_NEXT || code === MEDIA_FAST_FORWARD ||
                name === "MediaTrackNext" || name === "MediaFastForward") {
            if (liveTvPlayer()) {
                logAction("ignore-live-forward", event);
                consume(event);
                return;
            }
            value = seek(video, SEEK_SECONDS, "PLAYER-SKIP-FORWARD");
            logAction("seek-forward", event, value);
            consume(event);
            return;
        }

        if (code === MEDIA_TRACK_PREVIOUS || code === MEDIA_REWIND ||
                name === "MediaTrackPrevious" || name === "MediaRewind") {
            if (liveTvPlayer()) {
                logAction("ignore-live-backward", event);
                consume(event);
                return;
            }
            value = seek(video, -SEEK_SECONDS, "PLAYER-SKIP-BACKWARD");
            logAction("seek-backward", event, value);
            consume(event);
            return;
        }

        if (code === MEDIA_PLAY_PAUSE || code === MEDIA_PLAY ||
                code === LEGACY_PLAY_PAUSE || name === "MediaPlay" ||
                name === "MediaPlayPause") {
            if (!event.repeat) {
                value = togglePlayback(video);
                logAction(value, event);
            }
            consume(event);
            return;
        }

        if (code === MEDIA_PAUSE || code === LEGACY_PAUSE ||
                name === "MediaPause") {
            if (!event.repeat) {
                if (!video.paused && !clickPlayerButton("PLAYER-PLAY")) {
                    video.pause();
                }
                logAction("pause", event);
            }
            consume(event);
        }
    }

    if (window.__chromiumMagentaTvMediaKeysInstalled) {
        return;
    }
    window.__chromiumMagentaTvMediaKeysInstalled = true;
    window.addEventListener("keydown", handleKey, true);
    console.log("[MagentaTV Media Keys] installed 20260722-r1");
}());
