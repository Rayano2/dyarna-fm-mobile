/* eslint-disable no-restricted-syntax -- deliberately theme-independent fallback: raw hex keeps the boundary rendering even if unistyles/theme loading is what crashed */
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { logger } from '@/shared/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Top-level boundary that catches render errors anywhere in the tree (deep-link
// dispatch, FCM payload parsing, screen render bugs, etc.). Styles are hardcoded
// — the boundary intentionally avoids unistyles/i18n so a theme- or i18n-loading
// failure can't take the fallback down with it.
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('Root error boundary caught error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  reload = (): void => {
    void Updates.reloadAsync().catch((error) => logger.warn('Updates.reloadAsync failed', error));
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Reloading usually fixes it.
          </Text>
          <Pressable
            onPress={this.reload}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Reload app"
          >
            <Text style={styles.buttonLabel}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F2EA',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    color: '#403D38',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#8A7E66',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#445335',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
