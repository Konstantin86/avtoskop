import { notFound } from 'next/navigation';

// Any address under a language that matches no page shows the site's own 404 page.
export default function CatchAll() {
  notFound();
}
