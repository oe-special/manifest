(function () {
    "use strict";

    if (
        window.top !== window ||
        window.location.hostname.toLowerCase() !== "accounts.login.idm.telekom.com" ||
        window.__chromiumMagentaTvLogin20260722R1
    ) {
        return;
    }
    window.__chromiumMagentaTvLogin20260722R1 = true;

    var FOCUS_CLASS = "chromium-magentatv-login-focus";

    function visible(element) {
        if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var css = window.getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 && css.display !== "none" &&
            css.visibility !== "hidden" && parseFloat(css.opacity || "1") > 0.01;
    }

    function controls() {
        return Array.prototype.slice.call(document.querySelectorAll(
            "input:not([type='hidden']),scale-button,button:not([tabindex='-1'])," +
            "a[href]:not(#impressum):not(#data-protection)"
        )).filter(visible).sort(function (left, right) {
            var leftRect = left.getBoundingClientRect();
            var rightRect = right.getBoundingClientRect();
            return (leftRect.top - rightRect.top) || (leftRect.left - rightRect.left);
        });
    }

    function focusElement(element) {
        if (!element) {
            return false;
        }
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous && previous !== element) {
            previous.classList.remove(FOCUS_CLASS);
        }
        if (!element.hasAttribute("tabindex")) {
            element.setAttribute("tabindex", "0");
        }
        try {
            element.focus({preventScroll: true});
        } catch (error) {
            element.focus();
        }
        element.classList.add(FOCUS_CLASS);
        return true;
    }

    function submitButton() {
        var selectors = [
            "scale-button#pw_submit",
            "scale-button[type='submit']",
            "button#pw_submit",
            "button[type='submit']"
        ];
        for (var index = 0; index < selectors.length; index++) {
            var button = document.querySelector(selectors[index]);
            if (visible(button)) {
                return button;
            }
        }
        return null;
    }

    function activateButton(button) {
        var innerButton = button && button.shadowRoot && button.shadowRoot.querySelector(
            "button[type='submit'],button"
        );
        if (innerButton && !innerButton.disabled) {
            innerButton.click();
            return true;
        }
        var form = button && button.closest && button.closest("form");
        if (form && typeof form.requestSubmit === "function") {
            form.requestSubmit();
            return true;
        }
        if (button) {
            button.click();
            return true;
        }
        return false;
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function onKeyDown(event) {
        if (document.querySelector(".crkeyboard")) {
            return;
        }
        var key = event.key || "";
        var code = event.which || event.keyCode;
        var active = document.activeElement;
        var handled = false;

        if (key === "Enter" || code === 13) {
            var button = active && active.matches && active.matches(
                "scale-button,button[type='submit'],button#pw_submit"
            ) ? active : null;
            if (button) {
                handled = activateButton(button);
            }
        } else if (
            key === "ArrowDown" || key === "ArrowRight" ||
            code === 40 || code === 39
        ) {
            var forward = controls();
            var forwardIndex = Math.max(-1, forward.indexOf(active));
            handled = focusElement(forward[Math.min(forward.length - 1, forwardIndex + 1)]);
        } else if (
            key === "ArrowUp" || key === "ArrowLeft" ||
            code === 38 || code === 37
        ) {
            var backward = controls();
            var backwardIndex = backward.indexOf(active);
            if (backwardIndex === -1) {
                backwardIndex = backward.length;
            }
            handled = focusElement(backward[Math.max(0, backwardIndex - 1)]);
        }

        if (handled) {
            consume(event);
        }
    }

    var style = document.createElement("style");
    style.id = "chromium-magentatv-login-style";
    style.textContent = "." + FOCUS_CLASS + "{" +
        "outline:5px solid #00b7ff!important;outline-offset:4px!important;" +
        "box-shadow:0 0 0 4px rgba(0,0,0,.82)!important;}";
    (document.head || document.documentElement).appendChild(style);

    window.addEventListener("keydown", onKeyDown, true);
    console.log("[MagentaTV Login] installed 20260722-r1");
}());
