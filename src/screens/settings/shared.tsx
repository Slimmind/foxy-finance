import { useState } from 'react';
import { explainError } from '../../secure/errors';
import { MIN_CODE_LENGTH } from '../../secure/vault';

export interface Msg {
  kind: 'ok' | 'error';
  text: string;
}

export function useTask() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const run = async (fn: () => Promise<void>, ok?: string): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ kind: 'ok', text: ok });
      return true;
    } catch (e) {
      setMsg({ kind: 'error', text: explainError(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, msg, setMsg, run };
}

export function Message({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  return (
    <p className={msg.kind === 'error' ? 'error' : 'ok'} role={msg.kind === 'error' ? 'alert' : 'status'}>
      {msg.text}
    </p>
  );
}

interface PasswordPairProps {
  idPrefix: string;
  label: string;
  minLength: number;
  value: string;
  repeat: string;
  onChange: (value: string, repeat: string) => void;
}

export function PasswordPair({ idPrefix, label, minLength, value, repeat, onChange }: PasswordPairProps) {
  const tooShort = value.length > 0 && value.length < minLength;
  const mismatch = repeat.length > 0 && value !== repeat;
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor={`${idPrefix}-1`} className="label">
          {label}
        </label>
        <input
          id={`${idPrefix}-1`}
          className="input input--small"
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value, repeat)}
          aria-invalid={tooShort}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-2`} className="label">
          Ещё раз
        </label>
        <input
          id={`${idPrefix}-2`}
          className="input input--small"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => onChange(value, e.target.value)}
          aria-invalid={mismatch}
        />
      </div>
      {tooShort && <p className="error">Минимум {minLength} символов.</p>}
      {mismatch && <p className="error">Не совпадает.</p>}
    </div>
  );
}

export const passwordOk = (value: string, repeat: string, min: number) => value.length >= min && value === repeat;

export function CodeForm({
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  submitLabel: string;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [repeat, setRepeat] = useState('');
  const ok = passwordOk(code, repeat, MIN_CODE_LENGTH);

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSubmit(code);
      }}
    >
      <PasswordPair
        idPrefix="code"
        label="Новый код"
        minLength={MIN_CODE_LENGTH}
        value={code}
        repeat={repeat}
        onChange={(a, b) => {
          setCode(a);
          setRepeat(b);
        }}
      />
      <p className="muted">
        Короткий цифровой код можно подобрать, если украдут файл с данными. Чем длиннее и необычнее, тем лучше.
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn btn--primary" disabled={!ok || busy}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
