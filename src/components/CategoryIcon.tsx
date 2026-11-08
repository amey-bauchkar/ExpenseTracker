import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  color,
  size = 20,
  className = '',
}) => {
  // Map common custom names or directly resolve from Lucide
  const iconMap: Record<string, keyof typeof Icons> = {
    Carrot: 'Carrot',
    ShoppingBag: 'ShoppingBag',
    CupSoda: 'CupSoda',
    Apple: 'Apple',
    Home: 'Home',
    Zap: 'Zap',
    Flame: 'Flame',
    HeartPulse: 'HeartPulse',
    Fuel: 'Fuel',
    GraduationCap: 'GraduationCap',
    Shirt: 'Shirt',
    Wrench: 'Wrench',
    Sparkles: 'Sparkles',
    MoreHorizontal: 'MoreHorizontal',
    Wallet: 'Wallet',
    Building2: 'Building2',
    Smartphone: 'Smartphone',
    ArrowUpRight: 'ArrowUpRight',
    ArrowDownLeft: 'ArrowDownLeft',
    HandCoins: 'HandCoins',
    Repeat: 'Repeat',
    Tag: 'Tag',
  };

  const IconComponent = (Icons[iconMap[name] || (name as keyof typeof Icons)] || Icons.Tag) as React.ComponentType<{
    size?: number;
    color?: string;
    className?: string;
  }>;

  return <IconComponent size={size} color={color} className={className} />;
};
