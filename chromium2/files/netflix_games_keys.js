(function () {
	"use strict";

	if (window.__openatvNetflixGamesKeysInstalled)
		return;
	window.__openatvNetflixGamesKeysInstalled = true;

	var ENTER = 13;
	var SPACE = 32;
	var YELLOW = 0xC3;
	var lastCandidateLog = 0;
	var focusTimer = null;
	var observer = null;

	function isGamePage() {
		return window.location.pathname.indexOf("/play-game/") === 0;
	}

	function log(message) {
		if (window.console && typeof window.console.log === "function")
			window.console.log("[OpenATV Netflix Games] " + message);
	}

	function visible(element) {
		if (!element || typeof element.getBoundingClientRect !== "function")
			return false;
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return rect.width > 0 && rect.height > 0 &&
			style.display !== "none" && style.visibility !== "hidden" &&
			style.opacity !== "0";
	}

	function elementText(element) {
		var values = [
			element.getAttribute && element.getAttribute("aria-label"),
			element.getAttribute && element.getAttribute("title"),
			element.getAttribute && element.getAttribute("data-uia"),
			element.value,
			element.innerText,
			element.textContent
		];
		return values.filter(function (value) {
			return typeof value === "string" && value.trim();
		}).join(" ").replace(/\s+/g, " ").trim().toLowerCase();
	}

	function collectRoots(root, roots) {
		if (!root || roots.indexOf(root) !== -1)
			return;
		roots.push(root);
		var elements;
		try {
			elements = root.querySelectorAll("*");
		} catch (error) {
			return;
		}
		for (var index = 0; index < elements.length; index++) {
			if (elements[index].shadowRoot)
				collectRoots(elements[index].shadowRoot, roots);
			if (elements[index].tagName === "IFRAME") {
				try {
					if (elements[index].contentDocument)
						collectRoots(elements[index].contentDocument, roots);
				} catch (error) {
					// Cross-origin game frames cannot be inspected from Netflix.
				}
			}
		}
	}

	function candidates() {
		var roots = [];
		var result = [];
		collectRoots(document, roots);
		roots.forEach(function (root) {
			var elements;
			try {
				elements = root.querySelectorAll(
					"button,[role='button'],a[href],input[type='button']," +
					"input[type='submit'],[tabindex]:not([tabindex='-1'])"
				);
			} catch (error) {
				return;
			}
			for (var index = 0; index < elements.length; index++) {
				if (visible(elements[index]) && result.indexOf(elements[index]) === -1)
					result.push(elements[index]);
			}
		});
		return result;
	}

	function continueButton() {
		var elements = candidates();
		var continueWords = /(^|[^a-z])(fortsetzen|continue|resume|weiter)([^a-z]|$)/i;
		for (var index = 0; index < elements.length; index++) {
			if (continueWords.test(elementText(elements[index])))
				return elements[index];
		}
		return null;
	}

	function describe(element) {
		if (!element)
			return "none";
		var text = elementText(element).slice(0, 100);
		return element.tagName.toLowerCase() +
			(element.id ? "#" + element.id : "") +
			(text ? " text=\"" + text + "\"" : "");
	}

	function focusContinue() {
		if (!isGamePage())
			return null;
		var button = continueButton();
		if (!button)
			return null;
		if (document.activeElement !== button && typeof button.focus === "function")
			button.focus();
		if (button.getAttribute("data-openatv-continue-focus") !== "1") {
			button.style.outline = "4px solid #ffd400";
			button.style.outlineOffset = "3px";
			button.setAttribute("data-openatv-continue-focus", "1");
		}
		return button;
	}

	function logCandidates() {
		var now = Date.now();
		if (now - lastCandidateLog < 1000)
			return;
		lastCandidateLog = now;
		var elements = candidates();
		log("no Continue button; active=" + describe(document.activeElement) +
			" candidates=" + elements.slice(0, 12).map(describe).join(" | "));
	}

	function activate(button, event) {
		if (typeof button.focus === "function")
			button.focus();
		if (typeof button.click === "function")
			button.click();
		if (event && typeof event.preventDefault === "function")
			event.preventDefault();
		if (event && typeof event.stopImmediatePropagation === "function")
			event.stopImmediatePropagation();
		else if (event && typeof event.stopPropagation === "function")
			event.stopPropagation();
		log("activated " + describe(button));
	}

	function onKeyDown(event) {
		if (!isGamePage())
			return;
		var keyCode = event.which || event.keyCode;
		var name = event.key || event.code || "";
		log("keydown key=" + name + " keyCode=" + keyCode +
			" active=" + describe(document.activeElement));

		if (keyCode !== ENTER && keyCode !== SPACE && keyCode !== YELLOW &&
				name !== "Enter" && name !== "NumpadEnter" && name !== "ColorYellow")
			return;

		var button = focusContinue();
		if (button)
			activate(button, event);
		else
			logCandidates();
	}

	function scheduleFocus() {
		if (!isGamePage())
			return;
		window.clearTimeout(focusTimer);
		focusTimer = window.setTimeout(focusContinue, 100);
	}

	function watchPage() {
		if (!document.documentElement) {
			window.setTimeout(watchPage, 100);
			return;
		}
		observer = new MutationObserver(scheduleFocus);
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["aria-label", "tabindex"]
		});
		scheduleFocus();
	}

	// Window capture runs before the gaming client's document-level keyboard
	// sink. Keys are consumed only when the Continue overlay was actually found.
	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("popstate", scheduleFocus, true);
	window.addEventListener("hashchange", scheduleFocus, true);
	window.setInterval(scheduleFocus, 2000);
	watchPage();
	log("installed");
}());
