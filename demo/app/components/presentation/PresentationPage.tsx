import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { PresentationInfo, SlideInfo } from "@shared/types";
import { useRendererStore } from "../../store/renderer-store";
import styles from "./PresentationPage.module.css";

export function PresentationPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<PresentationInfo | null>(null);
  const [slides, setSlides] = useState<SlideInfo[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mode = useRendererStore((s) => s.mode);

  const handleStartSlideshow = () => {
    navigate(`/slideshow/${fileId}`);
  };

  useEffect(() => {
    if (!fileId) return;

    Promise.all([fetch(`/api/presentation/${fileId}`).then((r) => r.json()), fetch(`/api/presentation/${fileId}/slides`).then((r) => r.json())])
      .then(([pres, slideList]) => {
        setPresentation(pres);
        setSlides(slideList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [fileId]);

  useEffect(() => {
    if (!fileId || slides.length === 0) return;

    const renderMode = mode === "anim" ? "html" : mode;
    slides.forEach((slide) => {
      fetch(`/api/slide/${fileId}/${slide.number}/${renderMode}`)
        .then((r) => r.json())
        .then((data) => {
          setPreviews((prev) => ({ ...prev, [slide.number]: data.content }));
        });
    });
  }, [fileId, slides, mode]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading presentation...</div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error || "Presentation not found"}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>
          ← Back
        </Link>
        <div className={styles.info}>
          <h1 className={styles.title}>{presentation.name}</h1>
          <div className={styles.meta}>
            <span>{presentation.slideCount} slides</span>
            <span>•</span>
            <span>
              {presentation.size.width}×{presentation.size.height}
            </span>
            <span>•</span>
            <span>Parsed in {presentation.parseTimeMs}ms</span>
          </div>
        </div>
        <button className={styles.slideshowButton} onClick={handleStartSlideshow}>
          ▶ Start Slideshow
        </button>
      </div>

      <div className={styles.grid}>
        {slides.map((slide) => (
          <Link key={slide.number} to={`/play/${fileId}/${slide.number}`} className={styles.slideCard}>
            <div className={styles.slidePreview} style={{ aspectRatio: `${presentation.size.width} / ${presentation.size.height}` }}>
              {previews[slide.number] ? (
                <div className={styles.slideContent} dangerouslySetInnerHTML={{ __html: previews[slide.number] }} />
              ) : (
                <div className={styles.slidePlaceholder}>Loading...</div>
              )}
            </div>
            <div className={styles.slideInfo}>
              <span className={styles.slideNumber}>Slide {slide.number}</span>
              {slide.hasAnimations && <span className={styles.animBadge}>{slide.animationCount} animations</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
