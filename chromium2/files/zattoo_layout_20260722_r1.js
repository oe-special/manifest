(function () {
	"use strict";

	var STYLE_ID = "chromium2-zattoo-layout";
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	var style = document.createElement("style");
	style.id = STYLE_ID;
	style.type = "text/css";
	style.textContent = [
		"[data-soul='DISPLAY_ADS_SIDEBAR'] { display: none !important; }",
		"[data-soul='TOOLTIP'] { display: none !important; }",
		"main#main { margin-right: 0 !important; }",
		"header[data-soul='HEADER'] { right: 0 !important; }"
	].join("\n");
	(document.head || document.documentElement).appendChild(style);

	function dismissQuickTips() {
		Array.prototype.forEach.call(document.querySelectorAll(
			"[data-soul='TOOLTIP_CLOSE']"
		), function (button) {
			if (button.getAttribute("data-chromium-tip-dismissed") === "1") {
				return;
			}
			button.setAttribute("data-chromium-tip-dismissed", "1");
			var tooltip = button.closest("[data-soul='TOOLTIP']");
			if (tooltip) {
				tooltip.style.setProperty("display", "none", "important");
			}
			if (button.click) {
				button.click();
			}
		});
	}

	dismissQuickTips();
	new MutationObserver(dismissQuickTips).observe(document.documentElement, {
		childList: true,
		subtree: true
	});
})();
