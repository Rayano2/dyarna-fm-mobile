import { Redirect, Stack } from 'expo-router';

import { guardRedirect, useAuthStore } from '@/features/auth';

export default function AuthLayout(): React.JSX.Element {
  const status = useAuthStore((s) => s.status);
  const redirect = guardRedirect(status, 'auth');
  if (redirect) return <Redirect href={redirect as never} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
