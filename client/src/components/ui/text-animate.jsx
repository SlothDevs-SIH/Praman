import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

const staggerTimings = {
  text: 0.06,
  word: 0.05,
  character: 0.03,
  line: 0.06,
};

const defaultContainerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const defaultItemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

const defaultItemAnimationVariants = {
  fadeIn: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
    },
  },
  blurIn: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.3 } },
      exit: { opacity: 0, filter: "blur(10px)", transition: { duration: 0.3 } },
    },
  },
  blurInUp: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
      show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.4 } },
      exit: { opacity: 0, filter: "blur(10px)", y: 20, transition: { duration: 0.3 } },
    },
  },
  slideUp: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
    },
  },
};

function TextAnimateBase({
  children,
  delay = 0,
  duration = 0.3,
  variants,
  className,
  segmentClassName,
  as: Component = "p",
  by = "word",
  startOnView = true,
  once = false,
  animation = "fadeIn",
  accessible = true,
  ...props
}) {
  const MotionComponent = motion[Component] || motion.div;

  let segments = [];
  switch (by) {
    case "word":
      segments = String(children).split(/(\s+)/);
      break;
    case "character":
      segments = String(children).split("");
      break;
    case "line":
      segments = String(children).split("\n");
      break;
    case "text":
    default:
      segments = [children];
      break;
  }

  const animationPreset = defaultItemAnimationVariants[animation] || defaultItemAnimationVariants.fadeIn;

  const finalVariants = variants
    ? {
        container: {
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              opacity: { duration: 0.01, delay },
              delayChildren: delay,
              staggerChildren: duration / segments.length,
            },
          },
          exit: {
            opacity: 0,
            transition: {
              staggerChildren: duration / segments.length,
              staggerDirection: -1,
            },
          },
        },
        item: variants,
      }
    : {
        container: {
          ...animationPreset.container,
          show: {
            ...animationPreset.container.show,
            transition: {
              delayChildren: delay,
              staggerChildren: duration / (segments.length || 1),
            },
          },
        },
        item: animationPreset.item,
      };

  return (
    <AnimatePresence mode="popLayout">
      <MotionComponent
        variants={finalVariants.container}
        initial="hidden"
        whileInView={startOnView ? "show" : undefined}
        animate={startOnView ? undefined : "show"}
        exit="exit"
        className={cn("whitespace-pre-wrap", className)}
        viewport={{ once }}
        aria-label={accessible ? children : undefined}
        {...props}
      >
        {accessible && <span className="sr-only">{children}</span>}
        {segments.map((segment, i) => (
          <motion.span
            key={`${by}-${segment}-${i}`}
            variants={finalVariants.item}
            custom={i * (staggerTimings[by] || 0.04)}
            className={cn(
              by === "line" ? "block" : "inline-block whitespace-pre",
              segmentClassName
            )}
            aria-hidden={accessible ? true : undefined}
          >
            {segment}
          </motion.span>
        ))}
      </MotionComponent>
    </AnimatePresence>
  );
}

export const TextAnimate = memo(TextAnimateBase);
