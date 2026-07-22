(function () {
    "use strict";

    var host = window.location.hostname.toLowerCase();
    if (
        window.top !== window ||
        (host !== "www.magenta.tv" && host !== "magenta.tv" &&
            host !== "web.magentatv.de" && host !== "web2.magentatv.de") ||
        window.__chromiumMagentaTvInfoOverlay20260722R1
    ) {
        return;
    }
    window.__chromiumMagentaTvInfoOverlay20260722R1 = true;

    var FOCUS_CLASS = "chromium-magentatv-info-focus";
    var currentDialog = null;
    var syncTimer = 0;

    function visible(element) {
        if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var css = window.getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 && css.display !== "none" &&
            css.visibility !== "hidden" && parseFloat(css.opacity || "1") > 0.01;
    }

    function overlay() {
        var checkbox = document.querySelector("button#BUTTON-BAR[role='checkbox']");
        var dialog = checkbox && checkbox.closest("dialog");
        var action = dialog && dialog.querySelector("button#OVERLAY-BUTTON");
        return visible(dialog) && visible(checkbox) && visible(action) ? {
            dialog: dialog,
            checkbox: checkbox,
            action: action
        } : null;
    }

    function focusElement(element) {
        if (!element) {
            return false;
        }
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous && previous !== element) {
            previous.classList.remove(FOCUS_CLASS);
        }
        try {
            element.focus({preventScroll: true});
        } catch (error) {
            element.focus();
        }
        element.classList.add(FOCUS_CLASS);
        return true;
    }

    function syncOverlay() {
        syncTimer = 0;
        var state = overlay();
        if (!state) {
            currentDialog = null;
            return;
        }
        if (state.dialog !== currentDialog || !state.dialog.contains(document.activeElement)) {
            currentDialog = state.dialog;
            focusElement(state.checkbox);
            console.log("[MagentaTV Info Overlay] focused checkbox");
        }
    }

    function scheduleSync() {
        if (!syncTimer) {
            syncTimer = window.setTimeout(syncOverlay, 80);
        }
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function onKeyDown(event) {
        var state = overlay();
        if (!state) {
            return;
        }
        var key = event.key || "";
        var code = event.which || event.keyCode;
        var active = document.activeElement;
        var handled = false;

        if (key === "Enter" || code === 13) {
            if (active === state.action) {
                state.action.click();
            } else {
                state.checkbox.click();
                window.setTimeout(function () {
                    var updated = overlay();
                    if (updated) {
                        focusElement(updated.action);
                    }
                }, 80);
            }
            handled = true;
        } else if (
            key === "ArrowLeft" || key === "ArrowUp" ||
            code === 37 || code === 38
        ) {
            handled = focusElement(state.checkbox);
        } else if (
            key === "ArrowRight" || key === "ArrowDown" ||
            code === 39 || code === 40
        ) {
            handled = focusElement(state.action);
        } else if (
            key === "Escape" || key === "BrowserBack" ||
            code === 27 || code === 166
        ) {
            var close = state.dialog.querySelector("button#OVERLAY-CLOSE");
            if (visible(close)) {
                close.click();
                handled = true;
            }
        }

        if (handled) {
            consume(event);
        }
    }

    var style = document.createElement("style");
    style.id = "chromium-magentatv-info-overlay-style";
    style.textContent = "." + FOCUS_CLASS + "#BUTTON-BAR,." + FOCUS_CLASS +
        "#BUTTON-BAR:focus-visible{" +
        "outline:none!important;box-shadow:none!important;}" +
        "." + FOCUS_CLASS + "#BUTTON-BAR > i,." + FOCUS_CLASS +
        ":not(#BUTTON-BAR){" +
        "outline:5px solid #00b7ff!important;outline-offset:4px!important;" +
        "box-shadow:0 0 0 4px rgba(0,0,0,.82)!important;}";
    (document.head || document.documentElement).appendChild(style);

    window.addEventListener("keydown", onKeyDown, true);
    new MutationObserver(scheduleSync).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    scheduleSync();
    console.log("[MagentaTV Info Overlay] installed 20260722-r1");
}());
