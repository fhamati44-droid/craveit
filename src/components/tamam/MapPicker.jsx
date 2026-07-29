import { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Locate, Plus, Minus, MapPin } from 'lucide-react';

const DEFAULT_CENTER = [32.7940, 34.9896]; // Haifa

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;transform:translate(-50%,-90%);">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

export default function MapPicker({ onClose, onConfirm }) {
  const [pos, setPos] = useState(null);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=he`);
      const d = await r.json();
      setAddress(d?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const place = (latlng) => {
    setPos(latlng);
    reverseGeocode(latlng.lat, latlng.lng);
  };

  const useCurrent = () => {
    setLocating(true);
    setError('');
    if (!navigator.geolocation) {
      setError('לא ניתן לקבל מיקום. אפשר להזין כתובת ידנית.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const latlng = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(latlng);
        mapRef.current?.setView(latlng, 16);
        reverseGeocode(latlng.lat, latlng.lng);
        setLocating(false);
      },
      () => {
        setError('לא ניתן לקבל מיקום. אפשר להזין כתובת ידנית.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const confirm = () => {
    onConfirm({
      latitude: pos?.lat || null,
      longitude: pos?.lng || null,
      formatted_address: address || '',
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-3xl flex flex-col max-h-[92vh] animate-slide-up">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={18} />
          </button>
          <div className="text-right">
            <h2 className="font-bold text-[#1A3C34]">בחר מיקום משלוח</h2>
            <p className="text-[11px] text-gray-500">גרור את הסיכה או לחץ על המפה למיקום מדויק מאוד</p>
          </div>
        </div>

        <div className="relative flex-1 min-h-[300px] m-3 rounded-2xl overflow-hidden border border-gray-200">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <ClickHandler onClick={place} />
            {pos && <Marker position={[pos.lat, pos.lng]} icon={pinIcon} draggable eventHandlers={{ dragend: (e) => place(e.target.getLatLng()) }} />}
          </MapContainer>
          <button onClick={useCurrent} className="absolute bottom-3 left-3 z-[1000] bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center text-[#1A3C34]">
            <Locate size={18} />
          </button>
        </div>

        <div className="px-3 pb-3 space-y-2">
          <label className="text-xs text-gray-500">כתובת המיקום שנבחרה</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={locating ? '...Locating' : 'הכנס כתובת ידנית או בחר על המפה'}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={confirm}
            className="w-full bg-[#C59D46] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <MapPin size={16} /> אשר מיקום
          </button>
        </div>
      </div>
    </div>
  );
}