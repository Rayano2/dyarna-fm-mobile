import { describe, expect, it } from 'vitest';
import { injectFactoryRegistration } from './with-okhttp-connection-pool';

// A verbatim copy of the MainApplication.kt that `expo prebuild` generates for
// this app (Expo 54 / RN 0.8x template, package com.dyarna.fm), *before* this
// plugin edits it. Copied rather than read from android/: that directory is
// gitignored and is absent on a fresh clone and in CI.
//
// When an Expo/RN upgrade changes this template, this fixture must be updated
// to match — that is the point of these tests. They turn "the injection no
// longer applies" from a prebuild crash during someone's release into a red
// test on the upgrade PR.
const TEMPLATE_MAIN_APPLICATION = `package com.dyarna.fm

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`;

const IMPORT_LINE = 'import com.facebook.react.modules.network.OkHttpClientProvider';
// Deliberately the *generic* call, not our class name: it also counts a foreign
// registration, which is what makes the "exactly one" assertions meaningful.
const ANY_REGISTRATION = 'setOkHttpClientFactory(';

function countOf(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('injectFactoryRegistration', () => {
  it('adds exactly one import and one registration to the current template', () => {
    const out = injectFactoryRegistration(TEMPLATE_MAIN_APPLICATION, 'kt');

    expect(countOf(out, IMPORT_LINE)).toBe(1);
    expect(countOf(out, ANY_REGISTRATION)).toBe(1);
    expect(out).toContain('setOkHttpClientFactory(DyarnaOkHttpClientFactory())');
  });

  it('registers the factory before loadReactNative()', () => {
    const out = injectFactoryRegistration(TEMPLATE_MAIN_APPLICATION, 'kt');

    // The whole point of the fix: the factory must be installed before anything
    // can instantiate RN's networking module, which loadReactNative() does.
    expect(out.indexOf(ANY_REGISTRATION)).toBeLessThan(out.indexOf('loadReactNative('));
    expect(out.indexOf('super.onCreate()')).toBeLessThan(out.indexOf(ANY_REGISTRATION));
  });

  it('is idempotent — re-running prebuild over an already-modified file changes nothing', () => {
    const once = injectFactoryRegistration(TEMPLATE_MAIN_APPLICATION, 'kt');
    const twice = injectFactoryRegistration(once, 'kt');

    expect(twice).toBe(once);
    expect(countOf(twice, IMPORT_LINE)).toBe(1);
    expect(countOf(twice, ANY_REGISTRATION)).toBe(1);
  });

  it('throws on a Java MainApplication instead of silently skipping the fix', () => {
    expect(() => injectFactoryRegistration(TEMPLATE_MAIN_APPLICATION, 'java')).toThrow(
      /expected a Kotlin MainApplication/,
    );
  });

  it('throws when the file has no imports to anchor to', () => {
    const noImports = `package com.dyarna.fm

class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()
  }
}
`;

    expect(() => injectFactoryRegistration(noImports, 'kt')).toThrow(/no import statements found/);
  });

  it('throws when super.onCreate() is gone (template changed)', () => {
    const noOnCreate = TEMPLATE_MAIN_APPLICATION.replace(
      /  override fun onCreate\(\) \{\n    super\.onCreate\(\)\n/,
      '  override fun onStart() {\n',
    );

    expect(noOnCreate).not.toContain('super.onCreate()');
    expect(() => injectFactoryRegistration(noOnCreate, 'kt')).toThrow(
      /could not find `super\.onCreate\(\)`/,
    );
  });

  it('throws when another plugin already registered a different OkHttp factory', () => {
    // RN keeps only the LAST factory, so stacking ours on top of e.g. an SSL
    // pinning or APM factory would silently drop one configuration. Better to
    // fail prebuild loudly than to ship with either fix missing.
    const foreign = injectFactoryRegistration(TEMPLATE_MAIN_APPLICATION, 'kt').replace(
      'DyarnaOkHttpClientFactory()',
      'SomeSdkOkHttpClientFactory()',
    );

    expect(() => injectFactoryRegistration(foreign, 'kt')).toThrow(
      /already registers a different OkHttp factory \(SomeSdkOkHttpClientFactory\)/,
    );
  });
});
