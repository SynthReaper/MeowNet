import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createTask, claimTask, completeTask } from '@/lib/actions/volunteers';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const colonyId = url.searchParams.get('colony_id');
  const priority = url.searchParams.get('priority');

  let query = supabase
    .from('tasks' as never)
    .select('*, profiles:profiles!tasks_created_by_fkey(display_name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (colonyId) query = query.eq('colony_id', colonyId);
  if (priority) query = query.eq('priority', priority);

  const { data: tasks } = await query as unknown as { data: unknown[] | null };
  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('title', body.title);
    if (body.description) formData.append('description', body.description);
    if (body.colony_id) formData.append('colony_id', body.colony_id);
    formData.append('task_type', body.task_type);
    formData.append('priority', body.priority || 'medium');
    formData.append('required_skills', JSON.stringify(body.required_skills || []));
    if (body.due_date) formData.append('due_date', body.due_date);

    const res = await createTask(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { taskId, action } = body;

    if (action === 'claim') {
      const res = await claimTask(taskId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'complete') {
      const res = await completeTask(taskId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
