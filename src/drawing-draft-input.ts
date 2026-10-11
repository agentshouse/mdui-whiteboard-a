import { DraftSession, type RoomDraft } from './draft-session.ts';
import { parseScene, serializeScene, type Drawing, type Scene } from './house.ts';
import { mergeSceneInput } from './scene-draft.ts';

type SceneInput = (current: Scene) => Scene;
/** Failed local inputs belong to this drawing and remain unsaved until retried.
 * Failed Scene deltas are replayed against current native data, not an old whole
 * canvas, so a later retry retains another tab's disjoint element changes. */
export class DrawingDraftInput {
  private failedScenes: SceneInput[] = [];
  private failedTitle: string | undefined;
  readonly session: DraftSession;
  drawing: Drawing;
  constructor(session: DraftSession, drawing: Drawing) { this.session = session; this.drawing = drawing; }
  get hasFailures() { return this.failedScenes.length > 0 || this.failedTitle !== undefined; }
  private problem() {
    return `Local drawing input could not be kept: ${[...(this.failedScenes.length ? ['canvas'] : []), ...(this.failedTitle !== undefined ? ['title'] : [])].join(', ')}. Retry that input before Save; other drawings are unchanged.`;
  }
  async read() {
    try { return await this.session.read(); }
    catch (error) { if (!this.hasFailures) throw error; return this.session.current(); }
  }
  preview(draft: RoomDraft | null) {
    const current = parseScene(draft?.parts.sections?.Scene?.value ?? this.drawing.sceneText);
    return {
      scene: this.failedScenes.reduce((value, apply) => apply(value), current),
      title: this.failedTitle ?? draft?.parts.fields?.title?.value ?? this.drawing.title,
    };
  }
  async title(value: string) {
    try {
      await this.session.stage({ fields: { title: { value, base: { value: this.drawing.title } } } });
      this.failedTitle = undefined;
    } catch (error) { this.failedTitle = value; throw error; }
  }
  async scene(previous: Scene, input: Scene) {
    const apply: SceneInput = current => mergeSceneInput(previous, input, current);
    let replayed: SceneInput[] = [];
    try {
      await this.session.stage(draft => {
        replayed = [...this.failedScenes];
        const current = parseScene(draft?.parts.sections?.Scene?.value ?? this.drawing.sceneText);
        return { sections: { Scene: {
          value: serializeScene(apply(replayed.reduce((value, retry) => retry(value), current))),
          base: this.drawing.sceneText,
        } } };
      });
      this.failedScenes = this.failedScenes.filter(retry => !replayed.includes(retry));
    } catch (error) { this.failedScenes.push(apply); throw error; }
  }
  async flush() {
    try { await this.session.flush(); }
    catch (error) { if (this.hasFailures) throw new Error(this.problem(), { cause: error }); throw error; }
    if (this.hasFailures) throw new Error(this.problem());
  }
}
