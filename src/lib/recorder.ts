// Microphone recording with MediaRecorder. Recordings stay in memory only (never uploaded or saved).
import { embedded } from './env';

// Embedded pages (for example a shared link) block the microphone, so recording is offered only when the app runs on its own.
export const recordingSupported = () =>
  !embedded && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && 'MediaRecorder' in window;

export interface Recording { stop: () => Promise<string>; cancel: () => void }

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  const end = () => stream.getTracks().forEach((t) => t.stop());
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          end();
          resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })));
        };
        rec.stop();
      }),
    cancel: () => {
      try { rec.stop(); } catch { /* already stopped */ }
      end();
    },
  };
}
