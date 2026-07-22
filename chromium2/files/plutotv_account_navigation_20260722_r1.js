(function () {
    "use strict";

    var FOCUS_CLASS = "plutotv-account-rcu-focus";
    var lastUrl = window.location.href;

    function toArray(value) {
        return Array.prototype.slice.call(value || []);
    }

    function isAccountPage() {
        return /\/account(?:\/|$)/.test(window.location.pathname);
    }

    function keyboardIsOpen() {
        return Boolean(document.querySelector(".crkeyboard"));
    }

    function isVisible(element) {
        if (!element || !element.isConnected) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var style = window.getComputedStyle(element);
        return rect.width > 20 && rect.height > 15 &&
            style.display !== "none" && style.visibility !== "hidden" &&
            Number(style.opacity || 1) !== 0;
    }

    function label(element) {
        return [
            element.getAttribute("aria-label") || "",
            element.getAttribute("title") || "",
            element.innerText || "",
            element.textContent || ""
        ].join(" ").replace(/\s+/g, " ").trim();
    }

    function accountControls() {
        var inputs = toArray(document.querySelectorAll(
            'input:not([type="hidden"]):not([disabled])'
        )).filter(isVisible);
        var buttons = toArray(document.querySelectorAll(
            'button:not([disabled]),a[href],[role="button"]'
        )).filter(function (element) {
            if (!isVisible(element) || element.closest("header,.video-player")) {
                return false;
            }
            return element.getAttribute("type") === "submit" ||
                /(als\s*nächstes|weiter|continue|next|anmelden|einloggen|login|sign\s*in)/i
                    .test(label(element));
        });
        return inputs.concat(buttons).filter(function (element, index, all) {
            return all.indexOf(element) === index;
        }).sort(function (left, right) {
            var leftRect = left.getBoundingClientRect();
            var rightRect = right.getBoundingClientRect();
            return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
        });
    }

    function clearFocus() {
        toArray(document.querySelectorAll("." + FOCUS_CLASS)).forEach(function (element) {
            element.classList.remove(FOCUS_CLASS);
        });
    }

    function focusControl(element) {
        if (!isVisible(element)) {
            return false;
        }
        clearFocus();
        element.classList.add(FOCUS_CLASS);
        element.focus();
        try {
            element.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
        } catch (error) {
            element.scrollIntoView();
        }
        console.log("[PlutoTV Account] focus " + element.tagName + " " + label(element));
        return true;
    }

    function ensureFocus() {
        if (!isAccountPage() || keyboardIsOpen()) {
            return false;
        }
        var controls = accountControls();
        if (!controls.length) {
            return false;
        }
        if (controls.indexOf(document.activeElement) >= 0) {
            return true;
        }
        return focusControl(controls[0]);
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function handleKey(event) {
        if (!isAccountPage() || keyboardIsOpen()) {
            return;
        }
        var code = event.which || event.keyCode;
        if ([13, 37, 38, 39, 40].indexOf(code) < 0) {
            return;
        }
        var controls = accountControls();
        if (!controls.length) {
            return;
        }
        var current = document.activeElement;
        var index = controls.indexOf(current);
        if (index < 0) {
            focusControl(controls[0]);
            consume(event);
            return;
        }
        if (code === 13) {
            if (current.tagName === "INPUT" || current.tagName === "TEXTAREA") {
                return;
            }
            consume(event);
            current.click();
            console.log("[PlutoTV Account] activate " + label(current));
            return;
        }
        if ((current.tagName === "INPUT" || current.tagName === "TEXTAREA") &&
                (code === 37 || code === 39)) {
            return;
        }
        var direction = (code === 38 || code === 37) ? -1 : 1;
        var targetIndex = Math.max(0, Math.min(controls.length - 1, index + direction));
        consume(event);
        if (targetIndex !== index) {
            current.blur();
            focusControl(controls[targetIndex]);
        }
    }

    function install() {
        if (window.__plutoAccountNavigationInstalled) {
            return;
        }
        window.__plutoAccountNavigationInstalled = true;
        var style = document.createElement("style");
        style.textContent = "." + FOCUS_CLASS + "{" +
            "outline:5px solid #ffd400!important;outline-offset:3px!important;" +
            "box-shadow:0 0 0 3px #111,0 0 18px #ffd400!important;" +
            "}";
        (document.head || document.documentElement).appendChild(style);
        window.addEventListener("keydown", handleKey, true);
        new MutationObserver(function () {
            if (isAccountPage() && !keyboardIsOpen() &&
                    accountControls().indexOf(document.activeElement) < 0) {
                ensureFocus();
            }
        }).observe(document.documentElement, {childList: true, subtree: true});
        window.setInterval(function () {
            if (lastUrl !== window.location.href) {
                lastUrl = window.location.href;
                clearFocus();
                window.setTimeout(ensureFocus, 300);
            }
        }, 250);
        window.setTimeout(ensureFocus, 300);
        console.log("[PlutoTV Account] installed 20260722-r1");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, {once: true});
    } else {
        install();
    }
}());
