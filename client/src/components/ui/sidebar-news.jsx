import * as React from "react";
import { useMediaQuery } from "../../hooks/use-media-query";
import { cn } from "../../lib/utils";
import { Card } from "./card";

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

export function News({ articles = [], onOpen, onEmpty, zoom, emptyLogo }) {
  const [dismissedNews, setDismissedNews] = React.useState([]);
  const cards = articles.filter(({ href }) => !dismissedNews.includes(href));
  const cardCount = cards.length;
  const [showCompleted, setShowCompleted] = React.useState(cardCount > 0);

  React.useEffect(() => {
    let timeout;
    if (cardCount === 0) {
      timeout = setTimeout(() => {
        setShowCompleted(false);
        onEmpty?.();
      }, 2700);
    }
    return () => clearTimeout(timeout);
  }, [cardCount, onEmpty]);

  return cards.length || showCompleted ? (
    <div
      className="group overflow-hidden px-3 pb-3 pt-8"
      data-active={cardCount !== 0}
    >
      <div className="relative size-full">
        {cards.toReversed().map((article, idx) => {
          const { href, title, summary, image } = article;
          return (
            <div
              key={href}
              className={cn(
                "absolute left-0 top-0 size-full scale-[var(--scale)] transition-[opacity,transform] duration-200",
                cardCount - idx > 3
                  ? [
                      "opacity-0 sm:group-hover:translate-y-[var(--y)] sm:group-hover:opacity-[var(--opacity)]",
                      "sm:group-has-[*[data-dragging=true]]:translate-y-[var(--y)] sm:group-has-[*[data-dragging=true]]:opacity-[var(--opacity)]",
                    ]
                  : "translate-y-[var(--y)] opacity-[var(--opacity)]"
              )}
              style={{
                "--y": `-${(cardCount - (idx + 1)) * OFFSET_FACTOR}%`,
                "--scale": 1 - (cardCount - (idx + 1)) * SCALE_FACTOR,
                "--opacity":
                  cardCount - (idx + 1) >= 6
                    ? 0
                    : 1 - (cardCount - (idx + 1)) * OPACITY_FACTOR,
              }}
              aria-hidden={idx !== cardCount - 1}
            >
              <NewsCard
                title={title}
                description={summary}
                image={image}
                href={href}
                zoom={zoom}
                hideContent={cardCount - idx > 2}
                active={idx === cardCount - 1}
                onOpen={() => onOpen?.(article)}
                onDismiss={() =>
                  setDismissedNews((prev) => [href, ...prev.slice(0, 50)])
                }
              />
            </div>
          );
        })}
        <div className="pointer-events-none invisible" aria-hidden>
          <NewsCard title="Title" description="Description" />
        </div>
        {showCompleted && !cardCount && (
          <div
            className="animate-slide-up-fade absolute inset-0 flex size-full flex-col items-center justify-center gap-3 [animation-duration:1s]"
            style={{ "--offset": "10px" }}
          >
            <div className="animate-fade-in absolute inset-0 rounded-lg border border-neutral-300 [animation-delay:2.3s] [animation-direction:reverse] [animation-duration:0.2s]" />
            {emptyLogo ?? <AnimatedLogo className="w-1/3" />}
            <span className="animate-fade-in text-xs font-medium text-muted-foreground [animation-delay:2.3s] [animation-direction:reverse] [animation-duration:0.2s]">
              You're all caught up!
            </span>
          </div>
        )}
      </div>
    </div>
  ) : null;
}

