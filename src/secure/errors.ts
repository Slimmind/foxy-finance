export type VaultErrorCode =
  | 'wrong-code'
  | 'passkey-cancelled'
  | 'passkey-failed'
  | 'passkey-unsupported'
  | 'corrupt'
  | 'bad-state';

export class VaultError extends Error {
  constructor(
    public readonly code: VaultErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'VaultError';
  }
}

export function explainError(e: unknown): string {
  if (e instanceof VaultError) {
    switch (e.code) {
      case 'wrong-code':
        return 'Неверный код.';
      case 'passkey-cancelled':
        return 'Подтверждение отменено.';
      case 'passkey-unsupported':
        return 'Это устройство или браузер не поддерживает защиту через Face ID. Используй код.';
      case 'passkey-failed':
        return 'Не удалось подтвердить личность. Попробуй ещё раз.';
      case 'corrupt':
        return 'Данные повреждены и не читаются. Восстанови их из резервной копии.';
      case 'bad-state':
        return 'Действие сейчас недоступно.';
    }
  }
  return 'Что-то пошло не так. Попробуй ещё раз.';
}
