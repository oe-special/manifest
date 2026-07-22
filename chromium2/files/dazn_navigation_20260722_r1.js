(function () {
	"use strict";

	if (window.__openatvDaznNavigationInstalled)
		return;
	window.__openatvDaznNavigationInstalled = true;

	var style = document.createElement("style");
	style.id = "openatv-dazn-navigation-style";
	style.textContent = [
        "#onetrust-banner-sdk button.openatv-dazn-focus,",
        "#onetrust-banner-sdk button.chromium-rcu-focus,",
        "#onetrust-pc-sdk button.openatv-dazn-focus,",
        "#onetrust-pc-sdk button.chromium-rcu-focus{",
		"outline:5px solid #00b7ff!important;",
		"outline-offset:4px!important;",
		"box-shadow:0 0 0 4px #000,0 0 18px 8px #00b7ff!important;",
		"position:relative!important;z-index:2147483647!important;",
		"transform:scale(1.04)!important;opacity:1!important;",
		"}"
	].join("");
	(document.head || document.documentElement).appendChild(style);

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
		var previousDazn = document.querySelector(".openatv-dazn-focus");
		if (previousDazn)
			previousDazn.classList.remove("openatv-dazn-focus");
		try {
			button.focus({preventScroll: true});
		} catch (error) {
			button.focus();
		}
		button.classList.add("chromium-rcu-focus");
		button.classList.add("openatv-dazn-focus");
		return true;
	}

	function activateButton(button) {
		var rect = button.getBoundingClientRect();
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
		button.dispatchEvent(new PointerEvent("pointerdown", base));
		button.dispatchEvent(new MouseEvent("mousedown", base));
		base.buttons = 0;
		button.dispatchEvent(new PointerEvent("pointerup", base));
		button.dispatchEvent(new MouseEvent("mouseup", base));
		button.dispatchEvent(new MouseEvent("click", base));
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
			console.log("[OpenATV DAZN Navigation] activate " + selected.id +
				" keyCode=" + code);
			activateButton(selected);
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
		console.log("[OpenATV DAZN Navigation] focus " +
			document.activeElement.id + " keyCode=" + code);
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
