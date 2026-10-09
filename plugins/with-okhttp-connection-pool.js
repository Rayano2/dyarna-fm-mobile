const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// Android-only fix for false "operation failed" toasts caused by stale
// keep-alive sockets.
//
// Every network call in the app funnels through ky -> fetch -> RN's
// NetworkingModule -> OkHttp. OkHttp keeps idle HTTP/1.1+2 connections in a
// ConnectionPool and reuses them; the default pool holds an idle socket for
// **5 minutes** (`ConnectionPool(5, 5, TimeUnit.MINUTES)`). Our edge closes
// idle connections somewhere between 45s and 60s (measured 2026-08-15 on
// Railway: 45s idle still reusable, 60s idle already dead — the exact close
// point was not narrowed further). When the app has been backgrounded /
// idle and the user then taps something, OkHttp picks a pooled socket the
// edge has already torn down: the request goes out on a dead connection, the
// server frequently still processes it (200), but reading the response fails
// with "unexpected end of stream" / "Connection reset" — so the UI reports a
// failure for an action that actually succeeded. A manual retry works because
// it opens a fresh connection. iOS (NSURLSession) manages its own pool and is
// unaffected; an emulator never idles long enough to reproduce it.
//
// The fix is to evict idle sockets *before* the edge does, by shortening the
// pool's keep-alive. That is the only behavioural change: we build on RN's own
// `OkHttpClientProvider.createClientBuilder()` so the cookie jar, timeouts and
// any RN interceptors are preserved verbatim.
//
// Deliberately NOT done here:
//  * `retryOnConnectionFailure` is already `true` (OkHttp's default; RN never
//    overrides it), so setting it would be dead code dressed up as a fix.
//  * No retry Interceptor. An OkHttp interceptor sits *below* ky, so it would
//    replay POST/PATCH/PUT/DELETE too, silently bypassing
//    `RETRY_CONFIG.methods = ['get']` in src/shared/api/client.ts and
//    reintroducing the duplicate-booking/ticket/vote risk that guard exists to
//    prevent. No endpoint has idempotency keys.
//
// The plugin does two things, both idempotent (safe on every prebuild):
//  1. writes the Kotlin factory next to MainApplication (dangerous mod), and
//  2. registers it in `MainApplication.onCreate` — one import, one call,
//     inserted immediately after `super.onCreate()` so it lands before any
//     network module can be instantiated.
//
// `android/` is gitignored: only this plugin is source of truth, the Kotlin
// file is generated output.
//
// Known runtime-only limitations — this fix lowers the failure rate, it is not
// a correctness guarantee on its own. Do not lose these; they are the first
// things to check against a future field report:
//  1. OkHttp evicts over-idle connections from a *background cleanup task* and
//     does NOT re-check idle duration when a connection is acquired. So after a
//     wake from CPU suspend the pool can still briefly hand out a socket that
//     has been idle past the keep-alive, before the cleanup task gets to run.
//     The JS-side reconcile (#26, commit 7ad13d0) stays the correctness
//     guarantee; this plugin only shrinks the window it has to cover.
//  2. A network transition (Wi-Fi <-> cellular, VPN toggle) kills pooled
//     sockets immediately, regardless of keep-alive, and surfaces the exact
//     same user-visible symptom. If false failures persist after this ships,
//     the connection pool is NOT the remaining cause — do not shrink
//     KEEP_ALIVE_SECONDS further chasing it.
//  3. Registration timing: the factory is registered in `Application.onCreate`
//     and `OkHttpClientProvider` memoizes the client it builds. Anything that
//     obtains the client *before* onCreate — a ContentProvider, which Android
//     runs first — would get the default client and our factory would be set
//     too late and silently ignored. No current dependency does this; it is a
//     prime suspect if the fix ever mysteriously stops working.

const FACTORY_CLASS = 'DyarnaOkHttpClientFactory';
const FACTORY_FILENAME = `${FACTORY_CLASS}.kt`;

// OkHttp's ConnectionPool defaults: 5 idle connections, 5 minutes keep-alive.
// We keep the connection count and cut the keep-alive to 30s — see the Kotlin
// doc comment below for the measurement this number comes from.
const MAX_IDLE_CONNECTIONS = 5;
const KEEP_ALIVE_SECONDS = 30;

