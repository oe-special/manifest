(function () {
    "use strict";

    if (window.__chromiumMagentaTvNavigation20260722R1) {
        return;
    }
    window.__chromiumMagentaTvNavigation20260722R1 = true;

    var FOCUS_CLASS = "chromium-magentatv-focus";
    var KEY_MENU = 0x5D;
    var SAFE_LEFT = 70;
    var SAFE_RIGHT = 1195;
    var rowsCache = null;
    var rowsCacheTime = 0;
    var lastCell = null;
    var pendingCell = null;
    var lastHeaderIndex = 0;
    var focusSerial = 0;

    function magentaPage() {
        var host = window.location.hostname.toLowerCase();
        return window.top === window && (
            host === "www.magenta.tv" || host === "magenta.tv" ||
            host === "web.magentatv.de" || host === "web2.magentatv.de"
        );
    }

    function rendered(element) {
        if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var css = window.getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 &&
            css.display !== "none" && css.visibility !== "hidden" &&
            parseFloat(css.opacity || "1") > 0.01;
    }

    function activeModal() {
        var selectors = [
            "#onetrust-pc-sdk", "#onetrust-banner-sdk",
            "[aria-modal='true']", "[role='dialog']"
        ];
        for (var selectorIndex = 0; selectorIndex < selectors.length; selectorIndex++) {
            var items = document.querySelectorAll(selectors[selectorIndex]);
            for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
                if (rendered(items[itemIndex])) {
                    return items[itemIndex];
                }
            }
        }
        return null;
    }

    function editable(element) {
        return Boolean(element && (
            element.isContentEditable || element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" || element.tagName === "SELECT"
        ));
    }

    function label(element) {
        return String(element && (
            element.getAttribute("aria-label") || element.title ||
            element.innerText || element.textContent || element.id
        ) || "<none>").replace(/\s+/g, " ").trim().slice(0, 120);
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function cellsForGrid(grid) {
        var minimumHeight = grid.id === "TILE-PARAGRAPH-BUTTON" ? 30 : 60;
        return Array.prototype.slice.call(grid.querySelectorAll("[role='gridcell']"))
            .filter(function (cell) {
                var rect = cell.getBoundingClientRect();
                return cell.closest("[role='grid']") === grid &&
                    !cell.closest("footer,[role='contentinfo']") &&
                    rect.width > 80 && rect.height > minimumHeight;
            });
    }

    function buildRows() {
        var grids = Array.prototype.slice.call(document.querySelectorAll("[role='grid']"));
        return grids.map(function (grid) {
            var cells = cellsForGrid(grid);
            if (!cells.length) {
                return null;
            }
            var rect = cells[0].getBoundingClientRect();
            return {
                grid: grid,
                cells: cells,
                pageCenter: rect.top + rect.height / 2 + window.scrollY
            };
        }).filter(Boolean).sort(function (left, right) {
            return left.pageCenter - right.pageCenter;
        });
    }

    function rows() {
        var now = Date.now();
        var detailGrid = document.getElementById("TILE-PARAGRAPH-BUTTON");
        var detailGridMissing = detailGrid && rowsCache && !rowsCache.some(function (row) {
            return row.grid === detailGrid;
        });
        if (
            !rowsCache || detailGridMissing || now - rowsCacheTime > 1500 || !rowsCache.length ||
            !rowsCache[0].grid.isConnected || !rowsCache[0].cells[0].isConnected
        ) {
            rowsCache = buildRows();
            rowsCacheTime = now;
        }
        return rowsCache;
    }

    function headerItems() {
        var ids = [
            "HEADER-LOGO", "MENU-TOGGLE-COLLAPSED", "MENU-EPG",
            "MENU-SEARCH", "MENU-USER", "MENU-LOGIN", "HEADER-CONVERSION"
        ];
        return ids.map(function (id) {
            return document.getElementById(id);
        }).filter(rendered);
    }

    function positionOf(element) {
        var cell = element && element.closest && element.closest("[role='gridcell']");
        if (!cell) {
            return null;
        }
        var allRows = rows();
        for (var rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
            var cellIndex = allRows[rowIndex].cells.indexOf(cell);
            if (cellIndex !== -1) {
                return {row: rowIndex, cell: cellIndex, element: cell};
            }
        }
        return null;
    }

    function laneButton(cell, suffix) {
        var grid = cell.closest("[role='grid']");
        if (!grid || !grid.parentElement) {
            return null;
        }
        var button = grid.parentElement.querySelector("button[id$='" + suffix + "']");
        if (!button || button.disabled) {
            return null;
        }
        var css = window.getComputedStyle(button);
        return css.display !== "none" && css.visibility !== "hidden" ? button : null;
    }

    function revealVertical(element) {
        var rect = element.getBoundingClientRect();
        var before = window.scrollY;
        if (rect.top < 155) {
            window.scrollBy(0, rect.top - 185);
        } else if (rect.bottom > window.innerHeight - 25) {
            window.scrollBy(0, rect.bottom - window.innerHeight + 45);
        }
        return window.scrollY !== before;
    }

    function focusRaw(element, visualElement) {
        visualElement = visualElement || element;
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous && previous !== visualElement) {
            previous.classList.remove(FOCUS_CLASS);
        }
        try {
            element.focus({preventScroll: true});
        } catch (error) {
            element.focus();
        }
        var generic = document.querySelector(".chromium-rcu-focus");
        if (generic && generic !== visualElement) {
            generic.classList.remove("chromium-rcu-focus");
        }
        visualElement.classList.add(FOCUS_CLASS);
    }

    function cardFocusTarget(cell) {
        return cell.querySelector("a[id$='-CONTENT'][href]") ||
            cell.querySelector("a[href]") || cell;
    }

    function stabilizeCell(gridId, cellIndex, serial, attempt) {
        if (!gridId || serial !== focusSerial || attempt > 3) {
            return;
        }
        window.setTimeout(function () {
            if (serial !== focusSerial) {
                return;
            }
            var grid = document.getElementById(gridId);
            var cells = grid ? cellsForGrid(grid) : [];
            var cell = cells[cellIndex];
            if (!cell) {
                return;
            }
            var active = document.activeElement;
            var activeCell = active && active.closest && active.closest("[role='gridcell']");
            if (activeCell !== cell) {
                cells.forEach(function (item) {
                    item.setAttribute("tabindex", item === cell ? "0" : "-1");
                });
                lastCell = cell;
                focusRaw(cardFocusTarget(cell), cell);
            }
            stabilizeCell(gridId, cellIndex, serial, attempt + 1);
        }, 80);
    }

    function focusCell(cell, reason) {
        if (!cell || !cell.isConnected) {
            return false;
        }
        var originalGrid = cell.closest("[role='grid']");
        var originalIndex = originalGrid ? cellsForGrid(originalGrid).indexOf(cell) : -1;
        var serial = ++focusSerial;
        lastCell = cell;
        if (revealVertical(cell) && originalGrid && originalGrid.id && originalIndex !== -1) {
            pendingCell = cell;
            window.setTimeout(function () {
                var movedGrid = document.getElementById(originalGrid.id);
                var movedCells = movedGrid ? cellsForGrid(movedGrid) : [];
                var movedCell = movedCells[originalIndex];
                if (serial !== focusSerial) {
                    return;
                }
                if (movedCell) {
                    focusCell(movedCell, reason + "-after-scroll");
                } else if (pendingCell === cell) {
                    pendingCell = null;
                }
            }, 120);
            return true;
        }

        var rect = cell.getBoundingClientRect();
        var pageButton = null;
        if (rect.left < SAFE_LEFT - 5) {
            pageButton = laneButton(cell, "-PAGE-PREVIOUS");
        } else if (rect.right > SAFE_RIGHT + 5) {
            pageButton = laneButton(cell, "-PAGE-NEXT");
        }
        if (pageButton) {
            pendingCell = cell;
            pageButton.click();
            window.setTimeout(function () {
                if (cell.isConnected) {
                    var movedGrid = cell.closest("[role='grid']");
                    if (movedGrid) {
                        cellsForGrid(movedGrid).forEach(function (item) {
                            item.setAttribute("tabindex", item === cell ? "0" : "-1");
                        });
                    }
                    focusRaw(cardFocusTarget(cell), cell);
                    revealVertical(cell);
                    stabilizeCell(movedGrid && movedGrid.id, originalIndex, serial, 0);
                }
                if (pendingCell === cell) {
                    pendingCell = null;
                }
            }, 140);
        } else {
            pendingCell = null;
            var grid = cell.closest("[role='grid']");
            if (grid) {
                cellsForGrid(grid).forEach(function (item) {
                    item.setAttribute("tabindex", item === cell ? "0" : "-1");
                });
            }
            focusRaw(cardFocusTarget(cell), cell);
            stabilizeCell(grid && grid.id, originalIndex, serial, 0);
        }
        console.log("[MagentaTV Navigation] focus=" + label(cell) + " reason=" + reason);
        return true;
    }

    function focusHeader(index, reason) {
        var items = headerItems();
        if (!items.length) {
            return false;
        }
        index = Math.max(0, Math.min(items.length - 1, index));
        focusSerial++;
        pendingCell = null;
        lastHeaderIndex = index;
        focusRaw(items[index]);
        console.log("[MagentaTV Navigation] header=" + label(items[index]) + " reason=" + reason);
        return true;
    }

    function nearestCell(row, desiredX) {
        if (!row || !row.cells.length) {
            return null;
        }
        return row.cells.reduce(function (best, cell) {
            var rect = cell.getBoundingClientRect();
            var distance = Math.abs(rect.left + rect.width / 2 - desiredX);
            return !best || distance < best.distance ?
                {cell: cell, distance: distance} : best;
        }, null).cell;
    }

    function nearestVisibleRow() {
        var allRows = rows();
        var desiredY = window.scrollY + Math.min(window.innerHeight * 0.42, 310);
        return allRows.reduce(function (best, row, index) {
            var distance = Math.abs(row.pageCenter - desiredY);
            return !best || distance < best.distance ?
                {row: row, index: index, distance: distance} : best;
        }, null);
    }

    function focusFromUnknown(active, direction) {
        var allRows = rows();
        if (!allRows.length) {
            return false;
        }
        var rect = active && active !== document.body ? active.getBoundingClientRect() : null;
        var pageY = rect ? rect.top + rect.height / 2 + window.scrollY :
            window.scrollY + window.innerHeight / 2;
        var desiredX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        var candidates;
        if (direction === "down") {
            candidates = allRows.filter(function (row) { return row.pageCenter > pageY + 12; });
        } else if (direction === "up") {
            candidates = allRows.filter(function (row) { return row.pageCenter < pageY - 12; }).reverse();
        } else {
            candidates = allRows.slice().sort(function (left, right) {
                return Math.abs(left.pageCenter - pageY) - Math.abs(right.pageCenter - pageY);
            });
        }
        var row = candidates[0] || nearestVisibleRow().row;
        return focusCell(nearestCell(row, desiredX), "entry-" + direction);
    }

    function activateCell(cell) {
        var target = cell.querySelector("a[href]") ||
            cell.querySelector("button,[role='button']") || cell;
        target.click();
        console.log("[MagentaTV Navigation] activate=" + label(cell));
        return true;
    }

    function onKeyDown(event) {
        if (!magentaPage() || activeModal() || editable(document.activeElement)) {
            return;
        }
        var key = event.key || "";
        var code = event.which || event.keyCode;
        var active = document.activeElement;
        // MagentaTV briefly moves its native roving focus to the first tile while
        // a lazy-rendered lane is repositioned. Keep our selected tile authoritative
        // so a quick second RCU key cannot continue from the wrong card.
        var navigationActive = pendingCell && pendingCell.isConnected ? pendingCell :
            lastCell && lastCell.isConnected && lastCell.classList.contains(FOCUS_CLASS) ?
                lastCell : active;
        var headers = headerItems();
        var headerIndex = headers.indexOf(active);
        var position = positionOf(navigationActive);
        var handled = false;

        if (key === "ContextMenu" || code === KEY_MENU) {
            handled = headerIndex !== -1 && lastCell && lastCell.isConnected ?
                focusCell(lastCell, "menu-to-content") :
                focusHeader(lastHeaderIndex, "menu-to-header");
        } else if (headerIndex !== -1) {
            if (key === "ArrowLeft" || code === 37) {
                handled = focusHeader(headerIndex - 1, "header-left");
            } else if (key === "ArrowRight" || code === 39) {
                handled = focusHeader(headerIndex + 1, "header-right");
            } else if (key === "ArrowDown" || code === 40) {
                var visibleRow = nearestVisibleRow();
                handled = visibleRow && focusCell(
                    nearestCell(visibleRow.row, active.getBoundingClientRect().left),
                    "header-to-content"
                );
            } else if (key === "ArrowUp" || code === 38) {
                handled = true;
            }
        } else if (position) {
            var allRows = rows();
            var row = allRows[position.row];
            var rect = position.element.getBoundingClientRect();
            var desiredX = rect.left + rect.width / 2;
            if (key === "ArrowLeft" || code === 37) {
                handled = focusCell(
                    row.cells[Math.max(0, position.cell - 1)], "content-left"
                );
            } else if (key === "ArrowRight" || code === 39) {
                handled = focusCell(
                    row.cells[Math.min(row.cells.length - 1, position.cell + 1)],
                    "content-right"
                );
            } else if (key === "ArrowUp" || code === 38) {
                handled = position.row === 0 ? focusHeader(lastHeaderIndex, "content-to-header") :
                    focusCell(nearestCell(allRows[position.row - 1], desiredX), "content-up");
            } else if (key === "ArrowDown" || code === 40) {
                handled = focusCell(nearestCell(
                    allRows[Math.min(allRows.length - 1, position.row + 1)], desiredX
                ), "content-down");
            }
        } else if (key === "ArrowLeft" || code === 37) {
            handled = focusFromUnknown(active, "left");
        } else if (key === "ArrowRight" || code === 39) {
            handled = focusFromUnknown(active, "right");
        } else if (key === "ArrowUp" || code === 38) {
            handled = focusFromUnknown(active, "up");
        } else if (key === "ArrowDown" || code === 40) {
            handled = focusFromUnknown(active, "down");
        }

        if (key === "Enter" || code === 13) {
            if (position) {
                handled = activateCell(position.element);
            } else if (headerIndex !== -1) {
                active.click();
                handled = true;
            }
        } else if (
            key === "Escape" || key === "BrowserBack" || key === "Backspace" ||
            code === 27 || code === 166 || code === 8
        ) {
            window.history.back();
            handled = true;
        }

        if (handled) {
            consume(event);
        }
    }

    var style = document.createElement("style");
    style.id = "chromium-magentatv-navigation-style";
    style.textContent = "." + FOCUS_CLASS + "{" +
        "outline:5px solid #00b7ff!important;outline-offset:4px!important;" +
        "box-shadow:0 0 0 4px rgba(0,0,0,.82)!important;" +
        "position:relative!important;z-index:20!important;}" +
        "." + FOCUS_CLASS + " a:focus{" +
        "outline:none!important;box-shadow:none!important;}";
    (document.head || document.documentElement).appendChild(style);

    window.__chromiumMagentaTvInvalidateRows = function () {
        rowsCache = null;
        rowsCacheTime = 0;
    };
    window.addEventListener("keydown", onKeyDown, true);
    console.log("[MagentaTV Navigation] installed 20260722-r1");
}());
