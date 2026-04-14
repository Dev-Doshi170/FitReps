import { Badge, BadgeText } from '@gluestack-ui/themed';

type Props = {
  current: number | null;
  last: number | null;
};

export default function ProgressBadge({ current, last }: Props) {
  if (last === null || current === null) {
    return (
      <Badge size="sm" variant="outline" action="info" borderRadius="$sm" px="$1">
        <BadgeText fontSize="$2xs">—</BadgeText>
      </Badge>
    );
  }

  if (current === last) {
    return (
      <Badge size="sm" variant="outline" action="info" borderRadius="$sm" px="$1">
        <BadgeText fontSize="$2xs">=</BadgeText>
      </Badge>
    );
  }

  if (current > last) {
    return (
      <Badge size="sm" variant="solid" action="success" borderRadius="$sm" px="$1">
        <BadgeText fontSize="$2xs">↑</BadgeText>
      </Badge>
    );
  }

  return (
    <Badge size="sm" variant="solid" action="error" borderRadius="$sm" px="$1">
      <BadgeText fontSize="$2xs">↓</BadgeText>
    </Badge>
  );
}
