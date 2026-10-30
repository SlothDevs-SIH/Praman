import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const pathTo = (items, id, acc = []) => {
  for (const it of items) {
    if (it.id === id) return acc;
    if (it.children) {
      const r = pathTo(it.children, id, [...acc, it]);
      if (r) return r;
    }
  }
  return null;
};

export function TreeMenu({ menuData = [], activeId, onSelect, onGroupOpen }) {
  const [path, setPath] = useState(() => (activeId ? pathTo(menuData, activeId) || [] : []));
  const clicked = useRef(null);

  useEffect(() => {
    if (!activeId) return;
    const p = pathTo(menuData, activeId);
    if (p && p.map((x) => x.id).join('/') !== path.map((x) => x.id).join('/')) {
      clicked.current = null;
      setPath(p);
    }
  }, [activeId, menuData]);

  const items = path.length === 0 ? menuData : path[path.length - 1].children || [];

  const forward = (item, index) => {
    if (item.children?.length) {
      clicked.current = index;
      setPath((p) => [...p, item]);
      onGroupOpen?.();
    } else {
      onSelect?.(item);
    }
  };

  const back = (index) => {
    clicked.current = null;
    setPath((p) => p.slice(0, index));
  };

  const container = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.05 } },
    exit: {},
  };

  const row = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: (index) => {
      const c = clicked.current;
      if (c !== null) {
        if (index < c) return { opacity: 0, y: -80, transition: { duration: 0.3, ease: 'easeOut' } };
        if (index > c) return { opacity: 0, y: 80, transition: { duration: 0.3, ease: 'easeOut' } };
        return { opacity: 0, transition: { duration: 0.2 } };
      }
      return { opacity: 0, y: -10, transition: { duration: 0.2 } };
    },
  };

  return (
    <div className="tree">
      <div className="tree-crumbs">
        <AnimatePresence mode="popLayout">
          {path.map((item, idx) => (
            <motion.button
              key={item.id}
              type="button"
              className="tree-crumb"
              onClick={() => back(idx)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <span>←</span>
              <span>{item.label}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <motion.ul
        key={path.map((p) => p.id).join('/')}
        variants={container}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <AnimatePresence mode="popLayout">
          {items.map((it, idx) => {
            const hasChildren = it.children && it.children.length > 0;
            const isOn = it.id === activeId;
            return (
              <motion.li
                key={it.id}
                variants={row}
                custom={idx}
                layout
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button
                  type="button"
                  className={`tree-btn ${hasChildren ? 'group' : ''} ${isOn ? 'on' : ''}`}
                  onClick={() => forward(it, idx)}
                >
                  {it.icon && <span className="tree-ic">{it.icon}</span>}
                  <span className="tree-lbl">{it.label}</span>
                  {hasChildren && <span className="tree-more">›</span>}
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
