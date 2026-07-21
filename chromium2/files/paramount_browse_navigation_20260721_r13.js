(function () {
	"use strict";
	/* Revision r13 adds deterministic navigation inside the profile dropdown. */

	var CARD_SELECTOR =
		'a.link.content-highlight-enabled[role="button"],' +
		'a.link.zoom-carousel-effect-disabled[role="button"]';
	var HERO_ACTION_SELECTOR =
		"a[href],button,[tabindex],[role='button'],[role='option'],[role='tab']";
	var DETAIL_ACTION_SELECTOR =
		"a.button.focusable.playIcon,button.button.focusable.playIcon," +
		"a.watchlistCta,button.watchlistCta";
	var DETAIL_TILE_SELECTOR =
		"a.link.vilynx-redirect," + CARD_SELECTOR;
	var VIDEO_EPISODE_SELECTOR =
		"a.link.focusable[role='button']," +
		"a.link.vilynx-redirect," +
		"a[href*='/shows/video/']";
	var VIDEO_CONTROL_SELECTOR =
		"button.controls-bottom-btn,.seek-bar";
	var SEASON_BUTTON_SELECTOR = "button.filter.js-filter[role='listbox']";
	var TILE_CONTAINER = ".clip,.swiper-slide,[class*='carousel-item']";
	var FOCUS_CLASS = "chromium-paramount-card-focus";
	var KEY_MENU = 0x5D;
	var lastCard = null;
	var inHeader = false;
	var pendingContentFocus = 0;
	var videoPlaybackPending = playerOpen();
	var videoPendingLogged = false;
	var videoPlayerPinned = playerOpen();
	var videoGeometryLogged = false;
	var profileMenuButton = null;

	function consume(event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function visible(element) {
		if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
			return false;
		}
		if (element.closest("[hidden],[aria-hidden='true']")) {
			return false;
		}
		var rect = element.getBoundingClientRect();
		var style = window.getComputedStyle(element);
		return rect.width > 2 && rect.height > 2 &&
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			parseFloat(style.opacity || "1") > 0.01;
	}

	function topmostWhenOnScreen(element, rect) {
		if (
			rect.bottom <= 0 || rect.top >= window.innerHeight ||
			rect.right <= 0 || rect.left >= window.innerWidth
		) {
			return true;
		}
		var x = Math.max(1, Math.min(window.innerWidth - 2,
			rect.left + rect.width / 2));
		var y = Math.max(1, Math.min(window.innerHeight - 2,
			rect.top + rect.height / 2));
		var top = document.elementFromPoint(x, y);
		return !top || top === element || element.contains(top) || top.contains(element);
	}

	function modalOpen() {
		var marker = document.querySelector(
			".rfmodal-button-no,.rfmodal-button-yes,[aria-modal='true']"
		);
		return visible(marker) ? marker : null;
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

	function playerOpen() {
		return /\/(?:video|watch|live-tv)\//i.test(window.location.pathname);
	}

	function allCards() {
		var cards = Array.prototype.slice.call(
			document.querySelectorAll(CARD_SELECTOR)
		).filter(function (card) {
			if (!visible(card) || card.closest("header,nav,[role='navigation']")) {
				return false;
			}
			var rect = card.getBoundingClientRect();
			return rect.right > 4 && rect.left < window.innerWidth - 4;
		});
		return cards.filter(function (card, index) {
			return cards.indexOf(card) === index;
		});
	}

	function tileCards() {
		return allCards().filter(function (card) {
			return !!card.closest(TILE_CONTAINER);
		});
	}

	function heroActions() {
		if (detailPage()) {
			return [];
		}
		var cards = allCards();
		var firstCardTop = Infinity;
		cards.forEach(function (card) {
			var rect = card.getBoundingClientRect();
			firstCardTop = Math.min(firstCardTop, rect.top + window.pageYOffset);
		});
		var actions = Array.prototype.slice.call(
			document.querySelectorAll(HERO_ACTION_SELECTOR)
		).filter(function (action) {
			if (
				!visible(action) ||
				action.closest("header,nav,footer,[role='navigation']") ||
				action.matches(CARD_SELECTOR) ||
				action.matches("[role='region'],video,audio")
			) {
				return false;
			}
			var rect = action.getBoundingClientRect();
			var documentTop = rect.top + window.pageYOffset;
			return rect.right > 4 && rect.left < window.innerWidth - 4 &&
				documentTop < firstCardTop - 8 &&
				topmostWhenOnScreen(action, rect);
		});
		return actions.filter(function (action, index) {
			return actions.indexOf(action) === index;
		});
	}

	function detailPage() {
		return /^\/(?:shows|movies)\/[^/]+\/?/i.test(window.location.pathname);
	}

	function detailActions() {
		if (!detailPage()) {
			return [];
		}
		var actions = Array.prototype.slice.call(
			document.querySelectorAll(DETAIL_ACTION_SELECTOR)
		).filter(function (action) {
			if (
				!visible(action) ||
				action.closest("header,nav,footer,[role='navigation']")
			) {
				return false;
			}
			var rect = action.getBoundingClientRect();
			return rect.top < window.innerHeight * 0.9 && rect.bottom > 40;
		}).sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			return (leftRect.top - rightRect.top) || (leftRect.left - rightRect.left);
		});
		return actions.filter(function (action, index) {
			return actions.indexOf(action) === index;
		});
	}

	function detailTiles() {
		if (!detailPage()) {
			return [];
		}
		var tiles = Array.prototype.slice.call(
			document.querySelectorAll(DETAIL_TILE_SELECTOR)
		).filter(function (tile) {
			if (!visible(tile) || tile.closest("header,nav,[role='navigation']")) {
				return false;
			}
			var rect = tile.getBoundingClientRect();
			return rect.right > 4 && rect.left < window.innerWidth - 4;
		});
		return tiles.filter(function (tile, index) {
			return tiles.indexOf(tile) === index;
		});
	}

	function contentItems() {
		var actions = detailActions();
		if (!detailPage()) {
			return heroActions().concat(allCards()).filter(function (item, index, items) {
				return items.indexOf(item) === index;
			});
		}
		return actions.concat(detailTiles()).filter(function (item, index, items) {
			return items.indexOf(item) === index;
		});
	}

	function cardLabel(card) {
		return card && (
			card.getAttribute("aria-label") ||
			card.getAttribute("title") ||
			(card.textContent || "").trim().slice(0, 80) ||
			card.id ||
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
		if (!detailPage()) {
			var heroAction = element.closest(HERO_ACTION_SELECTOR);
			return heroActions().indexOf(heroAction) !== -1 ? heroAction : null;
		}
		if (detailPage()) {
			var action = element.closest(
				DETAIL_ACTION_SELECTOR + "," + DETAIL_TILE_SELECTOR
			);
			return contentItems().indexOf(action) !== -1 ? action : null;
		}
		return null;
	}

	function selectedCard() {
		var selected = document.querySelector("." + FOCUS_CLASS);
		return selected && document.documentElement.contains(selected) ? selected : null;
	}

	function clearCardFocus() {
		Array.prototype.forEach.call(
			document.querySelectorAll("." + FOCUS_CLASS),
			function (card) {
				card.classList.remove(FOCUS_CLASS);
				card.removeAttribute("data-chromium-rcu-focus");
			}
		);
	}

	function focusCard(card, reason) {
		if (!card || !visible(card)) {
			return false;
		}
		inHeader = false;
		lastCard = card;
		clearCardFocus();
		card.classList.add(FOCUS_CLASS);
		card.setAttribute("data-chromium-rcu-focus", "true");
		try {
			card.focus({preventScroll: true});
		} catch (error) {
			card.focus();
		}
		card.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
		console.log(
			"[Paramount+ Browse] card=" + cardLabel(card) + " reason=" + reason
		);
		return true;
	}

	function headerControls() {
		var controls = Array.prototype.slice.call(
			document.querySelectorAll(
				"button.burger,a.icon.siteLogo," +
				"a.header__topLevelItem,[class*='header__topLevelItemfilter']," +
				"a.icon.search,button.current-userprofile-anchor"
			)
		).filter(visible);
		return controls.filter(function (control, index) {
			return controls.indexOf(control) === index;
		}).sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			return (leftRect.left + leftRect.width / 2) -
				(rightRect.left + rightRect.width / 2);
		});
	}

	function focusHeader(control, reason) {
		if (!control) {
			return false;
		}
		window.scrollTo(0, 0);
		clearCardFocus();
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		inHeader = true;
		console.log(
			"[Paramount+ Browse] header=" + cardLabel(control) + " reason=" + reason
		);
		return true;
	}

	function profileMenuContext(button) {
		var root = button && button.parentElement;
		var depth = 0;
		while (root && root !== document.body && depth < 4) {
			var candidates = Array.prototype.slice.call(
				root.querySelectorAll(
					"ul a[href],ul button,ul [role='option'],ul li.avatar"
				)
			).filter(visible);
			var controls = [];
			candidates.forEach(function (candidate) {
				var control = candidate;
				if (candidate.matches("li.avatar")) {
					control = candidate.querySelector(
						"a[href],button,[role='option'],[tabindex]"
					) || candidate;
				}
				if (
					control !== button && visible(control) &&
					controls.indexOf(control) === -1
				) {
					controls.push(control);
				}
			});
			if (controls.length) {
				return {root: root, controls: controls};
			}
			root = root.parentElement;
			depth += 1;
		}
		return null;
	}

	function focusProfileControl(control, reason) {
		if (!control || !visible(control)) {
			return false;
		}
		clearCardFocus();
		if (!control.matches("a[href],button,[tabindex]")) {
			control.setAttribute("tabindex", "-1");
		}
		control.classList.add(FOCUS_CLASS);
		try {
			control.focus({preventScroll: true});
		} catch (error) {
			control.focus();
		}
		inHeader = false;
		console.log(
			"[Paramount+ Browse] profile-menu=" + cardLabel(control) +
				" reason=" + reason
		);
		return true;
	}

	function focusProfileMenu(button, attempts) {
		var context = profileMenuContext(button);
		if (!context) {
			if (attempts > 0) {
				window.setTimeout(function () {
					focusProfileMenu(button, attempts - 1);
				}, 100);
				return true;
			}
			profileMenuButton = null;
			inHeader = false;
			return false;
		}
		profileMenuButton = button;
		console.log(
			"[Paramount+ Browse] profile-menu-items=" +
				context.controls.map(cardLabel).join(" | ")
		);
		return focusProfileControl(context.controls[0], "profile-open");
	}

	function profileDirectionalControl(controls, active, code) {
		var currentRect = active.getBoundingClientRect();
		var best = null;
		var bestScore = Infinity;
		controls.forEach(function (control) {
			if (control === active) {
				return;
			}
			var rect = control.getBoundingClientRect();
			var dx = rect.left + rect.width / 2 -
				(currentRect.left + currentRect.width / 2);
			var dy = rect.top + rect.height / 2 -
				(currentRect.top + currentRect.height / 2);
			var primary;
			var secondary;
			if (code === 37 && dx < -2) {
				primary = -dx;
				secondary = Math.abs(dy);
			} else if (code === 39 && dx > 2) {
				primary = dx;
				secondary = Math.abs(dy);
			} else if (code === 38 && dy < -2) {
				primary = -dy;
				secondary = Math.abs(dx);
			} else if (code === 40 && dy > 2) {
				primary = dy;
				secondary = Math.abs(dx);
			} else {
				return;
			}
			var score = primary * 10 + secondary;
			if (score < bestScore) {
				best = control;
				bestScore = score;
			}
		});
		return best;
	}

	function handleProfileMenuKey(event, code) {
		if (!profileMenuButton) {
			return false;
		}
		var context = profileMenuContext(profileMenuButton);
		if (!context) {
			profileMenuButton = null;
			return false;
		}
		var controls = context.controls;
		var active = document.activeElement;
		var index = controls.indexOf(active);
		if (code === 8 || code === 27 || code === KEY_MENU) {
			profileMenuButton.click();
			var button = profileMenuButton;
			profileMenuButton = null;
			return focusHeader(button, "profile-close");
		}
		if (code === 13) {
			if (index < 0) {
				return focusProfileControl(controls[0], "profile-entry");
			}
			if (!event.repeat && active.click) {
				active.click();
				console.log(
					"[Paramount+ Browse] profile-open=" + cardLabel(active)
				);
			}
			return true;
		}
		if ([37, 38, 39, 40].indexOf(code) === -1) {
			return false;
		}
		if (index < 0) {
			return focusProfileControl(controls[0], "profile-entry");
		}
		var next = profileDirectionalControl(controls, active, code);
		if (!next) {
			var offset = (code === 37 || code === 38) ? -1 : 1;
			next = controls[Math.max(0, Math.min(controls.length - 1, index + offset))];
		}
		return focusProfileControl(
			next,
			code === 37 ? "profile-left" : code === 39 ? "profile-right" :
				code === 38 ? "profile-up" : "profile-down"
		);
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
				if (control.contains(active) || (active && active.contains(control))) {
					index = controlIndex;
					return true;
				}
				return false;
			});
		}
		if (index < 0) {
			index = direction > 0 ? -1 : controls.length;
		}
		index = Math.max(0, Math.min(controls.length - 1, index + direction));
		return focusHeader(controls[index], direction < 0 ? "left" : "right");
	}

	function moveToHeader(reason) {
		var card = selectedCard();
		if (card) {
			lastCard = card;
		}
		var controls = headerControls();
		var home = document.querySelector("a.icon.siteLogo");
		controls.some(function (control) {
			var href = control.getAttribute && control.getAttribute("href");
			if (href) {
				try {
					var pathname = new URL(href, window.location.href).pathname;
					if (/^\/home\/?$/i.test(pathname)) {
						home = control;
						return true;
					}
				} catch (error) {
					/* Ignore malformed optional menu URLs. */
				}
			}
			return false;
		});
		return focusHeader(home || controls[0], reason);
	}

	function firstCard() {
		var actions = detailActions();
		if (actions.length) {
			var play = null;
			actions.some(function (action) {
				var label = cardLabel(action) || "";
				if (
					!action.matches(".watchlistCta") &&
					(/play|watch|abspielen|ansehen|fortsetzen|resume/i.test(label) ||
						action.matches("a.link"))
				) {
					play = action;
					return true;
				}
				return false;
			});
			return play || actions[0];
		}
		if (detailPage()) {
			return null;
		}
		var hero = heroActions().sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			return (leftRect.top - rightRect.top) || (leftRect.left - rightRect.left);
		});
		if (hero.length) {
			return hero[0];
		}
		var cards = tileCards();
		if (!cards.length) {
			cards = allCards();
		}
		var target = null;
		var top = Infinity;
		var left = Infinity;
		cards.forEach(function (card) {
			var rect = card.getBoundingClientRect();
			if (rect.top < top - 8 || (Math.abs(rect.top - top) <= 8 && rect.left < left)) {
				target = card;
				top = rect.top;
				left = rect.left;
			}
		});
		return target;
	}

	function focusDetailWhenReady(reason, attempts) {
		window.clearTimeout(pendingContentFocus);
		pendingContentFocus = window.setTimeout(function retry() {
			var card = firstCard();
			if (card && focusCard(card, reason + "-ready")) {
				pendingContentFocus = 0;
				return;
			}
			attempts -= 1;
			if (attempts > 0) {
				pendingContentFocus = window.setTimeout(retry, 250);
			} else {
				pendingContentFocus = 0;
				console.log("[Paramount+ Browse] detail actions not ready");
			}
		}, 100);
	}

	function moveToCards(reason) {
		var cards = contentItems();
		var card = reason === "header-down" ? null : lastCard;
		if (!card || cards.indexOf(card) === -1) {
			card = firstCard();
		}
		if (!card && detailPage()) {
			focusDetailWhenReady(reason, 16);
			return true;
		}
		return focusCard(card, reason);
	}

	function toggleMenu() {
		if (selectedCard() || cardFromElement(document.activeElement)) {
			return moveToHeader("menu-key");
		}
		return moveToCards("menu-return") || moveToHeader("menu-key");
	}

	function overlapsVertically(left, right) {
		var leftRect = left.getBoundingClientRect();
		var rightRect = right.getBoundingClientRect();
		var overlap = Math.min(leftRect.bottom, rightRect.bottom) -
			Math.max(leftRect.top, rightRect.top);
		return overlap > Math.max(8, Math.min(leftRect.height, rightRect.height) * 0.35);
	}

	function rowCards(card) {
		return contentItems().filter(function (candidate) {
			return overlapsVertically(card, candidate);
		}).sort(function (left, right) {
			return left.getBoundingClientRect().left - right.getBoundingClientRect().left;
		});
	}

	function carouselArrow(card, direction) {
		var selector = direction < 0 ?
			".carousel-prev,.swiper-button-prev,[class*='carousel-prev']" :
			".carousel-next,.swiper-button-next,[class*='carousel-next']";
		var node = card.parentElement;
		var depth = 0;
		while (node && node !== document.body && depth < 8) {
			var arrow = node.querySelector(selector);
			if (arrow && visible(arrow) && !arrow.disabled) {
				return arrow;
			}
			node = node.parentElement;
			depth += 1;
		}
		return null;
	}

	function moveHorizontal(card, direction) {
		var cards = rowCards(card);
		var index = cards.indexOf(card);
		var target = cards[index + direction];
		if (!target && cards.length > 1 && heroActions().indexOf(card) !== -1) {
			target = direction < 0 ? cards[cards.length - 1] : cards[0];
		}
		if (target) {
			return focusCard(target, direction < 0 ? "left" : "right");
		}
		var arrow = carouselArrow(card, direction);
		if (!arrow) {
			return true;
		}
		arrow.click();
		window.setTimeout(function () {
			var refreshed = rowCards(card);
			var edge = direction < 0 ? refreshed[0] : refreshed[refreshed.length - 1];
			if (edge) {
				focusCard(edge, direction < 0 ? "left-page" : "right-page");
			}
		}, 220);
		return true;
	}

	function moveVertical(card, direction) {
		var sourceRow = rowCards(card);
		var sourceRect = card.getBoundingClientRect();
		var sourceX = sourceRect.left + sourceRect.width / 2;
		var sourceY = sourceRect.top + sourceRect.height / 2;
		var candidates = contentItems().filter(function (candidate) {
			if (sourceRow.indexOf(candidate) !== -1) {
				return false;
			}
			var rect = candidate.getBoundingClientRect();
			var centerY = rect.top + rect.height / 2;
			return direction < 0 ? centerY < sourceY - 8 : centerY > sourceY + 8;
		});
		if (!candidates.length) {
			return direction < 0 ? moveToHeader("top-row-up") : true;
		}
		var nearestY = Infinity;
		candidates.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			nearestY = Math.min(nearestY, Math.abs(rect.top + rect.height / 2 - sourceY));
		});
		var target = null;
		var nearestX = Infinity;
		candidates.forEach(function (candidate) {
			var rect = candidate.getBoundingClientRect();
			var y = Math.abs(rect.top + rect.height / 2 - sourceY);
			var x = Math.abs(rect.left + rect.width / 2 - sourceX);
			if (y <= nearestY + Math.max(24, rect.height * 0.35) && x < nearestX) {
				target = candidate;
				nearestX = x;
			}
		});
		return focusCard(target, direction < 0 ? "up" : "down");
	}

	function openCard(card) {
		if (!card || !card.click) {
			return false;
		}
		console.log("[Paramount+ Browse] open=" + cardLabel(card));
		card.click();
		return true;
	}

	function focusVideoElement(element, reason, section) {
		if (!element || !visible(element)) {
			return false;
		}
		clearCardFocus();
		if (!element.matches("a[href],button,input,select,textarea,[tabindex]")) {
			element.setAttribute("tabindex", "-1");
		}
		element.classList.add(FOCUS_CLASS);
		try {
			element.focus({preventScroll: true});
		} catch (error) {
			element.focus();
		}
		if (section === "player") {
			window.scrollTo(0, 0);
		} else {
			var rect = element.getBoundingClientRect();
			window.scrollTo(0, Math.max(0,
				rect.top + window.pageYOffset - Math.max(105, window.innerHeight * 0.14)
			));
		}
		console.log(
			"[Paramount+ Video] " + section + "=" +
				cardLabel(element) + " reason=" + reason
		);
		return true;
	}

	function videoPlayerRoot() {
		return document.querySelector(
			".player-wrapper,.aa-player-skin,[data-testid='player']"
		);
	}

	function videoControls() {
		var root = videoPlayerRoot() || document;
		return Array.prototype.slice.call(
			root.querySelectorAll(VIDEO_CONTROL_SELECTOR)
		).filter(visible).filter(function (control, index, controls) {
			return controls.indexOf(control) === index;
		});
	}

	function focusVideoPlayer(reason) {
		var root = videoPlayerRoot();
		if (root) {
			try {
				root.dispatchEvent(new MouseEvent("mousemove", {
					bubbles: true,
					clientX: window.innerWidth / 2,
					clientY: window.innerHeight / 2
				}));
			} catch (error) {
				/* The controls may already be visible. */
			}
		}
		var play = document.querySelector(
			"button.controls-bottom-btn.btn-play-pause"
		);
		return focusVideoElement(
			visible(play) ? play : (videoControls()[0] || root),
			reason,
			"player"
		);
	}

	function pinVideoPlayer(reason) {
		if (!videoPlayerPinned || !playerOpen()) {
			return false;
		}
		var target = videoPlayerRoot() || document.querySelector("video");
		if (!target) {
			return false;
		}
		var rect = target.getBoundingClientRect();
		var targetTop = Math.max(0, rect.top + window.pageYOffset);
		if (Math.abs(rect.top) > 2) {
			window.scrollTo(0, targetTop);
		}
		if (!videoGeometryLogged) {
			videoGeometryLogged = true;
			console.log(
				"[Paramount+ Video] geometry top=" + Math.round(rect.top) +
					" left=" + Math.round(rect.left) +
					" width=" + Math.round(rect.width) +
					" height=" + Math.round(rect.height) +
					" scroll=" + Math.round(window.pageYOffset) +
					" reason=" + reason
			);
		}
		return true;
	}

	function initializeVideoPlayback(attempts) {
		if (!playerOpen()) {
			videoPlaybackPending = false;
			return;
		}
		videoPlaybackPending = true;
		videoPlayerPinned = true;
		var root = videoPlayerRoot();
		var video = document.querySelector("video");
		var play = document.querySelector(
			"button.controls-bottom-btn.btn-play-pause"
		);
		if (video) {
			if (video.paused) {
				try {
					var request = video.play();
					if (request && request.catch) {
						request.catch(function () {
							if (visible(play) && video.paused) {
								play.click();
							}
						});
					}
				} catch (error) {
					if (visible(play)) {
						play.click();
					}
				}
			}
			if (video.readyState >= 2) {
				videoPlaybackPending = false;
				focusVideoPlayer("playback-ready");
				pinVideoPlayer("playback-ready");
				console.log(
					"[Paramount+ Video] playback-ready paused=" +
						video.paused + " readyState=" + video.readyState
				);
				return;
			}
		}
		if (root) {
			pinVideoPlayer("playback-wait");
		}
		if (!videoPendingLogged) {
			videoPendingLogged = true;
			console.log("[Paramount+ Video] waiting-for-player");
		}
		if (attempts > 0) {
			window.setTimeout(function () {
				initializeVideoPlayback(attempts - 1);
			}, 300);
			return;
		}
		videoPlaybackPending = false;
		focusVideoPlayer("playback-timeout");
		console.log("[Paramount+ Video] playback-timeout");
	}

	function seasonButton() {
		var button = document.querySelector(SEASON_BUTTON_SELECTOR);
		return visible(button) ? button : null;
	}

	function seasonMenuRoot(button) {
		var root = button && button.parentElement;
		var depth = 0;
		while (root && root !== document.body && depth < 5) {
			if (root.querySelector("a[role='listitem'],[role='option']")) {
				return root;
			}
			root = root.parentElement;
			depth += 1;
		}
		return document;
	}

	function seasonOptions() {
		var button = seasonButton();
		var root = seasonMenuRoot(button);
		return Array.prototype.slice.call(
			root.querySelectorAll("a[role='listitem'],[role='option']")
		).filter(visible).filter(function (option) {
			return !option.closest("header,nav,footer,[role='navigation']");
		});
	}

	function videoEpisodes() {
		var button = seasonButton();
		var seasonBottom = button ?
			button.getBoundingClientRect().bottom + window.pageYOffset : 0;
		return Array.prototype.slice.call(
			document.querySelectorAll(VIDEO_EPISODE_SELECTOR)
		).filter(function (episode) {
			if (
				!visible(episode) ||
				episode.closest("header,nav,footer,[role='navigation'],.player-wrapper,.aa-player-skin")
			) {
				return false;
			}
			var rect = episode.getBoundingClientRect();
			return rect.top + window.pageYOffset > seasonBottom + 4;
		}).filter(function (episode, index, episodes) {
			return episodes.indexOf(episode) === index;
		}).sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			return (leftRect.top - rightRect.top) || (leftRect.left - rightRect.left);
		});
	}

	function firstVideoEpisode(reason, attempts) {
		var episode = videoEpisodes()[0];
		if (episode) {
			return focusVideoElement(episode, reason, "episode");
		}
		if (attempts > 0) {
			window.setTimeout(function () {
				firstVideoEpisode(reason + "-ready", attempts - 1);
			}, 250);
			return true;
		}
		console.log("[Paramount+ Video] episodes not ready");
		return false;
	}

	function videoEpisodeFromElement(element) {
		if (!element || !element.closest) {
			return null;
		}
		var episode = element.closest(VIDEO_EPISODE_SELECTOR);
		return videoEpisodes().indexOf(episode) !== -1 ? episode : null;
	}

	function moveVideoEpisode(episode, direction) {
		var episodes = videoEpisodes();
		var row = episodes.filter(function (candidate) {
			return overlapsVertically(episode, candidate);
		}).sort(function (left, right) {
			return left.getBoundingClientRect().left - right.getBoundingClientRect().left;
		});
		var index = row.indexOf(episode);
		if (direction === "left" || direction === "right") {
			var horizontal = row[index + (direction === "left" ? -1 : 1)];
			return horizontal ?
				focusVideoElement(horizontal, direction, "episode") : true;
		}
		var sourceRect = episode.getBoundingClientRect();
		var sourceX = sourceRect.left + sourceRect.width / 2;
		var sourceY = sourceRect.top + sourceRect.height / 2;
		var candidates = episodes.filter(function (candidate) {
			if (row.indexOf(candidate) !== -1) {
				return false;
			}
			var rect = candidate.getBoundingClientRect();
			var centerY = rect.top + rect.height / 2;
			return direction === "up" ? centerY < sourceY - 8 : centerY > sourceY + 8;
		}).sort(function (left, right) {
			var leftRect = left.getBoundingClientRect();
			var rightRect = right.getBoundingClientRect();
			var leftY = Math.abs(leftRect.top + leftRect.height / 2 - sourceY);
			var rightY = Math.abs(rightRect.top + rightRect.height / 2 - sourceY);
			var leftX = Math.abs(leftRect.left + leftRect.width / 2 - sourceX);
			var rightX = Math.abs(rightRect.left + rightRect.width / 2 - sourceX);
			return (leftY - rightY) || (leftX - rightX);
		});
		if (candidates.length) {
			return focusVideoElement(candidates[0], direction, "episode");
		}
		return direction === "up" && seasonButton() ?
			focusVideoElement(seasonButton(), "episodes-up", "season") : true;
	}

	function closeSeasonMenu(reason) {
		var button = seasonButton();
		if (!button) {
			return false;
		}
		if (seasonOptions().length) {
			button.click();
		}
		return focusVideoElement(button, reason, "season");
	}

	function handleSeasonOptions(event, code) {
		var options = seasonOptions();
		if (!options.length) {
			return false;
		}
		var active = document.activeElement;
		var option = active && active.closest &&
			active.closest("a[role='listitem'],[role='option']");
		var index = options.indexOf(option);
		if (index < 0) {
			index = options.findIndex(function (candidate) {
				return candidate.matches(".active,[aria-selected='true']");
			});
		}
		if (code === 40 && index === options.length - 1) {
			options[index].click();
			window.setTimeout(function () {
				firstVideoEpisode("season-end-to-episodes", 12);
			}, 300);
			return true;
		}
		if (code === 38 || code === 40) {
			index = Math.max(0, Math.min(options.length - 1,
				(index < 0 ? 0 : index + (code === 38 ? -1 : 1))));
			focusVideoElement(options[index], code === 38 ? "season-up" : "season-down", "season-option");
			return true;
		}
		if (code === 13 || code === 39) {
			var selected = options[index < 0 ? 0 : index];
			selected.click();
			window.setTimeout(function () {
				firstVideoEpisode("season-selected", 12);
			}, 300);
			return true;
		}
		if (code === 8 || code === 27 || code === 37) {
			return closeSeasonMenu("season-cancel");
		}
		return false;
	}

	function handleVideoKey(event) {
		var code = event.which || event.keyCode;
		var name = event.key || event.code || "";
		if (name === "MediaStop" || code === 178) {
			videoPlayerPinned = false;
			window.history.back();
			return true;
		}
		if (code === 8 || code === 27 || name === "BrowserBack") {
			videoPlayerPinned = false;
			window.history.back();
			return true;
		}
		if (videoPlaybackPending && [13, 37, 38, 39, 40].indexOf(code) !== -1) {
			pinVideoPlayer("playback-pending");
			focusVideoPlayer("playback-pending");
			return true;
		}
		if (handleSeasonOptions(event, code)) {
			return true;
		}
		var active = document.activeElement;
		var button = seasonButton();
		var episode = videoEpisodeFromElement(active);
		var control = active && active.closest && active.closest(VIDEO_CONTROL_SELECTOR);
		var play = document.querySelector("button.controls-bottom-btn.btn-play-pause");
		if (
			name === "MediaPlayPause" || name === "MediaPlay" ||
			name === "MediaPause" || [19, 179, 233, 250].indexOf(code) !== -1
		) {
			if (play) {
				play.click();
			} else {
				var video = document.querySelector("video");
				if (video) {
					video.paused ? video.play() : video.pause();
				}
			}
			return true;
		}
		if ([13, 37, 38, 39, 40].indexOf(code) === -1) {
			return false;
		}
		if (button && (active === button || button.contains(active))) {
			if (code === 13) {
				button.click();
				window.setTimeout(function () {
					var options = seasonOptions();
					if (options.length) {
						focusVideoElement(options[0], "season-open", "season-option");
					}
				}, 120);
				return true;
			}
			if (code === 40) {
				videoPlayerPinned = false;
				return firstVideoEpisode("season-to-episodes", 8);
			}
			if (code === 39) {
				videoPlayerPinned = false;
				return firstVideoEpisode("season-right-to-episodes", 8);
			}
			if (code === 38) {
				return focusVideoPlayer("season-to-player");
			}
			return true;
		}
		if (episode) {
			videoPlayerPinned = false;
			if (code === 13) {
				episode.click();
				return true;
			}
			return moveVideoEpisode(episode,
				code === 37 ? "left" : code === 39 ? "right" : code === 38 ? "up" : "down");
		}
		if (control || (videoPlayerRoot() && videoPlayerRoot().contains(active))) {
			if (code === 40 && button) {
				videoPlayerPinned = false;
				return focusVideoElement(button, "player-to-season", "season");
			}
			if (code === 13 && control && control.click) {
				control.click();
				return true;
			}
			if (code === 37 || code === 39) {
				var controls = videoControls().filter(function (candidate) {
					return candidate.matches("button.controls-bottom-btn");
				});
				var controlIndex = controls.indexOf(control);
				var nextControl = controls[controlIndex + (code === 37 ? -1 : 1)];
				return nextControl ? focusVideoElement(nextControl,
					code === 37 ? "player-left" : "player-right", "player") : true;
			}
			return true;
		}
		if (code === 40 && button) {
			videoPlayerPinned = false;
			return focusVideoElement(button, "video-entry", "season");
		}
		videoPlayerPinned = true;
		return focusVideoPlayer("video-entry");
	}

	function handleKey(event) {
		if (
			event.altKey || event.ctrlKey || event.metaKey ||
			modalOpen() || inputOpen(event)
		) {
			return;
		}
		if (playerOpen()) {
			if (handleVideoKey(event)) {
				consume(event);
			}
			return;
		}
		var code = event.which || event.keyCode;
		var name = event.key || event.code || "";
		if (code === KEY_MENU || name === "ContextMenu" || name === "Menu") {
			if (!event.repeat && toggleMenu()) {
				consume(event);
			}
			return;
		}

		var active = document.activeElement;
		if (handleProfileMenuKey(event, code)) {
			consume(event);
			return;
		}
		var activeHeader = inHeader || headerControls().indexOf(active) !== -1;
		if (activeHeader) {
			if (code === 37 || code === 39) {
				if (moveHeader(code === 37 ? -1 : 1)) {
					consume(event);
				}
			} else if (code === 40 && moveToCards("header-down")) {
				consume(event);
			} else if (code === 38) {
				consume(event);
			} else if (code === 13 && !event.repeat && active && active.click) {
				var profile = active.matches("button.current-userprofile-anchor");
				active.click();
				if (profile) {
					window.setTimeout(function () {
						focusProfileMenu(active, 12);
					}, 120);
				}
				consume(event);
			}
			return;
		}

		if ([13, 37, 38, 39, 40].indexOf(code) === -1) {
			return;
		}
		var card = selectedCard();
		if (!card) {
			card = cardFromElement(active);
			if (!card) {
				return;
			}
			focusCard(card, "active-entry");
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

	function installStyle() {
		var style = document.createElement("style");
		style.id = "chromium-paramount-browse-style";
		style.textContent =
			"." + FOCUS_CLASS + "{" +
				"position:relative!important;z-index:100!important;" +
				"transform:scale(1.06)!important;" +
			"}" +
			"." + FOCUS_CLASS + "::after{" +
				"content:\"\"!important;position:absolute!important;inset:0!important;" +
				"border:5px solid #fff!important;border-radius:9px!important;" +
				"box-shadow:0 0 0 3px #0064ff,0 0 18px 6px rgba(0,100,255,.9)!important;" +
				"pointer-events:none!important;z-index:2147483647!important;" +
			"}";
		(document.head || document.documentElement).appendChild(style);
	}

	if (window.__chromiumParamountBrowseInstalled) {
		return;
	}
	window.__chromiumParamountBrowseInstalled = true;
	installStyle();
	window.addEventListener("keydown", handleKey, true);
	if (playerOpen()) {
		window.setInterval(function () {
			pinVideoPlayer("monitor");
		}, 250);
		window.setTimeout(function () {
			initializeVideoPlayback(150);
		}, 700);
	}
	console.log("[Paramount+ Browse] installed r13 profile-dropdown-navigation");
}());