function NewsCard({
  title,
  description,
  image,
  onDismiss,
  onOpen,
  hideContent,
  href,
  active,
  zoom,
}) {
  const ref = React.useRef(null);
  const drag = React.useRef({
    start: 0,
    delta: 0,
    startTime: 0,
    maxDelta: 0,
  });
  const animation = React.useRef();
  const moved = React.useRef(false);
  const [dragging, setDragging] = React.useState(false);

  const onDragMove = (e) => {
    if (!ref.current) return;
    const { clientX } = e;
    const dx = clientX - drag.current.start;
    drag.current.delta = dx;
    drag.current.maxDelta = Math.max(drag.current.maxDelta, Math.abs(dx));
    if (Math.abs(dx) > 6) moved.current = true;
    ref.current.style.setProperty("--dx", dx.toString());
  };

  const dismiss = () => {
    if (!ref.current) return;
    const cardWidth = ref.current.getBoundingClientRect().width;
    const translateX = (Math.sign(drag.current.delta) || 1) * cardWidth;

    animation.current = ref.current.animate(
      { opacity: 0, transform: `translateX(${translateX}px)` },
      { duration: 150, easing: "ease-in-out", fill: "forwards" }
    );
    animation.current.onfinish = () => onDismiss?.();
  };

  const stopDragging = (cancelled) => {
    if (!ref.current) return;
    unbindListeners();
    setDragging(false);

    const dx = drag.current.delta;
    if (Math.abs(dx) > ref.current.clientWidth / (cancelled ? 2 : 3)) {
      dismiss();
      return;
    }

    animation.current = ref.current.animate(
      { transform: "translateX(0)" },
      { duration: 150, easing: "ease-in-out" }
    );
    animation.current.onfinish = () =>
      ref.current?.style.setProperty("--dx", "0");

    drag.current = { start: 0, delta: 0, startTime: 0, maxDelta: 0 };
  };

  const onDragEnd = () => stopDragging(false);
  const onDragCancel = () => stopDragging(true);

  const onPointerDown = (e) => {
    if (!active || !ref.current || animation.current?.playState === "running")
      return;

    moved.current = false;
    bindListeners();
    setDragging(true);
    drag.current.start = e.clientX;
    drag.current.startTime = Date.now();
    drag.current.delta = 0;
    ref.current.style.setProperty("--w", ref.current.clientWidth.toString());
  };

  const onClick = (e) => {
    if (!active || moved.current) return;
    if (e.target.closest("[data-no-open]")) return;
    onOpen?.();
  };

  const bindListeners = () => {
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragCancel);
  };

  const unbindListeners = () => {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragCancel);
  };

  return (
    <Card
      ref={ref}
      className={cn(
        "relative select-none gap-2 p-3 text-[0.8125rem]",
        active && "cursor-pointer",
        "translate-x-[calc(var(--dx)*1px)] rotate-[calc(var(--dx)*0.05deg)] opacity-[calc(1-max(var(--dx),-1*var(--dx))/var(--w)/2)]",
        "transition-shadow data-[dragging=true]:shadow-md"
      )}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className={cn(hideContent && "invisible")}>
        <div className="flex flex-col gap-1">
          <span className="line-clamp-1 font-semibold text-foreground">
            {title}
          </span>
          <p className="line-clamp-2 h-10 leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="relative mt-3 aspect-[16/9] w-full shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              className={zoom ? "absolute top-0 max-w-none rounded" : "absolute inset-0 size-full rounded object-cover object-center"}
              style={zoom ? { width: "200%", left: "-37.5%" } : undefined}
              draggable={false}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          <div className="text-center p-3 text-muted-foreground/60 text-xs">
            <span className="font-bold block text-sm text-primary mb-1">{title}</span>
            <span>Interactive Preview Card</span>
          </div>
        </div>
        <div
          className={cn(
            "h-0 overflow-hidden opacity-0 transition-[height,opacity] duration-200",
            "sm:group-has-[*[data-dragging=true]]:h-7 sm:group-has-[*[data-dragging=true]]:opacity-100 sm:group-hover:group-data-[active=true]:h-7 sm:group-hover:group-data-[active=true]:opacity-100"
          )}
        >
          <div className="flex items-center justify-between pt-3 text-xs">
            <button
              type="button"
              data-no-open
              onClick={() => onOpen?.()}
              className="font-semibold text-primary hover:underline transition-colors duration-75 cursor-pointer"
            >
              Read more →
            </button>
            <button
              type="button"
              data-no-open
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors duration-75 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AnimatedLogo(props) {
  return (
    <svg
      viewBox="0 0 48 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1H15V12.9332C15.0001 12.9465 15.0002 12.9598 15.0003 12.9731C15.0003 12.982 15.0003 12.991 15.0003 13C15.0003 13.0223 15.0002 13.0445 15 13.0668V20H12V18.7455C10.8662 19.5362 9.48733 20 8.00016 20C4.13408 20 1 16.866 1 13C1 9.13401 4.13408 6 8.00016 6C9.48733 6 10.8662 6.46375 12 7.25452V1ZM8 16.9998C10.2091 16.9998 12 15.209 12 12.9999C12 10.7908 10.2091 9 8 9C5.79086 9 4 10.7908 4 12.9999C4 15.209 5.79086 16.9998 8 16.9998Z"
        stroke="currentColor"
        strokeDasharray="63"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2500ms"
          values="63;0;0;0;63"
          fill="freeze"
        />
      </path>
    </svg>
  );
}
