// src/components/InterestIcon.tsx
// SPOTA — line icons for all 30 interests.
//
// Usage:
//   <InterestIcon id="run" size={28} color={Colors.primary} />

import React from 'react';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

interface Props {
  id: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function InterestIcon({
  id,
  size = 24,
  color = '#1C1C1E',
  strokeWidth = 1.7,
}: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const renderPaths = () => {
    switch (id) {
      case 'run':
        return (
          <>
            <Circle cx={15} cy={4.5} r={1.7} {...common}/>
            <Path d="M9 21l2.5-5 -3-3 1.5-4 4 2 2.5 2.5 3-1" {...common}/>
            <Path d="M6 12l3-1" {...common}/>
          </>
        );
      case 'coffee':
        return (
          <>
            <Path d="M5 9h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4V9z" {...common}/>
            <Path d="M16 11h2a2.5 2.5 0 010 5h-2" {...common}/>
            <Path d="M8 5c.6 1 .6 2 0 3M11 5c.6 1 .6 2 0 3M14 5c.6 1 .6 2 0 3" {...common}/>
          </>
        );
      case 'book':
        return (
          <>
            <Path d="M3 5l4-1 5 2 5-2 4 1v13l-4-1-5 2-5-2-4 1V5z" {...common}/>
            <Path d="M12 6v13" {...common}/>
          </>
        );
      case 'travel':
        return (
          <>
            <Path d="M3 11l18-7-7 18-3-7-8-4z" {...common}/>
            <Path d="M11 13l3-3" {...common}/>
          </>
        );
      case 'gym':
        return (
          <>
            <Path d="M5 9v6M3 11v2" {...common}/>
            <Path d="M19 9v6M21 11v2" {...common}/>
            <Path d="M7 11h10" {...common}/>
            <Path d="M7 13h10" {...common}/>
          </>
        );
      case 'food':
        return (
          <>
            <Path d="M7 3v6c0 .8.6 1.5 1.5 1.5h0V21" {...common}/>
            <Path d="M5.5 3v5M8.5 3v5" {...common}/>
            <Path d="M17 3c-2 0-3 2-3 5s1 4 3 4v9" {...common}/>
          </>
        );
      case 'music':
        return (
          <>
            <Path d="M10 18V5l9-2v13" {...common}/>
            <Circle cx={7} cy={18} r={2.5} {...common}/>
            <Circle cx={16} cy={16} r={2.5} {...common}/>
          </>
        );
      case 'camp':
        return (
          <>
            <Path d="M3 20l9-15 9 15" {...common}/>
            <Path d="M12 5v15" {...common}/>
            <Path d="M9 20l3-4 3 4" {...common}/>
          </>
        );
      case 'yoga':
        return (
          <>
            <Circle cx={12} cy={5} r={1.8} {...common}/>
            <Path d="M12 8v6" {...common}/>
            <Path d="M5 19c2-3 4-5 7-5s5 2 7 5z" {...common}/>
            <Path d="M8 13l-3 2M16 13l3 2" {...common}/>
          </>
        );
      case 'cook':
        return (
          <>
            <Path d="M6 12a4 4 0 116-4 4 4 0 116 4v3H6v-3z" {...common}/>
            <Path d="M6 15h12v3H6z" {...common}/>
            <Path d="M9 12v3M15 12v3M12 12v3" {...common}/>
          </>
        );
      case 'movie':
        return (
          <>
            <Path d="M3 9h18v11H3z" {...common}/>
            <Path d="M3 9l2-4 4 4M7 5l3 4M12 5l3 4M17 5l3 4" {...common}/>
          </>
        );
      case 'drive':
        return (
          <>
            <Path d="M4 14l1.5-4.5A2 2 0 017.4 8h9.2a2 2 0 011.9 1.5L20 14v4h-2v-1.5H6V18H4v-4z" {...common}/>
            <Circle cx={8} cy={16} r={1.4} {...common}/>
            <Circle cx={16} cy={16} r={1.4} {...common}/>
          </>
        );

      /* ── 추가 18개 ── */

      case 'hike':
        return (
          <>
            <Path d="M2 20l6-11 3 6 3-4 8 9H2z" {...common}/>
            <Circle cx={17} cy={5} r={1.8} {...common}/>
          </>
        );

      case 'pet':
        return (
          <>
            <Circle cx={8.5} cy={10} r={1.4} {...common}/>
            <Circle cx={11.5} cy={8.5} r={1.4} {...common}/>
            <Circle cx={14.5} cy={8.5} r={1.4} {...common}/>
            <Circle cx={17} cy={10} r={1.4} {...common}/>
            <Path d="M8 14.5c0-2 1.8-3.5 4.5-3.5s4.5 1.5 4.5 3.5c0 2-2 3.5-4.5 3.5S8 16.5 8 14.5z" {...common}/>
          </>
        );

      case 'game':
        return (
          <>
            <Path d="M6 10a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H6z" {...common}/>
            <Path d="M5 10l2.5-5h9l2.5 5" {...common}/>
            <Path d="M9 13v2M8 14h2" {...common}/>
            <Circle cx={15} cy={14} r={1.3} {...common}/>
            <Circle cx={17.5} cy={13} r={1.3} {...common}/>
          </>
        );

      case 'study':
        return (
          <>
            <Path d="M22 10l-10-6-10 6 10 6 10-6z" {...common}/>
            <Path d="M6 13v4s2 2.5 6 2.5 6-2.5 6-2.5v-4" {...common}/>
            <Path d="M22 10v6" {...common}/>
            <Circle cx={22} cy={16} r={1.3} {...common}/>
          </>
        );

      case 'bike':
        return (
          <>
            <Circle cx={6.5} cy={16} r={3.5} {...common}/>
            <Circle cx={17.5} cy={16} r={3.5} {...common}/>
            <Path d="M6.5 16l3.5-8H12l4 8" {...common}/>
            <Path d="M12 8l5.5 8" {...common}/>
            <Path d="M10 8h3" {...common}/>
          </>
        );

      case 'plant':
        return (
          <>
            <Path d="M12 20V9" {...common}/>
            <Path d="M12 14c0-4-5-5.5-5-5.5S7 14 12 14z" {...common}/>
            <Path d="M12 14c0-4 5-5.5 5-5.5S17 14 12 14z" {...common}/>
            <Path d="M12 9c0-2.5-2-4.5-2-4.5S9 9 12 9z" {...common}/>
            <Path d="M9 20h6" {...common}/>
          </>
        );

      case 'chat':
        return (
          <>
            <Circle cx={9} cy={7} r={3} {...common}/>
            <Path d="M3 21c0-3.3 2.7-6 6-6h1" {...common}/>
            <Circle cx={17} cy={8} r={2.2} {...common}/>
            <Path d="M14 21c0-2.8 2-5 4.5-5.5" {...common}/>
          </>
        );

      case 'photo':
        return (
          <>
            <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" {...common}/>
            <Circle cx={12} cy={13} r={4} {...common}/>
          </>
        );

      case 'art':
        return (
          <>
            <Path d="M18.5 3.5l2 2-13 13H4v-3.5l14.5-11.5z" {...common}/>
            <Path d="M17 5l2 2" {...common}/>
            <Circle cx={4.5} cy={20.5} r={2} {...common}/>
            <Path d="M4 17l0.5 1.5" {...common}/>
          </>
        );

      case 'coding':
        return (
          <>
            <Path d="M16 18l6-6-6-6" {...common}/>
            <Path d="M8 6L2 12l6 6" {...common}/>
            <Path d="M14 4l-4 16" {...common}/>
          </>
        );

      case 'soccer':
        return (
          <>
            <Circle cx={12} cy={12} r={9} {...common}/>
            <Path d="M12 3l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" {...common}/>
          </>
        );

      case 'tennis':
        return (
          <>
            <Circle cx={12} cy={9} r={6} {...common}/>
            <Path d="M12 15l-1 7" {...common}/>
            <Path d="M10 22h5" {...common}/>
            <Path d="M8 9h8M9.5 6.5h5M9.5 11.5h5" {...common}/>
          </>
        );

      case 'swim':
        return (
          <>
            <Circle cx={12} cy={7} r={2} {...common}/>
            <Path d="M10 9l-2 5h7l1-5" {...common}/>
            <Path d="M2 16c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 3 1" {...common}/>
            <Path d="M2 20c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 3 1" {...common}/>
          </>
        );

      case 'beer':
        return (
          <>
            <Path d="M5 8h11l-1.5 12H6.5L5 8z" {...common}/>
            <Path d="M16 10h2.5a1.5 1.5 0 010 3H16" {...common}/>
            <Path d="M8 5c.5 1 .5 2 0 3M11.5 5c.5 1 .5 2 0 3" {...common}/>
          </>
        );

      case 'karaoke':
        return (
          <>
            <Path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" {...common}/>
            <Path d="M7 11a5 5 0 0010 0" {...common}/>
            <Path d="M12 16v4" {...common}/>
            <Path d="M9 20h6" {...common}/>
          </>
        );

      case 'fashion':
        return (
          <>
            <Path d="M3 4l3 3v13h12V7l3-3" {...common}/>
            <Path d="M3 4h6M15 4h6" {...common}/>
            <Path d="M9 4a3 3 0 006 0" {...common}/>
            <Path d="M10 12h4" {...common}/>
          </>
        );

      case 'invest':
        return (
          <>
            <Path d="M3 22V3" {...common}/>
            <Path d="M3 22h18" {...common}/>
            <Path d="M7 17l4-6 4 3 4-9" {...common}/>
            <Path d="M17 5l2-2M17 5h2v2" {...common}/>
          </>
        );

      case 'badminton':
        return (
          <>
            <Ellipse cx={12} cy={8} rx={5} ry={6.5} {...common}/>
            <Path d="M12 14.5v3" {...common}/>
            <Path d="M10.5 17.5l1.5 4 1.5-4" {...common}/>
            <Path d="M8 8h8M9 5.5h6M9 10.5h6" {...common}/>
          </>
        );

      default:
        return (
          <Circle cx={12} cy={12} r={8} {...common}/>
        );
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths()}
    </Svg>
  );
}
