/**
 * One glyph from the sprite, drawn in the color of the text around it.
 * It is hidden from screen readers, so a button that is only an icon
 * carries its own aria-label.
 */
export const Icon = ({
  id,
  size = 20,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) => (
  <svg width={size} height={size} className={className} aria-hidden="true">
    <use
      href={`/assets/icons/sprite.svg?v=${process.env.NEXT_PUBLIC_SPRITE_VERSION}#${id}`}
    />
  </svg>
);
