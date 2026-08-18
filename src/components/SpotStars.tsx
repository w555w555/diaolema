import { starFill } from '../lib/spotScore';

type Props = {
  score: number | null;
};

export function SpotStars({ score }: Props) {
  return (
    <span className="spot-stars-view" aria-label="渔见五星">
      {starFill(score).map((fill, index) => (
        <i key={index} data-fill={fill} />
      ))}
    </span>
  );
}
