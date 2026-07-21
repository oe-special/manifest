(function () {
    "use strict";

    if (window.__chromiumRtlPlusMediaKeys20260721R1) {
        return;
    }
    window.__chromiumRtlPlusMediaKeys20260721R1 = true;

    var KEY_BACKSPACE = 0x08;
    var KEY_ESCAPE = 0x1B;
    var BROWSER_BACK = 0xA6;
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
    var SEEK_SECONDS = 10;
    var VOLUME_STEP = 0.10;

    function playerPage() {
        return window.top === window &&
            window.location.hostname === "plus.rtl.de" &&
            (/\/video\//.test(window.location.pathname) || livePlayerPage());
    }

    function livePlayerPage() {
        return window.top === window &&
            window.location.hostname === "plus.rtl.de" &&
            /\/live\/?$/.test(window.location.pathname);
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
        for (var index = 0; index < videos.length; index++) {
            var video = videos[index];
            if (video.ended) {
                continue;
            }
            var rect = video.getBoundingClientRect();
            var score = Math.max(0, rect.width * rect.height);
            if (video.readyState >= 2) {
                score += 1000000000;
            }
            if (!video.paused) {
                score += 100000000;
            }
            if (score > bestScore) {
                best = video;
                bestScore = score;
            }
        }
        return best;
    }

    function logAction(action, event, detail) {
        console.log(
            "[RTL+ Media Keys] " + action +
            " key=" + (event.key || event.code || "") +
            " keyCode=" + (event.which || event.keyCode) +
            (detail ? " " + detail : "")
        );
    }

    function play(video) {
        var result = video.play();
        if (result && result.catch) {
            result.catch(function (error) {
                console.log(
                    "[RTL+ Media Keys] play rejected: " +
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
        var target = Math.max(0, video.currentTime + offset);
        if (video.seekable && video.seekable.length) {
            target = Math.max(
                video.seekable.start(0),
                Math.min(video.seekable.end(video.seekable.length - 1), target)
            );
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

    function closePlayer() {
        window.history.back();
        return "history";
    }

    function handleKey(event) {
        if (!playerPage()) {
            return;
        }

        var code = event.which || event.keyCode;
        var name = event.key || event.code || "";
        var video = currentVideo();
        var live = livePlayerPage();
        var value;

        if (
            code === KEY_BACKSPACE || code === BROWSER_BACK || code === KEY_ESCAPE ||
            name === "Backspace" || name === "BrowserBack" || name === "Escape"
        ) {
            if (!event.repeat) {
                logAction("exit/close", event, "via=" + closePlayer());
            }
            consume(event);
            return;
        }

        if (!live && (code === MEDIA_STOP || name === "MediaStop")) {
            if (!event.repeat) {
                logAction("stop/close", event, "via=" + closePlayer());
            }
            consume(event);
            return;
        }

        if (live && (
            code === MEDIA_TRACK_NEXT || code === MEDIA_TRACK_PREVIOUS ||
            code === MEDIA_STOP || code === MEDIA_PLAY_PAUSE ||
            code === MEDIA_REWIND || code === MEDIA_FAST_FORWARD ||
            code === MEDIA_PLAY || code === MEDIA_PAUSE ||
            code === LEGACY_PLAY || code === LEGACY_PAUSE ||
            name === "MediaTrackNext" || name === "MediaTrackPrevious" ||
            name === "MediaStop" || name === "MediaPlayPause" ||
            name === "MediaPlay" || name === "MediaPause" ||
            name === "MediaFastForward" || name === "MediaRewind" ||
            name === "Play"
        )) {
            if (!event.repeat) {
                logAction("live-key-ignored", event);
            }
            consume(event);
            return;
        }

        if (!video) {
            return;
        }

        if (
            code === MEDIA_TRACK_NEXT || code === MEDIA_FAST_FORWARD ||
            name === "MediaTrackNext" || name === "MediaFastForward"
        ) {
            value = seek(video, SEEK_SECONDS);
            logAction("seek-forward", event, "time=" + value);
            consume(event);
            return;
        }

        if (
            code === MEDIA_TRACK_PREVIOUS || code === MEDIA_REWIND ||
            name === "MediaTrackPrevious" || name === "MediaRewind"
        ) {
            value = seek(video, -SEEK_SECONDS);
            logAction("seek-backward", event, "time=" + value);
            consume(event);
            return;
        }

        if (
            code === MEDIA_PLAY_PAUSE || code === MEDIA_PLAY || code === LEGACY_PLAY ||
            name === "MediaPlay" || name === "MediaPlayPause" || name === "Play"
        ) {
            if (!event.repeat) {
                value = togglePlayback(video);
                logAction(value, event);
            }
            consume(event);
            return;
        }

        if (
            code === MEDIA_PAUSE || code === LEGACY_PAUSE ||
            name === "MediaPause"
        ) {
            video.pause();
            logAction("pause", event);
            consume(event);
            return;
        }

        if (code === VOLUME_UP || name === "AudioVolumeUp") {
            value = changeVolume(video, VOLUME_STEP);
            logAction("volume-up", event, "volume=" + value);
            consume(event);
            return;
        }

        if (code === VOLUME_DOWN || name === "AudioVolumeDown") {
            value = changeVolume(video, -VOLUME_STEP);
            logAction("volume-down", event, "volume=" + value);
            consume(event);
            return;
        }

        if (code === VOLUME_MUTE || name === "AudioVolumeMute") {
            video.muted = !video.muted;
            logAction(video.muted ? "mute" : "unmute", event);
            consume(event);
        }
    }

    window.addEventListener("keydown", handleKey, true);
    console.log("[RTL+ Media Keys] installed 20260721-r1");
}());
