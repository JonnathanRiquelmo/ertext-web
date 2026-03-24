import type { ParserDiagnostic } from '../ast';
import type { SyncCommitResult, SyncCoordinator } from '../sync';

export interface MonacoLikeLanguageDefinition {
  readonly id: 'erdsl';
  readonly keywords: readonly string[];
  readonly operators: readonly string[];
}

export function createMonacoLanguageDefinition(): MonacoLikeLanguageDefinition {
  return {
    id: 'erdsl',
    keywords: [
      'Generate',
      'Domain',
      'Entities',
      'Relationships',
      'is',
      'relates',
      'isIdentifier',
      'total',
      'partial',
      'disjoint',
      'overlapped',
      'int',
      'double',
      'money',
      'string',
      'boolean',
      'datetime',
      'file'
    ],
    operators: [':', ';', ',', '/', '{', '}', '[', ']', '(', ')']
  };
}

interface TimerControl {
  schedule(task: () => void, delayMs: number): number;
  cancel(handle: number): void;
}

const browserTimerControl: TimerControl = {
  schedule(task, delayMs) {
    return window.setTimeout(task, delayMs);
  },
  cancel(handle) {
    window.clearTimeout(handle);
  }
};

export interface TextValidationState {
  readonly diagnostics: readonly ParserDiagnostic[];
  readonly result: SyncCommitResult | null;
}

export interface TextEditorSession {
  getText(): string;
  getDiagnostics(): readonly ParserDiagnostic[];
  setText(nextText: string): void;
  flush(): void;
  syncFromAst(): void;
}

interface TextEditorSessionOptions {
  readonly coordinator: SyncCoordinator;
  readonly initialText: string;
  readonly debounceMs?: number;
  readonly timer?: TimerControl;
  readonly onValidation?: (state: TextValidationState) => void;
}

export function createTextEditorSession(options: TextEditorSessionOptions): TextEditorSession {
  const debounceMs = options.debounceMs ?? 120;
  const timer = options.timer ?? browserTimerControl;
  const onValidation = options.onValidation ?? (() => undefined);
  let text = options.initialText;
  let diagnostics: readonly ParserDiagnostic[] = [];
  let pendingHandle: number | null = null;
  let pendingBaseRevision = options.coordinator.getRevision();

  const safeCommit = () => {
    const result = options.coordinator.commitText(text, pendingBaseRevision);
    diagnostics = result.ok ? [] : result.diagnostics;
    onValidation({ diagnostics, result });
  };

  return {
    getText() {
      return text;
    },
    getDiagnostics() {
      return diagnostics;
    },
    setText(nextText) {
      text = nextText;
      pendingBaseRevision = options.coordinator.getRevision();
      if (pendingHandle !== null) {
        timer.cancel(pendingHandle);
      }
      pendingHandle = timer.schedule(() => {
        safeCommit();
      }, debounceMs);
    },
    flush() {
      if (pendingHandle !== null) {
        timer.cancel(pendingHandle);
        pendingHandle = null;
      }
      safeCommit();
    },
    syncFromAst() {
      text = options.coordinator.projectText();
      diagnostics = [];
      onValidation({ diagnostics, result: null });
    }
  };
}
