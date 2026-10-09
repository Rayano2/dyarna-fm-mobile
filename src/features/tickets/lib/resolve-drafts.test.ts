import { afterEach, describe, expect, it } from 'vitest';
import { buildAttachmentsForm } from '../api/update-status';
import {
  doneResolveSteps,
  initialResolveValues,
  selectDoneSteps,
  useResolveDrafts,
} from './resolve-drafts';
import { RESOLVE_DEFAULTS } from './resolve-schema';

const A = 'EL-000001';
const B = 'PL-000002';
const NOTE = { comment: 'Replaced the breaker', repairCost: '12', files: [] };

afterEach(() => {
  useResolveDrafts.getState().clear(A);
  useResolveDrafts.getState().clear(B);
});

describe('resolve drafts: values and done steps live together, per ticket', () => {
  it('done steps survive a "remount" (a fresh reader of the store)', () => {
    // First mount: the user typed, the comment landed, then the upload failed.
    const firstMount = useResolveDrafts.getState();
    firstMount.setValues(A, NOTE);
    firstMount.markDone(A, ['comment']);

    // Screen left and re-entered: a brand-new reader sees the same progress.
    expect([...doneResolveSteps(A)]).toEqual(['comment']);
    expect(initialResolveValues(A)).toEqual(NOTE);
    expect(selectDoneSteps(A)(useResolveDrafts.getState())).toEqual(['comment']);
  });

  it('typing after a partial failure keeps the done steps', () => {
    useResolveDrafts.getState().markDone(A, ['comment']);
    useResolveDrafts.getState().setValues(A, { ...NOTE, repairCost: '99' });
    expect([...doneResolveSteps(A)]).toEqual(['comment']);
  });

  it('merges steps without duplicates', () => {
    useResolveDrafts.getState().markDone(A, ['comment']);
    useResolveDrafts.getState().markDone(A, ['comment', 'attachments']);
    expect([...doneResolveSteps(A)]).toEqual(['comment', 'attachments']);
  });

  it('switching ticket number gives a fresh draft (nothing of ticket A leaks to B)', () => {
    useResolveDrafts.getState().setValues(A, NOTE);
    useResolveDrafts.getState().markDone(A, ['comment', 'attachments']);
    expect(initialResolveValues(B)).toEqual(RESOLVE_DEFAULTS);
    expect(doneResolveSteps(B).size).toBe(0);
  });

  it('clear drops values and steps together', () => {
    useResolveDrafts.getState().setValues(A, NOTE);
    useResolveDrafts.getState().markDone(A, ['comment']);
    useResolveDrafts.getState().clear(A);
    expect(initialResolveValues(A)).toEqual(RESOLVE_DEFAULTS);
    expect(doneResolveSteps(A).size).toBe(0);
  });
});

describe('buildAttachmentsForm', () => {
  it('sends one part named exactly "files" per file', () => {
    const form = buildAttachmentsForm([
      { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' },
      { uri: 'file:///b.png', name: 'b.png', type: 'image/png' },
    ]);
    // The RN FormData typings omit keys(); the test runs on jsdom's spec FormData.
    const names = [...(form as unknown as { keys(): Iterable<string> }).keys()];
    expect(names).toEqual(['files', 'files']);
  });
});
