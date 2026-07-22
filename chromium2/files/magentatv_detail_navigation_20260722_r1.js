(function () {
    "use strict";

    var host = window.location.hostname.toLowerCase();
    if (
        window.top !== window ||
        (host !== "www.magenta.tv" && host !== "magenta.tv" &&
            host !== "web.magentatv.de" && host !== "web2.magentatv.de") ||
        window.__chromiumMagentaTvDetailNavigation20260722R1
    ) {
        return;
    }
    window.__chromiumMagentaTvDetailNavigation20260722R1 = true;

    var GRID_ID = "TILE-PARAGRAPH-BUTTON";
    var FOCUS_CLASS = "chromium-magentatv-focus";
    var currentContainer = null;
    var syncTimer = 0;

    function visible(element) {
        if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var css = window.getComputedStyle(element);
        return rect.width > 80 && rect.height > 30 && css.display !== "none" &&
            css.visibility !== "hidden" && parseFloat(css.opacity || "1") > 0.01;
    }

    function actionContainer() {
        var container = document.getElementById("TILE-PARAGRAPH-BUTTON");
        if (!container || !visible(container)) {
            return null;
        }
        var actions = Array.prototype.slice.call(container.children).filter(function (element) {
            return visible(element) && element.matches("button,a[href],[role='button']");
        });
        return actions.length ? {container: container, actions: actions} : null;
    }

    function focusFirst(actions) {
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous && actions.indexOf(previous) === -1) {
            previous.classList.remove(FOCUS_CLASS);
        }
        actions.forEach(function (action, index) {
            action.setAttribute("tabindex", index === 0 ? "0" : "-1");
        });
        try {
            actions[0].focus({preventScroll: true});
        } catch (error) {
            actions[0].focus();
        }
        actions[0].classList.add(FOCUS_CLASS);
    }

    function syncActions() {
        syncTimer = 0;
        var state = actionContainer();
        if (!state) {
            currentContainer = null;
            return;
        }
        state.container.id = GRID_ID;
        state.container.setAttribute("role", "grid");
        state.actions.forEach(function (action) {
            action.setAttribute("role", "gridcell");
        });
        if (typeof window.__chromiumMagentaTvInvalidateRows === "function") {
            window.__chromiumMagentaTvInvalidateRows();
        }
        if (state.container !== currentContainer) {
            currentContainer = state.container;
            focusFirst(state.actions);
            console.log("[MagentaTV Detail Navigation] focused first action");
        }
    }

    function scheduleSync() {
        if (!syncTimer) {
            syncTimer = window.setTimeout(syncActions, 80);
        }
    }

    new MutationObserver(scheduleSync).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    scheduleSync();
    console.log("[MagentaTV Detail Navigation] installed 20260722-r1");
}());
