(function () {
    "use strict";

    if (window.__rtlPlusEpgNavigation20260721R1) {
        return;
    }
    window.__rtlPlusEpgNavigation20260721R1 = true;

    var FOCUS_CLASS = "chromium-rtlplus-focus";
    var KEY_MENU = 0x5D;
    var SAFE_LEFT = 130;
    var SAFE_RIGHT = 24;
    var gridCache = null;
    var lastRow = 0;
    var lastTimelineCenter = null;
    var lastHeader = 0;

    function epgPage() {
        return window.top === window &&
            window.location.hostname === "plus.rtl.de" &&
            (window.location.pathname === "/tv-programm" ||
                window.location.pathname.indexOf("/tv-programm/") === 0);
    }

    function rendered(element) {
        if (
            !element || element.disabled ||
            element.getAttribute("aria-hidden") === "true" ||
            element.closest("[hidden],[aria-hidden='true']")
        ) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var css = window.getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 &&
            css.display !== "none" && css.visibility !== "hidden" &&
            parseFloat(css.opacity || "1") > 0.01;
    }

    function uniqueRendered(items) {
        return items.filter(function (item, index) {
            return items.indexOf(item) === index && rendered(item);
        });
    }

    function label(element) {
        return String(
            element && (
                element.getAttribute("aria-label") ||
                element.innerText || element.textContent ||
                element.getAttribute("href") || element.id
            ) || "<none>"
        ).replace(/\s+/g, " ").trim().slice(0, 100);
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function horizontalScroller(element) {
        for (var current = element; current && current !== document.body;
                current = current.parentElement) {
            var css = window.getComputedStyle(current);
            if (
                current.scrollWidth > current.clientWidth + 4 &&
                (css.overflowX === "auto" || css.overflowX === "scroll")
            ) {
                return current;
            }
        }
        return null;
    }

    function isStationLink(element) {
        if (!element || element.tagName !== "A") {
            return false;
        }
        try {
            return /\/live\/?$/.test(new URL(
                element.getAttribute("href"), window.location.href
            ).pathname);
        } catch (error) {
            return false;
        }
    }

    function buildGrid() {
        var stations = uniqueRendered(Array.prototype.slice.call(
            document.querySelectorAll("main a[href]")
        ).filter(function (item) {
            if (!isStationLink(item)) {
                return false;
            }
            var rect = item.getBoundingClientRect();
            return rect.width <= 200 && rect.height >= 60 && rect.height <= 120;
        })).sort(function (left, right) {
            return left.getBoundingClientRect().top - right.getBoundingClientRect().top;
        });
        if (!stations.length) {
            return null;
        }
        var scroller = horizontalScroller(stations[0]);
        if (!scroller) {
            return null;
        }
        var programs = uniqueRendered(Array.prototype.slice.call(
            scroller.querySelectorAll("a[href='#'],button")
        ).filter(function (item) {
            return item.getBoundingClientRect().height >= 60;
        }));
        var rows = stations.map(function (station) {
            var stationRect = station.getBoundingClientRect();
            var centerY = stationRect.top + stationRect.height / 2;
            return {
                station: station,
                programs: programs.filter(function (program) {
                    var rect = program.getBoundingClientRect();
                    return Math.abs(rect.top + rect.height / 2 - centerY) < 8;
                }).sort(function (left, right) {
                    return left.getBoundingClientRect().left -
                        right.getBoundingClientRect().left;
                })
            };
        });
        return {scroller: scroller, rows: rows};
    }

    function grid() {
        if (
            !gridCache || !gridCache.scroller.isConnected ||
            !gridCache.rows.length || !gridCache.rows[0].station.isConnected ||
            (gridCache.rows[0].programs.length &&
                !gridCache.rows[0].programs[0].isConnected)
        ) {
            gridCache = buildGrid();
        }
        return gridCache;
    }

    function topControls() {
        return uniqueRendered(Array.prototype.slice.call(
            document.querySelectorAll("main nav button")
        ));
    }

    function headerAccount() {
        return document.querySelector(
            "#navEntryDropdown-btn," +
            "header #account," +
            "header button[aria-label*='Profil' i]," +
            "header a[aria-label*='Profil' i]"
        );
    }

    function headerItems() {
        var selectors = [
            "#brand", "#videotv", "#epggrid", "#sport", "#audio", "#search"
        ];
        var items = selectors.map(function (selector) {
            return document.querySelector("header " + selector);
        }).filter(Boolean);
        var account = headerAccount();
        var offers = document.querySelector("header #offers");
        if (account) {
            items.push(account);
        }
        if (offers) {
            items.push(offers);
        }
        return uniqueRendered(items);
    }

    function profileMenu() {
        var account = headerAccount();
        var menu = document.querySelector("#navEntryDropdown-items,[role='menu']");
        return account && account.getAttribute("aria-expanded") === "true" &&
            rendered(menu) ? menu : null;
    }

    function profileItems(menu) {
        return uniqueRendered(Array.prototype.slice.call(menu.querySelectorAll(
            "[role='menuitem'],a[href],button"
        )).filter(function (item) {
            return item.closest("#navEntryDropdown-items,[role='menu']") === menu;
        }));
    }

    function activeDialog() {
        var dialog = document.querySelector("[role='dialog']");
        return rendered(dialog) ? dialog : null;
    }

    function dialogItems(dialog) {
        return uniqueRendered(Array.prototype.slice.call(dialog.querySelectorAll(
            "a[href],button,[tabindex]:not([tabindex='-1'])"
        )).filter(function (item) {
            return item.closest("[role='dialog']") === dialog;
        })).sort(function (left, right) {
            var leftRect = left.getBoundingClientRect();
            var rightRect = right.getBoundingClientRect();
            return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
        });
    }

    function dialogPrimary(dialog) {
        return dialogItems(dialog).filter(function (item) {
            if (item.tagName !== "A") {
                return false;
            }
            try {
                return /\/live\/?$/.test(new URL(
                    item.getAttribute("href"), window.location.href
                ).pathname);
            } catch (error) {
                return false;
            }
        })[0] || dialogItems(dialog)[0];
    }

    function focusDialogWhenReady(attempt) {
        var dialog = activeDialog();
        if (dialog) {
            focusElement(dialogPrimary(dialog), "dialog-live-entry");
        } else if (attempt < 24) {
            window.setTimeout(function () {
                focusDialogWhenReady(attempt + 1);
            }, 50);
        }
    }

    function closeDialog(dialog) {
        var close = dialogItems(dialog).filter(function (item) {
            return item.tagName === "BUTTON" && /schlie|close/i.test(label(item));
        })[0];
        if (close) {
            close.click();
        } else {
            window.history.back();
        }
        window.setTimeout(function () {
            focusGrid(lastRow, null, "dialog-close");
        }, 80);
        return true;
    }

    function handleDialog(dialog, key, code) {
        var items = dialogItems(dialog);
        var primary = dialogPrimary(dialog);
        var index = items.indexOf(document.activeElement);
        if (
            key === "Escape" || key === "BrowserBack" ||
            code === 27 || code === 166 || code === 8
        ) {
            return closeDialog(dialog);
        }
        if (key === "ArrowUp" || code === 38) {
            return focusElement(
                index === -1 ? primary : items[Math.max(0, index - 1)],
                "dialog-up"
            );
        }
        if (key === "ArrowDown" || code === 40) {
            return focusElement(
                index === -1 ? primary : items[Math.min(items.length - 1, index + 1)],
                "dialog-down"
            );
        }
        if (key === "ArrowLeft" || key === "ArrowRight" || code === 37 || code === 39) {
            return focusElement(index === -1 ? primary : items[index], "dialog-horizontal");
        }
        if (key === "Enter" || code === 13) {
            if (index === -1) {
                return focusElement(primary, "dialog-activate-entry");
            }
            items[index].click();
            return true;
        }
        return false;
    }

    function reveal(element) {
        var data = grid();
        if (!data || !element || isStationLink(element)) {
            return;
        }
        var rect = element.getBoundingClientRect();
        if (rect.left < SAFE_LEFT) {
            data.scroller.scrollLeft = Math.max(
                0, data.scroller.scrollLeft + rect.left - SAFE_LEFT - 12
            );
        } else if (rect.right > window.innerWidth - SAFE_RIGHT) {
            data.scroller.scrollLeft +=
                rect.right - (window.innerWidth - SAFE_RIGHT) + 12;
        }
    }

    function revealVertical(element) {
        if (!element || element.closest("header,main nav,[role='menu']")) {
            return;
        }
        var rect = element.getBoundingClientRect();
        if (rect.top < 180) {
            window.scrollBy(0, rect.top - 190);
        } else if (rect.bottom > window.innerHeight - 18) {
            window.scrollBy(0, rect.bottom - window.innerHeight + 28);
        }
    }

    function focusElement(element, reason) {
        if (!element) {
            return false;
        }
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous && previous !== element) {
            previous.classList.remove(FOCUS_CLASS);
        }
        try {
            element.focus({preventScroll: true});
        } catch (error) {
            element.focus();
        }
        element.classList.add(FOCUS_CLASS);
        reveal(element);
        revealVertical(element);
        window.setTimeout(function () {
            if (element.isConnected) {
                try {
                    element.focus({preventScroll: true});
                } catch (error) {
                    element.focus();
                }
                reveal(element);
            }
        }, 30);
        console.log("[RTL+ EPG Navigation] focus=" + label(element) +
            " reason=" + reason);
        return true;
    }

    function locationInGrid(element) {
        var data = grid();
        if (!data) {
            return null;
        }
        for (var rowIndex = 0; rowIndex < data.rows.length; rowIndex++) {
            var row = data.rows[rowIndex];
            if (row.station === element) {
                return {row: rowIndex, station: true, program: -1};
            }
            var programIndex = row.programs.indexOf(element);
            if (programIndex !== -1) {
                return {row: rowIndex, station: false, program: programIndex};
            }
        }
        return null;
    }

    function timelineCenter(element) {
        var data = grid();
        var rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2 + (data ? data.scroller.scrollLeft : 0);
    }

    function nearestProgram(row, desiredCenter) {
        if (!row || !row.programs.length) {
            return null;
        }
        if (desiredCenter === null || desiredCenter === undefined) {
            var viewportCenter = SAFE_LEFT +
                (window.innerWidth - SAFE_LEFT - SAFE_RIGHT) / 2;
            return row.programs.reduce(function (best, item) {
                var rect = item.getBoundingClientRect();
                var distance = Math.abs(rect.left + rect.width / 2 - viewportCenter);
                return !best || distance < best.distance ?
                    {item: item, distance: distance} : best;
            }, null).item;
        }
        return row.programs.reduce(function (best, item) {
            var distance = Math.abs(timelineCenter(item) - desiredCenter);
            return !best || distance < best.distance ?
                {item: item, distance: distance} : best;
        }, null).item;
    }

    function focusGrid(rowIndex, element, reason) {
        var data = grid();
        if (!data || !data.rows.length) {
            return false;
        }
        rowIndex = Math.max(0, Math.min(data.rows.length - 1, rowIndex));
        var row = data.rows[rowIndex];
        element = element || nearestProgram(row, lastTimelineCenter) || row.station;
        lastRow = rowIndex;
        if (!isStationLink(element)) {
            lastTimelineCenter = timelineCenter(element);
        }
        return focusElement(element, reason);
    }

    function focusHeader(index, reason) {
        var items = headerItems();
        if (!items.length) {
            return false;
        }
        index = Math.max(0, Math.min(items.length - 1, index));
        lastHeader = index;
        return focusElement(items[index], reason);
    }

    function focusControl(index, reason) {
        var items = topControls();
        if (!items.length) {
            return focusGrid(lastRow, null, reason);
        }
        index = Math.max(0, Math.min(items.length - 1, index));
        return focusElement(items[index], reason);
    }

    function closeProfile() {
        var account = headerAccount();
        if (account && account.getAttribute("aria-expanded") === "true") {
            account.click();
        }
        window.setTimeout(function () {
            focusElement(headerAccount(), "profile-close");
        }, 30);
        return true;
    }

    function handleProfile(event, menu, key, code) {
        var items = profileItems(menu);
        var index = items.indexOf(document.activeElement);
        if (key === "ArrowUp" || code === 38) {
            return focusElement(items[Math.max(0, index === -1 ? 0 : index - 1)], "profile-up");
        }
        if (key === "ArrowDown" || code === 40) {
            return focusElement(items[Math.min(items.length - 1, index + 1)], "profile-down");
        }
        if (key === "ArrowLeft" || key === "ArrowRight" || code === 37 || code === 39) {
            return focusElement(items[Math.max(0, index)], "profile-boundary");
        }
        if (key === "Enter" || code === 13) {
            if (index === -1) {
                return focusElement(items[0], "profile-entry");
            }
            items[index].click();
            return true;
        }
        if (
            key === "Escape" || key === "BrowserBack" || key === "ContextMenu" ||
            code === 27 || code === 166 || code === KEY_MENU || code === 8
        ) {
            return closeProfile();
        }
        return false;
    }

    function onKeyDown(event) {
        if (!epgPage()) {
            return;
        }
        var key = event.key;
        var code = event.which || event.keyCode;
        var dialog = activeDialog();
        if (dialog && handleDialog(dialog, key, code)) {
            consume(event);
            return;
        }
        var menu = profileMenu();
        if (menu && handleProfile(event, menu, key, code)) {
            consume(event);
            return;
        }

        var active = document.activeElement;
        var headers = headerItems();
        var controls = topControls();
        var position = locationInGrid(active);
        var handled = false;

        if (key === "ContextMenu" || code === KEY_MENU) {
            handled = headers.indexOf(active) !== -1 ?
                focusGrid(lastRow, null, "menu-to-grid") :
                focusHeader(lastHeader, "menu-to-header");
        } else if (headers.indexOf(active) !== -1) {
            var headerIndex = headers.indexOf(active);
            if (key === "ArrowLeft" || code === 37) {
                handled = focusHeader(headerIndex - 1, "header-left");
            } else if (key === "ArrowRight" || code === 39) {
                handled = focusHeader(headerIndex + 1, "header-right");
            } else if (key === "ArrowDown" || code === 40) {
                handled = focusControl(0, "header-to-controls");
            } else if (key === "ArrowUp" || code === 38) {
                handled = true;
            }
        } else if (controls.indexOf(active) !== -1) {
            var controlIndex = controls.indexOf(active);
            if (key === "ArrowLeft" || code === 37) {
                handled = focusControl(controlIndex - 1, "controls-left");
            } else if (key === "ArrowRight" || code === 39) {
                handled = focusControl(controlIndex + 1, "controls-right");
            } else if (key === "ArrowUp" || code === 38) {
                handled = focusHeader(lastHeader, "controls-to-header");
            } else if (key === "ArrowDown" || code === 40) {
                handled = focusGrid(0, null, "controls-to-grid");
            }
        } else if (position) {
            var data = grid();
            var row = data.rows[position.row];
            if (key === "ArrowLeft" || code === 37) {
                if (position.station || position.program === 0) {
                    handled = focusGrid(position.row, row.station, "grid-left-station");
                } else {
                    handled = focusGrid(
                        position.row, row.programs[position.program - 1], "grid-left"
                    );
                }
            } else if (key === "ArrowRight" || code === 39) {
                if (position.station) {
                    handled = focusGrid(
                        position.row, nearestProgram(row, lastTimelineCenter),
                        "station-to-program"
                    );
                } else {
                    handled = focusGrid(
                        position.row,
                        row.programs[Math.min(row.programs.length - 1, position.program + 1)],
                        "grid-right"
                    );
                }
            } else if (key === "ArrowUp" || code === 38) {
                if (position.row === 0) {
                    handled = focusControl(0, "grid-to-controls");
                } else if (position.station) {
                    handled = focusGrid(position.row - 1, data.rows[position.row - 1].station, "station-up");
                } else {
                    handled = focusGrid(position.row - 1, nearestProgram(
                        data.rows[position.row - 1], timelineCenter(active)
                    ), "grid-up");
                }
            } else if (key === "ArrowDown" || code === 40) {
                if (position.station) {
                    handled = focusGrid(position.row + 1, data.rows[
                        Math.min(data.rows.length - 1, position.row + 1)
                    ].station, "station-down");
                } else {
                    handled = focusGrid(position.row + 1, nearestProgram(
                        data.rows[Math.min(data.rows.length - 1, position.row + 1)],
                        timelineCenter(active)
                    ), "grid-down");
                }
            }
        } else if (
            key === "ArrowLeft" || key === "ArrowRight" ||
            key === "ArrowUp" || key === "ArrowDown" ||
            code === 37 || code === 38 || code === 39 || code === 40
        ) {
            handled = focusGrid(lastRow, null, "grid-entry");
        }

        if (key === "Enter" || code === 13) {
            if (!active || active === document.body || active.tagName === "MAIN") {
                handled = focusGrid(lastRow, null, "activate-entry");
            } else {
                var account = headerAccount();
                active.click();
                if (active === account) {
                    window.setTimeout(function () {
                        var openedMenu = profileMenu();
                        if (openedMenu) {
                            focusElement(profileItems(openedMenu)[0], "profile-open");
                        }
                    }, 80);
                } else if (locationInGrid(active)) {
                    focusDialogWhenReady(0);
                }
                console.log("[RTL+ EPG Navigation] activate=" + label(active));
                handled = true;
            }
        } else if (
            key === "Escape" || key === "BrowserBack" ||
            code === 27 || code === 166 || code === 8
        ) {
            window.history.back();
            handled = true;
        }

        if (handled) {
            consume(event);
        }
    }

    window.addEventListener("keydown", onKeyDown, true);
    console.log("[RTL+ EPG Navigation] installed 20260721-r1");
}());
