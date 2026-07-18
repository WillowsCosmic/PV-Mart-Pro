/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import MapComponent from '../../components/map/MapComponent';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';

const SiteLocationPage = () => {
    const G = useSolarStore((s) => s.G);
    const updateG = useSolarStore((s) => s.updateG);

    // Local state for search bar input only
    const [searchTerm, setSearchTerm] = useState('');

    // Site dimensions
    const roofWidth = G.roofW;
    const roofDepth = G.roofD;
    const parapetHeight = G.parapetH;
    const manualArea = G.siteArea !== (G.roofW * G.roofD) ? G.siteArea : '';
    const panelCount = G.numPanels || '';

    const autoArea = roofWidth * roofDepth;
    const usableArea = G.siteArea || autoArea;

    // Maximum panels calculate: 28 sq ft per panel with spacing (more realistic)
    const maxPanels = Math.floor(usableArea / 28);
    const estimatedKw = Math.round(maxPanels * 0.55 * 10) / 10;

    // Calculate optimal tilt and usable area reactively
    useEffect(() => {
        const tilt = Math.round(0.76 * Math.abs(G.lat) * 10) / 10;
        const cappedTilt = Math.max(5, Math.min(45, tilt));
        updateG({ 
            optTilt: cappedTilt,
            // If the user hasn't overridden it, keep tilt in sync with optTilt
            tilt: G.tilt === 15 ? cappedTilt : G.tilt 
        });
    }, [G.lat]);

    // Update auto area or manual area changes
    useEffect(() => {
        const area = manualArea ? parseFloat(manualArea) : autoArea;
        updateG({ siteArea: area });
    }, [manualArea, autoArea]);

    // Reverse geocoding function
    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            const cityName = data.address?.city || 
                           data.address?.town || 
                           data.address?.village || 
                           data.address?.county || 
                           'Unknown';
            updateG({ city: cityName });
        } catch (error) {
            console.log('Reverse geocoding failed:', error);
        }
    };

    // Handle location changes from map
    const handleLocationChange = (lat, lng) => {
        const newCoords = { 
            lat: Math.round(lat * 100000) / 100000, 
            lng: Math.round(lng * 100000) / 100000 
        };
        updateG({ lat: newCoords.lat, lng: newCoords.lng });
        reverseGeocode(lat, lng);
    };

    // Event handlers
    const handleGeocode = async () => {
        if (!searchTerm.trim()) return;
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&limit=1`
            );
            const data = await response.json();
            
            if (data?.length) {
                const result = data[0];
                const cityName = result.display_name.split(',')[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                updateG({ lat, lng, city: cityName });
                setSearchTerm('');
            } else {
                alert('Location not found — try another name or click on map.');
            }
        } catch (error) {
            alert('Search unavailable — click on map instead.');
            console.log(error);
        }
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleGeocode();
        }
    };

    const handleManualArea = (value) => {
        const areaVal = value === '' ? '' : parseFloat(value) || 0;
        updateG({ siteArea: areaVal || autoArea });
    };

    const stepPanelCount = (step) => {
        const current = parseInt(panelCount) || 0;
        const newCount = Math.max(1, Math.min(maxPanels, current + step));
        updateG({ numPanels: newCount });
    };

    const applyPanelCount = (value) => {
        const count = Math.max(1, Math.min(maxPanels, parseInt(value) || 1));
        updateG({ numPanels: count });
    };

    const applyMaxPanels = () => {
        updateG({ numPanels: maxPanels });
    };

    const confirmSite = () => {
        // Set tag done
        const tag = document.getElementById('t1');
        if (tag) {
            tag.textContent = '✅ Done';
            tag.classList.add('done');
        }
        // Scroll to next step: Obstacles
        document.getElementById('s2')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Calculate panel count result message
    const getPanelCountResult = () => {
        if (!panelCount) return 'Enter number of panels above';
        
        const count = parseInt(panelCount);
        const areaNeeded = count * 28; // 28 sq ft per panel
        const kwOutput = Math.round(count * 0.55 * 10) / 10;
        const utilization = Math.round(areaNeeded / usableArea * 100);
        
        if (count > maxPanels) {
            return `⚠ ${count} panels need ${areaNeeded} sq.ft but site has only ${usableArea} sq.ft (max ${maxPanels} panels)`;
        } else {
            return `✅ ${count} panels × 28 sq.ft = ${areaNeeded} sq.ft used of ${usableArea} sq.ft (${utilization}%) — ${kwOutput} kWp`;
        }
    };

    return (
        <div>
            <NavBar />
            <section className="sw" id="s1">
                <div className="shdr">
                    <span className="sno">01</span>
                    <div>
                        <h2>Site Location</h2>
                        <p>Click map or search. Coordinates &amp; optimal tilt auto-calculated. NASA POWER API for real weather data.</p>
                    </div>
                    <span className="stag" id="t1">⏳</span>
                </div>
                <div className="map-layout">
                    <div className="map-col">
                        <div className="map-search">
                            <input 
                                id="msearch" 
                                type="text" 
                                placeholder="Search city, address or landmark…" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                            <button onClick={handleGeocode}>🔍</button>
                        </div>
                        <MapComponent
                            coordinates={{ lat: G.lat, lng: G.lng }}
                            city={G.city}
                            roofWidth={roofWidth}
                            roofDepth={roofDepth}
                            onLocationChange={handleLocationChange}
                        />
                        <div className="map-info-bar">
                            <span>📍 <b id="d-lat">{G.lat.toFixed(5)}</b>°N</span>
                            <span><b id="d-lng">{G.lng.toFixed(5)}</b>°E</span>
                            <span>🏙 <b id="d-city">{G.city}</b></span>
                            <span className="map-tip">Click map to reposition</span>
                        </div>
                        <div className="map-range-bar">
                            <span>📐 Site boundary shown on map</span>
                            <span id="map-area-info">
                                {roofWidth}ft × {roofDepth}ft = {autoArea.toLocaleString()} sq.ft · diag {Math.round(Math.sqrt(roofWidth * roofWidth + roofDepth * roofDepth))}ft
                            </span>
                        </div>
                        <div className="nasa-bar" id="nasa-status">☁️ NASA POWER API — will fetch on analysis</div>
                    </div>
                    <div className="param-col">
                        <div className="tilt-formula-card">
                            <div className="tfc-title">☀️ Optimal Tilt Formula</div>
                            <div className="tfc-formula">β = 0.76 × |φ|</div>
                            <div className="tfc-result" id="tfc-result">
                                {G.optTilt ? `${G.optTilt.toFixed(1)}°` : '—'}
                            </div>
                            <div className="tfc-sub" id="tfc-sub">
                                {G.optTilt ? `0.76 × ${Math.abs(G.lat).toFixed(2)}° = ${G.optTilt.toFixed(1)}° (capped 5–45°)` : 'Enter location first'}
                            </div>
                        </div>
                        <div className="pc">
                            <div className="pc-t">📐 Site Dimensions</div>
                            <div className="r2">
                                <div className="fg">
                                    <label>Roof Width (ft)</label>
                                    <input 
                                        type="number" 
                                        id="rw" 
                                        value={roofWidth} 
                                        min="5" 
                                        onChange={(e) => updateG({ roofW: parseInt(e.target.value) || 5 })}
                                    />
                                </div>
                                <div className="fg">
                                    <label>Roof Depth (ft)</label>
                                    <input 
                                        type="number" 
                                        id="rd" 
                                        value={roofDepth} 
                                        min="5" 
                                        onChange={(e) => updateG({ roofD: parseInt(e.target.value) || 5 })}
                                    />
                                </div>
                            </div>
                            <div className="r2" style={{marginTop: '.7rem'}}>
                                <div className="fg">
                                    <label>Parapet Height (ft)</label>
                                    <input 
                                        type="number" 
                                        id="ph" 
                                        value={parapetHeight} 
                                        min="0" 
                                        onChange={(e) => updateG({ parapetH: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="fg">
                                    <label>
                                        Total Usable Area (sq.ft) 
                                        <span style={{color: '#E87722', fontSize: '.7rem'}}>✏ Manual</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        id="manual-area" 
                                        value={manualArea} 
                                        placeholder="e.g. 1400" 
                                        min="50" 
                                        onChange={(e) => handleManualArea(e.target.value)}
                                    />
                                    <span style={{fontSize: '.7rem', color: '#9BA3BE'}} id="auto-area-hint">
                                        Auto W×D: <b id="auto-area-val">{autoArea.toLocaleString()}</b> sq.ft
                                    </span>
                                </div>
                            </div>
                            <div className="r2" style={{marginTop: '.7rem'}}>
                                <div className="fg">
                                    <label>Building Floors (Height Settings)</label>
                                    <select
                                        id="building-floors"
                                        value={G.buildingFloors || 0}
                                        onChange={(e) => updateG({ buildingFloors: parseInt(e.target.value) || 0 })}
                                        style={{
                                            width: '100%',
                                            padding: '0.4rem',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={0}>Ground Floor (10 ft)</option>
                                        <option value={1}>1st Floor (20 ft)</option>
                                        <option value={2}>2nd Floor (30 ft)</option>
                                        <option value={3}>3rd Floor (40 ft)</option>
                                        <option value={4}>4th Floor (50 ft)</option>
                                        <option value={5}>5th Floor (60 ft)</option>
                                        <option value={6}>6th Floor (70 ft)</option>
                                        <option value={7}>7th Floor (80 ft)</option>
                                        <option value={8}>8th Floor (90 ft)</option>
                                        <option value={9}>9th Floor (100 ft)</option>
                                        <option value={10}>10th Floor (110 ft)</option>
                                    </select>
                                </div>
                                <div className="fg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '0.5rem' }}>
                                    <span style={{ fontSize: '.75rem', color: '#9BA3BE', marginTop: '1.2rem' }}>
                                        🏢 Roof Elevation: <b>{(G.buildingFloors || 0) * 10 + 10} ft</b> above ground
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="pc">
                            <div className="pc-t">📊 Site Summary</div>
                            <div className="sum-grid">
                                <div className="sg orange">
                                    <b id="sg-area">{usableArea.toLocaleString()}</b>
                                    <span>Usable Area (sq.ft)</span>
                                </div>
                                <div className="sg">
                                    <b id="sg-panels">{maxPanels}</b>
                                    <span>Max Panels</span>
                                </div>
                                <div className="sg orange">
                                    <b id="sg-tilt">{G.optTilt ? `${G.optTilt.toFixed(1)}°` : '—'}</b>
                                    <span>Optimal Tilt</span>
                                </div>
                                <div className="sg">
                                    <b id="sg-kw">{estimatedKw}</b>
                                    <span>Est. kWp DC</span>
                                </div>
                            </div>
                            <div className="dims-strip">
                                <div className="dim-item">
                                    📏 <b>W:</b> <span id="d-roofW">{roofWidth}</span>ft · 
                                    <b>D:</b> <span id="d-roofD">{roofDepth}</span>ft · 
                                    <b>Parapet:</b> <span id="d-parapetH">{parapetHeight}</span>ft · 
                                    <b>Floor:</b> {G.buildingFloors === 0 ? 'Ground' : `${G.buildingFloors}st`} ({(G.buildingFloors || 0) * 10 + 10}ft)
                                </div>
                                <div className="dim-item">🏗 Array: <b id="array-dims">—</b></div>
                                <div className="dim-item">
                                    ☀️ Avg sun hrs/day: <b id="avg-sun-hrs">—</b> · 
                                    Opt row gap: <b id="opt-row-spacing">—</b>
                                </div>
                            </div>
                            <div id="boundary-warn" className="boundary-warn" style={{display: 'none'}}></div>
                            <div className="panel-count-inline">
                                <div className="pci-label">
                                    <span>🔢 How many panels do you want?</span>
                                    <small>Max from your site: <b id="sg-maxp-hint">{maxPanels}</b></small>
                                </div>
                                <div className="pci-row">
                                    <button className="pci-btn" onClick={() => stepPanelCount(-5)}>−5</button>
                                    <button className="pci-btn" onClick={() => stepPanelCount(-1)}>−1</button>
                                    <input 
                                        type="number" 
                                        id="panel-count-input" 
                                        placeholder={`e.g. ${Math.min(maxPanels, 20)} (max: ${maxPanels})`}
                                        min="1" 
                                        max={maxPanels}
                                        value={panelCount}
                                        onChange={(e) => applyPanelCount(e.target.value)}
                                    />
                                    <button className="pci-btn" onClick={() => stepPanelCount(1)}>+1</button>
                                    <button className="pci-btn" onClick={() => stepPanelCount(5)}>+5</button>
                                    <button className="pci-max-btn" onClick={applyMaxPanels}>Max</button>
                                </div>
                                <div className={`pci-result ${panelCount && parseInt(panelCount) > maxPanels ? 'over' : panelCount ? 'good' : ''}`} id="pci-result">
                                    {getPanelCountResult()}
                                </div>
                            </div>
                            <button className="btn-or mt1 w100" onClick={confirmSite}>
                                ✅ Confirm Site → Next Step
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SiteLocationPage;