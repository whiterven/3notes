export interface Note {
  id: string;
  text: string;
  imageUrl: string | null;
  drawingUrl: string | null;
  audioUrl: string | null;
  summary: string | null;
  color: string;
  tags: string[];
  tasks: string[] | null;
  relatedNoteIds: string[] | null;
  stackId: string | null;
  isPinned?: boolean;
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
