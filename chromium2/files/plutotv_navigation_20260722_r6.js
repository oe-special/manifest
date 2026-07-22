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
        if (/\/live-tv(?:\/|$)/.test(path)) {
            return "live";
        }
        if (/\/on-demand(?:\/|$)/.test(path)) {
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

    function detailDialog() {
        var dialogs = toArray(document.querySelectorAll(
            ".on-demand-movie-details-modal," +
            ".on-demand-series-details-modal," +
            ".live-tv-details-modal," +
            '[role="dialog"],dialog,[aria-modal="true"]'
        ));
        return dialogs.filter(function (dialog) {
            return isVisible(dialog) && !dialog.closest("#onetrust-consent-sdk");
        })[0] || null;
    }

    function dialogControls(dialog) {
        if (!dialog) {
            return [];
        }
        return unique(toArray(dialog.querySelectorAll(
            'button:not([disabled]),a[href],[role="button"],[tabindex]:not([tabindex="-1"])'
        ))).filter(isVisible);
    }

    function controlLabel(element) {
        return [
            element.getAttribute("aria-label") || "",
            element.getAttribute("title") || "",
            element.innerText || "",
            element.textContent || "",
            typeof element.className === "string" ? element.className : ""
        ].join(" ").replace(/\s+/g, " ").trim();
    }

    function primaryDialogControl(dialog) {
        var controls = dialogControls(dialog);
        return controls.filter(function (control) {
            return /(weiter\s*ansehen|fortsetzen|resume|continue\s*watching|watch\s*now|abspielen|ansehen|play)/i
                .test(controlLabel(control));
        })[0] || controls.filter(function (control) {
            return !control.matches(".close-content-details-atc,[class*='closeModal']");
        })[0] || controls[0] || null;
    }

    function ensureDialogFocus(dialog) {
        var controls = dialogControls(dialog);
        var current = currentElement();
        if (current && dialog.contains(current) && controls.indexOf(current) >= 0) {
            return true;
        }
        return focusElement(primaryDialogControl(dialog));
    }

    function spatialDialogControl(controls, current, code) {
        var currentRect = current.getBoundingClientRect();
        var currentX = currentRect.left + currentRect.width / 2;
        var currentY = currentRect.top + currentRect.height / 2;
        var candidates = controls.filter(function (control) {
            if (control === current) {
                return false;
            }
            var rect = control.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            if (code === 37) {
                return x < currentX - 4;
            }
            if (code === 39) {
                return x > currentX + 4;
            }
            if (code === 38) {
                return y < currentY - 4;
            }
            return y > currentY + 4;
        });
        if (!candidates.length) {
            return null;
        }
        return candidates.reduce(function (best, control) {
            function score(element) {
                var rect = element.getBoundingClientRect();
                var dx = Math.abs(rect.left + rect.width / 2 - currentX);
                var dy = Math.abs(rect.top + rect.height / 2 - currentY);
                return (code === 37 || code === 39) ? dx * 10 + dy : dy * 10 + dx;
            }
            return score(control) < score(best) ? control : best;
        }, candidates[0]);
    }

    function closeDetailDialog(dialog) {
        var close = dialog.querySelector(
            ".close-content-details-atc,[class*='closeModal'],[aria-label*='close' i]," +
            "[aria-label*='schließen' i]"
        );
        if (isVisible(close)) {
            close.click();
            console.log("[PlutoTV Navigation] detail dialog closed");
            return true;
        }
        return false;
    }

    function handleDetailDialogKey(event, dialog) {
        var code = event.which || event.keyCode;
        var name = (event.key || event.code || "").toLowerCase();
        var isExit = [8, 27, 166, 169, 178].indexOf(code) >= 0 ||
            /backspace|escape|browserback|mediastop/.test(name);
        if (!isExit && [13, 37, 38, 39, 40].indexOf(code) < 0) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (event.type !== "keydown") {
            return true;
        }
        if (isExit) {
            closeDetailDialog(dialog);
            return true;
        }
        ensureDialogFocus(dialog);
        var controls = dialogControls(dialog);
        var current = currentElement();
        if (!current || controls.indexOf(current) < 0) {
            return true;
        }
        if (code === 13) {
            var label = controlLabel(current);
            console.log("[PlutoTV Navigation] detail dialog activate " + label);
            current.click();
            if (/(weiter\s*ansehen|fortsetzen|resume|continue\s*watching|watch\s*now|abspielen|ansehen|play)/i
                    .test(label)) {
                window.setTimeout(function () {
                    completeVodPlayerStart(0);
                }, 250);
            }
            return true;
        }
        var target = spatialDialogControl(controls, current, code);
        if (target) {
            focusElement(target);
        }
        return true;
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
                button.classList.contains("current") ||
                button.getAttribute("aria-current") === "page" ||
                button.getAttribute("aria-selected") === "true" ||
                (parent && (parent.classList.contains("selected") ||
                    parent.classList.contains("current") ||
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

    function sideMenuControls(selector) {
        var direct = unique(toArray(document.querySelectorAll(selector))).filter(function (control) {
            return isVisible(control) && (control.innerText || control.textContent || "")
                .trim().length > 0 && headerItems().indexOf(control) < 0;
        });
        if (direct.length) {
            return direct.sort(function (left, right) {
                return left.getBoundingClientRect().top - right.getBoundingClientRect().top;
            });
        }
        return unique(toArray(document.querySelectorAll(
            'aside a[href],aside button,main a[href],main button,[role="main"] a[href],[role="main"] button'
        ))).filter(function (control) {
            if (!isVisible(control) || headerItems().indexOf(control) >= 0 ||
                    control.closest("header,footer,[role='dialog'],.video-player") ||
                    control.closest('[class*="actionButtonsContainer"]')) {
                return false;
            }
            var rect = control.getBoundingClientRect();
            var label = (control.innerText || control.textContent || "").trim();
            return label.length > 0 && label.length < 100 &&
                rect.left + rect.width / 2 < window.innerWidth * 0.36 &&
                rect.height < window.innerHeight * 0.22;
        }).sort(function (left, right) {
            return left.getBoundingClientRect().top - right.getBoundingClientRect().top;
        });
    }

    function demandCategories() {
        return sideMenuControls(
            'section[aria-label*="On Demand" i] button,' +
            'section[aria-label*="On Demand" i] a[href],' +
            '[class*="categoryListContainer"] button,' +
            '[class*="categoryListContainer"] a[href],' +
            '.category-list button,.category-list a[href],' +
            '[class*="categoryNavigation"] button,[class*="categoryNavigation"] a[href],' +
            'aside [class*="category"] button,aside [class*="category"] a[href]'
        );
    }

    function demandCards() {
        var direct = unique(toArray(document.querySelectorAll(
            '.vod-item-poster-atc > a[href],.vod-item-poster-atc a[href],' +
            '.episode-container-atc a[href],.episode-container-atc button,' +
            '[class*="episodeContainer"] a[href],[class*="episodeContainer"] button,' +
            '[class*="episodeCard"] a[href],[class*="episodeCard"] button'
        ))).filter(isVisible);
        if (direct.length) {
            return direct;
        }
        var categories = demandCategories();
        return unique(toArray(document.querySelectorAll(
            'main a[href],main button,[role="main"] a[href],[role="main"] button'
        ))).filter(function (control) {
            if (!isVisible(control) || categories.indexOf(control) >= 0 ||
                    headerItems().indexOf(control) >= 0 ||
                    control.closest("header,footer,[role='dialog'],.video-player")) {
                return false;
            }
            var rect = control.getBoundingClientRect();
            return rect.left + rect.width / 2 >= window.innerWidth * 0.32;
        });
    }

    function liveCategories() {
        return sideMenuControls(
            'section[class*="categoryListContainer"] button,' +
            'section[class*="categoryListContainer"] a[href],' +
            '[class*="category-list"] button,[class*="category-list"] a[href],' +
            '[class*="channelCategory"] button,[class*="channelCategory"] a[href],' +
            'aside [class*="category"] button,aside [class*="category"] a[href]'
        );
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

    function groupByVisualRows(elements) {
        var rows = [];
        elements.slice().sort(function (left, right) {
            var leftRect = left.getBoundingClientRect();
            var rightRect = right.getBoundingClientRect();
            return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
        }).forEach(function (element) {
            var rect = element.getBoundingClientRect();
            var y = rect.top + rect.height / 2;
            var row = rows.filter(function (candidate) {
                return Math.abs(candidate.y - y) <= Math.max(35, rect.height * 0.55);
            })[0];
            if (!row) {
                row = {y: y, items: []};
                rows.push(row);
            }
            row.items.push(element);
            row.y = row.items.reduce(function (total, item) {
                var itemRect = item.getBoundingClientRect();
                return total + itemRect.top + itemRect.height / 2;
            }, 0) / row.items.length;
        });
        return rows.sort(function (left, right) {
            return left.y - right.y;
        }).map(function (row) {
            return row.items.sort(function (left, right) {
                return left.getBoundingClientRect().left - right.getBoundingClientRect().left;
            });
        });
    }

    function flattened(groups) {
        return groups.reduce(function (items, group) {
            return items.concat(group);
        }, []);
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

    function visibleVodVideo() {
        var videos = toArray(document.querySelectorAll("video")).filter(isVisible);
        return videos.filter(function (video) {
            return Number.isFinite(video.duration) && video.duration > 0;
        }).sort(function (left, right) {
            var leftRect = left.getBoundingClientRect();
            var rightRect = right.getBoundingClientRect();
            return rightRect.width * rightRect.height - leftRect.width * leftRect.height;
        })[0] || null;
    }

    function completeVodPlayerStart(attempt) {
        var dialog = detailDialog();
        var expanded = playerIsExpanded();
        var video = visibleVodVideo();
        if (expanded || video) {
            if (dialog) {
                closeDetailDialog(dialog);
                console.log("[PlutoTV Navigation] removed VOD detail overlay");
            }
            window.setTimeout(function () {
                expandLivePlayer(0);
            }, 200);
            return;
        }
        if (attempt < 24) {
            window.setTimeout(function () {
                completeVodPlayerStart(attempt + 1);
            }, 250);
        } else {
            console.log("[PlutoTV Navigation] VOD player did not become ready");
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
        var groups = groupByVisualRows(demandCards());
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
                return focusElement(nearestByY(flattened(groups), centerY(element)));
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
                return focusElement(nearestByY(flattened(groups), centerY(element)));
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
        if (!type || consentIsOpen()) {
            return;
        }
        var dialog = detailDialog();
        if (dialog) {
            handleDetailDialogKey(event, dialog);
            return;
        }
        if (playerIsExpanded()) {
            return;
        }
        if (anotherDialogIsOpen()) {
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
            var dialog = detailDialog();
            if (dialog) {
                ensureDialogFocus(dialog);
            } else if (pageType() && !currentElement()) {
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
        console.log("[PlutoTV Navigation] installed 20260722-r6");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, {once: true});
    } else {
        install();
    }
}());
