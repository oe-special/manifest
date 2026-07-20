# oe-special update manifests

This repository publishes small, architecture-independent update manifests for
OpenEmbedded/Enigma2 components.

## Chromium2 web controls

`chromium2/manifest-v1.json` is consumed by the Chromium2 Enigma2 plugin. It
contains:

- a dynamic portal catalog with CDM requirements and thumbnails;
- URL-to-script/style mappings;
- file sizes and SHA-256 digests;
- relative download paths.

The receiver downloads every referenced file into a staging directory,
verifies all files, and only then replaces its local web controls.

### Add support for a website

1. Add a site-specific JavaScript file to `chromium2/files/`. If generic
   directional navigation is sufficient, reuse `rcu_plugin.js`.
2. Add the URL prefix and scripts/styles to `chromium2/sites.json`.
3. To expose it as a streaming portal, also add a `portals` entry and a
   150x60 PNG thumbnail. Set `requires_cdm` to `true` for DRM services.
4. Run:

   ```sh
   python3 tools/build_chromium2_manifest.py
   ```

5. Review the changed manifest and files before committing.

On a receiver, open Chromium Setup, press the yellow **Update web controls**
key, then restart Chromium.

### Debug a website

Enable **RCU debug log** in Chromium Setup. The receiver writes key codes and
DOM focus information to `/tmp/chromium-rcu.log`. It does not log input
values, cookies, query strings, or passwords.

No Widevine/CDM binaries, credentials, cookies, or receiver-specific settings
belong in this repository.
