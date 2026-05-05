/**
 * /order — redirects to / (main ordering page)
 *
 * This route is kept to avoid 404 for any saved bookmarks.
 * All ordering logic now lives in src/app/page.tsx only.
 */
import { redirect } from 'next/navigation';

export default function OrderRedirect() {
  redirect('/');
}
