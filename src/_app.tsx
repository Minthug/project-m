import { AppsInToss } from '@apps-in-toss/framework';
import { PropsWithChildren } from 'react';
import { InitialProps } from '@granite-js/react-native';
import { context } from '../require.context';
import * as Sentry from '@sentry/react-native';

if (typeof global.DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name ?? 'DOMException';
    }
  };
}

Sentry.init({
  dsn: 'https://3505ae4561529c1987dd7d6c10543139@o4511352878465024.ingest.us.sentry.io/4511352881217536',
  enableNative: false,
});

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <>{children}</>;
}

export default AppsInToss.registerApp(AppContainer, { context });
