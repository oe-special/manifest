(function () {
	"use strict";

	var CARD_SELECTOR = '[data-testid="card"]';
	var DETAIL_LINK_SELECTOR = 'a[href*="/detail/"]';
	var ROW_SELECTOR = '[data-testid="card-container-list"]';
	var FOCUS_CLASS = "chromium-prime-card-focus";
	var KEY_MENU = 0x5D;
	var pendingRowFocus = 0;
	var lastCard = null;
	var inHeaderMenu = false;

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function playerOpen() {
		var players = document.querySelectorAll(
			".dv-player-fullscreen, #dv-web-player"
		);
		var i;
		for (i = 0; i < players.length; i += 1) {
			var rect = players[i].getBoundingClientRect();
			var style = window.getComputedStyle(players[i]);
			if (
				rect.width > 0 &&
				rect.height > 0 &&
				style.display !== "none" &&
				style.visibility !== "hidden"
			) {
				return true;
			}
		}
		return false;
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

	function isVisible(element) {
		if (!element) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return (
			rect.width > 0 &&
			rect.height > 0 &&
			style.display !== "none" &&
			style.visibility !== "hidden"
		);
	}

	function allCards() {
		var cards = Array.prototype.slice.call(
			document.querySelectorAll(CARD_SELECTOR)
		).filter(isVisible);

		Array.prototype.forEach.call(
			document.querySelectorAll(DETAIL_LINK_SELECTOR),
			function (link) {
				if (
					!link.closest(CARD_SELECTOR) &&
					isVisible(link) &&
					cards.indexOf(link) < 0
				) {
					cards.push(link);
				}
			}
		);
		return cards;
	}

	function sortCardsHorizontally(cards) {
		return cards.sort(function (left, right) {
			var leftPosition = parseInt(
				left.getAttribute("data-card-position"),
				10
			);
			var rightPosition = parseInt(
				right.getAttribute("data-card-position"),
				10
			);
			if (!isNaN(leftPosition) && !isNaN(rightPosition)) {
				return leftPosition - rightPosition;
			}
			return (
				left.getBoundingClientRect().left -
				right.getBoundingClientRect().left
			);
		});
	}

	function cardsInRow(row) {
		if (!row) {
			return [];
		}
		return sortCardsHorizontally(allCards().filter(function (card) {
			return row.contains(card);
		}));
	}

	function overlapsVertically(left, right) {
		var leftRect = left.getBoundingClientRect();
		var rightRect = right.getBoundingClientRect();
		var overlap = Math.min(leftRect.bottom, rightRect.bottom) -
			Math.max(leftRect.top, rightRect.top);
		var minimumHeight = Math.min(leftRect.height, rightRect.height);
		return overlap > Math.max(8, minimumHeight * 0.35);
	}

	function cardsForCard(card) {
		var row = card && card.closest(ROW_SELECTOR);
		if (row) {
			return cardsInRow(row);
		}
		return sortCardsHorizontally(allCards().filter(function (candidate) {
			return overlapsVertically(card, candidate);
		}));
	}

	function cardLabel(card) {
		if (!card) {
			return "card";
		}
		return (
			card.getAttribute("data-card-title") ||
			card.getAttribute("aria-label") ||
			(card.querySelector("[aria-label]") &&
				card.querySelector("[aria-label]").getAttribute("aria-label")) ||
			(card.textContent || "").trim().slice(0, 80) ||
			"card"
		);
	}

	function cardFromElement(element) {
		if (!element || !element.closest) {
			return null;
		}
		var card = element.closest(CARD_SELECTOR);
		if (card) {
			return card;
		}
		var link = element.closest(DETAIL_LINK_SELECTOR);
		return link && !link.closest(CARD_SELECTOR) ? link : null;
	}

	function rowCenter(card) {
		var peers = cardsForCard(card);
		var top = Infinity;
		var bottom = -Infinity;
		peers.forEach(function (peer) {
			var rect = peer.getBoundingClientRect();
			top = Math.min(top, rect.top);
			bottom = Math.max(bottom, rect.bottom);
		});
		if (!isFinite(top) || !isFinite(bottom)) {
			var rect = card.getBoundingClientRect();
			return rect.top + rect.height / 2;
		}
		return top + (bottom - top) / 2;
	}

	function selectedCard() {
		var selected = document.querySelector("." + FOCUS_CLASS);
		return selected && document.documentElement.contains(selected) ?
			selected :
			null;
	}

	function clearSelection() {
		Array.prototype.forEach.call(
			document.querySelectorAll("." + FOCUS_CLASS),
			function (card) {
				card.classList.remove(FOCUS_CLASS);
				card.removeAttribute("data-chromium-rcu-focus");
			}
		);
	}

	function ensureVisible(card) {
		var row = card.closest(ROW_SELECTOR);
		var rect = card.getBoundingClientRect();
		var leftEdge = 48;
		var rightEdge = window.innerWidth - 48;
		var delta = 0;

		if (rect.left < leftEdge) {
			delta = rect.left - leftEdge;
		} else if (rect.right > rightEdge) {
			delta = rect.right - rightEdge;
		}

		if (row && delta) {
			try {
				row.scrollTo({
					left: row.scrollLeft + delta,
					behavior: "smooth"
				});
			} catch (error) {
				row.scrollLeft += delta;
			}
		}

		if (rect.top < 64 || rect.bottom > window.innerHeight - 8) {
			card.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "nearest"
			});
		}
	}

	function focusCard(card, reason) {
		if (!card) {
			return false;
		}

		inHeaderMenu = false;
		lastCard = card;
		clearSelection();
		card.classList.add(FOCUS_CLASS);
		card.setAttribute("data-chromium-rcu-focus", "true");

		var control = card.querySelector("button[aria-label], a[href]");
		if (control && control.focus) {
			try {
				control.focus({preventScroll: true});
			} catch (error) {
				control.focus();
			}
		}

		ensureVisible(card);
		console.log(
			"[Prime Navigation] focus " +
				cardLabel(card) +
				" reason=" +
				reason
		);
		return true;
	}

	function menuControl() {
		var preferred = document.querySelector(
			'[data-testid="pv-nav-home"]'
		);
		if (preferred && isVisible(preferred)) {
			if (preferred.matches("a[href],button,[tabindex]")) {
				return preferred;
			}
			var preferredControl = preferred.querySelector(
				"a[href],button,[tabindex]"
			);
			if (preferredControl && isVisible(preferredControl)) {
				return preferredControl;
			}
		}

		var modernControls = document.querySelectorAll(
			"a.SNxr4G[href],button.SNxr4G"
		);
		var modernIndex;
		for (
			modernIndex = 0;
			modernIndex < modernControls.length;
			modernIndex += 1
		) {
			if (isVisible(modernControls[modernIndex])) {
				return modernControls[modernIndex];
			}
		}

		var candidates = document.querySelectorAll(
			'header a[href],header button,' +
			'[data-testid^="pv-nav-"] a[href],' +
			'[data-testid^="pv-nav-"] button,' +
			'a[data-testid^="pv-nav-"],button[data-testid^="pv-nav-"]'
		);
		var i;
		for (i = 0; i < candidates.length; i += 1) {
			if (isVisible(candidates[i])) {
				return candidates[i];
			}
		}
		return null;
	}

	function headerControls() {
		var controls = Array.prototype.slice.call(
			document.querySelectorAll(
				"a.SNxr4G[href],button.SNxr4G," +
				'[data-testid^="pv-nav-"] a[href],' +
				'[data-testid^="pv-nav-"] button,' +
				'a[data-testid^="pv-nav-"],' +
				'button[data-testid^="pv-nav-"]'
			)
		).filter(isVisible);

		if (!controls.length) {
			controls = Array.prototype.slice.call(
				document.querySelectorAll(
					"header a[href],header button," +
					"nav a[href],nav button," +
					'[role="navigation"] a[href],' +
					'[role="navigation"] button'
				)
			).filter(isVisible);
		}

		return controls.filter(function (control, index) {
			return controls.indexOf(control) === index;
		}).sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			return (
				(leftRect.left + leftRect.width / 2) -
				(rightRect.left + rightRect.width / 2)
			);
		});
	}

	function focusHeaderControl(control, reason) {
		if (!control) {
			return false;
		}
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		inHeaderMenu = true;
		console.log(
			"[Prime Navigation] header focus " +
				cardLabel(control) +
				" reason=" +
				reason
		);
		return true;
	}

	function moveHeader(direction) {
		var controls = headerControls();
		if (!controls.length) {
			return false;
		}

		var active = document.activeElement;
		var index = controls.indexOf(active);
		if (index < 0) {
			controls.some(function (control, controlIndex) {
				if (control.contains(active) || active.contains(control)) {
					index = controlIndex;
					return true;
				}
				return false;
			});
		}
		if (index < 0) {
			index = direction > 0 ? -1 : controls.length;
		}

		var targetIndex = index + direction;
		targetIndex = Math.max(
			0,
			Math.min(controls.length - 1, targetIndex)
		);
		return focusHeaderControl(
			controls[targetIndex],
			direction < 0 ? "header-left" : "header-right"
		);
	}

	function moveToMenu(reason) {
		var card = selectedCard();
		if (card) {
			lastCard = card;
		}
		clearSelection();

		var control = menuControl();
		if (!control) {
			return false;
		}
		focusHeaderControl(control, reason);
		control.scrollIntoView({
			block: "nearest",
			inline: "nearest"
		});
		console.log("[Prime Navigation] menu reason=" + reason);
		return true;
	}

	function firstPageCard() {
		var cards = allCards();
		var standardCards = cards.filter(function (card) {
			return card.matches(CARD_SELECTOR);
		});
		if (standardCards.length) {
			cards = standardCards;
		}
		var target = null;
		var targetTop = Infinity;
		var targetLeft = Infinity;
		cards.forEach(function (card) {
			var rect = card.getBoundingClientRect();
			if (
				rect.top < targetTop - 8 ||
				(Math.abs(rect.top - targetTop) <= 8 &&
					rect.left < targetLeft)
			) {
				target = card;
				targetTop = rect.top;
				targetLeft = rect.left;
			}
		});
		return target;
	}

	function moveToCards(reason) {
		var card = lastCard;
		if (!card || !document.documentElement.contains(card) || !isVisible(card)) {
			card = firstPageCard();
		}
		return focusCard(card, reason);
	}

	function toggleMenu() {
		if (selectedCard()) {
			return moveToMenu("menu-key");
		}
		if (moveToCards("menu-return")) {
			return true;
		}
		return moveToMenu("menu-key");
	}

	function visibleAmount(card) {
		var rect = card.getBoundingClientRect();
		var left = Math.max(rect.left, 48);
		var right = Math.min(rect.right, window.innerWidth - 48);
		return Math.max(0, right - left);
	}

	function firstVisibleCard(row) {
		var cards = cardsInRow(row);
		var best = null;
		var bestVisible = 0;

		cards.forEach(function (card) {
			var visible = visibleAmount(card);
			if (
				visible > bestVisible ||
				(visible === bestVisible &&
					best &&
					card.getBoundingClientRect().left <
						best.getBoundingClientRect().left)
			) {
				best = card;
				bestVisible = visible;
			}
		});

		if (bestVisible > 0) {
			var fullyVisible = cards.filter(function (card) {
				var rect = card.getBoundingClientRect();
				return (
					rect.left >= 40 &&
					rect.right <= window.innerWidth - 40
				);
			});
			return fullyVisible[0] || best;
		}
		return cards[0] || null;
	}

	function moveHorizontal(card, direction) {
		var row = card.closest(ROW_SELECTOR);
		var cards = cardsForCard(card);
		var index = cards.indexOf(card);
		var target = cards[index + direction];

		if (target) {
			return focusCard(
				target,
				direction < 0 ? "left" : "right"
			);
		}

		var arrow = row && row.parentElement &&
			row.parentElement.querySelector(
				direction < 0 ?
					'[data-testid="left-arrow"]' :
					'[data-testid="right-arrow"]'
			);
		if (arrow && arrow.click) {
			arrow.click();
			window.setTimeout(function () {
				var refreshed = cardsInRow(row);
				var edge = direction < 0 ?
					refreshed[0] :
					refreshed[refreshed.length - 1];
				if (edge) {
					focusCard(
						edge,
						direction < 0 ? "left-page" : "right-page"
					);
				}
			}, 180);
			return true;
		}
		return false;
	}

	function moveVertical(card, direction) {
		var sourceCards = cardsForCard(card);
		var sourceRect = card.getBoundingClientRect();
		var sourceCenterX = sourceRect.left + sourceRect.width / 2;
		var sourceCenterY = rowCenter(card);
		var candidates = allCards().filter(function (candidate) {
			if (sourceCards.indexOf(candidate) >= 0) {
				return false;
			}
			var candidateRect = candidate.getBoundingClientRect();
			var candidateCenterY =
				candidateRect.top + candidateRect.height / 2;
			return direction < 0 ?
				candidateCenterY < sourceCenterY - 8 :
				candidateCenterY > sourceCenterY + 8;
		});

		if (!candidates.length) {
			if (direction < 0) {
				moveToMenu("top-row-up");
			}
			return true;
		}

		var nearestRowDistance = Infinity;
		candidates.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			var centerY = rect.top + rect.height / 2;
			var rowDistance = Math.abs(centerY - sourceCenterY);
			nearestRowDistance = Math.min(
				nearestRowDistance,
				rowDistance
			);
		});

		var target = null;
		var horizontalDistance = Infinity;
		candidates.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			var centerY = rect.top + rect.height / 2;
			var rowDistance = Math.abs(centerY - sourceCenterY);
			var sameNearestRow = rowDistance <=
				nearestRowDistance + Math.max(24, rect.height * 0.35);
			var candidateCenterX = rect.left + rect.width / 2;
			var candidateHorizontalDistance =
				Math.abs(candidateCenterX - sourceCenterX);
			if (
				sameNearestRow &&
				candidateHorizontalDistance < horizontalDistance
			) {
				target = candidate;
				horizontalDistance = candidateHorizontalDistance;
			}
		});

		console.log(
			"[Prime Navigation] vertical " +
				(direction < 0 ? "up" : "down") +
				" from=" +
				cardLabel(card) +
				" to=" +
				cardLabel(target) +
				" row-distance=" +
				Math.round(nearestRowDistance)
		);
		return focusCard(
			target,
			direction < 0 ? "up" : "down"
		);
	}

	function openCard(card) {
		var link = card.matches && card.matches(DETAIL_LINK_SELECTOR) ?
			card :
			card.querySelector(DETAIL_LINK_SELECTOR);
		var control = link || (
			card.matches && card.matches("button[aria-label], a[href]") ?
				card :
				card.querySelector("button[aria-label], a[href]")
		);
		if (!control) {
			return false;
		}
		console.log(
			"[Prime Navigation] open " +
				cardLabel(card)
		);
		control.click();
		return true;
	}

	function handleKey(event) {
		if (
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			playerOpen() ||
			inputOpen(event)
		) {
			return;
		}

		var keyCode = event.which || event.keyCode;
		var name = event.key || event.code || "";
		if (
			keyCode === KEY_MENU ||
			name === "ContextMenu" ||
			name === "Menu"
		) {
			if (!event.repeat && toggleMenu()) {
				consume(event);
			}
			return;
		}

		if (
			inHeaderMenu &&
			(keyCode === 37 || keyCode === 39)
		) {
			if (moveHeader(keyCode === 37 ? -1 : 1)) {
				consume(event);
			}
			return;
		}

		if (
			keyCode !== 13 &&
			keyCode !== 37 &&
			keyCode !== 38 &&
			keyCode !== 39 &&
			keyCode !== 40
		) {
			return;
		}

		var card = selectedCard();
		if (!card) {
			var active = document.activeElement;
			card = cardFromElement(active);
			if (card && !focusCard(card, "active-entry")) {
				return;
			}
			var activeRow = active && active.closest ?
				active.closest(ROW_SELECTOR) :
				null;
			if (!card && !activeRow) {
				return;
			}
			if (
				!card &&
				!focusCard(firstVisibleCard(activeRow), "row-entry")
			) {
				return;
			}
			card = selectedCard();
		}

		var handled = false;
		if (keyCode === 37) {
			handled = moveHorizontal(card, -1);
		} else if (keyCode === 39) {
			handled = moveHorizontal(card, 1);
		} else if (keyCode === 38) {
			handled = moveVertical(card, -1);
		} else if (keyCode === 40) {
			handled = moveVertical(card, 1);
		} else if (keyCode === 13 && !event.repeat) {
			handled = openCard(card);
		}

		if (handled) {
			consume(event);
		}
	}

	function handleRowFocus(event) {
		var row = event.target && event.target.matches &&
			event.target.matches(ROW_SELECTOR) ?
			event.target :
			null;
		if (!row || selectedCard() || playerOpen()) {
			return;
		}
		window.clearTimeout(pendingRowFocus);
		pendingRowFocus = window.setTimeout(function () {
			if (!selectedCard()) {
				focusCard(firstVisibleCard(row), "row-focus");
			}
		}, 0);
	}

	function installStyle() {
		if (document.getElementById("chromium-prime-navigation-style")) {
			return;
		}
		var style = document.createElement("style");
		style.id = "chromium-prime-navigation-style";
		style.textContent =
			"." + FOCUS_CLASS + "{" +
				"position:relative!important;" +
				"z-index:100!important;" +
				"filter:brightness(1.08)!important;" +
			"}" +
			"." + FOCUS_CLASS + "::after{" +
				"content:\"\"!important;" +
				"position:absolute!important;" +
				"inset:0!important;" +
				"border:5px solid #fff!important;" +
				"border-radius:9px!important;" +
				"box-shadow:0 0 0 3px #00a8e1,0 0 18px 6px rgba(0,168,225,.9)!important;" +
				"pointer-events:none!important;" +
				"z-index:2147483647!important;" +
			"}";
		(document.head || document.documentElement).appendChild(style);
	}

	if (window.__chromiumPrimeNavigationInstalled) {
		return;
	}
	window.__chromiumPrimeNavigationInstalled = true;
	installStyle();
	window.addEventListener("keydown", handleKey, true);
	document.addEventListener("focusin", handleRowFocus, true);
	console.log("[Prime Navigation] installed r20 header-navigation");
}());
