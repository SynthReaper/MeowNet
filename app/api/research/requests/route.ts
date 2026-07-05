import { NextRequest, NextResponse } from 'next/server';
import { requestResearchData } from '@/lib/actions/partners';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const formData = new FormData();
    formData.append('researcher_email', body.researcher_email);
    formData.append('institution', body.institution);
    formData.append('research_purpose', body.research_purpose);
    formData.append('requested_data_types', JSON.stringify(body.requested_data_types || []));

    const res = await requestResearchData(formData);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

    return NextResponse.json({ success: true, requestId: res.requestId });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
