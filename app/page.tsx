import { redirect } from 'next/navigation';

/** The product opens on the map. */
export default function RootPage() {
  redirect('/map');
}
