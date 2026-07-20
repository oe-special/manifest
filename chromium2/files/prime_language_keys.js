(function () {
	"use strict";

	var TRIGGER_TESTID = "pv-nav-locale-selector-dropdown-trigger";
	var DROPDOWN_TESTID = "pv-nav-locale-selector-dropdown";
	var ACCOUNT_TRIGGER_TESTID =
		"pv-nav-account-and-profiles-dropdown-trigger";
	var ACCOUNT_DROPDOWN_TESTID =
		"pv-nav-account-and-profiles-dropdown";
	var FOCUS_ATTR = "data-chromium-prime-focus";
	var KEY_LEFT = 37;
	var KEY_UP = 38;
	var KEY_RIGHT = 39;
	var KEY_DOWN = 40;
	var KEY_OK = 13;
	var KEY_SPACE = 32;

	function isPrimeHost() {
		return /(^|\.)primevideo\.com$|(^|\.)amazon\.[a-z.]+$/i.test(window.location.hostname);
	}

	function trigger() {
		var nodes = document.querySelectorAll(
			"button[data-testid=\"" + TRIGGER_TESTID + "\"]"
		);
		var i;
		for (i = 0; i < nodes.length; i += 1) {
			if (isVisible(nodes[i])) {
				return nodes[i];
			}
		}
		return nodes[0] || null;
	}

	function dropdownOpen() {
		var button = trigger();
		var dropdowns = document.querySelectorAll(
			"[data-testid=\"" + DROPDOWN_TESTID + "\"]"
		);
		var i;

		if (button && button.getAttribute("aria-expanded") === "true") {
			return true;
		}

		for (i = 0; i < dropdowns.length; i += 1) {
			if (
				dropdowns[i].getAttribute("aria-hidden") !== "true" &&
				isVisible(dropdowns[i])
			) {
				return true;
			}
		}
		return false;
	}

	function isVisible(element) {
		if (!element || element.disabled) {
			return false;
		}
		var style = window.getComputedStyle(element);
		if (
			style.display === "none" ||
			style.visibility === "hidden" ||
			style.opacity === "0"
		) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	function localeButtons() {
		var nodes = document.querySelectorAll(
			"button[data-testid^=\"pv-nav-locale-\"]"
		);
		var result = [];
		var i;
		for (i = 0; i < nodes.length; i += 1) {
			if (
				nodes[i].getAttribute("data-testid") !== TRIGGER_TESTID &&
				isVisible(nodes[i])
			) {
				result.push(nodes[i]);
			}
		}
		return result;
	}

	function accountTrigger() {
		var nodes = document.querySelectorAll(
			"button[data-testid=\"" + ACCOUNT_TRIGGER_TESTID + "\"]"
		);
		var i;
		for (i = 0; i < nodes.length; i += 1) {
			if (isVisible(nodes[i])) {
				return nodes[i];
			}
		}
		return nodes[0] || null;
	}

	function accountDropdownOpen() {
		var button = accountTrigger();
		var dropdowns = document.querySelectorAll(
			"[data-testid=\"" + ACCOUNT_DROPDOWN_TESTID + "\"]"
		);
		var i;

		if (button && button.getAttribute("aria-expanded") === "true") {
			return true;
		}
		for (i = 0; i < dropdowns.length; i += 1) {
			if (
				dropdowns[i].getAttribute("aria-hidden") !== "true" &&
				isVisible(dropdowns[i])
			) {
				return true;
			}
		}
		return false;
	}

	function accountItems() {
		var dropdowns = document.querySelectorAll(
			"[data-testid=\"" + ACCOUNT_DROPDOWN_TESTID + "\"]"
		);
		var result = [];
		var i;
		var j;
		for (i = 0; i < dropdowns.length; i += 1) {
			if (
				dropdowns[i].getAttribute("aria-hidden") === "true" ||
				!isVisible(dropdowns[i])
			) {
				continue;
			}
			var nodes = dropdowns[i].querySelectorAll(
				"a[data-testid],button[data-testid]"
			);
			for (j = 0; j < nodes.length; j += 1) {
				if (isVisible(nodes[j])) {
					result.push(nodes[j]);
				}
			}
		}
		return result;
	}

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		}
	}

	function markFocus(element) {
		var previous = document.querySelectorAll("[" + FOCUS_ATTR + "]");
		var i;
		for (i = 0; i < previous.length; i += 1) {
			previous[i].removeAttribute(FOCUS_ATTR);
		}
		if (!element) {
			return;
		}
		element.setAttribute(FOCUS_ATTR, "true");
		element.focus();
		if (element.scrollIntoView) {
			element.scrollIntoView({ block: "nearest", inline: "nearest" });
		}
	}

	function currentLanguageButton(buttons) {
		var lang = (document.documentElement.lang || "").toLowerCase();
		var fullSuffix = lang ? "-" + lang.replace(/_/g, "-") : "";
		var shortSuffix = lang ? "-" + lang.split(/[-_]/)[0] : "";
		var i;
		var testid;

		for (i = 0; i < buttons.length; i += 1) {
			testid = buttons[i].getAttribute("data-testid") || "";
			if (fullSuffix && testid.slice(-fullSuffix.length) === fullSuffix) {
				return buttons[i];
			}
		}
		for (i = 0; i < buttons.length; i += 1) {
			testid = buttons[i].getAttribute("data-testid") || "";
			if (
				shortSuffix &&
				testid.indexOf("pv-nav-locale" + shortSuffix + "-") === 0
			) {
				return buttons[i];
			}
		}
		return buttons[0] || null;
	}

	function focusLanguageSoon() {
		var attempts = 0;
		function focusWhenOpen() {
			var buttons = localeButtons();
			if (dropdownOpen() && buttons.length) {
				markFocus(currentLanguageButton(buttons));
				console.log("[Prime RCU] language menu focused");
				return;
			}
			attempts += 1;
			if (attempts < 8) {
				window.setTimeout(focusWhenOpen, 50);
			}
		}
		window.setTimeout(focusWhenOpen, 0);
	}

	function focusAccountSoon() {
		var attempts = 0;
		function focusWhenOpen() {
			var items = accountItems();
			var signIn = document.querySelector(
				"a[data-testid=\"pv-nav-sign-in\"]"
			);
			if (accountDropdownOpen() && items.length) {
				if (!signIn || items.indexOf(signIn) === -1) {
					signIn = items[0];
				}
				markFocus(signIn);
				console.log("[Prime RCU] account menu focused");
				return;
			}
			attempts += 1;
			if (attempts < 8) {
				window.setTimeout(focusWhenOpen, 50);
			}
		}
		window.setTimeout(focusWhenOpen, 0);
	}

	function center(rect) {
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2
		};
	}

	function nextSpatial(buttons, current, keyCode) {
		var from = center(current.getBoundingClientRect());
		var best = null;
		var bestScore = Number.POSITIVE_INFINITY;
		var i;

		for (i = 0; i < buttons.length; i += 1) {
			if (buttons[i] === current) {
				continue;
			}
			var to = center(buttons[i].getBoundingClientRect());
			var dx = to.x - from.x;
			var dy = to.y - from.y;
			var primary;
			var secondary;

			if (keyCode === KEY_LEFT && dx >= -1) {
				continue;
			}
			if (keyCode === KEY_RIGHT && dx <= 1) {
				continue;
			}
			if (keyCode === KEY_UP && dy >= -1) {
				continue;
			}
			if (keyCode === KEY_DOWN && dy <= 1) {
				continue;
			}

			if (keyCode === KEY_LEFT || keyCode === KEY_RIGHT) {
				primary = Math.abs(dx);
				secondary = Math.abs(dy);
			} else {
				primary = Math.abs(dy);
				secondary = Math.abs(dx);
			}

			var score = primary + secondary * 4;
			if (score < bestScore) {
				bestScore = score;
				best = buttons[i];
			}
		}
		return best;
	}

	function closestLocaleButton(element) {
		if (!element || !element.closest) {
			return null;
		}
		var button = element.closest("button[data-testid^=\"pv-nav-locale-\"]");
		if (!button || button.getAttribute("data-testid") === TRIGGER_TESTID) {
			return null;
		}
		return button;
	}

	function closestAccountItem(element) {
		if (!element || !element.closest) {
			return null;
		}
		var item = element.closest("a[data-testid],button[data-testid]");
		if (
			!item ||
			!item.closest(
				"[data-testid=\"" + ACCOUNT_DROPDOWN_TESTID + "\"]"
			)
		) {
			return null;
		}
		return item;
	}

	function handleKey(event) {
		var keyCode = event.which || event.keyCode;
		if (
			keyCode !== KEY_LEFT &&
			keyCode !== KEY_UP &&
			keyCode !== KEY_RIGHT &&
			keyCode !== KEY_DOWN &&
			keyCode !== KEY_OK &&
			keyCode !== KEY_SPACE
		) {
			return;
		}

		var active = document.activeElement;
		var activeTestid =
			active && active.getAttribute ? active.getAttribute("data-testid") : "";
		var button =
			activeTestid === TRIGGER_TESTID ? active : trigger();

		if (
			button &&
			activeTestid === TRIGGER_TESTID &&
			(keyCode === KEY_OK || keyCode === KEY_SPACE || keyCode === KEY_DOWN)
		) {
			consume(event);
			if (!dropdownOpen()) {
				button.click();
			}
			focusLanguageSoon();
			console.log("[Prime RCU] language menu opened");
			return;
		}

		if (dropdownOpen()) {
			var buttons = localeButtons();
			if (!buttons.length) {
				return;
			}

			var current = closestLocaleButton(active);
			if (keyCode === KEY_OK || keyCode === KEY_SPACE) {
				if (!current) {
					return;
				}
				consume(event);
				console.log(
					"[Prime RCU] language selected: " +
						(current.getAttribute("aria-label") || "")
				);
				current.click();
				return;
			}

			consume(event);
			if (!current || buttons.indexOf(current) === -1) {
				markFocus(currentLanguageButton(buttons));
				return;
			}

			var next = nextSpatial(buttons, current, keyCode);
			if (next) {
				markFocus(next);
			}
			return;
		}

		var accountButton =
			activeTestid === ACCOUNT_TRIGGER_TESTID ? active : accountTrigger();
		if (
			accountButton &&
			activeTestid === ACCOUNT_TRIGGER_TESTID &&
			(keyCode === KEY_OK || keyCode === KEY_SPACE || keyCode === KEY_DOWN)
		) {
			consume(event);
			if (!accountDropdownOpen()) {
				accountButton.click();
			}
			focusAccountSoon();
			console.log("[Prime RCU] account menu opened");
			return;
		}

		if (!accountDropdownOpen()) {
			return;
		}

		var items = accountItems();
		if (!items.length) {
			return;
		}
		var accountItem = closestAccountItem(active);
		if (keyCode === KEY_OK || keyCode === KEY_SPACE) {
			if (!accountItem) {
				return;
			}
			consume(event);
			console.log(
				"[Prime RCU] account action: " +
					(accountItem.getAttribute("aria-label") || "")
			);
			accountItem.click();
			return;
		}

		consume(event);
		if (!accountItem || items.indexOf(accountItem) === -1) {
			markFocus(items[0]);
			return;
		}
		var nextAccountItem = nextSpatial(items, accountItem, keyCode);
		if (nextAccountItem) {
			markFocus(nextAccountItem);
		}
	}

	function installStyle() {
		var style = document.createElement("style");
		style.type = "text/css";
		style.textContent =
			"[" +
			FOCUS_ATTR +
			"=\"true\"]{" +
			"outline:3px solid #ffffff!important;" +
			"outline-offset:2px!important;" +
			"box-shadow:0 0 0 3px #00a8e1!important;" +
			"}";
		(document.head || document.documentElement).appendChild(style);
	}

	if (!isPrimeHost() || window.__chromiumPrimeLanguageKeysInstalled) {
		return;
	}
	window.__chromiumPrimeLanguageKeysInstalled = true;
	installStyle();
	window.addEventListener("keydown", handleKey, true);
	console.log("[Prime RCU] header dropdown navigation installed");
}());
