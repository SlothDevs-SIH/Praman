import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';

const SHARED = { type: 'tween', ease: 'easeOut', duration: 0.15 };

export function CommandSearch({ items = [], extra }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (
        e.key.toLowerCase() === 'f' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isOpen &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        tag !== 'SELECT'
      ) {
        e.preventDefault();
        setQuery('');
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items.filter((i) => i.title.toLowerCase().includes(q));
    return q && extra ? [...base, ...extra(query.trim())] : base;
  }, [query, items, extra]);

  useEffect(() => {
    requestAnimationFrame(() => setActiveIndex(0));
  }, [query]);

  const sections = useMemo(() => {
    const g = {};
    filtered.forEach((i) => {
      (g[i.section] ??= []).push(i);
    });
    return Object.entries(g).map(([name, list]) => ({ name, items: list }));
  }, [filtered]);

  const choose = (i) => {
    if (i) {
      i.action();
      setIsOpen(false);
      setQuery('');
    }
  };

  const onKeyDown = (e) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((p) => (p + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((p) => (p - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      choose(filtered[activeIndex]);
    }
  };

  return (
    <>
      <AnimatePresence mode="popLayout">
        {isOpen && (
          <motion.div
            className="cmd-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="cmd-wrap">
        <AnimatePresence mode="popLayout">
          {!isOpen ? (
            <motion.button
              key="trigger"
              layoutId="command-palette"
              type="button"
              className="cmd-trigger"
              onClick={() => {
                setQuery('');
                setIsOpen(true);
              }}
              transition={SHARED}
              aria-label="Find, shortcut F"
            >
              <motion.span layoutId="search-icon" transition={SHARED} className="cmd-ic">
                <Search size={15} />
              </motion.span>
              <motion.span layoutId="search-text" transition={SHARED} className="cmd-ph">
                Find…
              </motion.span>
              <motion.kbd layoutId="search-shortcut" transition={SHARED} className="cmd-kbd">
                F
              </motion.kbd>
            </motion.button>
          ) : (
            <motion.div
              key="panel"
              layoutId="command-palette"
              transition={SHARED}
              className="cmd-panel"
            >
              <div className="cmd-head">
                <motion.span layoutId="search-icon" transition={SHARED} className="cmd-ic">
                  <Search size={16} />
                </motion.span>
                <div className="cmd-inwrap">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search actions, students, pages…"
                    aria-label="Search"
                  />
                </div>
                <kbd className="cmd-kbd sm">ESC</kbd>
              </div>
              <div className="cmd-body">
                {sections.length > 0 ? (
                  sections.map(({ name, items }) => (
                    <div key={name} className="cmd-sec">
                      <h3>{name}</h3>
                      {items.map((it) => {
                        const globalIdx = filtered.indexOf(it);
                        const isSelected = globalIdx === activeIndex;
                        return (
                          <button
                            key={it.id}
                            type="button"
                            className={`cmd-item ${isSelected ? 'on' : ''}`}
                            onClick={() => choose(it)}
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                          >
                            {it.icon && <span className="cmd-iic">{it.icon}</span>}
                            <span className="cmd-it">{it.title}</span>
                            {it.shortcut && <kbd>{it.shortcut}</kbd>}
                          </button>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="cmd-none">No matching commands or pages found.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
