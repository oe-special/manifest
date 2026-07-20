(function () {
    "use strict";

    if (window.__chromiumRcuDebug) {
        return;
    }
    window.__chromiumRcuDebug = true;

    function describe(element) {
        if (!element) {
            return "<none>";
        }
        var result = (element.tagName || "").toLowerCase();
        if (element.id) {
            result += "#" + element.id;
        }
        if (element.classList && element.classList.length) {
            result += "." + Array.prototype.slice.call(element.classList, 0, 4).join(".");
        }
        var role = element.getAttribute && element.getAttribute("role");
        if (role) {
            result += "[role=" + role + "]";
        }
        return result || "<unknown>";
    }

    function pageName() {
        return location.origin + location.pathname;
    }

    function dump() {
        var selector = "a[href],button,input,select,textarea,[tabindex],[role],[aria-controls]";
        var elements = Array.prototype.slice.call(document.querySelectorAll(selector), 0, 30);
        console.log("[RCU DEBUG] page=" + pageName() +
            " candidates=" + document.querySelectorAll(selector).length +
            " sample=" + elements.map(describe).join(" | "));
    }

    document.addEventListener("keydown", function (event) {
        console.log("[RCU DEBUG] keydown key=" + event.key +
            " code=" + event.code +
            " keyCode=" + (event.keyCode || event.which) +
            " active=" + describe(document.activeElement) +
            " target=" + describe(event.target) +
            " page=" + pageName());
    }, true);

    document.addEventListener("focusin", function (event) {
        console.log("[RCU DEBUG] focus=" + describe(event.target) + " page=" + pageName());
    }, true);

    window.chromiumRcuDump = dump;
    window.setTimeout(dump, 2000);
    console.log("[RCU DEBUG] enabled on " + pageName());
}());
