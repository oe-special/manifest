(function () {
	"use strict";

	var LEGACY_LOGIN =
		/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?account\/flow\/[^/]+\/action\/login\/?$/i;
	var LOCALE_KEY = "chromium-paramount-locale";
	var REGION_REDIRECT_KEY = "chromium-paramount-region-redirect";
	var SUPPORTED_REGIONS = {
		ar: true, at: true, au: true, br: true, ca: true, ch: true,
		cl: true, co: true, de: true, dk: true, es: true, fi: true,
		fr: true, gb: true, it: true, mx: true, nl: true, no: true,
		pe: true, se: true
	};

	function localeFromPath(pathname) {
		var match = /^\/([a-z]{2}(?:-[a-z]{2})?)(?:\/|$)/i.exec(
			pathname || ""
		);
		return match ? match[1].toLowerCase() : "";
	}

	function rememberLocale() {
		var locale = localeFromPath(window.location.pathname);
		if (!locale) {
			return;
		}
		try {
			window.sessionStorage.setItem(LOCALE_KEY, locale);
		} catch (error) {
			/* Storage can be disabled without affecting navigation. */
		}
		try {
			window.localStorage.setItem(LOCALE_KEY, locale);
			window.sessionStorage.removeItem(REGION_REDIRECT_KEY);
		} catch (error) {
			/* Persistent locale storage is an optional enhancement. */
		}
	}

	function storedLocale() {
		var locale = "";
		try {
			locale = window.sessionStorage.getItem(LOCALE_KEY) || "";
		} catch (error) {
			locale = "";
		}
		if (!locale) {
			try {
				locale = window.localStorage.getItem(LOCALE_KEY) || "";
			} catch (error) {
				locale = "";
			}
		}
		if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(locale)) {
			return locale.toLowerCase();
		}
		var language = (
			window.navigator.language ||
			(window.navigator.languages && window.navigator.languages[0]) ||
			""
		).replace("_", "-").toLowerCase();
		var parts = language.split("-");
		var candidates = parts.length > 1 ?
			[parts[parts.length - 1], parts[0]] :
			[parts[0]];
		var i;
		for (i = 0; i < candidates.length; i += 1) {
			var candidate = candidates[i] === "uk" ? "gb" : candidates[i];
			if (SUPPORTED_REGIONS[candidate]) {
				return candidate;
			}
		}
		return "";
	}

	function restoreRegionalPath() {
		var pathname = window.location.pathname;
		if (
			localeFromPath(pathname) ||
			/\/(?:video|watch|live-tv)\//i.test(pathname) ||
			!/^\/(?:home|browse|movies|shows|collections|brands|search)(?:\/|$)/i.test(pathname)
		) {
			return false;
		}
		var locale = storedLocale();
		if (!locale) {
			return false;
		}
		var destination = "/" + locale + pathname +
			window.location.search + window.location.hash;
		try {
			if (window.sessionStorage.getItem(REGION_REDIRECT_KEY) === destination) {
				console.log(
					"[Paramount+ Navigation] regional redirect refused loop " +
						destination
				);
				return false;
			}
			window.sessionStorage.setItem(REGION_REDIRECT_KEY, destination);
		} catch (error) {
			/* Continue without a loop marker if storage is unavailable. */
		}
		console.log(
			"[Paramount+ Navigation] restoring locale " +
				locale + " path=" + destination
		);
		window.location.replace(destination);
		return true;
	}

	function signInPath() {
		var locale = localeFromPath(window.location.pathname);
		if (!locale && document.referrer) {
			try {
				locale = localeFromPath(new URL(document.referrer).pathname);
			} catch (error) {
				locale = "";
			}
		}
		if (!locale) {
			locale = storedLocale();
		}
		if (!locale) {
			locale = localeFromPath(
				"/" +
					(
						document.documentElement.getAttribute("lang") || ""
					).split("-")[0] +
					"/"
			);
		}
		/*
		 * With no trustworthy region, return to Paramount's neutral entry
		 * point and let its geo/account redirect establish the locale.
		 */
		return locale ? "/" + locale + "/account/signin/" : "/";
	}

	function loginUrl(anchor) {
		if (!anchor || !anchor.getAttribute) {
			return null;
		}
		var href = anchor.getAttribute("href");
		if (!href) {
			return null;
		}
		try {
			return new URL(href, window.location.href);
		} catch (error) {
			return null;
		}
	}

	function isLegacyLogin(url) {
		return (
			url &&
			url.origin === window.location.origin &&
			LEGACY_LOGIN.test(url.pathname)
		);
	}

	function rewriteLoginLinks(root) {
		var scope = root && root.querySelectorAll ? root : document;
		var links = scope.querySelectorAll("a[href]");
		var rewritten = 0;
		var i;
		for (i = 0; i < links.length; i += 1) {
			if (isLegacyLogin(loginUrl(links[i]))) {
				links[i].setAttribute("href", signInPath());
				rewritten += 1;
			}
		}
		if (rewritten) {
			console.log(
				"[Paramount+ Navigation] rewrote legacy login links=" +
					rewritten
			);
		}
	}

	function onClick(event) {
		var target = event.target;
		var anchor = target && target.closest ?
			target.closest("a[href]") :
			null;
		if (!isLegacyLogin(loginUrl(anchor))) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		var destination = signInPath();
		console.log(
			"[Paramount+ Navigation] login redirect " +
				destination
		);
		window.location.assign(destination);
	}

	var NEWSLETTER_CONTROL = [
		".rf-market-checkbox",
		".policy-link",
		".rfmodal-button-no",
		".rfmodal-button-yes"
	].join(",");

	function visible(element) {
		if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
			return false;
		}
		var rect = element.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2) {
			return false;
		}
		var style = window.getComputedStyle(element);
		return style.display !== "none" &&
			style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01;
	}

	function newsletterModal() {
		var markers = document.querySelectorAll(
			".rfmodal-button-no,.rfmodal-button-yes"
		);
		var i;
		for (i = 0; i < markers.length; i += 1) {
			if (!visible(markers[i])) {
				continue;
			}
			var node = markers[i].parentElement;
			var fallback = null;
			while (node && node !== document.body) {
				if (
					node.querySelector(".rfmodal-button-no") &&
					node.querySelector(".rfmodal-button-yes")
				) {
					fallback = node;
					if (node.querySelector(".rf-market-checkbox,.policy-link")) {
						return node;
					}
				}
				node = node.parentElement;
			}
			return fallback;
		}
		return null;
	}

	function newsletterControls(root) {
		if (!root) {
			return [];
		}
		return Array.prototype.filter.call(
			root.querySelectorAll(NEWSLETTER_CONTROL),
			visible
		);
	}

	function focusNewsletterControl(element) {
		if (!element) {
			return false;
		}
		try {
			element.focus({preventScroll: true});
		} catch (error) {
			element.focus();
		}
		element.classList.add("chromium-rcu-focus");
		try {
			element.scrollIntoView({block: "center", inline: "center"});
		} catch (error) {
			element.scrollIntoView(false);
		}
		return true;
	}

	function newsletterDistance(from, to, direction) {
		var fx = from.left + from.width / 2;
		var fy = from.top + from.height / 2;
		var tx = to.left + to.width / 2;
		var ty = to.top + to.height / 2;
		var primary;
		var secondary;
		if (direction === "left") {
			primary = fx - tx;
			secondary = Math.abs(fy - ty);
		} else if (direction === "right") {
			primary = tx - fx;
			secondary = Math.abs(fy - ty);
		} else if (direction === "up") {
			primary = fy - ty;
			secondary = Math.abs(fx - tx);
		} else {
			primary = ty - fy;
			secondary = Math.abs(fx - tx);
		}
		return primary > 1 ? primary * 1000 + secondary * 10 : Infinity;
	}

	function moveNewsletter(root, direction) {
		var controls = newsletterControls(root);
		if (!controls.length) {
			return false;
		}
		var current = controls.indexOf(document.activeElement) !== -1 ?
			document.activeElement :
			root.querySelector(".rfmodal-button-no") || controls[0];
		if (controls.indexOf(document.activeElement) === -1) {
			return focusNewsletterControl(current);
		}
		var currentRect = current.getBoundingClientRect();
		var best = null;
		var bestScore = Infinity;
		controls.forEach(function (control) {
			if (control === current) {
				return;
			}
			var score = newsletterDistance(
				currentRect,
				control.getBoundingClientRect(),
				direction
			);
			if (score < bestScore) {
				best = control;
				bestScore = score;
			}
		});
		return focusNewsletterControl(best);
	}

	function onNewsletterKey(event) {
		var root = newsletterModal();
		if (!root) {
			return;
		}
		var code = event.keyCode || event.which;
		var handled = false;
		if (event.key === "ArrowLeft" || code === 37) {
			handled = moveNewsletter(root, "left");
		} else if (event.key === "ArrowUp" || code === 38) {
			handled = moveNewsletter(root, "up");
		} else if (event.key === "ArrowRight" || code === 39) {
			handled = moveNewsletter(root, "right");
		} else if (event.key === "ArrowDown" || code === 40) {
			handled = moveNewsletter(root, "down");
		} else if (event.key === "Enter" || code === 13) {
			var controls = newsletterControls(root);
			var active = controls.indexOf(document.activeElement) !== -1 ?
				document.activeElement :
				root.querySelector(".rfmodal-button-no");
			if (active && visible(active)) {
				active.click();
				handled = true;
			}
		} else if (
			event.key === "Escape" ||
			event.key === "BrowserBack" ||
			code === 27 ||
			code === 166
		) {
			var decline = root.querySelector(".rfmodal-button-no");
			if (decline && visible(decline)) {
				decline.click();
				handled = true;
			}
		}
		if (handled) {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		}
	}

	var focusedNewsletterModal = null;
	function focusNewsletterModal() {
		var root = newsletterModal();
		if (!root) {
			focusedNewsletterModal = null;
			return;
		}
		var controls = newsletterControls(root);
		if (
			root !== focusedNewsletterModal ||
			controls.indexOf(document.activeElement) === -1
		) {
			focusedNewsletterModal = root;
			focusNewsletterControl(
				root.querySelector(".rfmodal-button-no") || controls[0]
			);
		}
	}

	if (window.__chromiumParamountNavigationInstalled) {
		return;
	}
	window.__chromiumParamountNavigationInstalled = true;
	rememberLocale();
	if (restoreRegionalPath()) {
		return;
	}

	if (LEGACY_LOGIN.test(window.location.pathname)) {
		var destination = signInPath();
		console.log(
			"[Paramount+ Navigation] replacing forbidden legacy login " +
				window.location.pathname +
				" with " +
				destination
		);
		window.location.replace(destination);
		return;
	}

	document.addEventListener("click", onClick, true);
	window.addEventListener("keydown", onNewsletterKey, true);
	window.setInterval(focusNewsletterModal, 300);
	rewriteLoginLinks(document);

	new MutationObserver(function (records) {
		var i;
		for (i = 0; i < records.length; i += 1) {
			if (records[i].type === "childList" && records[i].addedNodes.length) {
				rewriteLoginLinks(document);
				return;
			}
		}
	}).observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	console.log("[Paramount+ Navigation] installed r5 browser-locale-region");
}());
