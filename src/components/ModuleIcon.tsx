import { Hand, Globe, Hash, Briefcase, Users, Package, Sun, Utensils, MapPin, Gamepad2, Shirt, Star, BookOpen, Home, History, Camera, Trophy, ShoppingBag, Plane, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  hand: Hand, globe: Globe, hash: Hash, briefcase: Briefcase, users: Users, package: Package, sun: Sun,
  utensils: Utensils, 'map-pin': MapPin, gamepad: Gamepad2, shirt: Shirt, star: Star, home: Home,
  history: History, camera: Camera, trophy: Trophy, 'shopping-bag': ShoppingBag, plane: Plane,
};

export function ModuleIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? BookOpen;
  return <Icon size={size} aria-hidden="true" />;
}
