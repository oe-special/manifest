(function () {
	"use strict";

	var CARD_SELECTOR = '[data-testid="card"]';
	var DETAIL_LINK_SELECTOR = 'a[href*="/detail/"]';
	var ROW_SELECTOR = '[data-testid="card-container-list"]';
	var FOCUS_CLASS = "chromium-prime-card-focus";
	var pendingRowFocus = 0;

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
				clearSelection();
				var home = document.querySelector(
					'[data-testid="pv-nav-home"]'
				);
				if (home && home.focus) {
					home.focus();
					home.scrollIntoView({
						block: "nearest",
						inline: "nearest"
					});
				}
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
	console.log("[Prime Navigation] installed r17 spatial");
}());
