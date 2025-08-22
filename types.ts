export interface Note {
  id: string;
  text: string;
  imageUrl: string | null;
  drawingUrl: string | null;
  audioUrl: string | null;
  summary: string | null;
  color: string;
  tags: string[];
}

export type ToastType = 'error' | 'success';

export interface ToastMessage {
  message: string;
  type: ToastType;
}