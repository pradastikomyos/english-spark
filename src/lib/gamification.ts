export interface Badge {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: string; // e.g., path to an image or a class name for an icon font
}

export const BADGE_LEVELS: Badge[] = [
  { level: 1, name: "Orange Star 1", minPoints: 0, maxPoints: 100, icon: "⭐" },
  { level: 2, name: "Orange Star 2", minPoints: 101, maxPoints: 200, icon: "⭐⭐" },
  { level: 3, name: "Orange Star 3", minPoints: 201, maxPoints: 300, icon: "⭐⭐⭐" },
  { level: 4, name: "Orange Star 4", minPoints: 301, maxPoints: 400, icon: "⭐⭐⭐⭐" },
  { level: 5, name: "Orange Star 5", minPoints: 401, maxPoints: 500, icon: "⭐⭐⭐⭐⭐" },
];

export function getBadgeByPoints(points: number): Badge | null {
  for (const badge of BADGE_LEVELS) {
    if (points >= badge.minPoints && points <= badge.maxPoints) {
      return badge;
    }
  }
  return null; // No badge found for the given points
}

// Example usage in a React component (conceptual)
/*
import React from 'react';
import { getBadgeByPoints, Badge } from './gamification';

interface UserBadgeDisplayProps {
  userPoints: number;
}

const UserBadgeDisplay: React.FC<UserBadgeDisplayProps> = ({ userPoints }) => {
  const badge = getBadgeByPoints(userPoints);

  if (!badge) {
    return <p>No badge yet. Keep earning points!</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-orange-500 text-2xl">{badge.icon}</span>
      <p className="font-semibold">{badge.name}</p>
      <p className="text-sm text-gray-600">({userPoints} points)</p>
    </div>
  );
};

export default UserBadgeDisplay;
*/