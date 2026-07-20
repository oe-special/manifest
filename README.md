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

Netflix uses two small compatibility adapters after its legacy handler:
`netflix_media_keys.js` for player transport keys and
`netflix_games_keys.js` for the Continue/Resume overlay on `/play-game/`.
Gameplay remains controlled by Netflix's phone/tablet controller.
The generic `rcu_plugin.js` keeps directional focus inside visible modal
dialogs and initially selects OneTrust's Accept All/Accept Recommended action.
`disney_navigation.js` adds the otherwise missing directional transition from
Disney+'s centered account-creation hero to the Login action in the
upper-right header. On `/identity/` it also exposes Disney's theme variables
and fade-in keyframes outside unsupported CSS cascade layers, allowing the
Chromium 92 login form to become visible.
`prime_language_keys.js` handles Prime Video's current header dropdowns: the
arrow keys move between the stable `pv-nav-locale-*` language controls and
the account/profile actions such as `pv-nav-sign-in`. OK performs the native
button or link action instead of being swallowed by the legacy Prime handler.
`prime_media_keys.js` maps the OpenATV/Dream media-key events missing from the
legacy Prime keymap. It selects Prime's visible player instead of the hidden
legacy player node. The combined Play/Pause key toggles the active HTML video,
the transport keys seek by ten seconds, Stop/Exit close the player, and
Volume+/Volume-/Mute control the web player with the same 175/174/173 key
codes used by the Netflix adapter.
`prime_navigation.js` uses Prime's current `data-testid` cards plus standalone
detail links for visible RCU focus. Vertical navigation follows the tiles'
actual screen positions instead of DOM container order, so recommendation and
special rows remain reachable. Left/Right navigate within the visual row and
OK opens the selected title.

The verified portal catalog contains YouTube TV, Netflix, Disney+, DAZN,
Prime Video, HBO Max, Paramount+, RTL+, MagentaTV, Apple TV+ and Pluto TV.
Only YouTube TV is exposed without Widevine. New services start with the
generic RCU adapter; Pluto TV retains its dedicated compatibility adapter.

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
