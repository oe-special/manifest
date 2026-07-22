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
OK opens the selected title. The Dream Menu key toggles between the Prime
header and the last selected tile; if no tile was selected yet it enters the
first real card. Up from the first row enters the header. The current Prime
header controls are navigated directly with Left/Right instead of relying on
the legacy handler's obsolete logo/menu structure.
`hbomax_navigation.js` makes the Dream Menu key toggle between HBO Max page
content and its current header. Header entry prefers Sign In; Left/Right moves
between the HBO Max logo, Sign In and Sign Up Now. The current
`auth.hbomax.com` login origin is supported and its email field is focused
through HBO's nested Shadow DOM after loading so the virtual keyboard opens.
Up/Down and OK then navigate and activate the visible login form controls,
including Continue and the password step. On the signed-in HBO Max browse
page, only movie tile links participate in navigation: Left/Right stays in
the current rail, Up/Down chooses the nearest tile in the adjacent rail and
OK opens the selected title. Movie/show detail pages start on the Play action;
Left/Right moves only between the hero actions, Down enters recommendations,
and Up or Menu enters the header. The home-page Continue Watching hero uses
the same action navigation while its full-surface link is skipped.
`hbomax_media_keys.js` treats the Dream Play key as a Play/Pause toggle,
supports a separate Pause key, 10-second Forward/Rewind and Mute. DreamNextGen
Volume Up/Down remain unconsumed so the native EGL command socket can route
them to Enigma2's system volume. Stop and Exit leave the HBO Max SPA player
directly through browser history without first changing the media element
state.

The verified portal catalog contains YouTube TV, Netflix, Disney+, Zattoo,
Prime Video, HBO Max, Paramount+, RTL+, MagentaTV and Pluto TV.
Only YouTube TV is exposed without Widevine. New services start with the
generic RCU adapter; Pluto TV retains its dedicated compatibility adapter.
`plutotv_consent_20260722_r1.js` recognizes Pluto TV's current OneTrust
consent panel. It keeps arrow and OK key handling inside the visible panel,
initially focuses Accept, and prevents the live-TV guide behind the panel from
moving while consent is open.
`plutotv_navigation_20260722_r1.js` replaces the obsolete top-level routing
of the legacy Pluto adapter. The home page navigates between its hero actions
and visual content rails, On Demand separates its category column from movie
rails, and Live TV treats each guide row as a stable channel/program grid.
The Dream Menu key toggles between Pluto's current header and page content.

`zattoo_layout_20260722_r1.js` hides Zattoo's fixed 300-pixel advertising
sidebar and releases the reserved width for the header and main content.
`zattoo_navigation_20260722_r1.js` keeps remote-control focus within the
header, hero and individual content carousels. Off-screen carousel duplicates
are ignored and the carousel controls are used when focus reaches an edge.
`paramount_navigation.js` replaces Paramount+'s obsolete
`/[region]/account/flow/.../action/login/` target (also accepted without a
region), which returns HTTP 403, with the
current locale-specific `/<region>/account/signin/` page both before a click
and after an old login URL was opened. The region is retained from the portal
URL or referrer instead of being hard-coded. The catalog launches Paramount+
at its neutral root URL so Paramount can select the correct market worldwide.
The selected market is stored locally and restored when Paramount drops the
locale prefix after sign-in, for example by turning `/home/` back into the
previously selected `/<region>/home/`. When that storage is not available, the
adapter derives the market from Chromium's language, which the plugin seeds
from the OpenATV Enigma2 language through `--lang`. A per-target loop guard
prevents repeated redirects if Paramount rejects a regional content URL.
On the signed-in home page, the newsletter opt-in modal locks RCU focus to its
checkbox, policy link and Yes/No buttons; background tiles cannot steal focus,
and Exit safely activates No to dismiss the dialog.
The dated `paramount_browse_navigation_*.js` adapter separates Paramount's
header from its movie
rails. The Dream Menu key toggles between the header and the last selected
movie tile, Left/Right stays in the visual rail, and Up/Down selects the
nearest tile in the adjacent rail. The selected tile receives an explicit TV
focus frame instead of relying on Paramount's inconsistent browser focus.
The home-page hero controls, including the carousel Pause button and its
primary action, form a navigation row between the header and the first movie
rail instead of being skipped.
On show and movie detail pages, the same Menu toggle waits for and returns to
the visible Play/Resume and Watchlist hero actions before episodes or
recommendations. OK explicitly opens the profile menu and hands its first
visible entry to normal navigation. Only Paramount's primary header controls
participate in header navigation, so profile-dropdown entries cannot trap
Left/Right focus.
Paramount video pages use a separate navigation state machine for the player,
season selector, open season menu and episode rows. This prevents the generic
spatial scanner from mixing player controls, header links and episode cards;
selecting a season returns focus to its first episode, while Left/Back closes
the season menu without leaving the page.
Paramount+ uses a Windows Chrome 92 user agent matching the actual browser
engine. The earlier LG webOS identifier made login available but selected
Paramount's Smart-TV player path, which expects native platform integration
that this standalone Chromium does not provide. The engine-matched desktop
agent keeps the normal web player and also avoids the contradictory Chrome 131
/ Chromium 92 fingerprint that can trigger bot protection. The newer default
Chrome agent remains available to Netflix.

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
DOM focus information persistently to `/home/root/logs/chromium-rcu.log`.
`/tmp/chromium-rcu.log` points to the same file while the receiver is running.
The log is appended across browser starts and rotated at 8 MiB; the previous
log remains available as `chromium-rcu.log.1`. It does not log input
values, cookies, query strings, or passwords.

No Widevine/CDM binaries, credentials, cookies, or receiver-specific settings
belong in this repository.
