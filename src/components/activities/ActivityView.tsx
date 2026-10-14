import type { Activity } from '../../types';
import type { ActivityResult, AnswerEvent } from './common';
import { ErrorFix, Gap, Mcq, Order, PictureChoice, Reading } from './quiz';
import { DialogueBuild, Match, Sort } from './interactive';
import { Flashcards, Grammar, ListenRepeat, Speak, Watch, Write } from './media';

export type { ActivityResult, AnswerEvent };

/** Renders any activity. `key` it by activity id so state resets between activities. */
export function ActivityView({ activity, onAnswer, onDone }: { activity: Activity; onAnswer: (a: AnswerEvent) => void; onDone: (r: ActivityResult) => void }) {
  const p = { onAnswer, onDone };
  switch (activity.kind) {
    case 'mcq': return <Mcq activity={activity} {...p} />;
    case 'gap': return <Gap activity={activity} {...p} />;
    case 'order': return <Order activity={activity} {...p} />;
    case 'error': return <ErrorFix activity={activity} {...p} />;
    case 'picture': return <PictureChoice activity={activity} {...p} />;
    case 'reading': return <Reading activity={activity} {...p} />;
    case 'match': return <Match activity={activity} {...p} />;
    case 'sort': return <Sort activity={activity} {...p} />;
    case 'dialogue': return <DialogueBuild activity={activity} {...p} />;
    case 'flashcards': return <Flashcards activity={activity} {...p} />;
    case 'grammar': return <Grammar activity={activity} {...p} />;
    case 'watch': return <Watch activity={activity} {...p} />;
    case 'listen': return <ListenRepeat activity={activity} {...p} />;
    case 'speak': return <Speak activity={activity} {...p} />;
    case 'write': return <Write activity={activity} {...p} />;
  }
}

export const KIND_LABEL: Record<Activity['kind'], string> = {
  mcq: 'Multiple choice', gap: 'Gap-fill', order: 'Sentence order', error: 'Error correction', picture: 'Picture choice', reading: 'Reading',
  match: 'Matching', sort: 'Drag and drop', dialogue: 'Dialogue building', flashcards: 'Word cards', grammar: 'Grammar', watch: 'Dialogue',
  listen: 'Listen & repeat', speak: 'Speaking', write: 'Writing',
};
