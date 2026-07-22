(function () {
	"use strict";

	if (window.__openatvDaznNavigationInstalled)
		return;
	window.__openatvDaznNavigationInstalled = true;

	function visible(element) {
		if (!element || element.disabled)
			return false;
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return rect.width > 2 && rect.height > 2 &&
			style.display !== "none" && style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01;
	}

	function cookieButtons() {
		return [
			document.getElementById("onetrust-accept-btn-handler"),
			document.getElementById("onetrust-reject-all-handler"),
			document.getElementById("onetrust-pc-btn-handler")
		].filter(visible);
	}

	function focusButton(button) {
		if (!button)
			return false;
		var previous = document.querySelector(".chromium-rcu-focus");
		if (previous)
			previous.classList.remove("chromium-rcu-focus");
		try {
			button.focus({preventScroll: true});
		} catch (error) {
			button.focus();
		}
		button.classList.add("chromium-rcu-focus");
		return true;
	}

	function consume(event) {
		event.preventDefault();
		if (typeof event.stopImmediatePropagation === "function")
			event.stopImmediatePropagation();
		else
			event.stopPropagation();
	}

	function handleCookieDialog(event) {
		var buttons = cookieButtons();
		if (!buttons.length)
			return;
		var code = event.which || event.keyCode;
		var key = event.key || event.code || "";
		var source = event.target;
		if (source && source.closest)
			source = source.closest("button") || source;
		var currentIndex = buttons.indexOf(source);
		if (currentIndex < 0)
			currentIndex = buttons.indexOf(document.activeElement);

		if (key === "Enter" || code === 13) {
			var selected = currentIndex >= 0 ? buttons[currentIndex] : buttons[0];
			selected.click();
			consume(event);
			return;
		}

		var step = 0;
		if (key === "ArrowUp" || key === "ArrowLeft" ||
				code === 38 || code === 37)
			step = -1;
		else if (key === "ArrowDown" || key === "ArrowRight" ||
				code === 40 || code === 39)
			step = 1;
		else
			return;
		if (currentIndex < 0)
			currentIndex = 0;
		var targetIndex = currentIndex + step;
		if (targetIndex >= 0 && targetIndex < buttons.length)
			focusButton(buttons[targetIndex]);
		else
			focusButton(buttons[currentIndex]);
		consume(event);
	}

	var focusAttempts = 0;
	function focusCookieDialog() {
		var buttons = cookieButtons();
		if (buttons.length) {
			if (buttons.indexOf(document.activeElement) < 0)
				focusButton(buttons[0]);
			if (window.__openatvDaznCookieTimer) {
				window.clearInterval(window.__openatvDaznCookieTimer);
				window.__openatvDaznCookieTimer = null;
			}
			return;
		}
		focusAttempts++;
		if (focusAttempts >= 30 && window.__openatvDaznCookieTimer) {
			window.clearInterval(window.__openatvDaznCookieTimer);
			window.__openatvDaznCookieTimer = null;
		}
	}

	window.addEventListener("keydown", handleCookieDialog, true);
	window.__openatvDaznCookieTimer = window.setInterval(
		focusCookieDialog,
		500
	);
	focusCookieDialog();
	console.log("[OpenATV DAZN Navigation] installed r1");
}());
