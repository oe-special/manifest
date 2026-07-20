(function () {
	"use strict";

	if (window.__openatvDisneyNavigationInstalled)
		return;
	window.__openatvDisneyNavigationInstalled = true;

	function isDisneyWelcome() {
		return /(^|\.)disneyplus\.com$/i.test(window.location.hostname) &&
			document.body && document.body.classList.contains("id-welcome");
	}

	function visible(element) {
		if (!element || element.disabled ||
				typeof element.getBoundingClientRect !== "function")
			return false;
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return rect.width > 2 && rect.height > 2 &&
			style.display !== "none" && style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01;
	}

	function modalOpen() {
		var selectors = [
			"#onetrust-pc-sdk",
			"#onetrust-banner-sdk",
			"[aria-modal='true']"
		];
		for (var index = 0; index < selectors.length; index++) {
			var elements = document.querySelectorAll(selectors[index]);
			for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
				if (visible(elements[elementIndex]))
					return true;
			}
		}
		return false;
	}

	function text(element) {
		return [
			element.getAttribute("aria-label") || "",
			element.getAttribute("title") || "",
			element.innerText || "",
			element.textContent || ""
		].join(" ").replace(/\s+/g, " ").trim().toLowerCase();
	}

	function loginButton() {
		var elements = Array.prototype.filter.call(
			document.querySelectorAll("a[href],button,[role='button']"),
			visible
		);
		var loginWords = /(^|[^a-z])(log\s*in|login|sign\s*in|anmelden|einloggen)([^a-z]|$)/i;
		var matches = elements.filter(function (element) {
			var href = element.getAttribute("href") || "";
			return loginWords.test(text(element)) ||
				/(^|\/)(login|signin|sign-in)(\/|$|\?)/i.test(href);
		});
		if (!matches.length) {
			// Disney occasionally renders the label in a nested client-side
			// component. Restrict the fallback to a rounded action in the
			// upper-right header area.
			matches = elements.filter(function (element) {
				var rect = element.getBoundingClientRect();
				return rect.top < window.innerHeight * 0.3 &&
					rect.left > window.innerWidth * 0.55 &&
					/(rounded-button|box-border)/.test(element.className || "");
			});
		}
		matches.sort(function (first, second) {
			var firstRect = first.getBoundingClientRect();
			var secondRect = second.getBoundingClientRect();
			return (firstRect.top - secondRect.top) ||
				(secondRect.right - firstRect.right);
		});
		return matches[0] || null;
	}

	function focus(element) {
		if (!element)
			return false;
		var previous = document.querySelectorAll(".chromium-rcu-focus");
		for (var index = 0; index < previous.length; index++)
			previous[index].classList.remove("chromium-rcu-focus");
		try {
			element.focus({preventScroll: true});
		} catch (error) {
			element.focus();
		}
		element.classList.add("chromium-rcu-focus");
		element.scrollIntoView({block: "center", inline: "center"});
		if (window.console && typeof window.console.log === "function")
			window.console.log("[OpenATV Disney Navigation] focused login " +
				"text=\"" + text(element).slice(0, 80) + "\"");
		return true;
	}

	function consume(event) {
		event.preventDefault();
		if (typeof event.stopImmediatePropagation === "function")
			event.stopImmediatePropagation();
		else
			event.stopPropagation();
	}

	function onKeyDown(event) {
		if (!isDisneyWelcome() || modalOpen())
			return;
		var code = event.which || event.keyCode;
		var direction = event.key || event.code || "";
		if (direction !== "ArrowUp" && direction !== "ArrowRight" &&
				code !== 38 && code !== 39)
			return;

		var login = loginButton();
		var active = document.activeElement;
		if (!login || active === login)
			return;

		var loginRect = login.getBoundingClientRect();
		var activeIsPage = !active || active === document.body ||
			active === document.documentElement;
		var activeRect = activeIsPage ? null : active.getBoundingClientRect();
		var nearPageTop = window.scrollY < window.innerHeight * 0.5;
		var upFromHero = (direction === "ArrowUp" || code === 38) &&
			nearPageTop && (activeIsPage ||
				(activeRect && activeRect.top > loginRect.bottom));
		var rightAcrossHeader = (direction === "ArrowRight" || code === 39) &&
			nearPageTop && activeRect &&
			Math.abs(
				(activeRect.top + activeRect.height / 2) -
				(loginRect.top + loginRect.height / 2)
			) < window.innerHeight * 0.22 &&
			activeRect.right <= loginRect.left;

		if (upFromHero || rightAcrossHeader) {
			focus(login);
			consume(event);
		}
	}

	// Window capture runs before the generic document-level spatial handler.
	window.addEventListener("keydown", onKeyDown, true);
	console.log("[OpenATV Disney Navigation] installed");
}());
