import { useCallback, useState } from 'react';

/**
 * Header search open/close state shared by the tab screens. Closing the
 * search (toggling while open) also clears the query so the list snaps
 * back to its unfiltered state.
 */
export function useSearchToggle() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const onSearchPress = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setQuery('');
      return !prev;
    });
  }, []);

  return { searchOpen, query, setQuery, onSearchPress };
}
