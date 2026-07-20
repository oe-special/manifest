#!/usr/bin/env python3

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHROMIUM_DIR = ROOT / "chromium2"
FILES_DIR = CHROMIUM_DIR / "files"
SITES_PATH = CHROMIUM_DIR / "sites.json"
MANIFEST_PATH = CHROMIUM_DIR / "manifest-v1.json"


def load_sites():
	with SITES_PATH.open("r", encoding="utf-8") as source:
		data = json.load(source)
	if data.get("schema") != 1 or not isinstance(data.get("sites"), list):
		raise ValueError("chromium2/sites.json must use schema 1 and contain sites")
	if not isinstance(data.get("portals"), list):
		raise ValueError("chromium2/sites.json must contain portals")
	return data


def file_record(path):
	content = path.read_bytes()
	return {
		"name": path.name,
		"path": "files/%s" % path.name,
		"size": len(content),
		"sha256": hashlib.sha256(content).hexdigest()
	}


def referenced_files(sites_data):
	references = {sites_data.get("debug_script")}
	portal_ids = set()
	for portal in sites_data["portals"]:
		portal_id = portal.get("id")
		if not isinstance(portal_id, str) or not portal_id:
			raise ValueError("each portal needs an id")
		if portal_id in portal_ids:
			raise ValueError("duplicate portal id: %s" % portal_id)
		portal_ids.add(portal_id)
		for key in ("name", "url", "mode"):
			if not isinstance(portal.get(key), str) or not portal[key]:
				raise ValueError("portal %s needs %s" % (portal_id, key))
		if not isinstance(portal.get("requires_cdm"), bool):
			raise ValueError("portal %s needs requires_cdm" % portal_id)
		icon = portal.get("icon")
		if icon is not None:
			if not isinstance(icon, str):
				raise ValueError("portal %s icon must be a string" % portal_id)
			references.add(icon)
	for site in sites_data["sites"]:
		if not isinstance(site.get("url"), str) or not site["url"]:
			raise ValueError("each site needs a non-empty URL")
		for key in ("scripts", "styles"):
			values = site.get(key, [])
			if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
				raise ValueError("%s for %s must be a string list" % (key, site["url"]))
			references.update(values)
	references.discard(None)
	return references


def main():
	sites_data = load_sites()
	available = {path.name: path for path in FILES_DIR.iterdir() if path.is_file()}
	references = referenced_files(sites_data)
	missing = sorted(references - set(available))
	if missing:
		raise SystemExit("missing referenced files: %s" % ", ".join(missing))

	manifest = {
		"schema": 1,
		"product": "chromium2-web-controls",
		"channel": "stable",
		"generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
		"debug_script": sites_data.get("debug_script"),
		"portals": sites_data["portals"],
		"sites": sites_data["sites"],
		"files": [file_record(available[name]) for name in sorted(references)]
	}
	serialized = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
	MANIFEST_PATH.write_text(serialized, encoding="utf-8", newline="\n")
	print("wrote %s with %d sites and %d files" % (
		MANIFEST_PATH,
		len(manifest["sites"]),
		len(manifest["files"])
	))


if __name__ == "__main__":
	main()
