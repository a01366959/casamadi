import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { title } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { error } = await supabase
      .from("conversations")
      .update({ title: title.trim() })
      .eq("id", id);

    if (error) {
      console.error("[Thread] Rename error:", error);
      return NextResponse.json(
        { error: "Failed to rename thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, title });
  } catch (err) {
    console.error("[Thread] API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
