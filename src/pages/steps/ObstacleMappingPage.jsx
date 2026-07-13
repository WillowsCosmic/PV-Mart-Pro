import { useState, useEffect, useRef } from 'react';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';
import { drawCompass, DIRS8, analyzeAllObstacles, calculateShadingSummary } from '../../components/steps/obstacleMapping/obstacleMapping';

const ObstacleMappingPage = () => {
  const G = useSolarStore((s) => s.G);
  const updateG = useSolarStore((s) => s.updateG);

  const canvasRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  // Initialize next ID based on current obstacles
  const [nextId, setNextId] = useState(() => {
    const current = G.obstacles || [];
    return current.length > 0 ? Math.max(...current.map(o => o.id || 0)) + 1 : 1;
  });

  const obstacles = G.obstacles || [];

  // Draw compass on mount
  useEffect(() => {
    if (canvasRef.current) {
      drawCompass(canvasRef.current);
    }
  }, []);

  // Helper to map and sync dual-key schemas (short keys for Three.js, verbose keys for forms)
  const mapObstacle = (o) => ({
    id: o.id,
    name: o.name || o.label || `Obs ${o.id}`,
    type: o.type || 'building',
    height: o.height !== undefined ? o.height : o.h || 10,
    width: o.width !== undefined ? o.width : o.w || 6,
    depth: o.depth !== undefined ? o.depth : o.d || 6,
    distance: o.distance !== undefined ? o.distance : o.dist || 15,
    direction: o.direction !== undefined ? o.direction : o.dir || 0,
    rotation: o.rotation !== undefined ? o.rotation : o.rot || 0,

    label: o.name || o.label || `Obs ${o.id}`,
    h: o.height !== undefined ? o.height : o.h || 10,
    w: o.width !== undefined ? o.width : o.w || 6,
    d: o.depth !== undefined ? o.depth : o.d || 6,
    dist: o.distance !== undefined ? o.distance : o.dist || 15,
    dir: o.direction !== undefined ? o.direction : o.dir || 0,
    rot: o.rotation !== undefined ? o.rotation : o.rot || 0,
  });

  // Add new obstacle
  const addObstacle = () => {
    const raw = {
      id: nextId,
      name: `Obs ${nextId}`,
      type: 'building',
      height: 10,
      width: 6,
      depth: 6,
      distance: 15,
      direction: 0, // North
      rotation: 0
    };
    const newObstacles = [...obstacles, mapObstacle(raw)];
    updateG({ obstacles: newObstacles });
    setNextId(nextId + 1);
  };

  // Remove obstacle
  const removeObstacle = (id) => {
    const newObstacles = obstacles.filter(obs => obs.id !== id);
    updateG({ obstacles: newObstacles });
  };

  // Update obstacle field
  const updateObstacle = (id, field, value) => {
    const newObstacles = obstacles.map(obs => {
      if (obs.id === id) {
        const updated = { ...obs, [field]: value };
        return mapObstacle(updated);
      }
      return obs;
    });
    updateG({ obstacles: newObstacles });
  };

  // Analyze obstacles
  const handleAnalyzeObstacles = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const parapetH = G.parapetH || 3;
      // Map obstacles to ensure proper naming format for the analysis logic
      const formattedObs = obstacles.map(mapObstacle);
      const analyzed = analyzeAllObstacles(formattedObs, parapetH);
      const summary = calculateShadingSummary(analyzed);
      
      setAnalysisResults({
        obstacles: analyzed,
        summary: summary,
        totalShadingLoss: summary.totalLoss,
        recommendations: [summary.recommendation]
      });
      setIsAnalyzing(false);

      // Save to global G store
      updateG({
        obstacles: formattedObs,
        shadingData: analyzed.map(r => ({
          shadeAngle: r.shadeAngle,
          shadeLoss: r.shadeLoss,
          isCritical: r.isCritical
        }))
      });

      // Update Step Done Tag
      const tag = document.getElementById('t2');
      if (tag) {
        tag.textContent = '✅ Done';
        tag.classList.add('done');
      }

      // Scroll to next step (Products Selection)
      document.getElementById('s5')?.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
  };

  return (
    <div>
      <NavBar progress={25} currentStep={2} />
      
      <section className="sw" id="s2">
        <div className="shdr">
          <span className="sno">02</span>
          <div>
            <h2>Obstacle Mapping</h2>
            <p>Define obstacles. Time-dependent shading loss computed per geometry.</p>
          </div>
          <span className="stag" id="t2">⏳</span>
        </div>
        
        <div className="obs-wrap">
          <div className="obs-top">
            <div className="compass-area">
              <canvas 
                ref={canvasRef} 
                id="comp" 
                width="170" 
                height="170"
              ></canvas>
              <div className="comp-hint">
                <b>8-Direction Compass</b><br/>
                Direction = where obstacle is relative to panels.<br/>
                Panels face <em>South (180°)</em>.
              </div>
            </div>
            
            <div className="obs-table-area">
              <div className="obs-th">
                <span>Obstacle Details</span>
                <button className="btn-sm-or" onClick={addObstacle}>+ Add</button>
              </div>
              <div className="obs-scroll">
                <table id="otbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Height(ft)</th>
                      <th>Width(ft)</th>
                      <th>Depth(ft)</th>
                      <th>Dist(ft)</th>
                      <th>Direction</th>
                      <th>Rotation(°)</th>
                      <th>✕</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obstacles.map((obs, index) => (
                      <tr key={obs.id}>
                        <td>{index + 1}</td>
                        <td>
                          <input 
                            type="text" 
                            value={obs.name}
                            onChange={(e) => updateObstacle(obs.id, 'name', e.target.value)}
                            style={{width: '88px'}}
                          />
                        </td>
                        <td>
                          <select
                            value={obs.type || 'building'}
                            onChange={(e) => updateObstacle(obs.id, 'type', e.target.value)}
                            style={{width: '80px', padding: '2px 4px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)'}}
                          >
                            <option value="building">Building</option>
                            <option value="tree">Tree</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={obs.height}
                            min="1"
                            onChange={(e) => updateObstacle(obs.id, 'height', parseInt(e.target.value) || 1)}
                            style={{width: '54px'}}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={obs.width}
                            min="1"
                            onChange={(e) => updateObstacle(obs.id, 'width', parseInt(e.target.value) || 1)}
                            style={{width: '54px'}}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={obs.depth}
                            min="1"
                            onChange={(e) => updateObstacle(obs.id, 'depth', parseInt(e.target.value) || 1)}
                            style={{width: '54px'}}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={obs.distance}
                            min="1"
                            onChange={(e) => updateObstacle(obs.id, 'distance', parseInt(e.target.value) || 1)}
                            style={{width: '54px'}}
                          />
                        </td>
                        <td>
                          <select 
                            value={obs.direction}
                            onChange={(e) => updateObstacle(obs.id, 'direction', parseInt(e.target.value))}
                            style={{width: '65px'}}
                          >
                            {DIRS8.map(d => (
                              <option key={d.deg} value={d.deg}>
                                {d.label}({d.deg}°)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={obs.rotation}
                            min="0"
                            max="360"
                            onChange={(e) => updateObstacle(obs.id, 'rotation', parseInt(e.target.value) || 0)}
                            style={{width: '50px'}}
                            title="Rotate obstacle in 3D (degrees)"
                          />
                        </td>
                        <td>
                          <button 
                            className="btrm" 
                            onClick={() => removeObstacle(obs.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {obstacles.length === 0 && (
                  <div style={{padding: '2rem', textAlign: 'center', color: '#9BA3BE'}}>
                    No obstacles added yet. Click "+ Add" to start.
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button 
            className="btn-or w100 mt1" 
            onClick={handleAnalyzeObstacles}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '⏳ Analyzing...' : '⚡ Analyse Shading → Build 3D Model'}
          </button>
          
          {/* Analysis Results */}
          {analysisResults && (
            <div className="shade-out">
              {analysisResults.obstacles.length === 0 ? (
                <div className="sc-ok" style={{padding: '.9rem', fontSize: '.88rem'}}>
                  ✅ No obstacles — clear roof, maximum solar yield.
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="analysis-summary">
                    <h3>Analysis Summary</h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Total Obstacles:</span>
                        <span className="summary-value">{analysisResults.obstacles.length}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Critical Obstacles:</span>
                        <span className="summary-value critical">
                          {analysisResults.obstacles.filter(r => r.isCritical).length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Total Shading Loss:</span>
                        <span className="summary-value">
                          {analysisResults.totalShadingLoss.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual obstacle results */}
                  {analysisResults.obstacles.map((r, index) => (
                    <div key={index} className="scard">
                      <div className="scn">🚧 {r.name}</div>
                      <div className="scr">
                        <span>Height × W × D</span>
                        <span>{r.height} × {r.width} × {r.depth} ft</span>
                      </div>
                      <div className="scr">
                        <span>Direction</span>
                        <span>{r.directionLabel} ({r.direction}°)</span>
                      </div>
                      <div className="scr">
                        <span>Distance</span>
                        <span>{r.distance} ft</span>
                      </div>
                      <div className="scr">
                        <span>3D Rotation</span>
                        <span>{r.rotation}°</span>
                      </div>
                      <div className="scr">
                        <span>Shading angle</span>
                        <span>{r.shadeAngle}°</span>
                      </div>
                      <div className="scr">
                        <span>Min clear dist</span>
                        <span>{r.minDist} ft</span>
                      </div>
                      <div className="scr">
                        <span>Est. shade loss</span>
                        <span>{r.shadeLoss}%</span>
                      </div>
                      {r.isCritical ? (
                        <div className="sc-warn">
                          ⚠ Critical — min {r.minDist}ft clearance needed
                        </div>
                      ) : (
                        <div className="sc-ok">
                          ✅ Acceptable shading ({r.shadeAngle}°)
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Recommendations */}
                  {analysisResults.recommendations && (
                    <div className="recommendations">
                      <h4>💡 Recommendations</h4>
                      <ul>
                        {analysisResults.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ObstacleMappingPage;