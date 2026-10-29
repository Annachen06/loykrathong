import type { FestivalConfig } from "../festivals/types";

/** The first moment: the world is already alive behind a soft veil. One tap anywhere steps in (the button click bubbles up to the section). */
export function Intro({ config, onEnter, hidden }: { config: FestivalConfig; onEnter: () => void; hidden: boolean }) {
  return (
    <section className="intro" aria-hidden={hidden} aria-labelledby="intro-title" onClick={hidden ? undefined : onEnter}>
      <div className="intro-inner">
        <p className="intro-eyebrow">{config.intro.eyebrow}</p>
        <h1 id="intro-title">{config.brand}</h1>
        <p className="intro-tagline">{config.tagline}</p>
        <p className="intro-edition">{config.edition}</p>
        <button type="button" className="intro-enter" tabIndex={hidden ? -1 : 0} autoFocus>
          {config.intro.enterLabel}
        </button>
        <p className="intro-help">{config.intro.help}</p>
      </div>
    </section>
  );
}
