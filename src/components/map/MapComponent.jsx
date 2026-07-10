import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Rectangle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = L.divIcon({
  html: '<div style="width:13px;height:13px;background:#E87722;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px rgba(232,119,34,.7)"></div>',
  className: '',
  iconAnchor: [6.5, 6.5]
});

// Component to handle map events
const MapEventHandler = ({ onLocationChange }) => {
  const map = useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

// Component to handle marker drag
const DraggableMarker = ({ coordinates, city, onLocationChange }) => {
  const markerRef = React.useRef();

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        onLocationChange(lat, lng);
      }
    },
  };

  return (
    <Marker
      ref={markerRef}
      position={[coordinates.lat, coordinates.lng]}
      icon={customIcon}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div>
          <b style={{ color: '#E87722' }}>{city}</b><br/>
          <small style={{ fontFamily: 'monospace' }}>
            {coordinates.lat.toFixed(5)}°N, {coordinates.lng.toFixed(5)}°E
          </small>
        </div>
      </Popup>
    </Marker>
  );
};

// Component to show site boundary
const SiteBoundary = ({ coordinates, roofWidth, roofDepth }) => {
  // Convert feet to approximate degrees (1 degree ≈ 111km ≈ 364000ft)
  const dLat = roofDepth / 364000;
  const dLng = (roofWidth / 364000) / Math.cos(coordinates.lat * Math.PI / 180);
  
  const bounds = [
    [coordinates.lat - dLat/2, coordinates.lng - dLng/2],
    [coordinates.lat + dLat/2, coordinates.lng + dLng/2]
  ];

  const area = Math.round(roofWidth * roofDepth);
  const diagonal = Math.round(Math.sqrt(roofWidth * roofWidth + roofDepth * roofDepth));

  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: '#E87722',
        weight: 2,
        dashArray: '6 4',
        fillColor: 'rgba(232,119,34,0.1)',
        fillOpacity: 0.3
      }}
    >
      <Popup>
        <div>
          Site: {roofWidth}×{roofDepth}ft ({area} sq.ft)<br/>
          Diagonal: {diagonal}ft
        </div>
      </Popup>
    </Rectangle>
  );
};

const MapComponent = ({ coordinates, city, roofWidth, roofDepth, onLocationChange }) => {
  useEffect(() => {
    // Update map info when coordinates change
    const infoEl = document.getElementById('map-area-info');
    if (infoEl) {
      const area = roofWidth * roofDepth;
      const diagonal = Math.round(Math.sqrt(roofWidth * roofWidth + roofDepth * roofDepth));
      infoEl.textContent = `${roofWidth}ft × ${roofDepth}ft = ${area} sq.ft · diag ${diagonal}ft`;
    }
  }, [roofWidth, roofDepth]);

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        key={`${coordinates.lat}-${coordinates.lng}`} // Force re-render when coordinates change
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="© Esri"
          maxZoom={19}
        />
        
        <MapEventHandler onLocationChange={onLocationChange} />
        
        <DraggableMarker 
          coordinates={coordinates}
          city={city}
          onLocationChange={onLocationChange}
        />
        
        <SiteBoundary 
          coordinates={coordinates}
          roofWidth={roofWidth}
          roofDepth={roofDepth}
        />
      </MapContainer>
    </div>
  );
};

export default MapComponent;