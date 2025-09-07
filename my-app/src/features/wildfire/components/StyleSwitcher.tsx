import { Map as MapIcon, Image, Mountain, Moon } from 'lucide-react';

type Props = {
  current: string;
  onChange: (style: string) => void;
};

export default function StyleSwitcher({ current, onChange }: Props) {
  const items = [
    { key: 'streets', style: 'mapbox://styles/mapbox/streets-v12', icon: <MapIcon className="h-4 w-4" />, label: 'Улици' },
    { key: 'satellite', style: 'mapbox://styles/mapbox/satellite-streets-v12', icon: <Image className="h-4 w-4" />, label: 'Сателит' },
    { key: 'outdoors', style: 'mapbox://styles/mapbox/outdoors-v12', icon: <Mountain className="h-4 w-4" />, label: 'Природа' },
    { key: 'dark', style: 'mapbox://styles/mapbox/dark-v11', icon: <Moon className="h-4 w-4" />, label: 'Тъмна' },
  ];
  return (
    <div className="absolute bottom-16 right-2 z-10 flex gap-2">
      {items.map(({ key, style, icon, label }) => (
        <button
          key={key}
          title={label}
          aria-label={label}
          onClick={() => onChange(style)}
          className={`bg-white/90 text-black hover:bg-white transition shadow border border-border rounded-full p-2 flex items-center justify-center ${current === style ? 'ring-2 ring-fire' : ''}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