const IMPORT_LINE = 'import com.facebook.react.modules.network.OkHttpClientProvider';
// Idempotency marker for OUR registration specifically. It must name the
// factory class: a bare `setOkHttpClientFactory(` would also match a factory
// registered by some *other* config plugin, and we would then skip our own
// insertion and ship without the fix. See ANY_REGISTRATION_RE below.
const REGISTRATION_MARKER = `setOkHttpClientFactory(${FACTORY_CLASS}(`;
// Any registration, whoever owns it; capture group 1 is the argument's leading
// identifier (`DyarnaOkHttpClientFactory()`, `SomeSdk.factory()`, `myFactory`).
const ANY_REGISTRATION_RE = /setOkHttpClientFactory\(\s*([A-Za-z_][\w.]*)/g;
const REGISTRATION_CALL = `OkHttpClientProvider.setOkHttpClientFactory(${FACTORY_CLASS}())`;
const REGISTRATION_COMMENT =
  '// Shorter OkHttp keep-alive so idle sockets are evicted before the edge closes them.';

function buildFactorySource(packageName) {
  return `package ${packageName}

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.util.concurrent.TimeUnit
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient

/**
 * Generated by plugins/with-okhttp-connection-pool.js — do not edit by hand.
 *
 * Supplies the OkHttpClient used by React Native's networking stack (and
 * therefore by every ky/fetch call in the app).
 *
 * The client is built from [OkHttpClientProvider.createClientBuilder] so React
 * Native's own configuration — its cookie jar ([ReactCookieJarContainer]), its
 * "no timeouts, JS owns them" timeout policy and any interceptors it installs —
 * is preserved. Building a bare OkHttpClient here would silently drop all of it.
 *
 * The single override is the connection pool. OkHttp's default keeps an idle
 * connection alive for 5 minutes, which is longer than our edge's idle timeout:
 * the app then reuses a socket the server has already closed, the request is
 * often still processed (200) but the response read fails ("unexpected end of
 * stream" / "Connection reset") and the user sees a false failure.
 *
 * The edge idle timeout was measured on 2026-08-15 (Railway): a connection
 * idled 45s could still be reused, one idled 60s was already dead ("Remote end
 * closed connection without response"). The measurement therefore only bounds
 * the close point to the interval (45s, 60s] — it was NOT observed to be 60s,
 * and nothing rules out, say, 46s. 45s is simply the longest idle still known
 * to work. ${KEEP_ALIVE_SECONDS}s is chosen to sit below that last observed-good value, not
 * below 60s, leaving margin for clock skew and in-flight timing.
 *
 * Do not raise this toward 60s on the reasoning that "the edge closes at 60s":
 * 60s is the first idle known to FAIL, not the boundary. The usable headroom
 * over ${KEEP_ALIVE_SECONDS}s is 15s (up to the last known-good 45s), and taking it would need
 * a fresh measurement that actually narrows the interval.
 *
 * This value is deliberately tied to the SHORTEST known edge idle timeout
 * across all environments: if a future environment (gateway, CDN, proxy) closes
 * sooner, this number must come down with it.
 *
 * Trade-off: an occasional extra TCP+TLS handshake (tens of ms) in exchange for
 * not showing a failure for an action that succeeded — cheap.
 *
 * Note: [OkHttpClient.Builder.retryOnConnectionFailure] is intentionally not
 * touched — it is already true by default and RN does not override it. Nor is a
 * retry interceptor installed: it would sit below ky and would replay non-
 * idempotent requests, which the JS retry policy deliberately forbids.
 */
class ${FACTORY_CLASS} : OkHttpClientFactory {
  override fun createNewNetworkModuleClient(): OkHttpClient =
      OkHttpClientProvider.createClientBuilder()
          .connectionPool(
              ConnectionPool(MAX_IDLE_CONNECTIONS, KEEP_ALIVE_SECONDS, TimeUnit.SECONDS)
          )
          .build()

  private companion object {
    /** Same as OkHttp's default — only the keep-alive changes. */
    const val MAX_IDLE_CONNECTIONS = ${MAX_IDLE_CONNECTIONS}

    /** Must stay under the last idle duration observed to still work: 45s (OkHttp default: 5 min). */
    const val KEEP_ALIVE_SECONDS = ${KEEP_ALIVE_SECONDS}L
  }
}
`;
}

// Writes android/app/src/main/java/<package>/DyarnaOkHttpClientFactory.kt.
// Same package as MainApplication, so the registration below needs a single
// import (the provider) and no import for the factory itself.
const withOkHttpFactoryFile = (config) => {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const packageName = cfg.android?.package;
      if (!packageName) {
        throw new Error(
          '[with-okhttp-connection-pool] android.package is not set in the Expo config; ' +
            'cannot determine where to write ' +
            FACTORY_FILENAME,
        );
      }

      const targetDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...packageName.split('.'),
      );
      fs.mkdirSync(targetDir, { recursive: true });

      const filePath = path.join(targetDir, FACTORY_FILENAME);
      const contents = buildFactorySource(packageName);
      // Always rewrite: the file is generated output, so the plugin is the
      // source of truth and re-running prebuild must converge on it.
      if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== contents) {
        fs.writeFileSync(filePath, contents, 'utf8');
      }
      return cfg;
    },
  ]);
};

