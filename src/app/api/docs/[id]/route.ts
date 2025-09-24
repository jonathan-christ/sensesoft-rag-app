import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/features/auth/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, filename, mime_type, size_bytes, status, created_at, meta')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (documentError) {
      console.error('Error fetching document:', documentError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { count: chunkCount, error: chunkCountError } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (chunkCountError) {
      console.error('Error fetching chunk count:', chunkCountError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({
      ...document,
      chunk_count: chunkCount,
    });
  } catch (error) {
    console.error('Error in GET /api/docs/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
