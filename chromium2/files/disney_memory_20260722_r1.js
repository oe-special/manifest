(function () {
	"use strict";

	if (window.__openatvDisneyMemoryInstalled)
		return;
	window.__openatvDisneyMemoryInstalled = true;

	var MAX_IMAGE_WIDTH = 480;
	var disneyImage = /(?:^|\/\/)(?:[^/]+\.)?(?:bamgrid\.com|disney-plus\.net)(?:\/|$)/i;
	var rewritten = 0;
	var lastReport = 0;

	function capNumber(prefix, number) {
		var value = parseInt(number, 10);
		if (!isFinite(value) || value <= MAX_IMAGE_WIDTH)
			return prefix + number;
		rewritten++;
		return prefix + MAX_IMAGE_WIDTH;
	}

	function capUrl(value) {
		if (!value || typeof value !== "string" || !disneyImage.test(value))
			return value;

		var capped = value.replace(
			/([?&](?:width|maxWidth)=)(\d+)/gi,
			capNumber
		);
		capped = capped.replace(
			/([?&]max=)(\d+)(%7C|\|)(\d+)/gi,
			function (match, prefix, width, separator, height) {
				var oldWidth = parseInt(width, 10);
				var oldHeight = parseInt(height, 10);
				if (!isFinite(oldWidth) || oldWidth <= MAX_IMAGE_WIDTH)
					return match;
				var newHeight = isFinite(oldHeight) && oldHeight > 0 ?
					Math.max(1, Math.round(oldHeight * MAX_IMAGE_WIDTH / oldWidth)) :
					oldHeight;
				rewritten++;
				return prefix + MAX_IMAGE_WIDTH + separator + newHeight;
			}
		);
		return capped;
	}

	function rewriteAttribute(element, name) {
		if (!element || !element.getAttribute || !element.hasAttribute(name))
			return;
		var value = element.getAttribute(name);
		var capped = capUrl(value);
		if (capped !== value)
			element.setAttribute(name, capped);
	}

	function processElement(element) {
		if (!element || element.nodeType !== 1)
			return;
		var name = (element.tagName || "").toLowerCase();
		if (name === "img") {
			try {
				element.decoding = "async";
			} catch (error) {
				// Chromium builds without the property simply ignore the hint.
			}
		}
		var attributes = [
			"src", "srcset", "data-src", "data-srcset", "poster", "style"
		];
		for (var index = 0; index < attributes.length; index++)
			rewriteAttribute(element, attributes[index]);
	}

	function processTree(root) {
		processElement(root);
		if (!root || typeof root.querySelectorAll !== "function")
			return;
		var elements = root.querySelectorAll(
			"img,source,[data-src],[data-srcset],[poster],[style*='bamgrid']," +
			"[style*='disney-plus.net']"
		);
		for (var index = 0; index < elements.length; index++)
			processElement(elements[index]);
	}

	function report() {
		if (rewritten === lastReport)
			return;
		lastReport = rewritten;
		console.log(
			"[OpenATV Disney Memory] capped " + rewritten +
			" artwork URLs at " + MAX_IMAGE_WIDTH + "px"
		);
	}

	var observer = new MutationObserver(function (mutations) {
		for (var mutationIndex = 0; mutationIndex < mutations.length; mutationIndex++) {
			var mutation = mutations[mutationIndex];
			if (mutation.type === "attributes")
				processElement(mutation.target);
			for (var nodeIndex = 0; nodeIndex < mutation.addedNodes.length; nodeIndex++)
				processTree(mutation.addedNodes[nodeIndex]);
		}
		report();
	});

	function install() {
		processTree(document.documentElement);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: [
				"src", "srcset", "data-src", "data-srcset", "poster", "style"
			],
			childList: true,
			subtree: true
		});
		report();
		console.log(
			"[OpenATV Disney Memory] installed, max artwork width=" +
			MAX_IMAGE_WIDTH
		);
	}

	if (document.documentElement)
		install();
	else
		document.addEventListener("DOMContentLoaded", install, {once: true});
}());