// Inserts the import + the registration call into MainApplication.kt and
// returns the new contents. Pure string -> string so it can be unit-tested
// against a template fixture without running prebuild; every failure mode is a
// throw, never a silent no-op, because a missed insertion only shows up as a
// user-visible false failure months later.
function injectFactoryRegistration(contents, language) {
  if (language !== 'kt') {
    throw new Error(
      `[with-okhttp-connection-pool] expected a Kotlin MainApplication, got "${language}". ` +
        'Update this plugin before shipping — otherwise the OkHttp connection-pool fix is silently absent.',
    );
  }

  // React Native's OkHttpClientProvider keeps only the LAST factory it was
  // given, so two plugins registering factories is a real conflict: one of the
  // two configurations is dropped. Refuse to guess which.
  const foreign = [...contents.matchAll(ANY_REGISTRATION_RE)]
    .map((match) => match[1])
    .filter((owner) => owner !== FACTORY_CLASS);
  if (foreign.length > 0) {
    throw new Error(
      `[with-okhttp-connection-pool] MainApplication already registers a different OkHttp factory (${foreign.join(', ')}). ` +
        'React Native keeps only the LAST factory passed to OkHttpClientProvider.setOkHttpClientFactory(), so stacking ' +
        `registrations would silently drop one of them. Merge the connection-pool override (see ${FACTORY_FILENAME}) into ` +
        'that other factory and remove this plugin, rather than registering both.',
    );
  }

  // Idempotency: bail out of each edit if its marker is already present, so
  // re-running prebuild over an existing android/ never duplicates them.
  if (!contents.includes(IMPORT_LINE)) {
    const imports = [...contents.matchAll(/^import .*$/gm)];
    if (imports.length === 0) {
      throw new Error(
        '[with-okhttp-connection-pool] no import statements found in MainApplication.kt; ' +
          'cannot insert the OkHttpClientProvider import.',
      );
    }
    const last = imports.at(-1);
    const insertAt = last.index + last[0].length;
    contents = `${contents.slice(0, insertAt)}\n${IMPORT_LINE}${contents.slice(insertAt)}`;
  }

  if (!contents.includes(REGISTRATION_MARKER)) {
    const onCreate =
      /(override fun onCreate\(\)\s*\{[^\n]*\r?\n)([ \t]*)(super\.onCreate\(\)[^\n]*\r?\n)/;
    if (!onCreate.test(contents)) {
      throw new Error(
        '[with-okhttp-connection-pool] could not find `super.onCreate()` inside ' +
          "MainApplication.onCreate(); the template changed and the OkHttp factory wouldn't be registered.",
      );
    }
    contents = contents.replace(
      onCreate,
      (_match, header, indent, superCall) =>
        `${header}${indent}${superCall}${indent}${REGISTRATION_COMMENT}\n${indent}${REGISTRATION_CALL}\n`,
    );
  }

  return contents;
}

// Registers the factory at the top of MainApplication.onCreate — before
// loadReactNative(), i.e. before anything can build a networking module.
const withOkHttpFactoryRegistration = (config) => {
  return withMainApplication(config, (cfg) => {
    cfg.modResults.contents = injectFactoryRegistration(
      cfg.modResults.contents,
      cfg.modResults.language,
    );
    return cfg;
  });
};

module.exports = function withOkHttpConnectionPool(config) {
  config = withOkHttpFactoryFile(config);
  config = withOkHttpFactoryRegistration(config);
  return config;
};

// Exported for plugins/with-okhttp-connection-pool.test.ts only — the plugin
// itself stays the module's default export.
module.exports.injectFactoryRegistration = injectFactoryRegistration;
