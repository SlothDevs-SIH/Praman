import React, { createContext, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import useMeasure from 'react-use-measure';
import { cn } from '@/lib/utils.js';

const springConfig = { stiffness: 200, damping: 20, bounce: 0.2 };

const ExpandableContext = createContext({
  isExpanded: false,
  toggleExpand: () => {},
  expandDirection: 'vertical',
});

const useExpandable = () => useContext(ExpandableContext);

const Expandable = React.forwardRef(
  (
    {
      children,
      expanded,
      onToggle,
      transitionDuration = 0.3,
      easeType = 'easeInOut',
      expandDirection = 'vertical',
      onExpandStart,
      onExpandEnd,
      onCollapseStart,
      onCollapseEnd,
      ...props
    },
    ref
  ) => {
    const [isExpandedInternal, setIsExpandedInternal] = useState(false);
    const isExpanded = expanded !== undefined ? expanded : isExpandedInternal;
    const toggleExpand = onToggle || (() => setIsExpandedInternal((prev) => !prev));

    useEffect(() => {
      if (isExpanded) onExpandStart?.();
      else onCollapseStart?.();
    }, [isExpanded, onExpandStart, onCollapseStart]);

    return (
      <ExpandableContext.Provider
        value={{
          isExpanded,
          toggleExpand,
          expandDirection,
          transitionDuration,
          easeType,
          onExpandEnd,
          onCollapseEnd,
        }}
      >
        <motion.div ref={ref} initial={false} {...props}>
          {typeof children === 'function' ? children({ isExpanded }) : children}
        </motion.div>
      </ExpandableContext.Provider>
    );
  }
);

const ExpandableContent = React.forwardRef(
  ({ children, keepMounted = false, ...props }, ref) => {
    const { isExpanded, transitionDuration, easeType } = useExpandable();
    const [measureRef, { height: measuredHeight }] = useMeasure();
    const animatedHeight = useMotionValue(0);
    const smoothHeight = useSpring(animatedHeight, springConfig);

    useEffect(() => {
      if (isExpanded) animatedHeight.set(measuredHeight);
      else animatedHeight.set(0);
    }, [isExpanded, measuredHeight, animatedHeight]);

    return (
      <motion.div
        ref={ref}
        style={{ height: smoothHeight, overflow: 'hidden' }}
        transition={{ duration: transitionDuration, ease: easeType }}
        {...props}
      >
        <AnimatePresence initial={false}>
          {(isExpanded || keepMounted) && (
            <motion.div
              ref={measureRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: transitionDuration, ease: easeType }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

const ExpandableTrigger = React.forwardRef(({ children, className, ...props }, ref) => {
  const { toggleExpand } = useExpandable();
  return (
    <div
      ref={ref}
      onClick={toggleExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpand();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Toggle expand"
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  );
});

export { Expandable, useExpandable, ExpandableContent, ExpandableContext, ExpandableTrigger };
