import PublicShell from "../../components/public/PublicShell";
import styles from "./ContentPage.module.css";

/**
 * Reusable public content page (Features, Community, Help, etc.).
 * Supports two prop shapes for backwards compatibility:
 *  - { title, highlight/subtitle, intro, sections: [{ header|title, content|desc, link|button, wide, tag }] }
 */
export default function ContentPage({
  title,
  highlight,
  subtitle,
  intro,
  sections = [],
}) {
  const accent = highlight || subtitle;

  return (
    <PublicShell>
      <section className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>DtailBase</span>
          <h1 className={styles.title}>
            {title}
            {accent && (
              <>
                {" "}
                <span className={styles.titleAccent}>{accent}</span>
              </>
            )}
          </h1>
          {intro && <p className={styles.intro}>{intro}</p>}
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          <ul className={styles.grid}>
            {sections.map((section, idx) => {
              const header = section.header || section.title || "";
              const body = section.content || section.desc || "";
              const cta = section.link || section.button;
              const cardClass = `${styles.card} ${section.wide ? styles.cardWide : ""}`;
              return (
                <li key={`${header}-${idx}`} className={cardClass}>
                  {section.tag ? (
                    <span className={styles.tag}>{section.tag}</span>
                  ) : (
                    <span className={styles.stepNum}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  )}
                  <h3 className={styles.cardTitle}>{header}</h3>
                  {body && <p className={styles.cardBody}>{body}</p>}
                  {cta && (
                    <a
                      href={typeof section.link === "string" ? section.link : "#"}
                      className={styles.linkBtn}
                    >
                      {typeof section.button === "string"
                        ? section.button
                        : "Learn more"}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </PublicShell>
  );
}
