(function () {
	"use strict";

	var LEGACY_LOGIN =
		/^\/account\/flow\/[^/]+\/action\/login\/?$/i;
	var LOCALE_KEY = "chromium-paramount-locale";

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
			try {
				locale = window.sessionStorage.getItem(LOCALE_KEY) || "";
			} catch (error) {
				locale = "";
			}
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

	if (window.__chromiumParamountNavigationInstalled) {
		return;
	}
	window.__chromiumParamountNavigationInstalled = true;
	rememberLocale();

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

	console.log("[Paramount+ Navigation] installed r1 locale-login-redirect");
}());
