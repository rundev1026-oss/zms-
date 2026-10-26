'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  ExternalLink, 
  Trash2, 
  Check, 
  AlertCircle, 
  Info, 
  Compass, 
  Map as MapIcon, 
  Layers, 
  HelpCircle,
  Copy,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  LocateFixed
} from 'lucide-react';
import { ModalPortal } from './Modal';

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  residenceAddress: string;
  placeName: string;
}

interface GoogleMapsLocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  residenceAddress?: string;
  placeName?: string;
  beneficiaryName?: string;
  readOnly?: boolean;
  locationUpdatedAt?: string;
  locationUpdatedBy?: string;
  allowClear?: boolean;
  onLocationChange?: (location: LocationData) => void;
  onApplyLocation?: (location: LocationData) => void;
  className?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMapsZMS?: () => void;
  }
}

export function GoogleMapsLocationPicker({
  latitude: initialLat = null,
  longitude: initialLng = null,
  residenceAddress: initialAddress = '',
  placeName: initialPlace = '',
  beneficiaryName = '',
  readOnly = false,
  locationUpdatedAt,
  locationUpdatedBy,
  allowClear = true,
  onLocationChange,
  onApplyLocation,
  className = '',
}: GoogleMapsLocationPickerProps) {
  // State
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [address, setAddress] = useState<string>(initialAddress);
  const [place, setPlace] = useState<string>(initialPlace);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // API Key & Script State
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  
  // UI Dialogs & Feedback
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);
  const [showConfigHelp, setShowConfigHelp] = useState<boolean>(false);

  // Map DOM & Google Maps object references
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const googleMapInstance = useRef<any>(null);
  const googleMarkerInstance = useRef<any>(null);
  const autocompleteInstance = useRef<any>(null);

  // Sync props when parent updates
  useEffect(() => {
    setLat(initialLat);
    setLng(initialLng);
  }, [initialLat, initialLng]);

  useEffect(() => {
    setAddress(initialAddress || '');
  }, [initialAddress]);

  useEffect(() => {
    setPlace(initialPlace || '');
  }, [initialPlace]);

  // Check & Load Google Maps Script
  useEffect(() => {
    if (!apiKey) {
      setLoadError('ยังไม่ได้ตั้งค่า Google Maps API Key ในระบบ');
      return;
    }

    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsGoogleMapsLoaded(true));
      existingScript.addEventListener('error', () => setLoadError('ไม่สามารถโหลด Google Maps JavaScript API ได้'));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=th&region=TH`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
      setLoadError(null);
    };
    script.onerror = () => {
      setLoadError('เกิดข้อผิดพลาดในการโหลด Google Maps API (โปรดตรวจสอบการจำกัดสิทธิ์ API Key หรือการเชื่อมต่ออินเทอร์เน็ต)');
    };
    document.head.appendChild(script);
  }, [apiKey]);

  // Reverse Geocode (Lat/Lng -> Thai Address)
  const reverseGeocode = useCallback((latitude: number, longitude: number) => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) return;

    setIsReverseGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results: any[], status: string) => {
        setIsReverseGeocoding(false);
        if (status === 'OK' && results && results[0]) {
          const formattedAddress = results[0].formatted_address || '';
          setAddress(formattedAddress);
          if (onLocationChange) {
            onLocationChange({
              latitude,
              longitude,
              residenceAddress: formattedAddress,
              placeName: place,
            });
          }
        }
      }
    );
  }, [place, onLocationChange]);

  // Initialize or Update Google Map
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || !window.google || !window.google.maps) return;

    const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
    const centerPos = hasCoords 
      ? { lat, lng } 
      : { lat: 13.7563, lng: 100.5018 }; // Default Center: Bangkok

    if (!googleMapInstance.current) {
      // Create new map
      const map = new window.google.maps.Map(mapRef.current, {
        center: centerPos,
        zoom: hasCoords ? 16 : 10,
        mapTypeControl: true,
        streetViewControl: !readOnly,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });
      googleMapInstance.current = map;

      // Marker
      if (hasCoords) {
        const marker = new window.google.maps.Marker({
          position: centerPos,
          map,
          draggable: !readOnly,
          title: beneficiaryName ? `ที่อยู่อาศัย: ${beneficiaryName}` : 'พิกัดที่อยู่อาศัย',
          animation: window.google.maps.Animation.DROP,
        });
        googleMarkerInstance.current = marker;

        if (!readOnly) {
          marker.addListener('dragend', (e: any) => {
            const newL = e.latLng.lat();
            const newG = e.latLng.lng();
            setLat(newL);
            setLng(newG);
            reverseGeocode(newL, newG);
            if (onLocationChange) {
              onLocationChange({
                latitude: newL,
                longitude: newG,
                residenceAddress: address,
                placeName: place,
              });
            }
          });
        }
      }

      // Map Click to place marker (Edit mode only)
      if (!readOnly) {
        map.addListener('click', (e: any) => {
          const newL = e.latLng.lat();
          const newG = e.latLng.lng();
          setLat(newL);
          setLng(newG);

          if (!googleMarkerInstance.current) {
            const marker = new window.google.maps.Marker({
              position: { lat: newL, lng: newG },
              map,
              draggable: true,
              animation: window.google.maps.Animation.DROP,
            });
            googleMarkerInstance.current = marker;

            marker.addListener('dragend', (ev: any) => {
              const dL = ev.latLng.lat();
              const dG = ev.latLng.lng();
              setLat(dL);
              setLng(dG);
              reverseGeocode(dL, dG);
              if (onLocationChange) {
                onLocationChange({
                  latitude: dL,
                  longitude: dG,
                  residenceAddress: address,
                  placeName: place,
                });
              }
            });
          } else {
            googleMarkerInstance.current.setPosition({ lat: newL, lng: newG });
          }

          reverseGeocode(newL, newG);
          if (onLocationChange) {
            onLocationChange({
              latitude: newL,
              longitude: newG,
              residenceAddress: address,
              placeName: place,
            });
          }
        });
      }

      // Initialize Places Autocomplete if search input exists
      if (!readOnly && searchInputRef.current && window.google.maps.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'th' },
          fields: ['geometry', 'name', 'formatted_address'],
        });
        autocompleteInstance.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const placeResult = autocomplete.getPlace();
          if (!placeResult.geometry || !placeResult.geometry.location) return;

          const pLat = placeResult.geometry.location.lat();
          const pLng = placeResult.geometry.location.lng();
          const pName = placeResult.name || '';
          const pAddress = placeResult.formatted_address || '';

          setLat(pLat);
          setLng(pLng);
          setPlace(pName);
          setAddress(pAddress);

          map.setCenter({ lat: pLat, lng: pLng });
          map.setZoom(17);

          if (!googleMarkerInstance.current) {
            googleMarkerInstance.current = new window.google.maps.Marker({
              position: { lat: pLat, lng: pLng },
              map,
              draggable: true,
              animation: window.google.maps.Animation.DROP,
            });
          } else {
            googleMarkerInstance.current.setPosition({ lat: pLat, lng: pLng });
          }

          if (onLocationChange) {
            onLocationChange({
              latitude: pLat,
              longitude: pLng,
              residenceAddress: pAddress,
              placeName: pName,
            });
          }
        });
      }
    } else {
      // Map instance already exists, update center and marker if coords changed
      if (hasCoords) {
        googleMapInstance.current.setCenter(centerPos);
        if (!googleMarkerInstance.current) {
          googleMarkerInstance.current = new window.google.maps.Marker({
            position: centerPos,
            map: googleMapInstance.current,
            draggable: !readOnly,
          });
        } else {
          googleMarkerInstance.current.setPosition(centerPos);
          googleMarkerInstance.current.setDraggable(!readOnly);
        }
      } else if (googleMarkerInstance.current) {
        googleMarkerInstance.current.setMap(null);
        googleMarkerInstance.current = null;
      }
    }
  }, [isGoogleMapsLoaded, lat, lng, readOnly, beneficiaryName, reverseGeocode, onLocationChange, address, place]);

  // Handle Geolocation (Current Device Location)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับการระบุพิกัด Geolocation');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);

        if (googleMapInstance.current) {
          googleMapInstance.current.setCenter({ lat: userLat, lng: userLng });
          googleMapInstance.current.setZoom(17);
          if (googleMarkerInstance.current) {
            googleMarkerInstance.current.setPosition({ lat: userLat, lng: userLng });
          } else if (window.google && window.google.maps) {
            googleMarkerInstance.current = new window.google.maps.Marker({
              position: { lat: userLat, lng: userLng },
              map: googleMapInstance.current,
              draggable: !readOnly,
            });
          }
        }

        reverseGeocode(userLat, userLng);
        if (onLocationChange) {
          onLocationChange({
            latitude: userLat,
            longitude: userLng,
            residenceAddress: address,
            placeName: place || 'ตำแหน่งปัจจุบันของผู้บันทึก',
          });
        }
      },
      (err) => {
        setIsLocatingUser(false);
        alert(`ไม่สามารถดึงตำแหน่งปัจจุบันได้: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Clear Location with confirmation
  const handleConfirmClearLocation = () => {
    setLat(null);
    setLng(null);
    setAddress('');
    setPlace('');
    if (googleMarkerInstance.current) {
      googleMarkerInstance.current.setMap(null);
      googleMarkerInstance.current = null;
    }
    setIsClearConfirmOpen(false);
    if (onLocationChange) {
      onLocationChange({
        latitude: null,
        longitude: null,
        residenceAddress: '',
        placeName: '',
      });
    }
  };

  // Apply location action
  const handleApplyLocation = () => {
    if (lat === null || lng === null) return;
    if (onApplyLocation) {
      onApplyLocation({
        latitude: lat,
        longitude: lng,
        residenceAddress: address,
        placeName: place,
      });
    }
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2500);
  };

  // Copy coordinates to clipboard
  const handleCopyCoords = () => {
    if (lat === null || lng === null) return;
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Google Maps directions URL
  const googleMapsDirectionsUrl = (lat !== null && lng !== null)
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || place || 'Thailand')}`;

  const hasCoords = lat !== null && lng !== null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>ตำแหน่งและพิกัดที่อยู่อาศัย</span>
              {hasCoords ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ระบุพิกัดแล้ว
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  ยังไม่ได้ระบุพิกัด
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              กำหนดพิกัดละติจูดและลองจิจูดสำหรับวางแผนลงพื้นที่และนำทางในระบบ ZMS
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {hasCoords && (
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold transition-colors"
              title="เปิดเส้นทางนำทางใน Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>เปิดเส้นทางใน Google Maps</span>
            </a>
          )}

          {!readOnly && hasCoords && allowClear && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold transition-colors"
              title="ล้างตำแหน่งพิกัดนี้"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ล้างตำแหน่ง</span>
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocatingUser}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors"
              title="ใช้ตำแหน่ง GPS ปัจจุบันของอุปกรณ์"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isLocatingUser ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
              <span>{isLocatingUser ? 'กำลังระบุ GPS...' : 'ตำแหน่งปัจจุบัน'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search Box & Coordinates Inputs (Editable Mode) */}
      {!readOnly && (
        <div className="space-y-2">
          {/* Places Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อหมู่บ้าน, ตำบล, อำเภอ, จังหวัด หรือสถานที่ใกล้เคียง..."
              className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
            />
            {isReverseGeocoding && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 font-bold animate-pulse">
                ค้นหาที่อยู่...
              </span>
            )}
          </div>

          {/* Coordinate manual numeric controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">ละติจูด (Latitude):</label>
              <input
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                value={lat !== null ? lat : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setLat(val);
                  if (onLocationChange) {
                    onLocationChange({
                      latitude: val,
                      longitude: lng,
                      residenceAddress: address,
                      placeName: place,
                    });
                  }
                }}
                placeholder="เช่น 13.756331"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">ลองจิจูด (Longitude):</label>
              <input
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                value={lng !== null ? lng : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setLng(val);
                  if (onLocationChange) {
                    onLocationChange({
                      latitude: lat,
                      longitude: val,
                      residenceAddress: address,
                      placeName: place,
                    });
                  }
                }}
                placeholder="เช่น 100.501765"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">ชื่อสถานที่ / จุดอ้างอิง:</label>
              <input
                type="text"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                  if (onLocationChange) {
                    onLocationChange({
                      latitude: lat,
                      longitude: lng,
                      residenceAddress: address,
                      placeName: e.target.value,
                    });
                  }
                }}
                placeholder="เช่น ใกล้มัสยิดนูรุลยากีน"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">ที่อยู่อาศัยบนแผนที่:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (onLocationChange) {
                    onLocationChange({
                      latitude: lat,
                      longitude: lng,
                      residenceAddress: e.target.value,
                      placeName: place,
                    });
                  }
                }}
                placeholder="ที่อยู่ที่ได้จากการระบุบนแผนที่..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Map Display Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-100">
        {/* Map Canvas */}
        <div 
          ref={mapRef} 
          className="w-full h-72 sm:h-80 bg-slate-100 relative"
          style={{ minHeight: '280px' }}
        >
          {/* Fallback View when Google Maps script is not loaded or missing API key */}
          {(!apiKey || loadError || !isGoogleMapsLoaded) && (
            <div className="absolute inset-0 p-4 bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-between overflow-y-auto">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>แจ้งเตือนการเชื่อมต่อ Google Maps</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfigHelp(!showConfigHelp)}
                    className="text-[11px] text-amber-800 underline font-semibold"
                  >
                    {showConfigHelp ? 'ซ่อนคำแนะนำ' : 'วิธีตั้งค่า API Key'}
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {loadError || 'ยังไม่ได้ระบุ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ในไฟล์การกำหนดค่าสภาพแวดล้อม (.env.local)'}
                </p>

                {showConfigHelp && (
                  <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200/70 text-[11px] text-slate-700 space-y-1 mt-1">
                    <strong className="block font-bold text-slate-900">ขั้นตอนการเปิดใช้งาน Google Maps อย่างปลอดภัย:</strong>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>เข้าสู่ <strong>Google Cloud Console</strong> และเปิดใช้ 3 APIs: <em>Maps JavaScript API</em>, <em>Places API</em>, และ <em>Geocoding API</em></li>
                      <li>สร้าง API Key และจำกัดการเข้าถึง (HTTP Referrer Restrictions) เพื่อความปลอดภัย</li>
                      <li>เพิ่มคีย์ลงในไฟล์ <code className="bg-slate-200 px-1 rounded font-mono text-[10px]">.env.local</code>: <code className="bg-slate-200 px-1 rounded font-mono text-[10px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key</code></li>
                      <li>รีสตาร์ทเซิร์ฟเวอร์ระบบเพื่อเริ่มการใช้งานแผนที่แบบโต้ตอบ</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Coordinate display / OpenStreetMap visual fallback */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">ข้อมูลพิกัดปัจจุบัน</span>
                  </div>
                  {hasCoords && (
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-semibold"
                    >
                      {copiedCoords ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCoords ? 'คัดลอกแล้ว' : 'คัดลอกพิกัด'}</span>
                    </button>
                  )}
                </div>

                {hasCoords ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-baseline justify-between font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px]">พิกัด (Lat, Lng):</span>
                      <strong className="text-slate-900 font-bold">{lat?.toFixed(6)}, {lng?.toFixed(6)}</strong>
                    </div>
                    {place && (
                      <div className="text-xs text-slate-700">
                        <span className="text-slate-400">สถานที่:</span> <strong className="text-slate-900">{place}</strong>
                      </div>
                    )}
                    {address && (
                      <div className="text-xs text-slate-700">
                        <span className="text-slate-400">ที่อยู่อาศัย:</span> <span>{address}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">
                    <MapPin className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    <span>ยังไม่ได้ระบุพิกัดที่อยู่อาศัย</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>ระบบสำรองพิกัด ZMS Geolocation</span>
                {hasCoords && (
                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                  >
                    <span>ดูบน Google Maps ทันที</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Prompt when coordinates are empty */}
          {isGoogleMapsLoaded && !hasCoords && (
            <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 p-2.5 bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200 text-xs text-slate-700 flex items-center gap-2 animate-fadeIn">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ยังไม่ได้ระบุพิกัดที่อยู่อาศัย — คลิกบนแผนที่หรือค้นหาที่อยู่เพื่อปักหมุด</span>
            </div>
          )}
        </div>

        {/* Map Floating Badges & Action Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>พิกัด:</span>
              </span>
              {hasCoords ? (
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {lat?.toFixed(6)}, {lng?.toFixed(6)}
                </span>
              ) : (
                <span className="text-slate-400 italic">ยังไม่ได้ระบุพิกัดที่อยู่อาศัย</span>
              )}

              {hasCoords && (
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  title="คัดลอกพิกัดละติจูด, ลองจิจูด"
                >
                  {copiedCoords ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {(place || address) && (
              <p className="text-[11px] text-slate-600 truncate max-w-xl">
                {place && <strong className="text-slate-900 mr-1">[{place}]</strong>}
                {address}
              </p>
            )}

            {locationUpdatedAt && (
              <p className="text-[10px] text-slate-400">
                ปรับปรุงล่าสุด: {locationUpdatedAt} {locationUpdatedBy ? `โดย ${locationUpdatedBy}` : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!readOnly && hasCoords && (
              <button
                type="button"
                onClick={handleApplyLocation}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{appliedFeedback ? 'บันทึกแล้ว!' : 'ใช้ตำแหน่งนี้'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Confirmation Dialog: Clear Coordinates */}
      {isClearConfirmOpen && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsClearConfirmOpen(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">ยืนยันการล้างพิกัดที่อยู่อาศัย?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    พิกัดและที่อยู่บนแผนที่จะถูกนำออก และเปลี่ยนสถานะเป็น "ยังไม่ได้ระบุพิกัด"
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearLocation}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  ยืนยันล้างพิกัด
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
