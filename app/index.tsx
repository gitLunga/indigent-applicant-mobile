import { Redirect } from 'expo-router';

/**
 * The entry route.
 *
 * Sends straight to the dashboard; the gate in the root layout redirects to
 * sign-in if there is no session. Having one place decide that is what keeps the
 * decision out of every screen.
 */
export default function Index() {
  return <Redirect href="/(app)/dashboard" />;
}
