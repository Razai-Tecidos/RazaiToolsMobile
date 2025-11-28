import * as Sentry from '@sentry/react-native';
import { isDevice } from 'expo-device';

export const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

export function initSentry() {
  if (!isDevice) {
    // Don't initialize on simulator/emulator if preferred
    // return; 
  }

  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN_HERE', // TODO: Replace with actual DSN
    debug: __DEV__, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
    integrations: [
      new Sentry.ReactNativeTracing({
        // Pass instrumentation to be used as `routingInstrumentation`
        routingInstrumentation,
        enableNativeFramesTracking: !isDevice, // Only in dev/emulator
      }),
    ],
  });
}
