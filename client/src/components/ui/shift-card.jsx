import * as React from 'react';
import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils.js';

const ShiftCardHeader = React.forwardRef(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ShiftCardHeader.displayName = 'ShiftCardHeader';

const ShiftCardContent = React.forwardRef(
  ({ isHovered, children, className, ...divProps }, ref) => {
    const motionProps = {
      initial: { opacity: 0, height: 0 },
      animate: isHovered
        ? { opacity: 1, height: 194 }
        : { opacity: 1, height: 38 },
      transition: { duration: 0.3, delay: 0.08, ease: 'circIn' },
    };

    return (
      <motion.div
        key="shift-card-content"
        ref={ref}
        {...motionProps}
        className={className}
        {...divProps}
      >
        {children}
      </motion.div>
    );
  }
);
ShiftCardContent.displayName = 'ShiftCardContent';

const ShiftCard = React.forwardRef(
  (
    {
      className,
      topContent,
      topAnimateContent,
      middleContent,
      bottomContent,
      ...props
    },
    ref
  ) => {
    const [isHovered, setHovered] = React.useState(false);
    const handleMouseEnter = () => setHovered(true);
    const handleMouseLeave = () => setHovered(false);
    const handleTapStart = () => setHovered(true);
    const handleTapCancel = () => setHovered(false);
    const handleTap = () => setHovered(false);

    return (
      <motion.div
        ref={ref}
        className={cn(
          'min-h-[300px] w-[280px] md:w-[300px]',
          'group relative flex flex-col items-center justify-between overflow-hidden rounded-xl p-3 text-sm',
          'bg-card hover:cursor-pointer border border-line',
          'shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)]',
          className
        )}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTapStart}
        onTapCancel={handleTapCancel}
        onTap={handleTap}
        {...props}
      >
        <ShiftCardHeader className="text-primary-foreground relative flex h-[46px] w-full flex-col">
          <div className="w-full">
            {topContent}
            <AnimatePresence>
              {isHovered ? <>{topAnimateContent}</> : null}
            </AnimatePresence>
          </div>
        </ShiftCardHeader>

        <div className="pb-12">
          <AnimatePresence>
            {!isHovered ? <>{middleContent}</> : null}
          </AnimatePresence>
        </div>

        <ShiftCardContent
          isHovered={isHovered}
          className="absolute right-0 -bottom-1.5 left-0 flex flex-col gap-4 rounded-xl bg-surface/95 backdrop-blur-md p-3 border-t border-line"
        >
          <motion.div className="flex w-full flex-col gap-1">
            {bottomContent}
          </motion.div>
        </ShiftCardContent>
      </motion.div>
    );
  }
);

ShiftCard.displayName = 'ShiftCard';

export { ShiftCard, ShiftCardHeader, ShiftCardContent };
export default ShiftCard;
