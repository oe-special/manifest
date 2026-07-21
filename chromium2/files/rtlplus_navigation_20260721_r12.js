(function () {
    "use strict";

    if (window.__rtlPlusNavigation20260721R12) {
        return;
    }
    window.__rtlPlusNavigation20260721R12 = true;

    function fixScreenMetrics() {
        if (!window.screen || (screen.width > 1 && screen.height > 1)) {
            return false;
        }
        var width = Math.max(1, window.innerWidth || 1280);
        var height = Math.max(1, window.innerHeight || 720);
        try {
            ["width", "availWidth"].forEach(function (name) {
                Object.defineProperty(window.screen, name, {
                    configurable: true,
                    enumerable: true,
                    get: function () { return width; }
                });
            });
            ["height", "availHeight"].forEach(function (name) {
                Object.defineProperty(window.screen, name, {
                    configurable: true,
                    enumerable: true,
                    get: function () { return height; }
                });
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    var screenMetricsCorrected = fixScreenMetrics();

    var FOCUS_CLASS = "chromium-rtlplus-focus";
    var HOME_CLASS = "chromium-rtlplus-home";
    var NAV_CLASS = "chromium-rtlplus-managed";
    var ACTIVE_SECTION_CLASS = "chromium-rtlplus-active-section";
    var AD_CLASS = "chromium-rtlplus-ad";
    var WIDE_CARD_CLASS = "chromium-rtlplus-wide-card";
    var PORTRAIT_23_CARD_CLASS = "chromium-rtlplus-portrait-23-card";
    var PORTRAIT_34_CARD_CLASS = "chromium-rtlplus-portrait-34-card";
    var TALL_CARD_CLASS = "chromium-rtlplus-tall-card";
    var LANDSCAPE_CARD_CLASS = "chromium-rtlplus-landscape-card";
    var KEY_MENU = 0x5D;
    var lastItem = null;
    var lastRow = 0;
    var lastColumn = 0;
    var lastHeader = 0;
    var lastProfile = 0;
    var inHeader = false;
    var settleTimer = 0;

    var style = document.createElement("style");
    style.id = "chromium-rtlplus-navigation-style";
    style.textContent =
        "body." + HOME_CLASS + " main section." + ACTIVE_SECTION_CLASS + "{" +
            "content-visibility:visible!important;" +
            "contain:layout style paint!important;" +
        "}" +
        "body." + HOME_CLASS + " ." + AD_CLASS + "{" +
            "display:none!important;height:0!important;min-height:0!important;" +
            "margin:0!important;padding:0!important;overflow:hidden!important;" +
        "}" +
        "body." + HOME_CLASS + " footer{" +
            "display:none!important;height:0!important;min-height:0!important;" +
            "margin:0!important;padding:0!important;overflow:hidden!important;" +
        "}" +
        "body." + NAV_CLASS + " header{" +
            "display:block!important;position:sticky!important;top:0!important;" +
            "z-index:1000!important;height:72px!important;min-height:72px!important;" +
        "}" +
        "body." + NAV_CLASS + " header>div{display:block!important;}" +
        "body." + HOME_CLASS + " main section li." + WIDE_CARD_CLASS + "{" +
            "width:160px!important;max-width:160px!important;flex:0 0 160px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + WIDE_CARD_CLASS + " article{" +
            "width:152px!important;max-width:152px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + WIDE_CARD_CLASS + " picture," +
        "body." + HOME_CLASS + " main section li." + WIDE_CARD_CLASS + " img{" +
            "width:152px!important;height:40.53px!important;max-width:152px!important;" +
            "max-height:40.53px!important;object-fit:cover!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_23_CARD_CLASS + "{" +
            "width:196px!important;max-width:196px!important;flex:0 0 196px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_23_CARD_CLASS + " article{" +
            "width:180px!important;max-width:180px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_23_CARD_CLASS + " picture," +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_23_CARD_CLASS + " img{" +
            "width:180px!important;height:270px!important;max-width:180px!important;" +
            "max-height:270px!important;object-fit:cover!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_34_CARD_CLASS + "{" +
            "width:196px!important;max-width:196px!important;flex:0 0 196px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_34_CARD_CLASS + " article{" +
            "width:180px!important;max-width:180px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_34_CARD_CLASS + " picture," +
        "body." + HOME_CLASS + " main section li." + PORTRAIT_34_CARD_CLASS + " img{" +
            "width:180px!important;height:240px!important;max-width:180px!important;" +
            "max-height:240px!important;object-fit:cover!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + TALL_CARD_CLASS + "{" +
            "width:136px!important;max-width:136px!important;flex:0 0 136px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + TALL_CARD_CLASS + " article{" +
            "width:120px!important;max-width:120px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + TALL_CARD_CLASS + " picture," +
        "body." + HOME_CLASS + " main section li." + TALL_CARD_CLASS + " img{" +
            "width:120px!important;height:300px!important;max-width:120px!important;" +
            "max-height:300px!important;object-fit:cover!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + LANDSCAPE_CARD_CLASS + "{" +
            "width:296px!important;max-width:296px!important;flex:0 0 296px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + LANDSCAPE_CARD_CLASS + " article{" +
            "width:280px!important;max-width:280px!important;" +
        "}" +
        "body." + HOME_CLASS + " main section li." + LANDSCAPE_CARD_CLASS + " picture," +
        "body." + HOME_CLASS + " main section li." + LANDSCAPE_CARD_CLASS + " img{" +
            "width:280px!important;height:157.5px!important;max-width:280px!important;" +
            "max-height:157.5px!important;object-fit:cover!important;" +
        "}" +
        "." + FOCUS_CLASS + "{" +
            "outline:5px solid #00b7ff!important;" +
            "outline-offset:4px!important;" +
            "box-shadow:0 0 0 4px rgba(0,0,0,.82)!important;" +
            "position:relative!important;" +
            "z-index:20!important;" +
        "}";
    (document.head || document.documentElement).appendChild(style);

    var cappedImageCount = 0;

    function srcsetCandidateWidth(candidate) {
        var trimmed = candidate.trim();
        var separator = trimmed.search(/\s/);
        var descriptor = separator === -1 ? "" : trimmed.slice(separator).trim();
        var descriptorMatch = descriptor.match(/^(\d+(?:\.\d+)?)w$/);
        if (descriptorMatch) {
            return parseFloat(descriptorMatch[1]);
        }
        if (trimmed.indexOf("images-fio.rtlde.bedrock.tech") === -1) {
            return 0;
        }
        try {
            var rawUrl = separator === -1 ? trimmed : trimmed.slice(0, separator);
            return parseInt(new URL(rawUrl, window.location.href).searchParams.get("width"), 10) || 0;
        } catch (error) {
            return 0;
        }
    }

    function limitSrcset(value, maxWidth) {
        if (!value || value.indexOf("images-fio.rtlde.bedrock.tech") === -1) {
            return value;
        }
        var candidates = value.split(",").map(function (candidate) {
            return {raw: candidate.trim(), width: srcsetCandidateWidth(candidate)};
        });
        var measurable = candidates.filter(function (candidate) {
            return candidate.width > 0;
        });
        if (!measurable.length) {
            return value;
        }
        var allowed = measurable.filter(function (candidate) {
            return candidate.width <= maxWidth;
        });
        if (!allowed.length) {
            allowed = measurable.sort(function (left, right) {
                return left.width - right.width;
            }).slice(0, 1);
        }
        var limited = allowed.map(function (candidate) {
            return candidate.raw;
        }).join(", ");
        if (limited !== value) {
            cappedImageCount++;
            if (cappedImageCount === 1 || cappedImageCount % 10 === 0) {
                console.log("[RTL+ Navigation] limited-srcsets=" + cappedImageCount);
            }
        }
        return limited;
    }

    function limitImageUrl(value, maxWidth, maxHeight) {
        if (!value || value.indexOf("images-fio.rtlde.bedrock.tech") === -1) {
            return value;
        }
        try {
            var parsed = new URL(value, window.location.href);
            var width = parseInt(parsed.searchParams.get("width"), 10) || 0;
            var height = parseInt(parsed.searchParams.get("height"), 10) || 0;
            if (width > maxWidth) {
                parsed.searchParams.set("width", String(maxWidth));
            }
            if (height > maxHeight) {
                parsed.searchParams.set("height", String(maxHeight));
            }
            return parsed.href;
        } catch (error) {
            return value;
        }
    }

    function capEpgImageElement(element) {
        if (!element || element.nodeType !== 1) {
            return;
        }
        if (element.hasAttribute("src")) {
            var currentSrc = element.getAttribute("src");
            var limitedSrc = limitImageUrl(currentSrc, 256, 256);
            if (limitedSrc !== currentSrc) {
                element.setAttribute("src", limitedSrc);
            }
        }
        if (element.hasAttribute("srcset")) {
            var currentSrcset = element.getAttribute("srcset");
            var limitedSrcset = limitSrcset(currentSrcset, 256);
            if (limitedSrcset !== currentSrcset) {
                element.setAttribute("srcset", limitedSrcset);
            }
        }
    }

    function capEpgImagesIn(root) {
        if (!root || root.nodeType !== 1) {
            return;
        }
        if (root.matches("img,source")) {
            capEpgImageElement(root);
        }
        var images = root.querySelectorAll("img[src],img[srcset],source[srcset]");
        for (var index = 0; index < images.length; index++) {
            capEpgImageElement(images[index]);
        }
    }

    function capImageElement(element) {
        if (!element || element.nodeType !== 1) {
            return;
        }
        var section = element.closest("main section");
        var firstSection = document.querySelector("main section");
        var picture = element.tagName === "PICTURE" ? element : element.closest("picture");
        var ratio = picture && picture.style.getPropertyValue("--local-aspectRatio");
        var normalizedRatio = (ratio || "").replace(/\s+/g, "");
        var maxWidth = normalizedRatio === "15/4" ? 320 :
            normalizedRatio === "3/4" ? 360 :
            normalizedRatio === "2/3" ? 400 :
            normalizedRatio === "2/5" ? 320 :
            normalizedRatio === "16/9" ? 640 :
            section && section === firstSection ? 1280 : 640;
        if (!element.hasAttribute("srcset")) {
            return;
        }
        var current = element.getAttribute("srcset");
        var limited = limitSrcset(current, maxWidth);
        if (limited !== current) {
            element.setAttribute("srcset", limited);
        }
    }

    function capImagesIn(root) {
        if (!root || root.nodeType !== 1) {
            return;
        }
        if (epgPage()) {
            capEpgImagesIn(root);
            return;
        }
        if (root.matches("img,source")) {
            capImageElement(root);
        }
        var images = root.querySelectorAll("img[srcset],source[srcset]");
        for (var index = 0; index < images.length; index++) {
            capImageElement(images[index]);
        }
    }

    function classifyCard(item) {
        if (!item || epgPage()) {
            return;
        }
        var picture = item.querySelector("picture");
        var ratio = picture && picture.style.getPropertyValue("--local-aspectRatio");
        ratio = (ratio || "").replace(/\s+/g, "");
        if (ratio === "15/4") {
            item.classList.add(WIDE_CARD_CLASS);
        } else if (ratio === "2/3") {
            item.classList.add(PORTRAIT_23_CARD_CLASS);
        } else if (ratio === "3/4") {
            item.classList.add(PORTRAIT_34_CARD_CLASS);
        } else if (ratio === "2/5") {
            item.classList.add(TALL_CARD_CLASS);
        } else if (ratio === "16/9") {
            item.classList.add(LANDSCAPE_CARD_CLASS);
        }
    }

    function classifyCardsIn(root) {
        if (!root || root.nodeType !== 1 || epgPage()) {
            return;
        }
        var closestItem = root.matches("li[data-portal-key='portal']") ?
            root : root.closest("li[data-portal-key='portal']");
        classifyCard(closestItem);
        var items = root.querySelectorAll("li[data-portal-key='portal']");
        for (var index = 0; index < items.length; index++) {
            classifyCard(items[index]);
        }
    }

    function startImageCap() {
        if (!document.documentElement) {
            return;
        }
        capImagesIn(document.documentElement);
        classifyCardsIn(document.documentElement);
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === "attributes") {
                    if (epgPage()) {
                        if (
                            mutation.attributeName === "src" ||
                            mutation.attributeName === "srcset"
                        ) {
                            capEpgImageElement(mutation.target);
                        }
                        return;
                    }
                    if (mutation.attributeName === "srcset") {
                        capImageElement(mutation.target);
                    }
                    classifyCardsIn(mutation.target);
                    return;
                }
                for (var index = 0; index < mutation.addedNodes.length; index++) {
                    capImagesIn(mutation.addedNodes[index]);
                    classifyCardsIn(mutation.addedNodes[index]);
                }
            });
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src", "srcset", "style"]
        });
    }

    startImageCap();

    function rtlPage() {
        return window.top === window &&
            window.location.hostname === "plus.rtl.de";
    }

    function playerPage() {
        return /\/video\//.test(window.location.pathname);
    }

    function epgPage() {
        return window.location.pathname === "/tv-programm" ||
            window.location.pathname.indexOf("/tv-programm/") === 0;
    }

    function managedPage() {
        return rtlPage() && !playerPage() && !epgPage() &&
            Boolean(document.querySelector("main section"));
    }

    function headerAccount() {
        return document.querySelector(
            "#navEntryDropdown-btn," +
            "header #account," +
            "header button[aria-label*='Profil' i]," +
            "header a[aria-label*='Profil' i]," +
            "header button[aria-controls='account']"
        );
    }

    function ensureHeaderControls() {
        var account = headerAccount();
        if (!account) {
            return;
        }
        account.removeAttribute("hidden");
        account.style.setProperty("display", "inline-flex", "important");
        account.style.setProperty("visibility", "visible", "important");
        account.style.setProperty("opacity", "1", "important");
        account.style.setProperty("width", "40px", "important");
        account.style.setProperty("min-width", "40px", "important");
        account.style.setProperty("height", "40px", "important");
        if (account.parentElement) {
            account.parentElement.style.setProperty("display", "list-item", "important");
            account.parentElement.style.setProperty("visibility", "visible", "important");
            account.parentElement.style.setProperty("opacity", "1", "important");
        }
        if (account.parentElement && account.parentElement.parentElement) {
            account.parentElement.parentElement.style.setProperty(
                "overflow", "visible", "important"
            );
        }
    }

    function syncHomeClass() {
        if (document.body) {
            document.body.classList.toggle(HOME_CLASS, rtlPage());
            document.body.classList.toggle(NAV_CLASS, managedPage());
        }
        if (managedPage()) {
            ensureHeaderControls();
        }
        if (!rtlPage()) {
            clearActiveSections();
        }
    }

    function clearActiveSections() {
        var activeSections = document.querySelectorAll("main section." + ACTIVE_SECTION_CLASS);
        for (var index = 0; index < activeSections.length; index++) {
            activeSections[index].classList.remove(ACTIVE_SECTION_CLASS);
        }
    }

    function visible(element) {
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

    function modalOpen() {
        var selectors = [
            "#onetrust-pc-sdk",
            "#onetrust-banner-sdk",
            "[aria-modal='true']",
            "[role='dialog']"
        ];
        for (var selectorIndex = 0; selectorIndex < selectors.length; selectorIndex++) {
            var matches = document.querySelectorAll(selectors[selectorIndex]);
            for (var matchIndex = 0; matchIndex < matches.length; matchIndex++) {
                if (visible(matches[matchIndex])) {
                    return matches[matchIndex];
                }
            }
        }
        return null;
    }

    function inputOpen(event) {
        var target = event && event.target;
        var keyboard = document.querySelector(".crkeyboard");
        return Boolean(
            (keyboard && visible(keyboard)) ||
            (target && (
                target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" || target.isContentEditable
            ))
        );
    }

    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function label(element) {
        if (!element) {
            return "<none>";
        }
        var image = element.querySelector && element.querySelector("img[alt]");
        return (
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            (element.innerText || element.textContent || "").trim() ||
            (image && image.getAttribute("alt")) ||
            element.getAttribute("href") || element.id || element.tagName
        ).replace(/\s+/g, " ").slice(0, 90);
    }

    function uniqueVisible(items) {
        return items.filter(function (item, index) {
            return visible(item) && items.indexOf(item) === index;
        });
    }

    function headerItems() {
        var preferred = [
            "#brand", "#videotv", "#epggrid", "#sport", "#audio",
            "#search"
        ];
        var items = preferred.map(function (selector) {
            return document.querySelector("header " + selector);
        }).filter(Boolean);
        var account = headerAccount();
        if (account) {
            items.push(account);
        }
        var offers = document.querySelector("header #offers");
        if (offers) {
            items.push(offers);
        }
        if (!items.length) {
            items = Array.prototype.slice.call(
                document.querySelectorAll("header a[href],header button")
            );
        }
        return uniqueVisible(items);
    }

    function sectionItems(section) {
        var seenCards = [];
        var anchors = Array.prototype.slice.call(
            section.querySelectorAll("a[href]")
        ).filter(function (item) {
            return item.closest("section") === section &&
                !item.closest("[hidden],[aria-hidden='true']");
        });
        var cardItems = anchors.filter(function (item) {
            var card = item.closest("li,article");
            if (!card || seenCards.indexOf(card) !== -1) {
                return false;
            }
            seenCards.push(card);
            return true;
        });
        if (cardItems.length) {
            return cardItems;
        }
        return anchors;
    }

    function contentRows() {
        syncHomeClass();
        if (!managedPage()) {
            return [];
        }
        return Array.prototype.slice.call(
            document.querySelectorAll("main section")
        ).map(function (section) {
            return {
                section: section,
                items: sectionItems(section)
            };
        }).filter(function (row) {
            return row.items.length > 0;
        });
    }

    function prepareSection(section) {
        var adCandidates = section.querySelectorAll(
            "[data-ad],[data-ad-slot],[data-testid],[aria-label],[id],iframe[src]"
        );
        for (var adIndex = 0; adIndex < adCandidates.length; adIndex++) {
            var candidate = adCandidates[adIndex];
            var marker = [
                candidate.id || "",
                candidate.getAttribute("data-testid") || "",
                candidate.getAttribute("data-ad-slot") || "",
                candidate.getAttribute("aria-label") || "",
                candidate.getAttribute("src") || ""
            ].join(" ").toLowerCase();
            if (/(^|[\s_\/-])(advertisement|advert|werbung|ad-slot|ad-container|adspace)([\s_\/-]|$)/.test(marker)) {
                candidate.classList.add(AD_CLASS);
            }
        }
    }

    function activateSection(rows, rowIndex) {
        clearActiveSections();
        if (rows[rowIndex] && rows[rowIndex].section) {
            prepareSection(rows[rowIndex].section);
            rows[rowIndex].section.classList.add(ACTIVE_SECTION_CLASS);
        }
    }

    function horizontalScroller(item) {
        var parent = item && item.parentElement;
        while (parent && parent !== document.body) {
            var overflowX = window.getComputedStyle(parent).overflowX;
            if (
                parent.scrollWidth > parent.clientWidth + 4 &&
                overflowX !== "visible" && overflowX !== "clip"
            ) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    function reveal(item) {
        if (!item || !item.isConnected) {
            return;
        }
        var card = item.closest("article,li") || item;
        var cardRect = card.getBoundingClientRect();
        if (!item.closest("header,[role='menu']")) {
            var documentTop = cardRect.top + window.pageYOffset;
            var margin = 86;
            var desiredTop = cardRect.height > window.innerHeight - margin * 2 ?
                documentTop - margin :
                documentTop - (window.innerHeight - cardRect.height) / 2;
            window.scrollTo(window.pageXOffset, Math.max(0, desiredTop));
        }

        var scroller = horizontalScroller(item);
        if (scroller) {
            var scrollerRect = scroller.getBoundingClientRect();
            var itemRect = card.getBoundingClientRect();
            scroller.scrollLeft +=
                itemRect.left + itemRect.width / 2 -
                (scrollerRect.left + scrollerRect.width / 2);
        }
    }

    function settleFocus(item) {
        window.clearTimeout(settleTimer);
        var attempts = 0;
        function settle() {
            if (item !== lastItem || !item || !item.isConnected) {
                return;
            }
            try {
                item.focus({preventScroll: true});
            } catch (error) {
                item.focus();
            }
            reveal(item);
            attempts++;
            if (attempts < 3) {
                settleTimer = window.setTimeout(settle, attempts === 1 ? 90 : 220);
            }
        }
        settleTimer = window.setTimeout(settle, 20);
    }

    function focusElement(item, reason) {
        if (!item) {
            return false;
        }
        var previous = document.querySelector("." + FOCUS_CLASS);
        if (previous && previous !== item) {
            previous.classList.remove(FOCUS_CLASS);
        }
        try {
            item.focus({preventScroll: true});
        } catch (error) {
            item.focus();
        }
        item.classList.add(FOCUS_CLASS);
        lastItem = item;
        settleFocus(item);
        console.log("[RTL+ Navigation] focus=" + label(item) + " reason=" + reason);
        return true;
    }

    function findCurrent(rows) {
        var active = document.activeElement;
        for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            var column = rows[rowIndex].items.indexOf(active);
            if (column !== -1) {
                return {row: rowIndex, column: column};
            }
        }
        if (lastItem && lastItem.isConnected) {
            for (var lastRowIndex = 0; lastRowIndex < rows.length; lastRowIndex++) {
                var lastItemColumn = rows[lastRowIndex].items.indexOf(lastItem);
                if (lastItemColumn !== -1) {
                    return {row: lastRowIndex, column: lastItemColumn};
                }
            }
        }
        return null;
    }

    function focusContent(rowIndex, column, reason) {
        var rows = contentRows();
        if (!rows.length) {
            return false;
        }
        rowIndex = Math.max(0, Math.min(rows.length - 1, rowIndex));
        activateSection(rows, rowIndex);
        column = Math.max(0, Math.min(rows[rowIndex].items.length - 1, column));
        lastRow = rowIndex;
        lastColumn = column;
        inHeader = false;
        return focusElement(rows[rowIndex].items[column], reason);
    }

    function focusHeader(index, reason) {
        var items = headerItems();
        if (!items.length) {
            return false;
        }
        index = Math.max(0, Math.min(items.length - 1, index));
        lastHeader = index;
        inHeader = true;
        return focusElement(items[index], reason);
    }

    function profileMenu() {
        var account = headerAccount();
        if (!account || account.getAttribute("aria-expanded") !== "true") {
            return null;
        }
        var menus = document.querySelectorAll(
            "#navEntryDropdown-items,[role='menu']"
        );
        for (var index = 0; index < menus.length; index++) {
            if (visible(menus[index])) {
                return menus[index];
            }
        }
        return null;
    }

    function profileItems(menu) {
        if (!menu) {
            return [];
        }
        return uniqueVisible(Array.prototype.slice.call(menu.querySelectorAll(
            "[role='menuitem'],a[href],button"
        )).filter(function (item) {
            return item.closest("#navEntryDropdown-items,[role='menu']") === menu;
        }));
    }

    function focusProfile(menu, index, reason) {
        var items = profileItems(menu);
        if (!items.length) {
            return false;
        }
        index = Math.max(0, Math.min(items.length - 1, index));
        lastProfile = index;
        inHeader = true;
        return focusElement(items[index], reason);
    }

    function closeProfile(reason) {
        var account = headerAccount();
        if (account && account.getAttribute("aria-expanded") === "true") {
            account.click();
        }
        window.setTimeout(function () {
            var currentAccount = headerAccount();
            if (currentAccount) {
                focusElement(currentAccount, reason);
                lastHeader = Math.max(0, headerItems().indexOf(currentAccount));
                inHeader = true;
            }
        }, 30);
        return true;
    }

    function handleProfileKey(event, menu, key, code) {
        var items = profileItems(menu);
        var current = items.indexOf(document.activeElement);
        if (current !== -1) {
            lastProfile = current;
        }
        if (key === "ArrowUp" || code === 38) {
            return focusProfile(
                menu, current === -1 ? items.length - 1 : current - 1,
                "profile-up"
            );
        }
        if (key === "ArrowDown" || code === 40) {
            return focusProfile(
                menu, current === -1 ? 0 : current + 1,
                "profile-down"
            );
        }
        if (
            key === "ArrowLeft" || key === "ArrowRight" ||
            code === 37 || code === 39
        ) {
            return focusProfile(
                menu, current === -1 ? lastProfile : current,
                "profile-boundary"
            );
        }
        if (key === "Enter" || code === 13) {
            if (current === -1) {
                return focusProfile(menu, 0, "profile-entry");
            }
            items[current].click();
            console.log("[RTL+ Navigation] profile-activate=" + label(items[current]));
            return true;
        }
        if (
            key === "ContextMenu" || code === KEY_MENU ||
            key === "Escape" || key === "BrowserBack" ||
            code === 27 || code === 166 || code === 8
        ) {
            return closeProfile("profile-close");
        }
        return false;
    }

    function moveContent(direction) {
        var rows = contentRows();
        if (!rows.length) {
            return false;
        }
        var current = findCurrent(rows);
        if (!current) {
            return focusContent(lastRow, lastColumn, "content-entry");
        }
        if (direction === "left" || direction === "right") {
            var delta = direction === "left" ? -1 : 1;
            return focusContent(current.row, current.column + delta, direction);
        }
        if (direction === "up" && current.row === 0) {
            return focusHeader(lastHeader, "content-to-header");
        }
        var rowDelta = direction === "up" ? -1 : 1;
        var nextRow = Math.max(0, Math.min(rows.length - 1, current.row + rowDelta));
        return focusContent(nextRow, current.column, direction);
    }

    function moveHeader(direction) {
        var items = headerItems();
        if (!items.length) {
            return false;
        }
        var activeIndex = items.indexOf(document.activeElement);
        if (activeIndex === -1) {
            activeIndex = lastHeader;
        }
        if (direction === "left") {
            return focusHeader(activeIndex - 1, "header-left");
        }
        if (direction === "right") {
            return focusHeader(activeIndex + 1, "header-right");
        }
        if (direction === "down") {
            return focusContent(lastRow, lastColumn, "header-to-content");
        }
        return true;
    }

    function activateCurrent() {
        var active = document.activeElement;
        if (!active || active === document.body || active.tagName === "MAIN") {
            return focusContent(lastRow, lastColumn, "activate-entry");
        }
        var account = headerAccount();
        active.click();
        console.log("[RTL+ Navigation] activate=" + label(active));
        if (active === account) {
            window.setTimeout(function () {
                var menu = profileMenu();
                if (menu) {
                    focusProfile(menu, 0, "profile-open");
                }
            }, 80);
        }
        return true;
    }

    function onKeyDown(event) {
        if (!managedPage() || inputOpen(event)) {
            return;
        }

        var code = event.keyCode || event.which;
        var key = event.key;
        var menu = profileMenu();
        if (menu && handleProfileKey(event, menu, key, code)) {
            consume(event);
            return;
        }
        if (modalOpen()) {
            return;
        }
        var handled = false;

        if (key === "ContextMenu" || code === KEY_MENU) {
            handled = inHeader ?
                focusContent(lastRow, lastColumn, "menu-to-content") :
                focusHeader(lastHeader, "menu-to-header");
        } else if (key === "ArrowLeft" || code === 37) {
            handled = inHeader ? moveHeader("left") : moveContent("left");
        } else if (key === "ArrowRight" || code === 39) {
            handled = inHeader ? moveHeader("right") : moveContent("right");
        } else if (key === "ArrowUp" || code === 38) {
            handled = inHeader ? moveHeader("up") : moveContent("up");
        } else if (key === "ArrowDown" || code === 40) {
            handled = inHeader ? moveHeader("down") : moveContent("down");
        } else if (key === "Enter" || code === 13) {
            handled = activateCurrent();
        } else if (
            key === "Escape" || key === "BrowserBack" ||
            code === 27 || code === 166
        ) {
            if (inHeader) {
                handled = focusContent(lastRow, lastColumn, "back-to-content");
            } else {
                window.history.back();
                handled = true;
            }
        }

        if (handled) {
            consume(event);
        }
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.setInterval(syncHomeClass, 500);
    window.setTimeout(function () {
        syncHomeClass();
        var active = document.activeElement;
        if (managedPage() && (
            !active || active === document.body || active.tagName === "MAIN"
        )) {
            focusContent(0, 0, "initial");
        }
    }, 1200);

    syncHomeClass();
    console.log(
        "[RTL+ Navigation] installed 20260721-r12 screen=" +
        screen.width + "x" + screen.height +
        (screenMetricsCorrected ? " corrected" : "")
    );
}());
