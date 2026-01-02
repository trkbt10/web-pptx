import styles from "./PlayerControls.module.css";

type Props = {
  isPlaying: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onReset: () => void;
  onShowAll: () => void;
};

export function PlayerControls({ isPlaying, disabled = false, onPlay, onReset, onShowAll }: Props) {
  const isDisabled = disabled || isPlaying;
  return (
    <div className={styles.controls}>
      <button className={`${styles.button} ${styles.primary}`} onClick={onPlay} disabled={isDisabled}>
        {disabled ? "Loading..." : isPlaying ? "Playing..." : "Play"}
      </button>
      <button className={styles.button} onClick={onReset} disabled={isDisabled}>
        Reset
      </button>
      <button className={styles.button} onClick={onShowAll} disabled={isDisabled}>
        Show All
      </button>
    </div>
  );
}
