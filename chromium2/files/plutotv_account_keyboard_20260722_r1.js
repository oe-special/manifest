(function () {
    "use strict";

    function isAccountPage() {
        return /\/account(?:\/|$)/.test(window.location.pathname);
    }

    function keyboardIsOpen() {
        return Boolean(document.querySelector(".crkeyboard"));
    }

    function isAccountInput(element) {
        return Boolean(element &&
            (element.tagName === "INPUT" || element.tagName === "TEXTAREA") &&
            !element.disabled && isAccountPage());
    }

    function isVisible(element) {
        if (!element || !element.isConnected) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var style = window.getComputedStyle(element);
        return rect.width > 20 && rect.height > 15 &&
            style.display !== "none" && style.visibility !== "hidden";
    }

    function submitButton() {
        return Array.prototype.slice.call(document.querySelectorAll(
            'button[type="submit"]:not([disabled]),button:not([disabled]),a[href],[role="button"]'
        )).filter(function (element) {
            if (!isVisible(element) || element.closest("header,.video-player")) {
                return false;
            }
            var label = [
                element.getAttribute("aria-label") || "",
                element.innerText || "",
                element.textContent || ""
            ].join(" ").replace(/\s+/g, " ");
            return element.getAttribute("type") === "submit" ||
                /(als\s*nächstes|weiter|continue|next|anmelden|einloggen|login|sign\s*in)/i
                    .test(label);
        })[0] || null;
    }

    function focusSubmit() {
        window.setTimeout(function () {
            var button = submitButton();
            if (!button) {
                return;
            }
            button.focus();
            button.classList.add("plutotv-account-rcu-focus");
            console.log("[PlutoTV Account Keyboard] completed; submit focused");
        }, 50);
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function openKeyboard(event, input) {
        if (typeof window.showKeyboard !== "function") {
            return false;
        }
        consume(event);
        window.showKeyboard(input, focusSubmit);
        console.log("[PlutoTV Account Keyboard] opened once for " +
            (input.id || input.name || input.type));
        return true;
    }

    function handleKey(event) {
        if (!isAccountPage() || keyboardIsOpen()) {
            return;
        }
        var code = event.which || event.keyCode;
        if (code !== 13) {
            return;
        }
        var input = isAccountInput(document.activeElement) ? document.activeElement :
            (isAccountInput(event.target) ? event.target : null);
        if (input) {
            openKeyboard(event, input);
        }
    }

    function repairOpenKeyboard() {
        if (!isAccountPage() || !keyboardIsOpen() ||
                typeof window.echo_elem_cr === "undefined") {
            return false;
        }
        if (isAccountInput(window.echo_elem_cr)) {
            return true;
        }
        var input = Array.prototype.slice.call(document.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]),textarea:not([disabled])'
        )).filter(isVisible)[0];
        if (!input) {
            return false;
        }
        window.echo_elem_cr = input;
        window.keybordCloseCallback = focusSubmit;
        console.log("[PlutoTV Account Keyboard] repaired duplicate-open target");
        return true;
    }

    function install() {
        if (window.__plutoAccountKeyboardInstalled) {
            return;
        }
        window.__plutoAccountKeyboardInstalled = true;
        window.addEventListener("keydown", handleKey, true);
        repairOpenKeyboard();
        console.log("[PlutoTV Account Keyboard] installed 20260722-r1");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, {once: true});
    } else {
        install();
    }
}());
