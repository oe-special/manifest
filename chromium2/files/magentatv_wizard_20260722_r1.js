(function () {
    "use strict";

    var host = window.location.hostname.toLowerCase();
    if (
        window.top !== window ||
        (host !== "www.magenta.tv" && host !== "magenta.tv" &&
            host !== "web.magentatv.de" && host !== "web2.magentatv.de") ||
        window.__chromiumMagentaTvWizard20260722R1
    ) {
        return;
    }
    window.__chromiumMagentaTvWizard20260722R1 = true;

    var FOCUS_CLASS = "chromium-magentatv-wizard-focus";
    var currentNext = null;
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

    function wizard() {
        var next = document.getElementById("PAGINATION-NEXT");
        var dialog = next && next.closest("dialog");
        return visible(next) && visible(dialog) ? {dialog: dialog, next: next} : null;
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

    function syncWizard() {
        syncTimer = 0;
        var state = wizard();
        if (!state) {
            currentNext = null;
            return;
        }
        if (state.next !== currentNext) {
            currentNext = state.next;
            focusElement(state.next);
            console.log("[MagentaTV Wizard] focused next");
        }
    }

    function scheduleSync() {
        if (syncTimer) {
            return;
        }
        syncTimer = window.setTimeout(syncWizard, 80);
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function onKeyDown(event) {
        var state = wizard();
        if (!state) {
            return;
        }
        var key = event.key || "";
        var code = event.which || event.keyCode;
        var active = document.activeElement;
        var handled = false;

        if (key === "Enter" || code === 13) {
            var activeButton = state.dialog.contains(active) && active.matches &&
                active.matches("button,[role='button']") &&
                !/^PAGINATION-DOTS-/.test(active.id || "") && active.id !== "HEADER-LOGO" ?
                active : state.next;
            activeButton.click();
            handled = true;
            window.setTimeout(scheduleSync, 100);
        } else if (
            key === "ArrowDown" || key === "ArrowRight" ||
            code === 40 || code === 39
        ) {
            handled = focusElement(state.next);
        } else if (
            key === "Escape" || key === "BrowserBack" ||
            code === 27 || code === 166
        ) {
            var close = state.dialog.querySelector("#OVERLAY-CLOSE,[aria-label*='schlie' i]");
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
    style.id = "chromium-magentatv-wizard-style";
    style.textContent = "." + FOCUS_CLASS + "{" +
        "outline:5px solid #00b7ff!important;outline-offset:4px!important;" +
        "box-shadow:0 0 0 4px rgba(0,0,0,.82)!important;}";
    (document.head || document.documentElement).appendChild(style);

    window.addEventListener("keydown", onKeyDown, true);
    new MutationObserver(scheduleSync).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    scheduleSync();
    console.log("[MagentaTV Wizard] installed 20260722-r1");
}());
