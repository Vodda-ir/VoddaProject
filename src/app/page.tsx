import { redirect } from 'next/navigation';

/**
 * Root entry — redirects to the REA static preview (vodda2 / rea/preview branch).
 * The gateway (Caddy :81) routes any request carrying ?XTransformPort=3500
 * to the static preview server on localhost:3500.
 */
export default function Home() {
  redirect('/index.html?XTransformPort=3500');
}
