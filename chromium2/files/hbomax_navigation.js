(function () {
	"use strict";

	var KEY_MENU = 0x5D;
	var HEADER_FOCUS_CLASS = "chromium-hbomax-header-focus";
	var CARD_FOCUS_CLASS = "chromium-hbomax-card-focus";
	var DETAIL_FOCUS_CLASS = "chromium-hbomax-detail-focus";
	var TILE_LINK_SELECTOR =
		'a[class*="StyledTileLink"],a[data-testid*="tile"][href]';
	var ROW_SELECTOR =
		'[id="tileList"],[class*="StyledList-Fuse-Web-Play"]';
	var lastContent = null;
	var lastCard = null;
	var lastDetailControl = null;
	var headerMode = false;
	var loginFocusedControl = null;

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function visible(element) {
		if (
			!element ||
			element.disabled ||
			element.getAttribute("aria-hidden") === "true"
		) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return (
			rect.width > 1 &&
			rect.height > 1 &&
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01
		);
	}

	function loginControl() {
		var selectors = [
			'a[href*="auth.hbomax.com/login"]',
			'a[href*="auth.max.com/login"]',
			'a[href*="/login"]',
			'a[href*="/sign-in"]'
		];
		var i;
		for (i = 0; i < selectors.length; i += 1) {
			var control = document.querySelector(selectors[i]);
			if (visible(control)) {
				return control;
			}
		}
		return null;
	}

	function navigationRoot() {
		var login = loginControl();
		if (login) {
			return login.closest("nav,[role=\"navigation\"],header") ||
				login.parentElement;
		}
		return document.querySelector("nav,[role=\"navigation\"],header");
	}

	function headerControls() {
		var root = navigationRoot();
		if (!root) {
			return [];
		}
		return Array.prototype.slice.call(
			root.querySelectorAll("a[href],button,[role=\"button\"]")
		).filter(visible).sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			return (
				(leftRect.left + leftRect.width / 2) -
				(rightRect.left + rightRect.width / 2)
			);
		});
	}

	function controlLabel(control) {
		return (
			control.getAttribute("aria-label") ||
			(control.textContent || "").trim().slice(0, 80) ||
			control.getAttribute("href") ||
			"control"
		);
	}

	function clearHeaderFocus() {
		Array.prototype.forEach.call(
			document.querySelectorAll("." + HEADER_FOCUS_CLASS),
			function (control) {
				control.classList.remove(HEADER_FOCUS_CLASS);
			}
		);
	}

	function focusHeader(control, reason) {
		if (!control) {
			return false;
		}
		var card = selectedCard();
		if (card) {
			lastCard = card;
		}
		clearCardSelection();
		clearDetailSelection();
		clearHeaderFocus();
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		control.classList.add(HEADER_FOCUS_CLASS);
		control.scrollIntoView({
			block: "nearest",
			inline: "nearest"
		});
		headerMode = true;
		console.log(
			"[HBO Max Navigation] header " +
				controlLabel(control) +
				" reason=" +
				reason
		);
		return true;
	}

	function contentControl() {
		if (
			lastContent &&
			document.documentElement.contains(lastContent) &&
			visible(lastContent)
		) {
			return lastContent;
		}

		var root = document.querySelector("main") || document.body;
		var navigation = navigationRoot();
		var controls = Array.prototype.slice.call(
			root.querySelectorAll(
				"a[href],button,[tabindex]," +
				"[role=\"button\"],[role=\"link\"]," +
				"input,select,textarea"
			)
		).filter(function (control) {
			return (
				visible(control) &&
				(!navigation || !navigation.contains(control))
			);
		});
		return controls[0] || null;
	}

	function focusContent(reason) {
		if (hasHeroActions()) {
			var detail = selectedDetailControl() ||
				preferredDetailControl();
			if (detail) {
				return focusDetailControl(detail, reason);
			}
		}
		var browseCard = selectedCard() || (
			lastCard &&
			document.documentElement.contains(lastCard) &&
			visible(lastCard) ?
				lastCard :
				firstPageCard()
		);
		if (browseCard) {
			return focusCard(browseCard, reason);
		}
		var control = contentControl();
		if (!control) {
			return false;
		}
		clearHeaderFocus();
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		control.scrollIntoView({
			block: "center",
			inline: "nearest"
		});
		headerMode = false;
		lastContent = control;
		console.log(
			"[HBO Max Navigation] content " +
				controlLabel(control) +
				" reason=" +
				reason
		);
		return true;
	}

	function enterHeader() {
		var active = document.activeElement;
		var navigation = navigationRoot();
		if (
			active &&
			active !== document.body &&
			(!navigation || !navigation.contains(active)) &&
			visible(active)
		) {
			lastContent = active;
		}

		return focusHeader(
			loginControl() || headerControls()[0],
			"menu-key"
		);
	}

	function toggleHeader() {
		var navigation = navigationRoot();
		var active = document.activeElement;
		if (
			headerMode ||
			(navigation && active && navigation.contains(active))
		) {
			return focusContent("menu-return");
		}
		return enterHeader();
	}

	function moveHeader(direction) {
		var controls = headerControls();
		if (!controls.length) {
			return false;
		}

		var active = document.activeElement;
		var index = controls.indexOf(active);
		if (index < 0) {
			index = controls.indexOf(loginControl());
		}
		if (index < 0) {
			index = direction > 0 ? -1 : controls.length;
		}

		var targetIndex = Math.max(
			0,
			Math.min(controls.length - 1, index + direction)
		);
		return focusHeader(
			controls[targetIndex],
			direction < 0 ? "left" : "right"
		);
	}

	function isDetailPage() {
		return (
			window.location.hostname === "play.hbomax.com" &&
			/^\/(?:movie|show|series|feature)\//.test(
				window.location.pathname
			)
		);
	}

	function hasHeroActions() {
		return (
			isDetailPage() ||
			(
				window.location.hostname === "play.hbomax.com" &&
				window.location.pathname === "/"
			)
		);
	}

	function detailLabel(control) {
		return (
			control.getAttribute("aria-label") ||
			control.getAttribute("title") ||
			(control.textContent || "").trim() ||
			""
		);
	}

	function isPlayControl(control) {
		return /\b(?:play|abspielen|ansehen|fortsetzen|weiterschauen|resume)\b/i
			.test(detailLabel(control));
	}

	function detailControls() {
		if (!hasHeroActions()) {
			return [];
		}
		var root = document.querySelector("main") || document.body;
		var navigation = navigationRoot();
		var controls = Array.prototype.slice.call(
			root.querySelectorAll(
				"button:not([disabled]),a[href],[role=\"button\"]"
			)
		).filter(function (control, index, all) {
			return (
				visible(control) &&
				all.indexOf(control) === index &&
				(!navigation || !navigation.contains(control)) &&
				!control.matches(TILE_LINK_SELECTOR) &&
				!control.closest(ROW_SELECTOR) &&
				!control.closest('[class*="TileAction"]') &&
				!control.matches('[class*="SkipNavLink"]') &&
				!control.matches('[class*="StyledHeroSurfaceButton"]')
			);
		});

		var play = controls.filter(isPlayControl)[0];
		if (play) {
			var playRect = play.getBoundingClientRect();
			controls = controls.filter(function (control) {
				var rect = control.getBoundingClientRect();
				var overlap =
					Math.min(playRect.bottom, rect.bottom) -
					Math.max(playRect.top, rect.top);
				return overlap >
					Math.max(6, Math.min(playRect.height, rect.height) * 0.25);
			});
		}

		return controls.sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			if (Math.abs(leftRect.top - rightRect.top) > 12) {
				return leftRect.top - rightRect.top;
			}
			return leftRect.left - rightRect.left;
		});
	}

	function preferredDetailControl() {
		var controls = detailControls();
		return controls.filter(isPlayControl)[0] || controls[0] || null;
	}

	function selectedDetailControl() {
		var selected = document.querySelector("." + DETAIL_FOCUS_CLASS);
		return (
			selected &&
			document.documentElement.contains(selected) &&
			visible(selected) ?
				selected :
				null
		);
	}

	function clearDetailSelection() {
		Array.prototype.forEach.call(
			document.querySelectorAll("." + DETAIL_FOCUS_CLASS),
			function (control) {
				control.classList.remove(DETAIL_FOCUS_CLASS);
			}
		);
	}

	function focusDetailControl(control, reason) {
		if (!control) {
			return false;
		}
		clearHeaderFocus();
		clearGenericFocus();
		clearCardSelection();
		clearDetailSelection();
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		control.classList.add(DETAIL_FOCUS_CLASS);
		control.scrollIntoView({
			block: "center",
			inline: "nearest"
		});
		headerMode = false;
		lastDetailControl = control;
		lastContent = control;
		console.log(
			"[HBO Max Navigation] action " +
				detailLabel(control).slice(0, 100) +
				" reason=" +
				reason
		);
		return true;
	}

	function detailControlFromElement(element) {
		var controls = detailControls();
		if (controls.indexOf(element) >= 0) {
			return element;
		}
		if (lastDetailControl && controls.indexOf(lastDetailControl) >= 0) {
			return lastDetailControl;
		}
		return null;
	}

	function handleDetailKey(keyCode, event) {
		if (
			keyCode !== 13 &&
			keyCode !== 37 &&
			keyCode !== 38 &&
			keyCode !== 39 &&
			keyCode !== 40
		) {
			return false;
		}
		var controls = detailControls();
		if (!controls.length) {
			return false;
		}
		var control = selectedDetailControl() ||
			detailControlFromElement(document.activeElement);
		if (!control) {
			return focusDetailControl(
				preferredDetailControl(),
				"detail-entry"
			);
		}
		var index = controls.indexOf(control);
		if (keyCode === 37 || keyCode === 39) {
			var targetIndex = Math.max(
				0,
				Math.min(
					controls.length - 1,
					index + (keyCode === 37 ? -1 : 1)
				)
			);
			return focusDetailControl(
				controls[targetIndex],
				keyCode === 37 ? "left" : "right"
			);
		}
		if (keyCode === 38) {
			return enterHeader();
		}
		if (keyCode === 40) {
			var card = firstPageCard();
			return card ? focusCard(card, "detail-down") : true;
		}
		if (keyCode === 13 && !event.repeat) {
			console.log(
				"[HBO Max Navigation] action activate " +
					detailLabel(control).slice(0, 100)
			);
			control.click();
			return true;
		}
		return false;
	}

	function allCards() {
		var navigation = navigationRoot();
		return Array.prototype.slice.call(
			document.querySelectorAll(TILE_LINK_SELECTOR)
		).filter(function (card, index, cards) {
			return (
				visible(card) &&
				(!navigation || !navigation.contains(card)) &&
				cards.indexOf(card) === index
			);
		});
	}

	function cardLabel(card) {
		if (!card) {
			return "card";
		}
		return (
			card.getAttribute("aria-label") ||
			card.getAttribute("title") ||
			(card.querySelector("[aria-label]") &&
				card.querySelector("[aria-label]").getAttribute("aria-label")) ||
			(card.textContent || "").trim().slice(0, 80) ||
			card.getAttribute("href") ||
			"card"
		);
	}

	function selectedCard() {
		var selected = document.querySelector("." + CARD_FOCUS_CLASS);
		return (
			selected &&
			document.documentElement.contains(selected) &&
			visible(selected) ?
				selected :
				null
		);
	}

	function clearCardSelection() {
		Array.prototype.forEach.call(
			document.querySelectorAll("." + CARD_FOCUS_CLASS),
			function (card) {
				card.classList.remove(CARD_FOCUS_CLASS);
			}
		);
	}

	function rowForCard(card) {
		return card && card.closest(ROW_SELECTOR);
	}

	function cardsInRow(card) {
		var cards = allCards();
		var row = rowForCard(card);
		if (row) {
			cards = cards.filter(function (candidate) {
				return row.contains(candidate);
			});
		} else {
			var sourceRect = card.getBoundingClientRect();
			cards = cards.filter(function (candidate) {
				var rect = candidate.getBoundingClientRect();
				var overlap =
					Math.min(sourceRect.bottom, rect.bottom) -
					Math.max(sourceRect.top, rect.top);
				return overlap >
					Math.max(8, Math.min(sourceRect.height, rect.height) * 0.35);
			});
		}
		return cards.sort(function (left, right) {
			return (
				left.getBoundingClientRect().left -
				right.getBoundingClientRect().left
			);
		});
	}

	function visibleHorizontalAmount(card) {
		var rect = card.getBoundingClientRect();
		return Math.max(
			0,
			Math.min(rect.right, window.innerWidth - 32) -
				Math.max(rect.left, 32)
		);
	}

	function firstVisibleCard(cards) {
		var best = null;
		var bestVisible = -1;
		cards.forEach(function (card) {
			var amount = visibleHorizontalAmount(card);
			if (
				amount > bestVisible ||
				(amount === bestVisible &&
					best &&
					card.getBoundingClientRect().left <
						best.getBoundingClientRect().left)
			) {
				best = card;
				bestVisible = amount;
			}
		});
		return best || cards[0] || null;
	}

	function firstPageCard() {
		var cards = allCards();
		var onScreen = cards.filter(function (card) {
			var rect = card.getBoundingClientRect();
			return (
				rect.bottom > 80 &&
				rect.top < window.innerHeight &&
				visibleHorizontalAmount(card) > 0
			);
		});
		if (onScreen.length) {
			cards = onScreen;
		}
		return cards.sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			if (Math.abs(leftRect.top - rightRect.top) > 12) {
				return leftRect.top - rightRect.top;
			}
			return leftRect.left - rightRect.left;
		})[0] || null;
	}

	function cardFromElement(element) {
		if (!element || !element.closest) {
			return null;
		}
		var direct = element.closest(TILE_LINK_SELECTOR);
		if (direct) {
			return direct;
		}
		var parent = element;
		var depth = 0;
		while (parent && depth < 7) {
			var links = parent.querySelectorAll ?
				parent.querySelectorAll(TILE_LINK_SELECTOR) :
				[];
			if (links.length === 1 && visible(links[0])) {
				return links[0];
			}
			parent = parent.parentElement;
			depth += 1;
		}
		return null;
	}

	function ensureCardVisible(card) {
		var row = rowForCard(card);
		var rect = card.getBoundingClientRect();
		var leftEdge = 40;
		var rightEdge = window.innerWidth - 40;
		var delta = 0;
		if (rect.left < leftEdge) {
			delta = rect.left - leftEdge;
		} else if (rect.right > rightEdge) {
			delta = rect.right - rightEdge;
		}
		if (row && delta && row.scrollWidth > row.clientWidth) {
			try {
				row.scrollTo({
					left: row.scrollLeft + delta,
					behavior: "smooth"
				});
			} catch (error) {
				row.scrollLeft += delta;
			}
		}
		if (
			rect.top < 72 ||
			rect.bottom > window.innerHeight - 12 ||
			delta
		) {
			card.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "center"
			});
		}
	}

	function focusCard(card, reason) {
		if (!card) {
			return false;
		}
		clearHeaderFocus();
		clearGenericFocus();
		clearDetailSelection();
		clearCardSelection();
		try {
			card.focus({preventScroll: true});
		} catch (error) {
			card.focus();
		}
		card.classList.add(CARD_FOCUS_CLASS);
		headerMode = false;
		lastCard = card;
		lastContent = card;
		ensureCardVisible(card);
		console.log(
			"[HBO Max Navigation] card " +
				cardLabel(card) +
				" reason=" +
				reason
		);
		return true;
	}

	function moveCardHorizontal(card, direction) {
		var cards = cardsInRow(card);
		var index = cards.indexOf(card);
		var target = cards[index + direction];
		if (!target) {
			return true;
		}
		return focusCard(target, direction < 0 ? "left" : "right");
	}

	function moveCardVertical(card, direction) {
		var sourceRow = cardsInRow(card);
		var sourceRect = card.getBoundingClientRect();
		var sourceX = sourceRect.left + sourceRect.width / 2;
		var sourceY = sourceRect.top + sourceRect.height / 2;
		var candidates = allCards().filter(function (candidate) {
			if (sourceRow.indexOf(candidate) >= 0) {
				return false;
			}
			var rect = candidate.getBoundingClientRect();
			var centerY = rect.top + rect.height / 2;
			return direction < 0 ?
				centerY < sourceY - 12 :
				centerY > sourceY + 12;
		});
		if (!candidates.length) {
			if (direction < 0) {
				if (hasHeroActions()) {
					return focusDetailControl(
						preferredDetailControl(),
						"cards-up"
					);
				}
				return enterHeader();
			}
			return true;
		}

		var nearestY = Infinity;
		candidates.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			nearestY = Math.min(
				nearestY,
				Math.abs(rect.top + rect.height / 2 - sourceY)
			);
		});
		var target = null;
		var nearestX = Infinity;
		candidates.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			var distanceY =
				Math.abs(rect.top + rect.height / 2 - sourceY);
			if (distanceY > nearestY + Math.max(20, rect.height * 0.3)) {
				return;
			}
			var distanceX =
				Math.abs(rect.left + rect.width / 2 - sourceX);
			if (distanceX < nearestX) {
				target = candidate;
				nearestX = distanceX;
			}
		});
		return focusCard(target, direction < 0 ? "up" : "down");
	}

	function openCard(card) {
		console.log("[HBO Max Navigation] card open " + cardLabel(card));
		card.click();
		return true;
	}

	function handleCardKey(keyCode, event) {
		if (
			keyCode !== 13 &&
			keyCode !== 37 &&
			keyCode !== 38 &&
			keyCode !== 39 &&
			keyCode !== 40
		) {
			return false;
		}
		var cards = allCards();
		if (!cards.length) {
			return false;
		}
		var card = selectedCard();
		if (!card) {
			card = cardFromElement(document.activeElement);
		}
		if (!card) {
			var active = document.activeElement;
			var row = active && active.closest ?
				active.closest(ROW_SELECTOR) :
				null;
			card = row ?
				firstVisibleCard(cards.filter(function (candidate) {
					return row.contains(candidate);
				})) :
				firstPageCard();
			return focusCard(card, "grid-entry");
		}
		if (!selectedCard()) {
			focusCard(card, "active-entry");
		}
		if (keyCode === 37) {
			return moveCardHorizontal(card, -1);
		}
		if (keyCode === 39) {
			return moveCardHorizontal(card, 1);
		}
		if (keyCode === 38) {
			return moveCardVertical(card, -1);
		}
		if (keyCode === 40) {
			return moveCardVertical(card, 1);
		}
		return !event.repeat && openCard(card);
	}

	function inputOpen(event) {
		var target = event && event.target;
		return !!(
			document.querySelector(".crkeyboard") ||
			(target && (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.tagName === "SELECT" ||
				target.isContentEditable
			))
		);
	}

	function isLoginPage() {
		return (
			(
				window.location.hostname === "auth.hbomax.com" ||
				window.location.hostname === "auth.max.com"
			) &&
			/^\/login(?:\/|$)/.test(window.location.pathname)
		);
	}

	function deepMatches(selector, startRoot) {
		var matches = [];
		function collect(root) {
			var controls = root.querySelectorAll(selector);
			var elements = root.querySelectorAll("*");
			var i;
			for (i = 0; i < controls.length; i += 1) {
				matches.push(controls[i]);
			}
			for (i = 0; i < elements.length; i += 1) {
				if (elements[i].shadowRoot) {
					collect(elements[i].shadowRoot);
				}
			}
		}
		collect(startRoot || document);
		return matches;
	}

	function deepActiveElement() {
		var active = document.activeElement;
		while (
			active &&
			active.shadowRoot &&
			active.shadowRoot.activeElement
		) {
			active = active.shadowRoot.activeElement;
		}
		return active;
	}

	function loginEmailField() {
		var selector = [
			'input[type="email"]',
			'input[autocomplete="email"]',
			'input[name*="email" i]',
			'input[id*="email" i]',
			'input[placeholder*="mail" i]'
		].join(",");
		return deepMatches(selector).filter(visible)[0] || null;
	}

	function loginFormControls() {
		var login = document.querySelector("gi-login");
		var root = login && login.shadowRoot;
		if (!root) {
			return [];
		}
		return deepMatches(
			'input:not([type="hidden"]),textarea,select,' +
				'button:not([disabled]),a[href],[role="button"]',
			root
		).filter(function (control) {
			return !control.closest(".hide-input-group") && visible(control);
		});
	}

	function clearGenericFocus() {
		Array.prototype.forEach.call(
			document.querySelectorAll(".chromium-rcu-focus"),
			function (control) {
				control.classList.remove("chromium-rcu-focus");
			}
		);
	}

	function clearLoginFocus() {
		if (loginFocusedControl) {
			loginFocusedControl.style.removeProperty("outline");
			loginFocusedControl.style.removeProperty("outline-offset");
		}
	}

	function focusLoginControl(control, reason) {
		if (!control) {
			return false;
		}
		clearHeaderFocus();
		clearGenericFocus();
		clearLoginFocus();
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		control.scrollIntoView({
			block: "center",
			inline: "nearest"
		});
		control.style.setProperty("outline", "4px solid #fff", "important");
		control.style.setProperty("outline-offset", "3px", "important");
		headerMode = false;
		loginFocusedControl = control;
		console.log(
			"[HBO Max Navigation] login " +
				controlLabel(control) +
				" reason=" +
				reason
		);
		return true;
	}

	function focusLoginEmail() {
		var field = loginEmailField();
		if (!field) {
			return false;
		}
		focusLoginControl(field, "initial-email");
		field.click();
		lastContent = field;
		if (typeof window.showKeyboard === "function") {
			window.showKeyboard(field);
			console.log(
				"[HBO Max Navigation] shadow login email focus + keyboard"
			);
			return true;
		}
		return false;
	}

	function moveLoginControl(direction) {
		var controls = loginFormControls();
		if (!controls.length) {
			return false;
		}
		var active = deepActiveElement();
		var index = controls.indexOf(active);
		if (index < 0) {
			index = controls.indexOf(loginFocusedControl);
		}
		if (index < 0) {
			index = direction > 0 ? -1 : controls.length;
		}
		var targetIndex = Math.max(
			0,
			Math.min(controls.length - 1, index + direction)
		);
		return focusLoginControl(
			controls[targetIndex],
			direction > 0 ? "down" : "up"
		);
	}

	function activateLoginControl() {
		var controls = loginFormControls();
		var control = deepActiveElement();
		if (controls.indexOf(control) < 0) {
			control = loginFocusedControl;
		}
		if (!control || controls.indexOf(control) < 0) {
			return false;
		}
		if (
			control.tagName === "INPUT" ||
			control.tagName === "TEXTAREA"
		) {
			focusLoginControl(control, "keyboard");
			if (typeof window.showKeyboard === "function") {
				window.showKeyboard(control);
				return true;
			}
			return false;
		}
		control.click();
		console.log(
			"[HBO Max Navigation] login activate " +
				controlLabel(control)
		);
		return true;
	}

	function scheduleLoginEmailFocus() {
		if (!isLoginPage()) {
			return;
		}
		var attempts = 0;
		function retry() {
			attempts += 1;
			if (focusLoginEmail() || attempts >= 40) {
				return;
			}
			window.setTimeout(retry, 250);
		}
		// The generic RCU adapter selects its initial target after 1.2 seconds.
		// Run afterwards so it cannot take focus back from the email field.
		window.setTimeout(retry, 1600);
	}

	function handleKey(event) {
		if (
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}

		var keyCode = event.which || event.keyCode;
		var name = event.key || event.code || "";

		if (
			isLoginPage() &&
			!document.querySelector(".crkeyboard")
		) {
			if (keyCode === 38 || keyCode === 40) {
				if (moveLoginControl(keyCode === 38 ? -1 : 1)) {
					consume(event);
				}
				return;
			}
			if (
				keyCode === 13 ||
				name === "Enter" ||
				name === "NumpadEnter"
			) {
				if (!event.repeat && activateLoginControl()) {
					consume(event);
				}
				return;
			}
		}

		if (inputOpen(event)) {
			return;
		}

		if (
			keyCode === KEY_MENU ||
			name === "ContextMenu" ||
			name === "Menu"
		) {
			if (!event.repeat && toggleHeader()) {
				consume(event);
			}
			return;
		}

		if (
			headerMode &&
			(keyCode === 37 || keyCode === 39)
		) {
			if (moveHeader(keyCode === 37 ? -1 : 1)) {
				consume(event);
			}
			return;
		}

		if (headerMode) {
			if (keyCode === 40 && focusContent("header-down")) {
				consume(event);
			}
			return;
		}

		if (
			hasHeroActions() &&
			!selectedCard() &&
			handleDetailKey(keyCode, event)
		) {
			consume(event);
			return;
		}

		if (handleCardKey(keyCode, event)) {
			consume(event);
		}
	}

	function installStyle() {
		if (document.getElementById("chromium-hbomax-navigation-style")) {
			return;
		}
		var style = document.createElement("style");
		style.id = "chromium-hbomax-navigation-style";
		style.textContent =
			"." + HEADER_FOCUS_CLASS + "{" +
				"outline:4px solid #fff!important;" +
				"outline-offset:4px!important;" +
				"box-shadow:0 0 0 3px #5b2cff," +
					"0 0 18px 5px rgba(91,44,255,.9)!important;" +
			"}" +
			"." + CARD_FOCUS_CLASS + "{" +
				"position:relative!important;" +
				"z-index:100!important;" +
				"outline:5px solid #fff!important;" +
				"outline-offset:3px!important;" +
				"box-shadow:0 0 0 3px #5b2cff," +
					"0 0 20px 6px rgba(91,44,255,.9)!important;" +
				"transform:scale(1.035)!important;" +
			"}" +
			"." + DETAIL_FOCUS_CLASS + "{" +
				"outline:5px solid #fff!important;" +
				"outline-offset:4px!important;" +
				"box-shadow:0 0 0 3px #5b2cff," +
					"0 0 20px 6px rgba(91,44,255,.9)!important;" +
			"}";
		(document.head || document.documentElement).appendChild(style);
	}

	if (window.__chromiumHboMaxNavigationInstalled) {
		return;
	}
	window.__chromiumHboMaxNavigationInstalled = true;
	installStyle();
	window.addEventListener("keydown", handleKey, true);
	scheduleLoginEmailFocus();
	document.addEventListener("focusin", function (event) {
		var navigation = navigationRoot();
		if (
			event.target &&
			(!navigation || !navigation.contains(event.target)) &&
			visible(event.target)
		) {
			lastContent = event.target;
			headerMode = false;
			clearHeaderFocus();
		}
	}, true);
	console.log("[HBO Max Navigation] installed r7 home-hero-actions");
}());
