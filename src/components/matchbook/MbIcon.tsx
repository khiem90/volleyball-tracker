export const MbIcon = ({
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
      href={`/assets/matchbook/icons/sprite.svg?v=${process.env.NEXT_PUBLIC_SPRITE_VERSION}#${id}`}
    />
  </svg>
);
