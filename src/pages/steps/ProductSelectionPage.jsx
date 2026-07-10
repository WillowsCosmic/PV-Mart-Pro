/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';
import { PANELS, INVERTERS, BATTERIES, getUniqueBrands, filterByBrand } from '../../services/productDatabase';
import { validateSystem, formatNumber } from '../../services/solarPhysics';
import { SYSTEM_TYPES, ELECTRICITY_BOARDS } from '../../services/constants';

const ProductSelectionPage = () => {
  const G = useSolarStore((s) => s.G);
  const updateG = useSolarStore((s) => s.updateG);

  // Read selections from Zustand store
  const systemType = G.gridType || 'on-grid';
  const electricityBoard = G.boardName || '';
  const selectedPanel = G.panel;
  const selectedInverter = G.inverter;
  const selectedBattery = G.battery;
  
  // Product filtering state (kept local for dropdowns)
  const [panelBrand, setPanelBrand] = useState('');
  const [inverterBrand, setInverterBrand] = useState('');
  const [batteryBrand, setBatteryBrand] = useState('');
  
  // Validation and metrics local state
  const [validation, setValidation] = useState({ warnings: [], errors: [], valid: true });
  const [metrics, setMetrics] = useState({
    panels: 0,
    dcKW: 0,
    sqftUsed: 0,
    annualKWh: 0,
    annualSavings: 0,
    paybackYears: 0
  });

  // Update metrics when products or panels change
  const updateMetrics = () => {
    const numPanels = G.numPanels || 0;
    if (!selectedPanel) {
      setMetrics({
        panels: numPanels,
        dcKW: 0,
        sqftUsed: 0,
        annualKWh: 0,
        annualSavings: 0,
        paybackYears: 0
      });
      return;
    }
    
    const dcKW = numPanels * selectedPanel.watt / 1000;
    const sqftUsed = numPanels * selectedPanel.sqft;
    
    // Avg 4.5 sun hours/day in India, with PR=75% (0.75)
    const annualKWh = dcKW * 4.5 * 365 * 0.75;
    const annualSavings = annualKWh * (G.boardTariff || 7.5);
    
    // Rough system cost estimate
    const panelCost = numPanels * selectedPanel.watt * 25; // ₹25/Wp
    const inverterCost = selectedInverter ? selectedInverter.kw * 15000 : dcKW * 15000; // ₹15k/kW
    const batteryCost = selectedBattery ? selectedBattery.kwh * 25000 : 0; // ₹25k/kWh
    const totalCost = panelCost + inverterCost + batteryCost + 50000; // +installation
    
    const paybackYears = annualSavings > 0 ? totalCost / annualSavings : 0;
    
    const calculatedMetrics = {
      panels: numPanels,
      dcKW: dcKW.toFixed(2),
      sqftUsed: sqftUsed.toFixed(0),
      annualKWh: annualKWh.toFixed(0),
      annualSavings: annualSavings.toFixed(0),
      paybackYears: paybackYears.toFixed(1)
    };

    setMetrics(calculatedMetrics);

    // Sync back to store
    updateG({
      systemKW: parseFloat(calculatedMetrics.dcKW),
      annualYield: parseInt(calculatedMetrics.annualKWh)
    });
  };
  
  // Initialize and update metrics
  useEffect(() => {
    updateMetrics();
  }, [selectedPanel, selectedInverter, selectedBattery, G.numPanels, G.boardTariff]);
  
  // Validate system when products change
  useEffect(() => {
    const result = validateSystem(selectedPanel, selectedInverter, selectedBattery, G.numPanels, systemType);
    setValidation(result);
    updateG({ validation: result });
  }, [selectedPanel, selectedInverter, selectedBattery, systemType, G.numPanels]);
  
  // System type handlers
  const handleSystemTypeChange = (type) => {
    updateG({ gridType: type });
    // Clear battery if switching to on-grid
    if (type === 'on-grid') {
      updateG({ battery: null });
    }
  };

  const handleBoardChange = (e) => {
    const boardId = e.target.value;
    const board = ELECTRICITY_BOARDS.find(b => b.id === boardId);
    if (board) {
      updateG({ 
        boardName: board.name, 
        boardTariff: board.tariff 
      });
    } else {
      updateG({ 
        boardName: '', 
        boardTariff: 7.5 
      });
    }
  };
  
  // Product selection handlers
  const handlePanelSelection = (e) => {
    const panel = PANELS.find(p => `${p.brand}-${p.model}` === e.target.value);
    updateG({ panel: panel || null });
  };
  
  const handleInverterSelection = (e) => {
    const inverter = INVERTERS.find(i => `${i.brand}-${i.model}` === e.target.value);
    updateG({ inverter: inverter || null });
  };
  
  const handleBatterySelection = (e) => {
    const battery = BATTERIES.find(b => `${b.brand}-${b.model}` === e.target.value);
    updateG({ battery: battery || null });
  };
  
  // Get filtered products
  const availablePanels = panelBrand ? filterByBrand(PANELS, panelBrand) : PANELS;
  const availableInverters = inverterBrand ? filterByBrand(INVERTERS, inverterBrand) : INVERTERS;
  const availableBatteries = batteryBrand ? filterByBrand(BATTERIES, batteryBrand) : BATTERIES;
  
  // Board info display
  const getBoardInfo = () => {
    const board = ELECTRICITY_BOARDS.find(b => b.name === electricityBoard || b.id === electricityBoard);
    if (!board) return null;
    
    return (
      <div style={{ 
        marginTop: '0.5rem', 
        padding: '0.5rem', 
        backgroundColor: '#E8F4FD', 
        borderRadius: '4px',
        fontSize: '0.85rem'
      }}>
        <strong>{board.name}</strong><br />
        Net Metering: {board.netMetering ? '✅ Available' : '❌ Not Available'}<br />
        Tariff: ₹{board.tariff}/kWh
      </div>
    );
  };
  
  // Confirm and proceed to next step
  const handleConfirmProducts = () => {
    if (!selectedPanel) {
      alert('Please select a solar panel first.');
      return;
    }
    if (!selectedInverter) {
      alert('Please select an inverter first.');
      return;
    }
    if ((systemType === 'hybrid' || systemType === 'off-grid') && !selectedBattery) {
      alert(`Please select a battery for ${systemType} system.`);
      return;
    }
    if (validation.errors.length > 0) {
      alert('Please fix validation errors before proceeding:\n' + validation.errors.join('\n'));
      return;
    }
    
    // Set tag done
    const tag = document.getElementById('t5');
    if (tag) {
      tag.textContent = '✅ Done';
      tag.classList.add('done');
    }

    // Scroll to next step (3D model)
    document.getElementById('s3')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      <NavBar progress={50} />
      <section className="sw" id="s5">
        <div className="shdr">
          <span className="sno">03</span>
          <div>
            <h2>Solar Products</h2>
            <p>Select system type, components. Physics engine validates DC/AC ratio, string voltage, compatibility.</p>
          </div>
          <span className="stag" id="t5">⏳</span>
        </div>

        {/* Validation Box */}
        <div id="validation-box" className={`validation-box ${!validation.valid ? 'has-errors' : validation.warnings.length > 0 ? 'has-warnings' : 'ok'}`}>
          {validation.valid ? (
            validation.warnings.length > 0 ? (
              <div>
                <span style={{ color: '#E87722', fontWeight: 'bold' }}>⚠️ Warnings:</span><br />
                {validation.warnings.map((warning, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem', marginLeft: '1rem' }}>{warning}</div>
                ))}
              </div>
            ) : (
              selectedPanel && selectedInverter ? 
                `✅ System configuration is valid. DC/AC ratio: ${validation.dcAcRatio}` : 
                'Select panel, inverter and run analysis for validation.'
            )
          ) : (
            <div>
              <span style={{ color: '#DC3545', fontWeight: 'bold' }}>❌ Validation Errors:</span><br />
              {validation.errors.map((error, idx) => (
                <div key={idx} style={{ fontSize: '0.85rem', marginLeft: '1rem' }}>{error}</div>
              ))}
              {validation.warnings.length > 0 && (
                <>
                  <br /><span style={{ color: '#E87722', fontWeight: 'bold' }}>⚠️ Warnings:</span><br />
                  {validation.warnings.map((warning, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', marginLeft: '1rem' }}>{warning}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* System Type + Board */}
        <div className="sys-type-bar">
          <div className="sys-type-group">
            <label className="sys-label">⚡ System Type</label>
            <div className="sys-btns" id="sys-btns">
              {SYSTEM_TYPES.map(type => (
                <button 
                  key={type.id}
                  className={`sys-btn ${systemType === type.id ? 'active' : ''}`}
                  onClick={() => handleSystemTypeChange(type.id)}
                >
                  <span className="sys-icon">{type.icon}</span>
                  <span className="sys-name">{type.name}</span>
                  <span className="sys-desc">{type.description}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="board-group">
            <div className="fg">
              <label>🏛 Electricity Board / DISCOM</label>
              <select 
                id="elec-board" 
                value={ELECTRICITY_BOARDS.find(b => b.name === electricityBoard || b.id === electricityBoard)?.id || ''}
                onChange={handleBoardChange}
              >
                <option value="">— Select Board —</option>
                {ELECTRICITY_BOARDS.map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
            </div>
            <div className="board-info" id="board-info">
              {getBoardInfo()}
            </div>
          </div>
        </div>
        
        <div id="sys-type-note" className="sys-type-note" dangerouslySetInnerHTML={{
          __html: systemType === 'on-grid' 
            ? '🔌 <b>On-Grid:</b> Panels → Inverter → Grid. Earns net metering credits. No battery required.' 
            : systemType === 'hybrid' 
              ? '⚡ <b>Hybrid:</b> Panels → Hybrid Inverter ⇄ Battery + Grid. Smart load switching during outages.' 
              : '🔋 <b>Off-Grid:</b> Panels → Charge Controller → Battery → Inverter → Load. Fully independent system.'
        }} />

        {/* Product Cards */}
        <div className="prod-grid">
          {/* Solar Panel Card */}
          <div className="pcard">
            <div className="pi">☀️</div>
            <div className="pt">Solar Panel</div>
            <div className="fg">
              <label>Brand</label>
              <select 
                value={panelBrand} 
                onChange={(e) => setPanelBrand(e.target.value)}
              >
                <option value="">All Brands</option>
                {getUniqueBrands(PANELS).map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div className="fg mt1">
              <label>Model</label>
              <select 
                onChange={handlePanelSelection}
                value={selectedPanel ? `${selectedPanel.brand}-${selectedPanel.model}` : ''}
              >
                <option value="">— Select Model —</option>
                {availablePanels.map(panel => (
                  <option key={`${panel.brand}-${panel.model}`} value={`${panel.brand}-${panel.model}`}>
                    {panel.model} ({panel.watt}W)
                  </option>
                ))}
              </select>
            </div>
            <div className="pspecs" id="psp">
              <div className="psr"><span>Wattage</span><b>{selectedPanel ? `${selectedPanel.watt}W` : '—'}</b></div>
              <div className="psr"><span>Efficiency</span><b>{selectedPanel ? `${(selectedPanel.eff * 100).toFixed(1)}%` : '—'}</b></div>
              <div className="psr"><span>Technology</span><b>{selectedPanel?.tech || '—'}</b></div>
              <div className="psr"><span>Area/panel</span><b>{selectedPanel ? `${selectedPanel.sqft} sq.ft` : '—'}</b></div>
              <div className="psr"><span>Voc / Vmp</span><b>{selectedPanel ? `${selectedPanel.voc}V / ${selectedPanel.vmp}V` : '—'}</b></div>
              <div className="psr"><span>NOCT</span><b>{selectedPanel ? `${selectedPanel.noct}°C` : '—'}</b></div>
              <div className="psr"><span>Temp Coeff γ</span><b>{selectedPanel ? `${(selectedPanel.gamma * 100).toFixed(2)}%/°C` : '—'}</b></div>
            </div>
          </div>

          {/* Inverter Card */}
          <div className="pcard">
            <div className="pi">🔄</div>
            <div className="pt">Inverter</div>
            <div className="fg">
              <label>Brand</label>
              <select 
                value={inverterBrand} 
                onChange={(e) => setInverterBrand(e.target.value)}
              >
                <option value="">All Brands</option>
                {getUniqueBrands(INVERTERS).map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div className="fg mt1">
              <label>Model</label>
              <select 
                onChange={handleInverterSelection}
                value={selectedInverter ? `${selectedInverter.brand}-${selectedInverter.model}` : ''}
              >
                <option value="">— Select Model —</option>
                {availableInverters.map(inverter => (
                  <option key={`${inverter.brand}-${inverter.model}`} value={`${inverter.brand}-${inverter.model}`}>
                    {inverter.model} ({inverter.kw}kW)
                  </option>
                ))}
              </select>
            </div>
            <div className="pspecs" id="isp">
              <div className="psr"><span>Capacity</span><b>{selectedInverter ? `${selectedInverter.kw}kW` : '—'}</b></div>
              <div className="psr"><span>Efficiency</span><b>{selectedInverter ? `${(selectedInverter.eff * 100).toFixed(1)}%` : '—'}</b></div>
              <div className="psr"><span>MPPT</span><b>{selectedInverter?.mppt || '—'}</b></div>
              <div className="psr"><span>Type</span><b>{selectedInverter?.type || '—'}</b></div>
              <div className="psr"><span>DC/AC Ratio</span><b>{validation.dcAcRatio || '—'}</b></div>
              <div className="psr"><span>Max Vdc</span><b>{selectedInverter ? `${selectedInverter.maxVdc}V` : '—'}</b></div>
              <div className="psr"><span>Panels/string</span><b>{validation.perStr || '—'}</b></div>
            </div>
          </div>

          {/* Battery Card */}
          <div className="pcard" id="batcard">
            <div className="pi">🔋</div>
            <div className="pt">
              Battery 
              <span className="bopt" id="bopt">
                {systemType === 'on-grid' ? 'Optional' : 'Required'}
              </span>
            </div>
            <div className="fg">
              <label>Brand</label>
              <select 
                value={batteryBrand} 
                onChange={(e) => setBatteryBrand(e.target.value)}
                disabled={systemType === 'on-grid'}
              >
                <option value="">All Brands</option>
                {getUniqueBrands(BATTERIES).map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div className="fg mt1">
              <label>Model</label>
              <select 
                onChange={handleBatterySelection}
                value={selectedBattery ? `${selectedBattery.brand}-${selectedBattery.model}` : ''}
                disabled={systemType === 'on-grid'}
              >
                <option value="">— Select Model —</option>
                {availableBatteries.map(battery => (
                  <option key={`${battery.brand}-${battery.model}`} value={`${battery.brand}-${battery.model}`}>
                    {battery.model} ({battery.kwh}kWh)
                  </option>
                ))}
              </select>
            </div>
            <div className="pspecs" id="bsp">
              <div className="psr"><span>Capacity</span><b>{selectedBattery ? `${selectedBattery.kwh}kWh` : '—'}</b></div>
              <div className="psr"><span>Type</span><b>{selectedBattery?.type || '—'}</b></div>
              <div className="psr"><span>Efficiency</span><b>{selectedBattery ? `${(selectedBattery.eff * 100).toFixed(0)}%` : '—'}</b></div>
              <div className="psr"><span>Depth of Discharge</span><b>{selectedBattery ? `${(selectedBattery.dod * 100).toFixed(0)}%` : '—'}</b></div>
              <div className="psr"><span>Backup</span><b>{selectedBattery && selectedInverter ? `${((selectedBattery.kwh * selectedBattery.dod) / (selectedInverter.kw * 0.3)).toFixed(1)}h` : '—'}</b></div>
              <div className="psr"><span>Cycle Life</span><b>{selectedBattery ? `${formatNumber(selectedBattery.cycles)}` : '—'}</b></div>
              <div className="psr"><span>Units needed</span><b>{selectedBattery && selectedInverter ? Math.ceil(selectedInverter.kw * 4 / selectedBattery.kwh) : '—'}</b></div>
            </div>
          </div>
        </div>

        {/* Panel Count Reminder */}
        <div className="step5-panel-reminder">
          <span>🔢 Panels from Step 1: </span>
          <b id="s5-panel-reminder">{G.numPanels}</b>
          <span> panels</span>
          <span className="step5-change-link" onClick={() => document.getElementById('s1')?.scrollIntoView({ behavior: 'smooth' })}>
             ← Change in Step 1
          </span>
        </div>

        {/* Metrics Bar */}
        <div className="kbar" id="kbar">
          <div className="kb">
            <b id="k1">{metrics.panels}</b>
            <span>Panels</span>
          </div>
          <div className="kb hl">
            <b id="k2">{metrics.dcKW}</b>
            <span>kWp DC</span>
          </div>
          <div className="kb">
            <b id="k3">{metrics.sqftUsed}</b>
            <span>sq.ft used</span>
          </div>
          <div className="kb">
            <b id="k4">{formatNumber(metrics.annualKWh, 0)}</b>
            <span>kWh/yr</span>
          </div>
          <div className="kb">
            <b id="k5">₹{formatNumber(metrics.annualSavings, 0)}</b>
            <span>savings/yr</span>
          </div>
          <div className="kb">
            <b id="k6">{metrics.paybackYears}</b>
            <span>Payback yrs</span>
          </div>
        </div>

        <button 
          className="btn-or w100 mt1" 
          onClick={handleConfirmProducts}
        >
          ⚡ Confirm Products → Build 3D Model
        </button>
      </section>
    </div>
  );
};

export default ProductSelectionPage;