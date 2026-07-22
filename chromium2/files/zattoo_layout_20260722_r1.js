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
		"main#main { margin-right: 0 !important; }",
		"header[data-soul='HEADER'] { right: 0 !important; }"
	].join("\n");
	(document.head || document.documentElement).appendChild(style);
})();
