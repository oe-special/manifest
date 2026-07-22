(function () {
	"use strict";

	if (window.__openatvDaznNavigationR2Installed)
		return;
	window.__openatvDaznNavigationR2Installed = true;

	var style = document.createElement("style");
	style.id = "openatv-dazn-navigation-r2-style";
	style.textContent = [
		"#onetrust-banner-sdk button.chromium-rcu-focus,",
		"#onetrust-pc-sdk button.chromium-rcu-focus,",
		".openatv-dazn-focus{",
		"outline:5px solid #00b7ff!important;",
		"outline-offset:4px!important;",
		"box-shadow:0 0 0 4px #000,0 0 18px 8px #00b7ff!important;",
		"position:relative!important;z-index:2147483646!important;",
		"opacity:1!important;",
		"}",
		"a[class*='tile__link'].openatv-dazn-focus{",
		"transform:scale(1.035)!important;",
		"transform-origin:center center!important;",
		"}"
	].join("");
	(document.head || document.documentElement).appendChild(style);

	var state = {
		lastContent: null,
		column: 0
	};

	function visible(element) {
		if (!element || element.disabled)
			return false;
		if (element.closest && element.closest("[aria-hidden='true']"))
			return false;
		var rect = element.getBoundingClientRect();
		var css = window.getComputedStyle(element);
		return rect.width > 3 && rect.height > 3 &&
			css.display !== "none" && css.visibility !== "hidden" &&
			parseFloat(css.opacity || "1") > 0.01;
	}

	function removeFocus() {
		var focused = document.querySelectorAll(
			".chromium-rcu-focus,.openatv-dazn-focus"
		);
		for (var index = 0; index < focused.length; index++) {
			focused[index].classList.remove("chromium-rcu-focus");
			focused[index].classList.remove("openatv-dazn-focus");
		}
	}

	function focusElement(element, scrollVertically) {
		if (!element)
			return false;
		removeFocus();
		try {
			element.focus({preventScroll: true});
		} catch (error) {
			element.focus();
		}
		element.classList.add("chromium-rcu-focus");
		element.classList.add("openatv-dazn-focus");
		if (scrollVertically) {
			var top = element.getBoundingClientRect().top +
				(window.pageYOffset || document.documentElement.scrollTop || 0) - 140;
			window.scrollTo(0, Math.max(0, top));
		}
		return true;
	}

	function activateElement(element) {
		if (!element)
			return;
		var rect = element.getBoundingClientRect();
		var base = {
			bubbles: true,
			cancelable: true,
			view: window,
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
			button: 0,
			buttons: 1,
			pointerId: 1,
			pointerType: "mouse",
			isPrimary: true
		};
		element.dispatchEvent(new PointerEvent("pointerdown", base));
		element.dispatchEvent(new MouseEvent("mousedown", base));
		base.buttons = 0;
		element.dispatchEvent(new PointerEvent("pointerup", base));
		element.dispatchEvent(new MouseEvent("mouseup", base));
		element.dispatchEvent(new MouseEvent("click", base));
	}

	function consume(event) {
		event.preventDefault();
		if (typeof event.stopImmediatePropagation === "function")
			event.stopImmediatePropagation();
		else
			event.stopPropagation();
	}

	function cookieButtons() {
		return [
			document.getElementById("onetrust-accept-btn-handler"),
			document.getElementById("onetrust-reject-all-handler"),
			document.getElementById("onetrust-pc-btn-handler")
		].filter(visible);
	}

	function handleCookieDialog(event) {
		var buttons = cookieButtons();
		if (!buttons.length)
			return false;
		var code = event.which || event.keyCode;
		var index = buttons.indexOf(document.activeElement);
		if (index < 0)
			index = 0;
		if (code === 13) {
			activateElement(buttons[index]);
			consume(event);
			return true;
		}
		if (code === 37 || code === 38)
			index = Math.max(0, index - 1);
		else if (code === 39 || code === 40)
			index = Math.min(buttons.length - 1, index + 1);
		else
			return false;
		focusElement(buttons[index], false);
		consume(event);
		return true;
	}

	function isHomePage() {
		return /^\/(?:[a-z]{2}-[a-z]{2}\/)?home\/?$/i.test(location.pathname);
	}

	function headerItems() {
		var root = document.querySelector("[class*='header__header-wrapper']") ||
			document.querySelector("header");
		if (!root)
			return [];
		return Array.prototype.filter.call(
			root.querySelectorAll("a[href],button"), visible
		);
	}

	function heroButton() {
		var active = document.querySelector(
			"[class*='hero-banner-slider'] .swiper-slide-active button.tp-button"
		);
		if (visible(active))
			return active;
		var buttons = document.querySelectorAll(
			"[class*='hero-banner-slider'] button.tp-button"
		);
		for (var index = 0; index < buttons.length; index++) {
			if (visible(buttons[index]))
				return buttons[index];
		}
		return null;
	}

	function subNavItems() {
		return Array.prototype.filter.call(document.querySelectorAll(
			"button[class*='home-sub-nav__home-sub-nav-item-container']"
		), visible);
	}

	function rails() {
		return Array.prototype.filter.call(document.querySelectorAll(
			"[class*='rail__rail-wrapper']"
		), function (rail) {
			return rail.querySelector("a[class*='tile__link']");
		});
	}

	function railTiles(rail) {
		return Array.prototype.filter.call(rail.querySelectorAll(
			"a[class*='tile__link']"
		), function (tile) {
			var rect = tile.getBoundingClientRect();
			var css = window.getComputedStyle(tile);
			return rect.width > 3 && rect.height > 3 &&
				css.display !== "none" && css.visibility !== "hidden" &&
				parseFloat(css.opacity || "1") > 0.01;
		});
	}

	function ensureSubNavVisible(element) {
		var container = element.closest("[class*='home-sub-nav__nav-items-container']");
		var item = element.parentElement;
		if (!container || !item)
			return;
		var target = item.offsetLeft + item.offsetWidth / 2 -
			container.clientWidth / 2;
		container.scrollLeft = Math.max(0, target);
	}

	function focusSubNav(index) {
		var items = subNavItems();
		if (!items.length)
			return false;
		index = Math.max(0, Math.min(items.length - 1, index));
		ensureSubNavVisible(items[index]);
		return focusElement(items[index], true);
	}

	function railStart(rail) {
		var value = parseInt(rail.getAttribute("data-openatv-rail-start"), 10);
		return isNaN(value) ? 0 : value;
	}

	function setRailStart(rail, start) {
		var tiles = railTiles(rail);
		var wrapper = rail.querySelector(".swiper-wrapper");
		if (!tiles.length || !wrapper)
			return 0;
		var columns = Math.min(3, tiles.length);
		start = Math.max(0, Math.min(tiles.length - columns, start));
		var firstSlide = tiles[0].closest(".swiper-slide") || tiles[0].parentElement;
		var targetSlide = tiles[start].closest(".swiper-slide") ||
			tiles[start].parentElement;
		var offset = targetSlide.offsetLeft - firstSlide.offsetLeft;
		wrapper.style.transitionDuration = "220ms";
		wrapper.style.transform = "translate3d(" + (-offset) + "px,0,0)";
		for (var index = 0; index < tiles.length; index++) {
			var slide = tiles[index].closest(".swiper-slide");
			if (slide) {
				slide.setAttribute("aria-hidden",
					index >= start && index < start + columns ? "false" : "true");
			}
		}
		rail.setAttribute("data-openatv-rail-start", String(start));
		return start;
	}

	function focusRail(railIndex, tileIndex) {
		var allRails = rails();
		if (!allRails.length)
			return false;
		railIndex = Math.max(0, Math.min(allRails.length - 1, railIndex));
		var rail = allRails[railIndex];
		var tiles = railTiles(rail);
		if (!tiles.length)
			return false;
		tileIndex = Math.max(0, Math.min(tiles.length - 1, tileIndex));
		var start = railStart(rail);
		if (tileIndex < start)
			start = tileIndex;
		else if (tileIndex >= start + 3)
			start = tileIndex - 2;
		start = setRailStart(rail, start);
		state.column = Math.max(0, Math.min(2, tileIndex - start));
		state.lastContent = tiles[tileIndex];
		return focusElement(tiles[tileIndex], true);
	}

	function currentArea() {
		var active = document.activeElement;
		var headers = headerItems();
		var headerIndex = headers.indexOf(active);
		if (headerIndex >= 0)
			return {type: "header", index: headerIndex, items: headers};
		var hero = heroButton();
		if (active === hero)
			return {type: "hero", index: 0, element: hero};
		var subItems = subNavItems();
		var subIndex = subItems.indexOf(active);
		if (subIndex >= 0)
			return {type: "subnav", index: subIndex, items: subItems};
		var allRails = rails();
		for (var railIndex = 0; railIndex < allRails.length; railIndex++) {
			var tiles = railTiles(allRails[railIndex]);
			var tileIndex = tiles.indexOf(active);
			if (tileIndex >= 0) {
				return {
					type: "rail",
					railIndex: railIndex,
					tileIndex: tileIndex,
					element: active
				};
			}
		}
		return {type: "none"};
	}

	function focusHeader(index) {
		var items = headerItems();
		if (!items.length)
			return false;
		index = Math.max(0, Math.min(items.length - 1, index));
		return focusElement(items[index], false);
	}

	function handleHome(event) {
		if (!isHomePage() || document.querySelector(".crkeyboard"))
			return false;
		var code = event.which || event.keyCode;
		if ([13, 37, 38, 39, 40, 93].indexOf(code) < 0)
			return false;
		var area = currentArea();

		if (code === 93) {
			if (area.type === "header" && state.lastContent &&
					document.documentElement.contains(state.lastContent))
				focusElement(state.lastContent, true);
			else {
				if (area.element)
					state.lastContent = area.element;
				focusHeader(1);
			}
			consume(event);
			return true;
		}

		if (area.type === "none") {
			focusHeader(1);
			consume(event);
			return true;
		}

		if (code === 13) {
			activateElement(document.activeElement);
			consume(event);
			return true;
		}

		if (area.type === "header") {
			if (code === 37)
				focusHeader(area.index - 1);
			else if (code === 39)
				focusHeader(area.index + 1);
			else if (code === 40) {
				var hero = heroButton();
				if (hero)
					focusElement(hero, true);
				else
					focusSubNav(0);
			}
			consume(event);
			return true;
		}

		if (area.type === "hero") {
			if (code === 38)
				focusHeader(1);
			else if (code === 40)
				focusSubNav(0);
			consume(event);
			return true;
		}

		if (area.type === "subnav") {
			if (code === 37)
				focusSubNav(area.index - 1);
			else if (code === 39)
				focusSubNav(area.index + 1);
			else if (code === 38) {
				var heroAction = heroButton();
				if (heroAction)
					focusElement(heroAction, true);
				else
					focusHeader(1);
			} else if (code === 40)
				focusRail(0, state.column);
			consume(event);
			return true;
		}

		if (area.type === "rail") {
			if (code === 37)
				focusRail(area.railIndex, area.tileIndex - 1);
			else if (code === 39)
				focusRail(area.railIndex, area.tileIndex + 1);
			else if (code === 38) {
				if (area.railIndex === 0)
					focusSubNav(0);
				else {
					var previous = rails()[area.railIndex - 1];
					focusRail(area.railIndex - 1,
						railStart(previous) + state.column);
				}
			} else if (code === 40 && area.railIndex < rails().length - 1) {
				var next = rails()[area.railIndex + 1];
				focusRail(area.railIndex + 1,
					railStart(next) + state.column);
			}
			consume(event);
			return true;
		}
		return false;
	}

	function handleKeyDown(event) {
		if (handleCookieDialog(event))
			return;
		handleHome(event);
	}

	window.addEventListener("keydown", handleKeyDown, true);

	var focusAttempts = 0;
	window.__openatvDaznR2Timer = window.setInterval(function () {
		focusAttempts++;
		var buttons = cookieButtons();
		if (buttons.length && buttons.indexOf(document.activeElement) < 0)
			focusElement(buttons[0], false);
		else if (isHomePage() && currentArea().type === "none")
			focusHeader(1);
		if (focusAttempts >= 30) {
			window.clearInterval(window.__openatvDaznR2Timer);
			window.__openatvDaznR2Timer = null;
		}
	}, 500);

	console.log("[OpenATV DAZN Navigation] installed r2");
}());
