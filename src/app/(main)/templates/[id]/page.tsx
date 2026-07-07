import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { FlowEditor } from '@/components/FlowEditor';
import type { FlowEdge, FlowNode } from '@/lib/flow-types';

export default async function TemplateEditPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const [template, companies] = await Promise.all([
    prisma.processTemplate.findUnique({ where: { id: params.id } }),
    prisma.company.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, isHost: true, teams: true },
      orderBy: [{ isHost: 'desc' }, { name: 'asc' }],
    }),
  ]);
  if (!template) notFound();

  return (
    <div className="container wide">
      <FlowEditor
        templateId={template.id}
        initialName={template.name}
        initialDescription={template.description ?? ''}
        initialEstimatedDays={template.estimatedDays}
        initialNodes={template.nodes as unknown as FlowNode[]}
        initialEdges={template.edges as unknown as FlowEdge[]}
        companies={companies}
        readOnly={user.role !== 'ADMIN'}
      />
    </div>
  );
}
