(function () {
    "use strict";

    var FOCUS_CLASS = "plutotv-consent-rcu-focus";
    var BUTTON_SELECTORS = [
        "#onetrust-accept-btn-handler",
        "#onetrust-reject-all-handler",
        "#onetrust-pc-btn-handler"
    ];

    function isVisible(element) {
        if (!element) {
            return false;
        }
        var style = window.getComputedStyle(element);
        var rect = element.getBoundingClientRect();
        return style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity || 1) !== 0 &&
            rect.width > 0 && rect.height > 0;
    }

    function bannerIsVisible() {
        return isVisible(document.getElementById("onetrust-banner-sdk"));
    }

    function consentButtons() {
        var buttons = [];
        BUTTON_SELECTORS.forEach(function (selector) {
            var button = document.querySelector(selector);
            if (isVisible(button) && !button.disabled) {
                buttons.push(button);
            }
        });
        return buttons;
    }

    function markButton(button) {
        var marked = document.querySelectorAll("." + FOCUS_CLASS);
        for (var i = 0; i < marked.length; i++) {
            marked[i].classList.remove(FOCUS_CLASS);
        }
        if (!button) {
            return;
        }
        button.classList.add(FOCUS_CLASS);
        button.focus();
        button.scrollIntoView({block: "center", inline: "center"});
    }

    function ensureConsentFocus() {
        if (!bannerIsVisible()) {
            return false;
        }
        var buttons = consentButtons();
        if (!buttons.length) {
            return false;
        }
        if (buttons.indexOf(document.activeElement) < 0) {
            markButton(buttons[0]);
        }
        return true;
    }

    function handleConsentKey(event) {
        if (!bannerIsVisible()) {
            return;
        }
        var code = event.which || event.keyCode;
        if ([13, 32, 37, 38, 39, 40].indexOf(code) < 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (event.type !== "keydown") {
            return;
        }

        var buttons = consentButtons();
        if (!buttons.length) {
            return;
        }
        var index = buttons.indexOf(document.activeElement);
        if (index < 0) {
            index = 0;
        }

        if (code === 13 || code === 32) {
            markButton(buttons[index]);
            buttons[index].click();
            return;
        }

        if (code === 37 || code === 38) {
            index = (index + buttons.length - 1) % buttons.length;
        } else {
            index = (index + 1) % buttons.length;
        }
        markButton(buttons[index]);
    }

    function install() {
        if (window.__plutoConsentRcuInstalled) {
            return;
        }
        window.__plutoConsentRcuInstalled = true;

        var style = document.createElement("style");
        style.textContent =
            "." + FOCUS_CLASS + "{" +
            "outline:5px solid #ffd400!important;" +
            "outline-offset:2px!important;" +
            "box-shadow:0 0 0 3px #111,0 0 18px #ffd400!important;" +
            "}";
        (document.head || document.documentElement).appendChild(style);

        window.addEventListener("keydown", handleConsentKey, true);
        window.addEventListener("keyup", handleConsentKey, true);

        var observer = new MutationObserver(ensureConsentFocus);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style", "aria-hidden"]
        });
        ensureConsentFocus();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, {once: true});
    } else {
        install();
    }
}());
