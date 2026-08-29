import { redirect } from 'next/navigation';
import { catalog } from '@/lib/catalog';

/**
 * Canonical-URL resolver (§29).
 *
 * `/agents/<slug>` is a convenient handle to share, but the map's own URL
 * carries the department too. This resolves the slug and redirects to that
 * canonical form; an unknown slug falls back to the map rather than 404ing.
 */
export default async function AgentResolverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = catalog.indexes.agentBySlug.get(slug);
  if (!agent) redirect('/map');

  const department = catalog.indexes.departmentById.get(agent.departmentId);
  redirect(department ? `/map/${department.slug}/${agent.slug}` : '/map');
}
