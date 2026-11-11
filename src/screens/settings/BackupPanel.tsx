import { useState } from 'react';
import { assessRisk, isComplete } from '../../lib/scoring';
import type { AppState } from '../../lib/storage';
import { BackupError, MIN_BACKUP_PASSWORD, createBackup, readBackup } from '../../secure/backup';
import { Message, PasswordPair, passwordOk, useTask } from './shared';

interface Props {
  app: AppState;
  onReplaceState: (next: AppState) => void;
}

const fileName = () => `foxy-backup-${new Date().toISOString().slice(0, 10)}.foxy`;

async function shareOrDownload(file: File): Promise<void> {
  // The share sheet is the natural way to save a file on phones; on desktop a plain download is better.
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Резервная копия Foxy Finance' });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
      // otherwise fall through to a regular download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function BackupPanel({ app, onReplaceState }: Props) {
  return (
    <section className="box stack" aria-labelledby="bk-title">
      <h2 id="bk-title" className="subtitle">
        Резервная копия
      </h2>
      <p>
        Копия нужна, чтобы перенести данные на другое устройство или восстановить их после потери телефона. Файл
        зашифрован отдельным паролем.
      </p>
      <ExportBlock app={app} />
      <ImportBlock onReplaceState={onReplaceState} />
    </section>
  );
}

function ExportBlock({ app }: { app: AppState }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { busy, msg, run } = useTask();

  const ok = passwordOk(pw, pw2, MIN_BACKUP_PASSWORD);

  return (
    <div className="stack">
      <h3 className="label">Сохранить копию</h3>
      {!file ? (
        <>
          <PasswordPair
            idPrefix="bk-export"
            label="Пароль для файла"
            minLength={MIN_BACKUP_PASSWORD}
            value={pw}
            repeat={pw2}
            onChange={(a, b) => {
              setPw(a);
              setPw2(b);
            }}
          />
          <p className="note">Пароль нельзя восстановить. Забудешь его, и файл не откроется.</p>
          <button
            className="btn btn--block"
            disabled={!ok || busy}
            onClick={() =>
              run(async () => {
                const text = await createBackup(app, pw);
                setFile(new File([text], fileName(), { type: 'application/json' }));
                setPw('');
                setPw2('');
              })
            }
          >
            {busy ? 'Шифруем…' : 'Подготовить файл'}
          </button>
        </>
      ) : (
        <>
          <p className="ok">Файл готов: {file.name}</p>
          <div className="row">
            <button className="btn" onClick={() => setFile(null)}>
              Отмена
            </button>
            <button className="btn btn--primary" onClick={() => run(() => shareOrDownload(file))}>
              Отправить или сохранить
            </button>
          </div>
        </>
      )}
      <Message msg={msg} />
    </div>
  );
}

function ImportBlock({ onReplaceState }: { onReplaceState: (next: AppState) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState('');
  const [preview, setPreview] = useState<AppState | null>(null);
  const { busy, msg, setMsg, run } = useTask();

  const reset = () => {
    setFile(null);
    setPw('');
    setPreview(null);
  };

  const decrypt = async () => {
    if (!file) return;
    try {
      setPreview(await readBackup(await file.text(), pw));
      setMsg(null);
    } catch (e) {
      setPw('');
      setMsg({
        kind: 'error',
        text:
          e instanceof BackupError && e.code === 'bad-file'
            ? 'Это не файл резервной копии Foxy Finance.'
            : 'Неверный пароль или файл повреждён.',
      });
    }
  };

  return (
    <div className="stack">
      <h3 className="label">Восстановить из копии</h3>

      {!preview ? (
        <>
          <label className="btn btn--block file">
            <input
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setMsg(null);
              }}
            />
            {file ? file.name : 'Выбрать файл'}
          </label>
          <div className="field">
            <label htmlFor="bk-import-pw" className="label">
              Пароль файла
            </label>
            <input
              id="bk-import-pw"
              className="input input--small"
              type="password"
              autoComplete="off"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
          <button className="btn btn--block" disabled={!file || !pw || busy} onClick={() => run(decrypt)}>
            {busy ? 'Расшифровываем…' : 'Расшифровать'}
          </button>
        </>
      ) : (
        <div className="stack">
          <p>
            В копии: профиль {isComplete(preview.answers) ? <b>{assessRisk(preview.answers).profile.name}</b> : 'не пройден'},
            операций: <b>{preview.history.length}</b>.
          </p>
          <p className="note">Текущие данные на этом устройстве будут заменены.</p>
          <div className="row">
            <button className="btn" onClick={reset}>
              Отмена
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                onReplaceState(preview);
                reset();
                setMsg({ kind: 'ok', text: 'Данные восстановлены.' });
              }}
            >
              Заменить
            </button>
          </div>
        </div>
      )}
      <Message msg={msg} />
    </div>
  );
}
