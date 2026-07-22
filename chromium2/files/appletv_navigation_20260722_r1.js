(function () {
    "use strict";

    if (window.__chromiumAppleTvNavigation20260722R1) {
        return;
    }
    window.__chromiumAppleTvNavigation20260722R1 = true;

    var KEY_MENU = 0x5D;
    var FOCUS_CLASS = "chromium-appletv-focus";
    var lastContent = null;

    function appleTvPage() {
        return window.top === window &&
            /(^|\.)tv\.apple\.com$/i.test(window.location.hostname);
    }

    function rendered(element) {
        if (!element || element.disabled ||
                element.getAttribute("aria-hidden") === "true") {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var style = window.getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 &&
            style.display !== "none" && style.visibility !== "hidden";
    }

    function signInButton() {
        var button = document.querySelector('[data-testid="sign-in-button"]');
        if (rendered(button)) {
            return button;
        }
        return Array.prototype.find.call(
            document.querySelectorAll("button,a,[role='button']"),
            function (element) {
                var text = String(
                    element.getAttribute("aria-label") ||
                    element.innerText || element.textContent || ""
                ).replace(/\s+/g, " ").trim();
                return rendered(element) && /^(anmelden|sign in)$/i.test(text);
            }
        ) || null;
    }

    function inHeader(element) {
        return !!(element && element.closest(
            ".header,.header__contents,.header__controls,header"
        ));
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function clearFocus() {
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous) {
            previous.classList.remove(FOCUS_CLASS);
        }
    }

    function focusElement(element, reason) {
        if (!rendered(element)) {
            return false;
        }
        clearFocus();
        if (!element.hasAttribute("tabindex")) {
            element.setAttribute("tabindex", "0");
        }
        element.focus({preventScroll: true});
        element.classList.add(FOCUS_CLASS);
        console.log(
            "[Apple TV Navigation] focus=" +
                String(element.innerText || element.textContent || element.tagName)
                    .replace(/\s+/g, " ").trim().slice(0, 80) +
                " reason=" + reason
        );
        return true;
    }

    function focusSignIn(reason) {
        var active = document.activeElement;
        if (active && active !== document.body && !inHeader(active) &&
                rendered(active)) {
            lastContent = active;
        }
        return focusElement(signInButton(), reason);
    }

    function contentTarget() {
        if (rendered(lastContent) && !inHeader(lastContent)) {
            return lastContent;
        }
        var candidates = document.querySelectorAll(
            "main button,main a,[role='main'] button,[role='main'] a," +
                "button[aria-label],a[aria-label]"
        );
        return Array.prototype.find.call(candidates, function (element) {
            return rendered(element) && !inHeader(element) &&
                element.getBoundingClientRect().top >= 52;
        }) || null;
    }

    function onKeyDown(event) {
        if (!appleTvPage()) {
            return;
        }
        var key = event.key || "";
        var code = event.which || event.keyCode;
        var active = document.activeElement;
        var signIn = signInButton();
        var handled = false;

        if (key === "ContextMenu" || code === KEY_MENU) {
            handled = active === signIn ?
                focusElement(contentTarget(), "menu-to-content") :
                focusSignIn("menu-to-sign-in");
        } else if (key === "ArrowUp" || code === 38) {
            if (active !== signIn) {
                handled = focusSignIn("up-to-sign-in");
            } else {
                handled = true;
            }
        } else if ((key === "ArrowDown" || code === 40) && active === signIn) {
            handled = focusElement(contentTarget(), "sign-in-to-content");
        } else if ((key === "Enter" || code === 13) && active === signIn) {
            signIn.click();
            handled = true;
            console.log("[Apple TV Navigation] activate=sign-in");
        }

        if (handled) {
            consume(event);
        }
    }

    var style = document.createElement("style");
    style.id = "chromium-appletv-navigation-style";
    style.textContent = "." + FOCUS_CLASS + "{" +
        "outline:4px solid #00b7ff!important;" +
        "outline-offset:3px!important;" +
        "box-shadow:0 0 0 3px rgba(0,0,0,.85)!important;}";
    (document.head || document.documentElement).appendChild(style);

    window.addEventListener("keydown", onKeyDown, true);
    console.log("[Apple TV Navigation] installed 20260722-r1");
}());
