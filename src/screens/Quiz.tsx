import { useEffect, useRef, useState } from 'react';
import { FoxSays } from '../components/Fox';
import { QUESTIONS } from '../data/questions';
import type { Answers } from '../lib/scoring';

interface Props {
  answers: Answers;
  onAnswer: (questionId: string, optionIndex: number) => void;
  onFinish: () => void;
  onExit: () => void;
}

export function Quiz({ answers, onAnswer, onFinish, onExit }: Props) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLFieldSetElement>(null);
  const q = QUESTIONS[step];
  const selected = answers[q.id];
  const isLast = step === QUESTIONS.length - 1;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <section className="screen">
      <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={step + 1} aria-label="Прогресс теста">
        {QUESTIONS.map((x, i) => (
          <span key={x.id} className={`progress__cell ${i <= step ? 'is-on' : ''}`} />
        ))}
      </div>
      <p className="muted counter">
        Вопрос {step + 1} / {QUESTIONS.length}
      </p>

      <FoxSays>{q.hint}</FoxSays>

      <fieldset key={q.id} ref={heading} tabIndex={-1} className="question box">
        <legend className="question__text">{q.text}</legend>
        {q.options.map((o, i) => (
          <label key={o.label} className={`option ${selected === i ? 'is-selected' : ''}`}>
            <input type="radio" name={q.id} checked={selected === i} onChange={() => onAnswer(q.id, i)} />
            <span className="option__mark" aria-hidden="true" />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="row">
        <button className="btn" onClick={() => (step === 0 ? onExit() : setStep(step - 1))}>
          Назад
        </button>
        <button
          className="btn btn--primary"
          disabled={selected === undefined}
          onClick={() => (isLast ? onFinish() : setStep(step + 1))}
        >
          {isLast ? 'Результат' : 'Далее'}
        </button>
      </div>
    </section>
  );
}
