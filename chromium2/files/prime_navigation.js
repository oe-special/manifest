(function () {
	"use strict";

	var CARD_SELECTOR = '[data-testid="card"]';
	var ROW_SELECTOR = '[data-testid="card-container-list"]';
	var FOCUS_CLASS = "chromium-prime-card-focus";
	var pendingRowFocus = 0;

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function playerOpen() {
		var player = document.querySelector(
			".dv-player-fullscreen, #dv-web-player"
		);
		if (!player) {
			return false;
		}
		var rect = player.getBoundingClientRect();
		var style = window.getComputedStyle(player);
		return !!(
			rect.width > 0 &&
			rect.height > 0 &&
			style.display !== "none" &&
			style.visibility !== "hidden"
		);
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

	function cardsInRow(row) {
		if (!row) {
			return [];
		}
		return Array.prototype.slice.call(
			row.querySelectorAll(CARD_SELECTOR)
		).sort(function (left, right) {
			var leftPosition = parseInt(
				left.getAttribute("data-card-position"),
				10
			);
			var rightPosition = parseInt(
				right.getAttribute("data-card-position"),
				10
			);
			if (isNaN(leftPosition) || isNaN(rightPosition)) {
				return 0;
			}
			return leftPosition - rightPosition;
		});
	}

	function rowsWithCards() {
		return Array.prototype.slice.call(
			document.querySelectorAll(ROW_SELECTOR)
		).filter(function (row) {
			return cardsInRow(row).length > 0;
		});
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
				(card.getAttribute("data-card-title") || "card") +
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
		var cards = cardsInRow(row);
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
		var currentRow = card.closest(ROW_SELECTOR);
		var rows = rowsWithCards();
		var rowIndex = rows.indexOf(currentRow);
		var targetRow = rows[rowIndex + direction];

		if (!targetRow) {
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

		var sourceRect = card.getBoundingClientRect();
		var sourceCenter = sourceRect.left + sourceRect.width / 2;
		var targetCards = cardsInRow(targetRow);
		var target = targetCards[0];
		var distance = Infinity;

		targetCards.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			var candidateCenter = rect.left + rect.width / 2;
			var candidateDistance = Math.abs(candidateCenter - sourceCenter);
			if (candidateDistance < distance) {
				target = candidate;
				distance = candidateDistance;
			}
		});

		return focusCard(
			target,
			direction < 0 ? "up" : "down"
		);
	}

	function openCard(card) {
		var link = card.querySelector('a[href*="/detail/"]');
		var control = link || card.querySelector("button[aria-label], a[href]");
		if (!control) {
			return false;
		}
		console.log(
			"[Prime Navigation] open " +
				(card.getAttribute("data-card-title") || "card")
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
			var activeRow = active && active.closest ?
				active.closest(ROW_SELECTOR) :
				null;
			if (!activeRow) {
				return;
			}
			card = firstVisibleCard(activeRow);
			if (!focusCard(card, "row-entry")) {
				return;
			}
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
			CARD_SELECTOR + "." + FOCUS_CLASS + "{" +
				"position:relative!important;" +
				"z-index:100!important;" +
				"filter:brightness(1.08)!important;" +
			"}" +
			CARD_SELECTOR + "." + FOCUS_CLASS + "::after{" +
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
	console.log("[Prime Navigation] installed");
}());
