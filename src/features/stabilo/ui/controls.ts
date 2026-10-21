/**
 * Which controls a dialogue node must show.
 *
 * Pure, and separate from the component, for one reason: a test can then walk
 * every node in every script and assert that none of them is a dead end. That
 * was the failure the reviewer hit — a question on screen with no named way out
 * of it — and it is a property of the script, not of one rendering.
 *
 * Two rules hold here rather than in each call site:
 *   1. `exit` is always true. Every node can be left, and the control says so.
 *   2. A quiz always offers a way past itself. Before, "Lewati kuis" only
 *      appeared after the engine had decided to hint, so a stuck reader had
 *      nothing to press.
 */
export interface NodeControlsInput {
  quiz?: boolean;
  ask?: boolean;
  nameInput?: boolean;
  intensityPick?: boolean;
}

export interface NodeControls {
  /** The corner close button. */
  exit: true;
  /** The plain "Lanjut" button for narration. */
  next: boolean;
  /** The honest "Paham / Belum paham" pair. */
  ask: boolean;
  /** Answer buttons. */
  options: boolean;
  skipQuiz: boolean;
  nameSubmit: boolean;
  intensity: boolean;
}

export function controlsFor(input: NodeControlsInput): NodeControls {
  const quiz = Boolean(input.quiz);
  const ask = Boolean(input.ask) && !quiz;
  const nameInput = Boolean(input.nameInput);
  const intensity = Boolean(input.intensityPick) && !quiz;

  return {
    exit: true,
    next: !quiz && !ask && !nameInput && !intensity,
    ask,
    options: quiz,
    // Unconditional: see rule 2 above.
    skipQuiz: quiz,
    nameSubmit: nameInput,
    intensity,
  };
}

/** Something other than leaving: a guide that only offers "close" is a dead end. */
export function hasForwardControl(controls: NodeControls): boolean {
  return (
    controls.next ||
    controls.ask ||
    controls.options ||
    controls.skipQuiz ||
    controls.nameSubmit ||
    controls.intensity
  );
}
