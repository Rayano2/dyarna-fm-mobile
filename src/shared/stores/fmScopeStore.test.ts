import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prefStorage } from '@/shared/lib/storage';
import { useScopeStore } from './fmScopeStore';

vi.mock('@/shared/lib/storage', () => ({
  prefStorage: { getJSON: vi.fn(), setJSON: vi.fn(), remove: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(prefStorage.getJSON).mockReset().mockResolvedValue(null);
  vi.mocked(prefStorage.setJSON).mockReset().mockResolvedValue();
  vi.mocked(prefStorage.remove).mockReset().mockResolvedValue();
  useScopeStore.setState({ projectId: null, buildingId: null, hydrated: false });
});

describe('FM scope store', () => {
  it('hydrates the persisted pick', async () => {
    vi.mocked(prefStorage.getJSON).mockResolvedValue({ projectId: '7', buildingId: '3' });
    await useScopeStore.getState().hydrate();
    expect(useScopeStore.getState()).toMatchObject({
      projectId: '7',
      buildingId: '3',
      hydrated: true,
    });
  });

  it('a pick made while hydrating wins over the stored value', async () => {
    const gate = Promise.withResolvers<unknown>();
    const release = gate.resolve;
    vi.mocked(prefStorage.getJSON).mockReturnValue(gate.promise as never);
    const pending = useScopeStore.getState().hydrate();
    useScopeStore.getState().setProject('8');
    release({ projectId: '7', buildingId: '3' });
    await pending;
    expect(useScopeStore.getState()).toMatchObject({ projectId: '8', buildingId: null });
  });

  it('picking a project clears the building and persists both', () => {
    useScopeStore.setState({ projectId: '7', buildingId: '3', hydrated: true });
    useScopeStore.getState().setProject('8');
    expect(useScopeStore.getState().buildingId).toBeNull();
    expect(prefStorage.setJSON).toHaveBeenCalledWith(expect.any(String), {
      projectId: '8',
      buildingId: null,
    });
  });

  it('reset (logout) forgets the pick in memory and in storage', async () => {
    useScopeStore.setState({ projectId: '7', buildingId: '3', hydrated: true });
    useScopeStore.getState().reset();
    expect(useScopeStore.getState()).toMatchObject({ projectId: null, buildingId: null });
    await vi.waitFor(() => expect(prefStorage.remove).toHaveBeenCalledTimes(1));
  });
});
