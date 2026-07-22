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

	function onboardingControls() {
		var banner = document.querySelector("[data-testid='add-profile-banner']");
		if (!visible(banner))
			return null;
		var close = banner.querySelector(
			"[data-testid='onboardingbanner-closeIcon']"
		);
		var addProfile = banner.querySelector(
			"[data-testid^='onboardingbanner-button-']"
		);
		return {
			close: visible(close) ? close : null,
			addProfile: visible(addProfile) ? addProfile : null
		};
	}

	function text(element) {
		return [
			element.getAttribute("aria-label") || "",
			element.getAttribute("title") || "",
			element.innerText || "",
			element.textContent || ""
		].join(" ").replace(/\s+/g, " ").trim().toLowerCase();
	}

	function installChromium92LoginCompatibility() {
		if (window.location.pathname.indexOf("/identity/") === -1 ||
				document.getElementById("openatv-disney-login-compat"))
			return;
		var style = document.createElement("style");
		style.id = "openatv-disney-login-compat";
		style.textContent = [
			"body{",
			"--background_gradient:radial-gradient(circle at 20% 95%,#056877,#051828 96%);",
			"--button_primary_default_text:#fff;",
			"--button_primary_hover_text:#fff;",
			"--button_primary_active_text:#fff;",
			"--button_primary_focus_text:#fff;",
			"--button_primary_default:#30f;",
			"--button_primary_hover:#2700cd;",
			"--button_primary_active:#1c00a1;",
			"--button_primary_focus:#2700cd;",
			"--button_primary_loading:#30f;",
			"--button_primary_disabled:#a6b8ff;",
			"--checkbox_background_checked:#30f;",
			"--checkbox_border_checked:#30f;",
			"--media_object_full_border:#e6e8eb;",
			"--media_object_top_border:#ccced3;",
			"--toggle_bg_checked:#30f;",
			"--toggle_bg_checked_hover:#2700cd;",
			"--toggle_bg_checked_disabled:#c6d6ff;",
			"}",
			"div[data-theme='disneyPlus']{",
			"--button_primary_default:#000;",
			"--button_primary_hover:#252526;",
			"--button_primary_active:#000;",
			"--button_primary_focus:#252526;",
			"--button_primary_loading:#000;",
			"--button_primary_disabled:#252526;",
			"--checkbox_background_checked:#000;",
			"--checkbox_border_checked:#000;",
			"}",
			"@keyframes fade_in{0%{opacity:0}to{opacity:1}}",
			"@keyframes fade_out{0%{opacity:1}to{opacity:0}}",
			"@keyframes slide_mobile_container_down{",
			"0%{padding-bottom:32px;margin-top:0}",
			"to{padding-bottom:0;margin-top:32px}}",
			"@keyframes slide_mobile_container_up{",
			"0%{padding-bottom:0;margin-top:32px}",
			"to{padding-bottom:32px;margin-top:0}}",
			"@keyframes slide_secondary_container_down{",
			"0%{transform:translateY(0)}to{transform:translateY(20px)}}",
			"@keyframes slide_secondary_container_up{",
			"0%{transform:translateY(20px)}to{transform:translateY(0)}}",
			"@keyframes slide_web_container_down{",
			"0%{transform:translateY(0)}to{transform:translateY(60px)}}",
			"@keyframes slide_web_container_up{",
			"0%{transform:translateY(60px)}to{transform:translateY(0)}}",
			"@keyframes loader_ellipsis_1{",
			"0%{opacity:0;transform:scale(0)}",
			"to{opacity:.6;transform:scale(1)}}",
			"@keyframes loader_ellipsis_2{",
			"0%{transform:translate(0) scale(1);opacity:.6}",
			"to{transform:translate(14px) scale(1.25);opacity:1}}",
			"@keyframes loader_ellipsis_3{",
			"0%{transform:translate(0) scale(1.5);opacity:1}",
			"to{transform:translate(16px) scale(1);opacity:.6}}",
			"@keyframes loader_ellipsis_4{",
			"0%{transform:scale(1);opacity:.6}",
			"to{transform:scale(0);opacity:0}}",
			"@keyframes inputCaret{",
			"0%,25%{opacity:1}75%,to{opacity:.1}}"
		].join("");
		(document.head || document.documentElement).appendChild(style);
		console.log("[OpenATV Disney Navigation] Chromium 92 login CSS compatibility active");
	}

	function installFrozenHeroStyle() {
		if (document.getElementById("openatv-disney-frozen-hero"))
			return;
		var style = document.createElement("style");
		style.id = "openatv-disney-frozen-hero";
		style.textContent = [
			"[data-testid='hero-carousel-shelf-item']{",
			"animation:none!important;transition:none!important;",
			"}",
			"[data-testid='hero-carousel-shelf-item'] *{",
			"animation:none!important;transition:none!important;",
			"}",
			"[data-testid='hero-carousel-shelf-item']",
			"[data-openatv-hero-hidden='true']{display:none!important;}",
			"[data-testid='hero-carousel-shelf-item']",
			"[data-openatv-hero-primary='true']{",
			"display:block!important;opacity:1!important;",
			"visibility:visible!important;transform:none!important;",
			"}"
		].join("");
		(document.head || document.documentElement).appendChild(style);
	}

	var heroFreezeAttempts = 0;
	function freezeHeroCarousel() {
		var items = document.querySelectorAll(
			"[data-testid='hero-carousel-shelf-item']"
		);
		if (!items.length) {
			heroFreezeAttempts++;
			if (heroFreezeAttempts >= 30 && window.__openatvDisneyHeroTimer) {
				window.clearInterval(window.__openatvDisneyHeroTimer);
				window.__openatvDisneyHeroTimer = null;
			}
			return;
		}
		if (window.__openatvDisneyHeroTimer) {
			window.clearInterval(window.__openatvDisneyHeroTimer);
			window.__openatvDisneyHeroTimer = null;
		}
		items[0].setAttribute("data-openatv-hero-primary", "true");
		for (var index = 1; index < items.length; index++)
			items[index].setAttribute("data-openatv-hero-hidden", "true");

		var hero = items[0].closest("section") || items[0].parentElement;
		if (hero) {
			hero.dispatchEvent(new MouseEvent("mouseenter", {
				bubbles: true,
				cancelable: false,
				view: window
			}));
			hero.dispatchEvent(new PointerEvent("pointerenter", {
				bubbles: true,
				cancelable: false,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true
			}));
		}
		console.log("[OpenATV Disney Navigation] froze hero carousel at one item");
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

	function focus(element, label, scroll) {
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
		// The onboarding banner is fixed over a very tall home page. Calling
		// scrollIntoView() here scrolls the page behind it and makes Disney load
		// thousands of off-screen images, which can stall the Amlogic renderer.
		if (scroll !== false)
			element.scrollIntoView({block: "center", inline: "center"});
		if (window.console && typeof window.console.log === "function")
			window.console.log("[OpenATV Disney Navigation] focused " +
				(label || "control") + " " +
				"text=\"" + String(
					element.getAttribute("aria-label") ||
					element.textContent || ""
				).replace(/\s+/g, " ").trim().slice(0, 80) + "\"");
		return true;
	}

	function activateOnboardingControl(element) {
		if (!element)
			return false;
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
		// Disney binds this SVG through its interaction layer. A plain
		// element.click() is ignored, while the complete pointer/mouse sequence
		// is handled in the same way as a physical click.
		element.dispatchEvent(new PointerEvent("pointerdown", base));
		element.dispatchEvent(new MouseEvent("mousedown", base));
		base.buttons = 0;
		element.dispatchEvent(new PointerEvent("pointerup", base));
		element.dispatchEvent(new MouseEvent("mouseup", base));
		element.dispatchEvent(new MouseEvent("click", base));
		return true;
	}

	var onboardingDismissAttempts = 0;
	function dismissOnboardingBanner() {
		var banner = document.querySelector("[data-testid='add-profile-banner']");
		var close = banner && banner.querySelector(
			"[data-testid='onboardingbanner-closeIcon']"
		);
		if (!close) {
			onboardingDismissAttempts++;
			if (onboardingDismissAttempts >= 40 &&
					window.__openatvDisneyOnboardingTimer) {
				window.clearInterval(window.__openatvDisneyOnboardingTimer);
				window.__openatvDisneyOnboardingTimer = null;
			}
			return;
		}
		if (window.__openatvDisneyOnboardingTimer) {
			window.clearInterval(window.__openatvDisneyOnboardingTimer);
			window.__openatvDisneyOnboardingTimer = null;
		}
		activateOnboardingControl(close);
		console.log("[OpenATV Disney Navigation] dismissed add-profile banner");
	}

	function consume(event) {
		event.preventDefault();
		if (typeof event.stopImmediatePropagation === "function")
			event.stopImmediatePropagation();
		else
			event.stopPropagation();
	}

	function handleShelfNavigation(event) {
		var code = event.which || event.keyCode;
		var key = event.key || event.code || "";
		var step = 0;
		if (key === "ArrowLeft" || code === 37)
			step = -1;
		else if (key === "ArrowRight" || code === 39)
			step = 1;
		else
			return false;

		var active = document.activeElement;
		var current = active && active.closest &&
			active.closest("[data-testid='set-shelf-item']");
		var shelf = current && current.parentElement;
		if (!current || !shelf ||
				shelf.getAttribute("data-testid") !== "set-shelf")
			return false;

		var items = Array.prototype.filter.call(shelf.children, function (item) {
			return item.getAttribute &&
				item.getAttribute("data-testid") === "set-shelf-item";
		});
		var currentIndex = items.indexOf(current);
		var targetIndex = currentIndex + step;
		if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) {
			consume(event);
			return true;
		}

		var targetItem = items[targetIndex];
		var target = targetItem.querySelector(
			"a[data-testid='set-item'],button,[tabindex]"
		);
		if (!target) {
			consume(event);
			return true;
		}
		focus(target, "shelf item", false);
		var shelfRect = shelf.getBoundingClientRect();
		var targetRect = targetItem.getBoundingClientRect();
		var edge = 12;
		if (targetRect.left < shelfRect.left + edge) {
			shelf.scrollLeft += targetRect.left - shelfRect.left - edge;
		} else if (targetRect.right > shelfRect.right - edge) {
			shelf.scrollLeft += targetRect.right - shelfRect.right + edge;
		}
		consume(event);
		return true;
	}

	function handleOnboarding(event) {
		var controls = onboardingControls();
		if (!controls || !controls.close)
			return false;

		var code = event.which || event.keyCode;
		var key = event.key || event.code || "";
		var active = document.activeElement;
		var target = null;

		if (key === "Escape" || key === "BrowserBack" ||
				key === "Backspace" || code === 8 || code === 27 || code === 166) {
			activateOnboardingControl(controls.close);
			consume(event);
			return true;
		}

		if (key === "Enter" || code === 13) {
			if (active === controls.close || active === controls.addProfile) {
				activateOnboardingControl(active);
			} else {
				focus(controls.close, "onboarding close", false);
			}
			consume(event);
			return true;
		}

		if (key === "ArrowRight" || key === "ArrowUp" ||
				code === 39 || code === 38) {
			target = controls.close;
		} else if (key === "ArrowLeft" || key === "ArrowDown" ||
				code === 37 || code === 40) {
			target = controls.addProfile || controls.close;
		}

		if (!target)
			return false;
		focus(target, target === controls.close ?
			"onboarding close" : "onboarding add profile", false);
		consume(event);
		return true;
	}

	function onKeyDown(event) {
		if (handleOnboarding(event))
			return;
		if (handleShelfNavigation(event))
			return;
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
			focus(login, "login");
			consume(event);
		}
	}

	// Window capture runs before the generic document-level spatial handler.
	installChromium92LoginCompatibility();
	installFrozenHeroStyle();
	window.addEventListener("keydown", onKeyDown, true);
	if (window.__openatvDisneyOnboardingTimer)
		window.clearInterval(window.__openatvDisneyOnboardingTimer);
	onboardingDismissAttempts = 0;
	window.__openatvDisneyOnboardingTimer = window.setInterval(
		dismissOnboardingBanner,
		1000
	);
	dismissOnboardingBanner();
	if (window.__openatvDisneyHeroTimer)
		window.clearInterval(window.__openatvDisneyHeroTimer);
	heroFreezeAttempts = 0;
	window.__openatvDisneyHeroTimer = window.setInterval(
		freezeHeroCarousel,
		1000
	);
	freezeHeroCarousel();
	console.log("[OpenATV Disney Navigation] installed");
}());
