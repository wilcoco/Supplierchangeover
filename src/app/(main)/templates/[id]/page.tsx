import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { FlowEditor } from '@/components/FlowEditor';
import type { FlowEdge, FlowNode } from '@/lib/flow-types';

export default async function TemplateEditPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const template = await prisma.processTemplate.findUnique({ where: { id: params.id } });
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
        readOnly={user.role !== 'ADMIN'}
      />
    </div>
  );
}
