(function () {
    "use strict";

    var FOCUS_CLASS = "plutotv-modern-rcu-focus";
    var lastContentElement = null;
    var lastUrl = window.location.href;
    var lastMediaSessionBind = 0;

    function toArray(value) {
        return Array.prototype.slice.call(value || []);
    }

    function unique(elements) {
        return elements.filter(function (element, index) {
            return element && elements.indexOf(element) === index;
        });
    }

    function isVisible(element) {
        if (!element || !element.isConnected) {
            return false;
        }
        var style = window.getComputedStyle(element);
        var rect = element.getBoundingClientRect();
        return style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity || 1) !== 0 &&
            rect.width > 20 && rect.height > 15;
    }

    function pageType() {
        var path = window.location.pathname.replace(/\/+$/, "");
        if (path.indexOf("/hub/home") >= 0) {
            return "home";
        }
        if (/\/live-tv(?:\/[^/]+)?$/.test(path)) {
            return "live";
        }
        if (/\/on-demand$/.test(path)) {
            return "demand";
        }
        return "";
    }

    function consentIsOpen() {
        return isVisible(document.getElementById("onetrust-banner-sdk")) ||
            isVisible(document.getElementById("onetrust-pc-sdk"));
    }

    function playerIsExpanded() {
        return Boolean(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.webkitIsFullScreen ||
            isVisible(document.querySelector(".fullbrowser")));
    }

    function anotherDialogIsOpen() {
        var dialogs = toArray(document.querySelectorAll(
            '[role="dialog"],dialog,[aria-modal="true"]'
        ));
        return dialogs.some(function (dialog) {
            return isVisible(dialog) && !dialog.closest("#onetrust-consent-sdk");
        });
    }

    function headerItems() {
        var links = toArray(document.querySelectorAll(
            'nav[aria-label="Primary TV"] a,' +
            'a.l1-home-atc,a.l1-live-tv-atc,a.l1-on-demand-atc,' +
            'a.l1-search-atc,a[class*="signInButton"]'
        ));
        return unique(links).filter(isVisible).sort(function (left, right) {
            return left.getBoundingClientRect().left - right.getBoundingClientRect().left;
        });
    }

    function currentElement() {
        var element = document.querySelector("." + FOCUS_CLASS);
        return isVisible(element) ? element : null;
    }

    function clearFocus() {
        toArray(document.querySelectorAll("." + FOCUS_CLASS)).forEach(function (element) {
            element.classList.remove(FOCUS_CLASS);
        });
        toArray(document.querySelectorAll(".itemFocus")).forEach(function (element) {
            element.classList.remove("itemFocus");
        });
    }

    function focusElement(element, rememberContent) {
        if (!isVisible(element)) {
            return false;
        }
        clearFocus();
        element.classList.add(FOCUS_CLASS);
        try {
            element.focus({preventScroll: true});
        } catch (error) {
            element.focus();
        }
        if (rememberContent !== false && headerItems().indexOf(element) < 0) {
            lastContentElement = element;
        }
        try {
            element.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
        } catch (error) {
            element.scrollIntoView();
        }
        return true;
    }

    function focusHeader() {
        var headers = headerItems();
        if (!headers.length) {
            return false;
        }
        var selected = headers.filter(function (element) {
            return element.classList.contains("current");
        })[0] || headers[0];
        return focusElement(selected, false);
    }

    function selectedCategory(categories) {
        return categories.filter(function (button) {
            var parent = button.parentElement;
            return button.classList.contains("selected") ||
                (parent && (parent.classList.contains("selected") ||
                    /selected-l2-category/.test(parent.className)));
        })[0] || categories[0];
    }

    function homeHeroButtons() {
        return toArray(document.querySelectorAll('[class*="actionButtonsContainer"] button'))
            .filter(isVisible);
    }

    function homeTiles() {
        return unique(toArray(document.querySelectorAll(
            'a[class^="tile-"],.carousel-item > a'
        ))).filter(isVisible);
    }

    function demandHeroButtons() {
        return toArray(document.querySelectorAll("section.hero button")).filter(function (button) {
            return isVisible(button) && (button.innerText || "").trim().length > 0;
        });
    }

    function demandCategories() {
        return unique(toArray(document.querySelectorAll(
            'section[aria-label="On Demand Kategorien"] button,' +
            '[class*="categoryListContainer"] .category-list button'
        ))).filter(function (button) {
            return isVisible(button) && (button.innerText || "").trim().length > 0;
        });
    }

    function demandCards() {
        return unique(toArray(document.querySelectorAll(
            '.vod-item-poster-atc > a[href],.vod-item-poster-atc a[href]'
        ))).filter(isVisible);
    }

    function liveCategories() {
        return unique(toArray(document.querySelectorAll(
            'section[class*="categoryListContainer"] button'
        ))).filter(function (button) {
            return isVisible(button) && (button.innerText || "").trim().length > 0;
        });
    }

    function liveRowGroups() {
        var rows = toArray(document.querySelectorAll('[role="row"]')).filter(function (row) {
            return Boolean(row.querySelector(".ChannelInfo-Link"));
        });
        return rows.map(function (row) {
            return toArray(row.querySelectorAll("a[href]")).filter(isVisible).sort(function (left, right) {
                return left.getBoundingClientRect().left - right.getBoundingClientRect().left;
            });
        }).filter(function (group) {
            return group.length > 0;
        });
    }

    function groupByContainer(elements, selector) {
        var groups = [];
        elements.forEach(function (element) {
            var container = element.closest(selector) || element.parentElement;
            var group = groups.filter(function (candidate) {
                return candidate.container === container;
            })[0];
            if (!group) {
                group = {container: container, items: []};
                groups.push(group);
            }
            group.items.push(element);
        });
        groups.forEach(function (group) {
            group.items.sort(function (left, right) {
                return left.getBoundingClientRect().left - right.getBoundingClientRect().left;
            });
        });
        groups.sort(function (left, right) {
            return left.container.getBoundingClientRect().top -
                right.container.getBoundingClientRect().top;
        });
        return groups.map(function (group) {
            return group.items;
        });
    }

    function elementLocation(groups, element) {
        for (var row = 0; row < groups.length; row++) {
            var column = groups[row].indexOf(element);
            if (column >= 0) {
                return {row: row, column: column};
            }
        }
        return null;
    }

    function centerX(element) {
        var rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2;
    }

    function nearestByX(elements, x) {
        if (!elements.length) {
            return null;
        }
        return elements.reduce(function (best, element) {
            return Math.abs(centerX(element) - x) < Math.abs(centerX(best) - x) ? element : best;
        }, elements[0]);
    }

    function moveInRows(groups, element, rowDelta) {
        var location = elementLocation(groups, element);
        if (!location) {
            return false;
        }
        var targetRow = location.row + rowDelta;
        if (targetRow < 0 || targetRow >= groups.length) {
            return false;
        }
        return focusElement(nearestByX(groups[targetRow], centerX(element)));
    }

    function centerY(element) {
        var rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2;
    }

    function arrowLabel(button) {
        return [
            button.getAttribute("aria-label") || "",
            button.getAttribute("title") || "",
            button.getAttribute("data-testid") || "",
            button.innerText || "",
            button.textContent || "",
            typeof button.className === "string" ? button.className : ""
        ].join(" ").toLowerCase();
    }

    function labelMatchesDirection(button, direction) {
        var label = arrowLabel(button);
        if (direction > 0) {
            return /(next|forward|right|weiter|nächste|vorwärts|chevron.*right|arrow.*right|[>›»❯])/i
                .test(label);
        }
        return /(previous|prev|back|left|zurück|chevron.*left|arrow.*left|[<‹«❮])/i
            .test(label);
    }

    function nearestByY(elements, y) {
        if (!elements.length) {
            return null;
        }
        return elements.reduce(function (best, element) {
            return Math.abs(centerY(element) - y) < Math.abs(centerY(best) - y) ?
                element : best;
        }, elements[0]);
    }

    function sliderArrow(direction) {
        var current = currentElement();
        var referenceY = current ? centerY(current) : window.innerHeight / 2;
        var buttons = toArray(document.querySelectorAll("button")).filter(isVisible);
        var labeled = buttons.filter(function (button) {
            return labelMatchesDirection(button, direction) &&
                !button.matches(".fullbrowser-btn-atc,.fullscreen-btn-atc");
        });
        if (labeled.length) {
            return nearestByY(labeled, referenceY);
        }

        var container = current && current.closest("section");
        if (!container) {
            return null;
        }
        var containerRect = container.getBoundingClientRect();
        var edgeButtons = toArray(container.querySelectorAll("button")).filter(function (button) {
            if (!isVisible(button) || (button.innerText || "").trim().length > 2) {
                return false;
            }
            var rect = button.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            return direction > 0 ?
                x > containerRect.right - containerRect.width * 0.18 :
                x < containerRect.left + containerRect.width * 0.18;
        });
        return nearestByY(edgeButtons, referenceY);
    }

    function pageSlider(direction, source) {
        if (pageType() !== "home" || playerIsExpanded() ||
                consentIsOpen() || anotherDialogIsOpen()) {
            return false;
        }
        var arrow = sliderArrow(direction);
        if (!arrow) {
            console.log("[PlutoTV Navigation] slider arrow missing direction=" +
                direction + " source=" + source);
            return false;
        }
        arrow.click();
        console.log("[PlutoTV Navigation] slider " +
            (direction > 0 ? "next" : "previous") +
            " source=" + source + " arrow=" + arrowLabel(arrow));
        return true;
    }

    function bindMediaSessionSliderHandlers() {
        if (!navigator.mediaSession || !navigator.mediaSession.setActionHandler) {
            return;
        }
        [
            ["nexttrack", 1],
            ["seekforward", 1],
            ["previoustrack", -1],
            ["seekbackward", -1]
        ].forEach(function (entry) {
            try {
                navigator.mediaSession.setActionHandler(entry[0], function () {
                    pageSlider(entry[1], "media-session-" + entry[0]);
                });
            } catch (error) {
                // Chromium builds do not necessarily expose every action.
            }
        });
        lastMediaSessionBind = Date.now();
    }

    function sliderDirectionFromEvent(event) {
        var code = event.which || event.keyCode;
        var name = (event.key || event.code || "").toLowerCase();
        if (code === 228 || /media(fast)?forward|mediatracknext/.test(name)) {
            return 1;
        }
        if (code === 227 || /mediarewind|mediatrackprevious/.test(name)) {
            return -1;
        }
        return 0;
    }

    function isLiveWatchButton(element) {
        if (!element || pageType() !== "home") {
            return false;
        }
        var label = [
            element.innerText || "",
            element.textContent || "",
            element.getAttribute("aria-label") || ""
        ].join(" ");
        return /(live\s*(?:ansehen|schauen|watch)|watch\s*live)/i.test(label);
    }

    function expandLivePlayer(attempt) {
        if (playerIsExpanded()) {
            console.log("[PlutoTV Navigation] live player already expanded");
            return;
        }
        var buttons = toArray(document.querySelectorAll(".fullbrowser-btn-atc"))
            .filter(isVisible);
        if (buttons.length) {
            buttons[0].click();
            console.log("[PlutoTV Navigation] expanded live player via fullbrowser button");
            return;
        }
        if (attempt < 20) {
            window.setTimeout(function () {
                expandLivePlayer(attempt + 1);
            }, 250);
        } else {
            console.log("[PlutoTV Navigation] fullbrowser button not found");
        }
    }

    function clickCurrent(element) {
        if (!element) {
            return false;
        }
        var expandLive = isLiveWatchButton(element);
        element.click();
        if (expandLive) {
            window.setTimeout(function () {
                expandLivePlayer(0);
            }, 350);
        }
        window.setTimeout(function () {
            if (!currentElement()) {
                ensureInitialFocus();
            }
        }, 500);
        return true;
    }

    function handleHeader(element, code, type) {
        var headers = headerItems();
        var index = headers.indexOf(element);
        if (index < 0) {
            return false;
        }
        if (code === 37 && index > 0) {
            return focusElement(headers[index - 1], false);
        }
        if (code === 39 && index < headers.length - 1) {
            return focusElement(headers[index + 1], false);
        }
        if (code === 38) {
            return true;
        }
        if (code === 40) {
            if (type === "home") {
                return focusElement(homeHeroButtons()[0] || homeTiles()[0]);
            }
            if (type === "demand") {
                return focusElement(demandHeroButtons()[0] ||
                    selectedCategory(demandCategories()) || demandCards()[0]);
            }
            if (type === "live") {
                return focusElement(selectedCategory(liveCategories()) ||
                    (liveRowGroups()[0] || [])[1] || (liveRowGroups()[0] || [])[0]);
            }
        }
        if (code === 13) {
            return clickCurrent(element);
        }
        return true;
    }

    function handleHome(element, code) {
        var hero = homeHeroButtons();
        var heroIndex = hero.indexOf(element);
        var groups = groupByContainer(homeTiles(), "section");
        var location = elementLocation(groups, element);

        if (heroIndex >= 0) {
            if (code === 37 && heroIndex > 0) {
                return focusElement(hero[heroIndex - 1]);
            }
            if (code === 39 && heroIndex < hero.length - 1) {
                return focusElement(hero[heroIndex + 1]);
            }
            if (code === 38) {
                return focusHeader();
            }
            if (code === 40 && groups.length) {
                return focusElement(nearestByX(groups[0], centerX(element)));
            }
            if (code === 13) {
                return clickCurrent(element);
            }
            return true;
        }

        if (location) {
            if (code === 37 && location.column > 0) {
                return focusElement(groups[location.row][location.column - 1]);
            }
            if (code === 39 && location.column < groups[location.row].length - 1) {
                return focusElement(groups[location.row][location.column + 1]);
            }
            if (code === 38) {
                if (location.row === 0 && hero.length) {
                    return focusElement(nearestByX(hero, centerX(element)));
                }
                return moveInRows(groups, element, -1);
            }
            if (code === 40) {
                return moveInRows(groups, element, 1);
            }
            if (code === 13) {
                return clickCurrent(element);
            }
            return true;
        }
        return focusHeader();
    }

    function handleDemand(element, code) {
        var hero = demandHeroButtons();
        var heroIndex = hero.indexOf(element);
        var categories = demandCategories();
        var categoryIndex = categories.indexOf(element);
        var groups = groupByContainer(demandCards(), ".l3-atc");
        var location = elementLocation(groups, element);

        if (heroIndex >= 0) {
            if (code === 37 && heroIndex > 0) {
                return focusElement(hero[heroIndex - 1]);
            }
            if (code === 39 && heroIndex < hero.length - 1) {
                return focusElement(hero[heroIndex + 1]);
            }
            if (code === 38) {
                return focusHeader();
            }
            if (code === 40) {
                return focusElement(selectedCategory(categories) || (groups[0] || [])[0]);
            }
            if (code === 13) {
                return clickCurrent(element);
            }
            return true;
        }

        if (categoryIndex >= 0) {
            if (code === 38 && categoryIndex > 0) {
                return focusElement(categories[categoryIndex - 1]);
            }
            if (code === 38 && categoryIndex === 0) {
                return focusElement(hero[0]) || focusHeader();
            }
            if (code === 40 && categoryIndex < categories.length - 1) {
                return focusElement(categories[categoryIndex + 1]);
            }
            if (code === 39 && groups.length) {
                return focusElement(groups[0][0]);
            }
            if (code === 13) {
                clickCurrent(element);
                window.setTimeout(function () {
                    focusElement(selectedCategory(demandCategories()));
                }, 350);
                return true;
            }
            return true;
        }

        if (location) {
            if (code === 37) {
                if (location.column === 0) {
                    return focusElement(selectedCategory(categories));
                }
                return focusElement(groups[location.row][location.column - 1]);
            }
            if (code === 39 && location.column < groups[location.row].length - 1) {
                return focusElement(groups[location.row][location.column + 1]);
            }
            if (code === 38) {
                if (location.row === 0) {
                    return focusElement(hero[0]) || focusHeader();
                }
                return moveInRows(groups, element, -1);
            }
            if (code === 40) {
                return moveInRows(groups, element, 1);
            }
            if (code === 13) {
                return clickCurrent(element);
            }
            return true;
        }
        return focusHeader();
    }

    function handleLive(element, code) {
        var categories = liveCategories();
        var categoryIndex = categories.indexOf(element);
        var groups = liveRowGroups();
        var location = elementLocation(groups, element);

        if (categoryIndex >= 0) {
            if (code === 38 && categoryIndex > 0) {
                return focusElement(categories[categoryIndex - 1]);
            }
            if (code === 38 && categoryIndex === 0) {
                return focusHeader();
            }
            if (code === 40 && categoryIndex < categories.length - 1) {
                return focusElement(categories[categoryIndex + 1]);
            }
            if (code === 39 && groups.length) {
                return focusElement(groups[0][1] || groups[0][0]);
            }
            if (code === 13) {
                clickCurrent(element);
                window.setTimeout(function () {
                    focusElement(selectedCategory(liveCategories()));
                }, 350);
                return true;
            }
            return true;
        }

        if (location) {
            if (code === 37) {
                if (location.column === 0) {
                    return focusElement(selectedCategory(categories));
                }
                return focusElement(groups[location.row][location.column - 1]);
            }
            if (code === 39 && location.column < groups[location.row].length - 1) {
                return focusElement(groups[location.row][location.column + 1]);
            }
            if (code === 38) {
                if (location.row === 0) {
                    return focusHeader();
                }
                return moveInRows(groups, element, -1);
            }
            if (code === 40) {
                return moveInRows(groups, element, 1);
            }
            if (code === 13) {
                return clickCurrent(element);
            }
            return true;
        }
        return focusHeader();
    }

    function ensureInitialFocus() {
        if (!pageType() || consentIsOpen() || playerIsExpanded() || anotherDialogIsOpen()) {
            return false;
        }
        if (currentElement()) {
            return true;
        }
        return focusHeader();
    }

    function toggleHeader() {
        var current = currentElement();
        if (headerItems().indexOf(current) >= 0) {
            if (isVisible(lastContentElement)) {
                return focusElement(lastContentElement);
            }
            var type = pageType();
            if (type === "home") {
                return focusElement(homeHeroButtons()[0] || homeTiles()[0]);
            }
            if (type === "demand") {
                return focusElement(demandHeroButtons()[0] || selectedCategory(demandCategories()));
            }
            if (type === "live") {
                return focusElement(selectedCategory(liveCategories()));
            }
        }
        return focusHeader();
    }

    function handleKey(event) {
        var type = pageType();
        if (!type || consentIsOpen() || playerIsExpanded() || anotherDialogIsOpen()) {
            return;
        }
        var code = event.which || event.keyCode;
        var sliderDirection = type === "home" ? sliderDirectionFromEvent(event) : 0;
        if (!sliderDirection && [13, 37, 38, 39, 40, 93].indexOf(code) < 0) {
            return;
        }

        if (!ensureInitialFocus()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (event.type !== "keydown") {
            return;
        }

        if (sliderDirection) {
            pageSlider(sliderDirection, "keydown-" + code);
            return;
        }

        if (code === 93) {
            toggleHeader();
            return;
        }

        var element = currentElement();
        if (!element) {
            focusHeader();
            return;
        }
        if (headerItems().indexOf(element) >= 0) {
            handleHeader(element, code, type);
        } else if (type === "home") {
            handleHome(element, code);
        } else if (type === "demand") {
            handleDemand(element, code);
        } else {
            handleLive(element, code);
        }
    }

    function install() {
        if (window.__plutoModernNavigationInstalled) {
            return;
        }
        window.__plutoModernNavigationInstalled = true;

        var style = document.createElement("style");
        style.textContent =
            "." + FOCUS_CLASS + "{" +
            "outline:5px solid #ffd400!important;" +
            "outline-offset:3px!important;" +
            "box-shadow:0 0 0 3px #111,0 0 18px #ffd400!important;" +
            "position:relative!important;z-index:20!important;" +
            "}";
        (document.head || document.documentElement).appendChild(style);

        window.addEventListener("keydown", handleKey, true);
        window.addEventListener("keyup", handleKey, true);
        bindMediaSessionSliderHandlers();

        new MutationObserver(function () {
            if (pageType() && !currentElement()) {
                ensureInitialFocus();
            }
        }).observe(document.documentElement, {childList: true, subtree: true});

        window.setInterval(function () {
            if (Date.now() - lastMediaSessionBind >= 1000) {
                bindMediaSessionSliderHandlers();
            }
            if (lastUrl !== window.location.href) {
                lastUrl = window.location.href;
                lastContentElement = null;
                clearFocus();
                window.setTimeout(ensureInitialFocus, 350);
            }
        }, 250);
        window.setTimeout(ensureInitialFocus, 300);
        console.log("[PlutoTV Navigation] installed 20260722-r3");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, {once: true});
    } else {
        install();
    }
}());
