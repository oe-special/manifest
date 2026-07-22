(function () {
	"use strict";

	if (window.__chromiumZattooNavigationInstalled) {
		return;
	}
	window.__chromiumZattooNavigationInstalled = true;

	var CARD_SELECTOR = [
		"[data-soul='TEASER_BROADCAST']",
		"[data-soul='TEASER_MOVIE']",
		"[data-soul='TEASER_SERIES']",
		"[data-soul='TEASER_EXTERNAL']",
		"[data-soul='TEASER_CHANNEL']",
		"[data-soul='TEASER_EPISODE']",
		"[data-soul='TEASER_RECORDING']"
	].join(",");
	var GROUP_SELECTOR = [
		"[data-soul='ELEMENT_MARQUEE']",
		"[data-soul='ELEMENT_CAROUSEL']"
	].join(",");
	var HEADER_SELECTOR = [
		"header[data-soul='HEADER'] [data-soul^='MENU_LINK_']",
		"header[data-soul='HEADER'] [data-soul='SEARCH_CONTROL']",
		"header[data-soul='HEADER'] [data-soul='HEADER_CONTROL_SETTINGS']"
	].join(",");
	var FOCUS_CLASS = "chromium-zattoo-focus";
	var KEY_MENU = 0x5D;
	var lastCard = null;
	var inHeader = false;
	var activeDialog = null;

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function visible(element) {
		if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
			return false;
		}
		if (element.closest("[hidden],[aria-hidden='true'],footer,[role='contentinfo']")) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return rect.width > 4 && rect.height > 4 &&
			style.display !== "none" && style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01;
	}

	function intersectsViewport(element) {
		if (!visible(element)) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		return rect.right > 8 && rect.left < window.innerWidth - 8 &&
			rect.bottom > 68 && rect.top < window.innerHeight - 8;
	}

	function centerOnScreen(element) {
		if (!visible(element)) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var centerX = rect.left + rect.width / 2;
		var centerY = rect.top + rect.height / 2;
		return centerX > 8 && centerX < window.innerWidth - 8 &&
			centerY > 68 && centerY < window.innerHeight - 8;
	}

	function modalOrInputOpen(event) {
		var target = event && event.target;
		var modal = Array.prototype.some.call(document.querySelectorAll(
			"#onetrust-pc-sdk,#onetrust-banner-sdk,[aria-modal='true']"
		), visible);
		return modal || Boolean(document.querySelector(".crkeyboard")) || Boolean(target && (
			target.isContentEditable || target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" || target.tagName === "SELECT"
		));
	}

	function detailsDialog() {
		var dialogs = Array.prototype.slice.call(document.querySelectorAll(
			"[data-soul='WINDOW'][role='dialog']"
		)).filter(visible);
		return dialogs.length ? dialogs[dialogs.length - 1] : null;
	}

	function inputOpen(event) {
		var target = event && event.target;
		return Boolean(document.querySelector(".crkeyboard")) || Boolean(target && (
			target.isContentEditable || target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" || target.tagName === "SELECT"
		));
	}

	function dialogItems(dialog) {
		var selector = [
			"[data-soul='WINDOW_CONTROL_CLOSE']",
			"[data-soul='BROADCAST_DETAILS_ALL_EPISODES']",
			"[data-soul='TABS_ITEM']",
			"[data-soul$='_OVERLAY_WATCH']",
			"[data-soul$='_CONTROL_WATCH']",
			"button",
			"a[href]",
			"[role='button']",
			"[role='tab']",
			"[tabindex]"
		].join(",");
		return Array.prototype.slice.call(dialog.querySelectorAll(selector))
			.filter(visible).filter(function (element, index, elements) {
				return elements.indexOf(element) === index &&
					!element.closest("[data-soul='SLIDE_CONTROL_PREVIOUS']," +
						"[data-soul='SLIDE_CONTROL_NEXT'],[data-soul='CLUSTER_CONTROL_NEXT']," +
						"[data-soul='CLUSTER_CONTROL_PREVIOUS']");
			});
	}

	function focusDialogItem(element) {
		if (!focusElement(element, false)) {
			return false;
		}
		inHeader = false;
		try {
			element.scrollIntoView({block: "center", inline: "nearest", behavior: "smooth"});
		} catch (error) {
			element.scrollIntoView(false);
		}
		return true;
	}

	function initialDialogItem(dialog) {
		return dialog.querySelector("[data-soul='BROADCAST_DETAILS_ALL_EPISODES']") ||
			dialog.querySelector("[data-soul$='_OVERLAY_WATCH']") ||
			dialog.querySelector("[data-soul$='_CONTROL_WATCH']") ||
			dialog.querySelector("[data-soul='WINDOW_CONTROL_CLOSE']") ||
			dialogItems(dialog)[0];
	}

	function closeDialog(dialog) {
		var close = dialog.querySelector("[data-soul='WINDOW_CONTROL_CLOSE']");
		if (!close || !close.click) {
			return false;
		}
		close.click();
		activeDialog = null;
		window.setTimeout(function () {
			if (!detailsDialog() && lastCard && document.documentElement.contains(lastCard)) {
				focusCard(lastCard);
			}
		}, 250);
		return true;
	}

	function moveInDialog(dialog, directionX, directionY) {
		var items = dialogItems(dialog);
		if (!items.length) {
			return false;
		}
		var active = document.activeElement;
		if (items.indexOf(active) === -1) {
			return focusDialogItem(initialDialogItem(dialog));
		}
		var source = active.getBoundingClientRect();
		var sourceX = source.left + source.width / 2;
		var sourceY = source.top + source.height / 2;
		var best = null;
		var bestScore = Infinity;
		items.forEach(function (item) {
			if (item === active) {
				return;
			}
			var rect = item.getBoundingClientRect();
			var deltaX = rect.left + rect.width / 2 - sourceX;
			var deltaY = rect.top + rect.height / 2 - sourceY;
			var primary = directionX ? deltaX * directionX : deltaY * directionY;
			if (primary <= 4) {
				return;
			}
			var secondary = directionX ? Math.abs(deltaY) : Math.abs(deltaX);
			var score = primary * 1000 + secondary;
			if (score < bestScore) {
				best = item;
				bestScore = score;
			}
		});
		return best ? focusDialogItem(best) : true;
	}

	function handleDialogKey(event, dialog, code, name) {
		if ([0x08, 0x1B, 0xA6, 0xA9, 0xB2].indexOf(code) !== -1 ||
			name === "Escape" || name === "BrowserBack" || name === "MediaStop") {
			return !event.repeat && closeDialog(dialog);
		}
		if (code === KEY_MENU || name === "ContextMenu" || name === "Menu") {
			return !event.repeat && closeDialog(dialog);
		}
		if (code === 13) {
			var active = document.activeElement;
			if (dialog.contains(active) && active.click && !event.repeat) {
				active.click();
				return true;
			}
			return focusDialogItem(initialDialogItem(dialog));
		}
		return code === 37 ? moveInDialog(dialog, -1, 0) :
			code === 39 ? moveInDialog(dialog, 1, 0) :
			code === 38 ? moveInDialog(dialog, 0, -1) :
			code === 40 ? moveInDialog(dialog, 0, 1) : false;
	}

	function playerOpen() {
		return Array.prototype.some.call(document.querySelectorAll("video"), function (video) {
			var rect = video.getBoundingClientRect();
			return visible(video) && rect.width > 300 && rect.height > 160;
		});
	}

	function clearFocus() {
		Array.prototype.forEach.call(document.querySelectorAll(
			"." + FOCUS_CLASS + ",.chromium-rcu-focus"
		), function (element) {
			element.classList.remove(FOCUS_CLASS);
			element.classList.remove("chromium-rcu-focus");
		});
	}

	function focusElement(element, scrollVertically) {
		if (!element || !visible(element)) {
			return false;
		}
		clearFocus();
		if (!element.hasAttribute("tabindex")) {
			element.setAttribute("tabindex", "-1");
		}
		try {
			element.focus({preventScroll: true});
		} catch (error) {
			element.focus();
		}
		element.classList.add(FOCUS_CLASS);
		if (scrollVertically) {
			var rect = element.getBoundingClientRect();
			if (rect.top < 74 || rect.bottom > window.innerHeight - 18) {
				var targetTop = Math.max(0, window.pageYOffset + rect.top -
					Math.max(80, (window.innerHeight - rect.height) / 2));
				window.scrollTo({top: targetTop, left: 0, behavior: "smooth"});
			}
		}
		return true;
	}

	function cardFromElement(element) {
		return element && element.closest ? element.closest(CARD_SELECTOR) : null;
	}

	function focusCard(card) {
		if (!focusElement(card, true)) {
			return false;
		}
		lastCard = card;
		inHeader = false;
		return true;
	}

	function headerItems() {
		return Array.prototype.slice.call(document.querySelectorAll(HEADER_SELECTOR))
			.filter(function (element) {
				var rect = element.getBoundingClientRect();
				return visible(element) && rect.right > 4 && rect.left < window.innerWidth - 4;
			});
	}

	function focusHeader(element) {
		if (!element) {
			return false;
		}
		inHeader = true;
		return focusElement(element, false);
	}

	function allCards(group) {
		return Array.prototype.slice.call(group.querySelectorAll(CARD_SELECTOR))
			.filter(visible).filter(function (card, index, cards) {
				return cards.indexOf(card) === index && !card.parentElement.closest(CARD_SELECTOR);
			});
	}

	function groups() {
		var result = Array.prototype.slice.call(document.querySelectorAll(GROUP_SELECTOR))
			.filter(visible).map(function (group) {
				return {element: group, cards: allCards(group)};
			}).filter(function (group) {
				return group.cards.length > 0;
			});
		return result.sort(function (left, right) {
			var lr = left.element.getBoundingClientRect();
			var rr = right.element.getBoundingClientRect();
			return (lr.top - rr.top) || (lr.left - rr.left);
		});
	}

	function groupForCard(card, list) {
		var groupElement = card && card.closest(GROUP_SELECTOR);
		for (var index = 0; index < list.length; index++) {
			if (list[index].element === groupElement) {
				return index;
			}
		}
		return -1;
	}

	function visibleCards(group) {
		return group.cards.filter(intersectsViewport).sort(function (left, right) {
			var lr = left.getBoundingClientRect();
			var rr = right.getBoundingClientRect();
			return (lr.left - rr.left) || (lr.top - rr.top);
		});
	}

	function preferredCard(group, x) {
		var cards = visibleCards(group);
		if (!cards.length) {
			cards = group.cards;
		}
		var centered = cards.filter(centerOnScreen);
		if (centered.length) {
			cards = centered;
		}
		var best = null;
		var bestScore = Infinity;
		cards.forEach(function (card) {
			var rect = card.getBoundingClientRect();
			var score = Math.abs(rect.left + rect.width / 2 - x);
			if (score < bestScore) {
				best = card;
				bestScore = score;
			}
		});
		return best;
	}

	function selectedCard() {
		var active = cardFromElement(document.activeElement);
		if (active && centerOnScreen(active)) {
			return active;
		}
		if (lastCard && document.documentElement.contains(lastCard) && visible(lastCard) &&
			lastCard.classList.contains(FOCUS_CLASS)) {
			return lastCard;
		}
		var list = groups();
		for (var index = 0; index < list.length; index++) {
			var card = preferredCard(list[index], window.innerWidth / 2);
			if (card && intersectsViewport(card)) {
				return card;
			}
		}
		return null;
	}

	function sliderButton(group, direction) {
		return group.element.querySelector(
			direction < 0 ? "[data-soul='SLIDE_CONTROL_PREVIOUS']" :
				"[data-soul='SLIDE_CONTROL_NEXT']"
		);
	}

	function activateSlider(control) {
		["mousedown", "mouseup", "click"].forEach(function (name) {
			control.dispatchEvent(new MouseEvent(name, {
				bubbles: true,
				cancelable: true,
				button: 0
			}));
		});
	}

	function moveHorizontal(card, direction) {
		var list = groups();
		var groupIndex = groupForCard(card, list);
		if (groupIndex < 0) {
			return false;
		}
		var group = list[groupIndex];
		var index = group.cards.indexOf(card);
		var target = group.cards[index + direction];
		if (!target) {
			return true;
		}
		var rect = target.getBoundingClientRect();
		var outside = rect.right < 24 || rect.left > window.innerWidth - 24 ||
			rect.right > window.innerWidth + 24 || rect.left < -24;
		var control = sliderButton(group, direction);
		if (outside && control && !control.disabled) {
			activateSlider(control);
			[220, 600, 1050].forEach(function (delay) {
				window.setTimeout(function () {
					if (document.documentElement.contains(target) && visible(target)) {
						focusCard(target);
					}
				}, delay);
			});
			return true;
		}
		return focusCard(target);
	}

	function moveVertical(card, direction) {
		var list = groups();
		var index = groupForCard(card, list);
		if (index < 0) {
			return false;
		}
		var rect = card.getBoundingClientRect();
		var x = rect.left + rect.width / 2;
		var targetIndex = index + direction;
		if (targetIndex < 0) {
			var header = headerItems();
			if (!header.length) {
				return true;
			}
			var closest = header[0];
			var distance = Infinity;
			header.forEach(function (item) {
				var itemRect = item.getBoundingClientRect();
				var currentDistance = Math.abs(itemRect.left + itemRect.width / 2 - x);
				if (currentDistance < distance) {
					closest = item;
					distance = currentDistance;
				}
			});
			return focusHeader(closest);
		}
		if (targetIndex >= list.length) {
			return true;
		}
		return focusCard(preferredCard(list[targetIndex], x));
	}

	function moveFromHeader(direction) {
		var header = headerItems();
		var active = document.activeElement;
		var index = header.indexOf(active);
		if (index < 0) {
			index = 0;
		}
		return focusHeader(header[Math.max(0, Math.min(header.length - 1, index + direction))]);
	}

	function moveHeaderDown() {
		var list = groups();
		if (!list.length) {
			return false;
		}
		var rect = document.activeElement.getBoundingClientRect();
		return focusCard(preferredCard(list[0], rect.left + rect.width / 2));
	}

	function openCard(card) {
		var selector = [
			"button[data-soul$='_PICTURE_OVERLAY_WATCH']",
			"a[data-soul='DETAILS_LINK']",
			"a[data-soul='TEASER_OVERLAY_LINK']",
			"button[data-soul$='_CONTROL_WATCH']",
			"a[href]",
			"button"
		].join(",");
		var action = Array.prototype.slice.call(card.querySelectorAll(selector))
			.filter(visible)[0] || card.querySelector(selector);
		if (action && action.click) {
			action.click();
			return true;
		}
		return false;
	}

	function toggleHeader() {
		if (inHeader || headerItems().indexOf(document.activeElement) !== -1) {
			return focusCard(lastCard || selectedCard());
		}
		var header = headerItems();
		return focusHeader(header[0]);
	}

	function handleKey(event) {
		if (event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}
		var code = event.which || event.keyCode;
		var name = event.key || event.code || "";
		var dialog = detailsDialog();
		if (dialog) {
			if (!inputOpen(event) && handleDialogKey(event, dialog, code, name)) {
				consume(event);
			}
			return;
		}
		if (modalOrInputOpen(event) || playerOpen()) {
			return;
		}
		if (code === KEY_MENU || name === "ContextMenu" || name === "Menu") {
			if (!event.repeat && toggleHeader()) {
				consume(event);
			}
			return;
		}
		if ([13, 37, 38, 39, 40].indexOf(code) === -1) {
			return;
		}

		var active = document.activeElement;
		var header = headerItems();
		if (inHeader || header.indexOf(active) !== -1) {
			var headerHandled = code === 37 ? moveFromHeader(-1) :
				code === 39 ? moveFromHeader(1) :
				code === 40 ? moveHeaderDown() :
				code === 38 ? true :
				(!event.repeat && active && active.click && (active.click() || true));
			if (headerHandled) {
				consume(event);
			}
			return;
		}

		var card = selectedCard();
		if (!card) {
			var list = groups();
			card = list.length ? preferredCard(list[0], window.innerWidth / 2) : null;
			if (card) {
				focusCard(card);
			}
		}
		if (!card) {
			return;
		}
		var handled = code === 37 ? moveHorizontal(card, -1) :
			code === 39 ? moveHorizontal(card, 1) :
			code === 38 ? moveVertical(card, -1) :
			code === 40 ? moveVertical(card, 1) :
			(!event.repeat && openCard(card));
		if (handled) {
			consume(event);
		}
	}

	var style = document.createElement("style");
	style.id = "chromium-zattoo-navigation-style";
	style.textContent =
		"." + FOCUS_CLASS + "{" +
			"outline:5px solid #00b7ff!important;" +
			"outline-offset:-5px!important;" +
			"box-shadow:inset 0 0 0 3px #fff,0 0 16px rgba(0,183,255,.9)!important;" +
			"position:relative!important;z-index:100!important;" +
		"}";
	(document.head || document.documentElement).appendChild(style);
	window.addEventListener("keydown", handleKey, true);
	window.setInterval(function () {
		var dialog = detailsDialog();
		if (!dialog) {
			activeDialog = null;
			return;
		}
		if (dialog !== activeDialog) {
			activeDialog = dialog;
			window.setTimeout(function () {
				if (detailsDialog() === dialog) {
					focusDialogItem(initialDialogItem(dialog));
				}
			}, 80);
		}
	}, 250);
	window.setTimeout(function () {
		if (!modalOrInputOpen() && !playerOpen()) {
			var card = selectedCard();
			if (card) {
				focusCard(card);
			}
		}
	}, 900);
	console.log("[Zattoo Navigation] installed r1");
})();
