export interface Note {
  id: string;
  user_id: string;
  created_at?: string;
  text: string;
  image_url: string | null;
  drawing_url: string | null;
  audio_url: string | null;
  summary: string | null;
  color: string;
  tags: string[];
  tasks: string[] | null;
  related_note_ids: string[] | null;
  stack_id: string | null;
  is_pinned?: boolean;
  canvas_x: number | null;
  canvas_y: number | null;
}

export type ToastType = 'error' | 'success';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

export interface UserProfile {
  name: string;
  avatar: string;
}
