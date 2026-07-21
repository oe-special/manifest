(function () {
    "use strict";

    function fixInvalidScreenMetrics() {
        if (!window.screen || (screen.width > 1 && screen.height > 1)) {
            return;
        }
        var width = Math.max(1, window.innerWidth || 1280);
        var height = Math.max(1, window.innerHeight || 720);
        try {
            ["width", "availWidth"].forEach(function (name) {
                Object.defineProperty(window.screen, name, {
                    configurable: true,
                    enumerable: true,
                    get: function () { return width; }
                });
            });
            ["height", "availHeight"].forEach(function (name) {
                Object.defineProperty(window.screen, name, {
                    configurable: true,
                    enumerable: true,
                    get: function () { return height; }
                });
            });
        } catch (error) {
            // Native metrics stay unchanged when the Screen object is locked.
        }
    }

    fixInvalidScreenMetrics();

    if (window.__chromiumRcuPlugin) {
        return;
    }

    window.__chromiumRcuPlugin = {
        version: "1.0.4",
        date: "2026-07-21"
    };

    var selector = [
        "a[href]",
        "button",
        "input:not([type='hidden'])",
        "select",
        "textarea",
        "[tabindex]",
        "[role='button']",
        "[role='link']",
        "[role='menuitem']",
        "[role='option']",
        "[role='tab']",
        "[role='checkbox']",
        "[role='radio']",
        "[aria-controls]"
    ].join(",");

    var style = document.createElement("style");
    style.id = "chromium-rcu-style";
    style.textContent =
        ".chromium-rcu-focus," +
        ":focus-visible{" +
        "outline:4px solid #00b7ff!important;" +
        "outline-offset:3px!important;" +
        "box-shadow:0 0 0 3px rgba(0,0,0,.75)!important;" +
        "}";
    (document.head || document.documentElement).appendChild(style);

    function visible(element) {
        if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
            return false;
        }
        if (element.closest && element.closest("footer,[role='contentinfo']")) {
            return false;
        }
        var href = element.getAttribute && element.getAttribute("href") || "";
        if (/(?:^|\/)(?:agb|datenschutz|impressum|barrierefreiheit|privacy|terms|legal)(?:[\/?#]|$)/i.test(href)) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
            return false;
        }
        var css = window.getComputedStyle(element);
        return css.display !== "none" &&
            css.visibility !== "hidden" &&
            parseFloat(css.opacity || "1") > 0.01;
    }

    function activeModal() {
        var modalSelectors = [
            "#onetrust-pc-sdk",
            "#onetrust-banner-sdk",
            "[aria-modal='true']"
        ];
        for (var index = 0; index < modalSelectors.length; index++) {
            var elements = document.querySelectorAll(modalSelectors[index]);
            for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
                if (visible(elements[elementIndex])) {
                    return elements[elementIndex];
                }
            }
        }
        return null;
    }

    function candidates() {
        var root = activeModal() || document;
        return Array.prototype.filter.call(root.querySelectorAll(selector), visible);
    }

    function preferredConsentButton(items) {
        var root = activeModal();
        if (!root) {
            return null;
        }
        var preferredSelectors = [
            "#onetrust-accept-btn-handler",
            "#accept-recommended-btn-handler",
            "#save-preference-btn-handler"
        ];
        for (var index = 0; index < preferredSelectors.length; index++) {
            var preferred = root.querySelector(preferredSelectors[index]);
            if (preferred && visible(preferred) && items.indexOf(preferred) !== -1) {
                return preferred;
            }
        }
        var acceptWords = /(accept all|allow all|accept recommended|alle akzeptieren|alles akzeptieren|zustimmen)/i;
        for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
            var label = [
                items[itemIndex].getAttribute("aria-label") || "",
                items[itemIndex].innerText || "",
                items[itemIndex].textContent || ""
            ].join(" ");
            if (acceptWords.test(label)) {
                return items[itemIndex];
            }
        }
        return null;
    }

    function focusElement(element) {
        if (!element) {
            return false;
        }
        var previous = document.querySelector(".chromium-rcu-focus");
        if (previous) {
            previous.classList.remove("chromium-rcu-focus");
        }
        if (!element.matches("a[href],button,input,select,textarea,[tabindex]")) {
            element.setAttribute("tabindex", "-1");
        }
        try {
            element.focus({preventScroll: true});
        } catch (error) {
            element.focus();
        }
        element.classList.add("chromium-rcu-focus");
        try {
            element.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
        } catch (error) {
            element.scrollIntoView(false);
        }
        return true;
    }

    function currentElement(items) {
        var active = document.activeElement;
        if (active && items.indexOf(active) !== -1 && visible(active)) {
            return active;
        }
        if (!items.length) {
            return null;
        }
        var preferred = preferredConsentButton(items);
        if (preferred) {
            focusElement(preferred);
            return preferred;
        }
        items.sort(function (a, b) {
            var ar = a.getBoundingClientRect();
            var br = b.getBoundingClientRect();
            return (ar.top - br.top) || (ar.left - br.left);
        });
        focusElement(items[0]);
        return items[0];
    }

    function distance(from, to, direction) {
        var fx = from.left + from.width / 2;
        var fy = from.top + from.height / 2;
        var tx = to.left + to.width / 2;
        var ty = to.top + to.height / 2;
        var primary;
        var secondary;

        if (direction === "left") {
            primary = fx - tx;
            secondary = Math.abs(fy - ty);
        } else if (direction === "right") {
            primary = tx - fx;
            secondary = Math.abs(fy - ty);
        } else if (direction === "up") {
            primary = fy - ty;
            secondary = Math.abs(fx - tx);
        } else {
            primary = ty - fy;
            secondary = Math.abs(fx - tx);
        }

        if (primary <= 1) {
            return Number.POSITIVE_INFINITY;
        }
        return primary * 1000 + secondary * 10 + Math.sqrt(primary * primary + secondary * secondary);
    }

    function move(direction) {
        var items = candidates();
        var current = currentElement(items);
        if (!current) {
            return false;
        }
        var currentRect = current.getBoundingClientRect();
        var best = null;
        var bestScore = Number.POSITIVE_INFINITY;

        items.forEach(function (element) {
            if (element === current) {
                return;
            }
            var score = distance(currentRect, element.getBoundingClientRect(), direction);
            if (score < bestScore) {
                best = element;
                bestScore = score;
            }
        });
        return focusElement(best);
    }

    function activate() {
        var active = currentElement(candidates());
        if (!active) {
            return false;
        }
        if (active.tagName === "VIDEO") {
            active.paused ? active.play() : active.pause();
            return true;
        }
        active.click();
        return true;
    }

    function inVirtualKeyboard() {
        return Boolean(document.querySelector(".crkeyboard"));
    }

    function editable(element) {
        return Boolean(element && (
            element.isContentEditable ||
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT"
        ));
    }

    function onKeyDown(event) {
        if (
            window.top === window &&
            window.location.hostname === "plus.rtl.de" &&
            !/\/video\//.test(window.location.pathname) &&
            !activeModal()
        ) {
            return;
        }
        if (inVirtualKeyboard()) {
            return;
        }

        var code = event.keyCode || event.which;
        var handled = false;
        var active = document.activeElement;
        var modal = activeModal();

        if (!editable(active) || event.key.indexOf("Arrow") === 0) {
            if (event.key === "ArrowLeft" || code === 37) {
                handled = move("left") || Boolean(modal) || candidates().length > 0;
            } else if (event.key === "ArrowUp" || code === 38) {
                handled = move("up") || Boolean(modal) || candidates().length > 0;
            } else if (event.key === "ArrowRight" || code === 39) {
                handled = move("right") || Boolean(modal) || candidates().length > 0;
            } else if (event.key === "ArrowDown" || code === 40) {
                handled = move("down") || Boolean(modal) || candidates().length > 0;
            }
        }

        if (event.key === "Enter" || code === 13) {
            handled = activate();
        } else if (event.key === "Escape" || event.key === "BrowserBack" || code === 27 || code === 166) {
            var closeButton = modal && modal.querySelector(
                "#close-pc-btn-handler,.ot-close-icon,[aria-label*='close' i]"
            );
            if (closeButton && visible(closeButton)) {
                closeButton.click();
            } else if (!modal) {
                window.history.back();
            }
            handled = true;
        } else if (event.key === "MediaPlayPause" || code === 179 || code === 19 || code === 250) {
            var video = document.querySelector("video");
            if (video) {
                video.paused ? video.play() : video.pause();
                handled = true;
            }
        }

        if (handled) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", function (event) {
        var previous = document.querySelector(".chromium-rcu-focus");
        if (previous && previous !== event.target) {
            previous.classList.remove("chromium-rcu-focus");
        }
        if (event.target && event.target.classList) {
            event.target.classList.add("chromium-rcu-focus");
        }
    }, true);

    var focusedModal = null;
    function focusNewModal() {
        var modal = activeModal();
        if (!modal) {
            focusedModal = null;
            return;
        }
        if (modal === focusedModal) {
            return;
        }
        focusedModal = modal;
        var items = candidates();
        focusElement(preferredConsentButton(items) || currentElement(items));
    }

    window.setInterval(focusNewModal, 500);
    window.setTimeout(function () {
        focusNewModal();
        if (!activeModal()) {
            currentElement(candidates());
        }
    }, 1200);

    console.log("[Chromium RCU] generic plugin 1.0.1 active on " + location.origin);
}());
