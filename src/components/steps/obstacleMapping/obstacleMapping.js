// ══════════════════════════════════════════════════════════════════════════════
// OBSTACLE MAPPING SERVICE - Step 2 Functions
// ══════════════════════════════════════════════════════════════════════════════

// 8-direction compass data
export const DIRS8 = [
  { label: 'N', deg: 0 },
  { label: 'NE', deg: 45 },
  { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 },
  { label: 'S', deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W', deg: 270 },
  { label: 'NW', deg: 315 }
];

/**
 * Draw 8-direction compass on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
 */
export function drawCompass(canvas) {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const cx = 85, cy = 85, r = 70;
  
  ctx.clearRect(0, 0, 170, 170);
  
  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FEF7E6';
  ctx.fill();
  ctx.strokeStyle = '#E87722';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Direction ticks and labels
  const dirs = [
    { l: 'N', d: 0, c: '#E87722', bold: true },
    { l: 'NE', d: 45, c: '#9BA3BE', bold: false },
    { l: 'E', d: 90, c: '#5C6480', bold: true },
    { l: 'SE', d: 135, c: '#9BA3BE', bold: false },
    { l: 'S', d: 180, c: '#5C6480', bold: true },
    { l: 'SW', d: 225, c: '#9BA3BE', bold: false },
    { l: 'W', d: 270, c: '#5C6480', bold: true },
    { l: 'NW', d: 315, c: '#9BA3BE', bold: false }
  ];
  
  dirs.forEach(d => {
    const rad = (d.d - 90) * Math.PI / 180;
    const r1 = r - 14, r2 = r;
    
    // Draw tick marks
    ctx.strokeStyle = d.c;
    ctx.lineWidth = d.bold ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(rad), cy + r1 * Math.sin(rad));
    ctx.lineTo(cx + r2 * Math.cos(rad), cy + r2 * Math.sin(rad));
    ctx.stroke();
    
    // Draw labels
    const tr = r - 26;
    ctx.fillStyle = d.c;
    ctx.font = `${d.bold ? 'bold ' : ''}${d.bold ? 12 : 10}px Inter,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.l, cx + (tr + 2) * Math.cos(rad) - 1, cy + (tr + 2) * Math.sin(rad) + 1);
  });
  
  // North arrow
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 6);
  ctx.lineTo(cx - 5, cy - 10);
  ctx.lineTo(cx + 5, cy - 10);
  ctx.fillStyle = '#E87722';
  ctx.fill();
  
  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1F2E';
  ctx.fill();
}

/**
 * Create a new obstacle object with default values
 * @param {number} id - Obstacle ID number
 * @returns {Object} New obstacle object
 */
export function createNewObstacle(id) {
  return {
    id,
    name: `Obs ${id}`,
    height: 10,
    width: 6,
    depth: 6,
    distance: 15,
    direction: 0, // North by default
    rotation: 0
  };
}

/**
 * Calculate shading angle from obstacle
 * @param {number} effectiveHeight - Height above parapet
 * @param {number} distance - Distance from panels
 * @returns {number} Shading angle in degrees
 */
export function calculateShadingAngle(effectiveHeight, distance) {
  if (distance <= 0) return 90;
  return Math.atan(effectiveHeight / distance) * 180 / Math.PI;
}

/**
 * Calculate minimum clearance distance needed
 * @param {number} effectiveHeight - Height above parapet
 * @param {number} latitude - Site latitude
 * @returns {number} Minimum distance in feet
 */
export function calculateMinClearDistance(effectiveHeight, latitude = 22.5) {
  // Based on sun angle calculations - simplified version
  const sunAngle = Math.max(20, 90 - Math.abs(latitude)); // Approximate winter sun angle
  return effectiveHeight / Math.tan(sunAngle * Math.PI / 180);
}

/**
 * Calculate shading loss percentage from obstacle
 * @param {Object} obstacle - Obstacle data
 * @param {number} parapetHeight - Parapet height
 * @returns {Object} Analysis results
 */
export function analyzeObstacle(obstacle, parapetHeight = 3) {
  const effectiveHeight = Math.max(0, obstacle.height - parapetHeight);
  const shadeAngle = calculateShadingAngle(effectiveHeight, obstacle.distance);
  const minDist = calculateMinClearDistance(effectiveHeight);
  const isCritical = shadeAngle > 20;
  
  // Calculate direction factor (how much obstacle affects south-facing panels)
  const angleDiff = Math.min(Math.abs(obstacle.direction - 180), 360 - Math.abs(obstacle.direction - 180));
  const directionFactor = Math.cos(angleDiff * Math.PI / 180);
  
  // Calculate shading loss percentage
  const rawLoss = Math.max(0, shadeAngle / 90 * directionFactor * 22);
  const shadeLoss = Math.max(2.0, rawLoss); // Minimum 2% for any real obstacle
  
  // Get direction label
  const dirLabel = DIRS8.find(d => d.deg === obstacle.direction)?.label || 'N';
  
  return {
    ...obstacle,
    effectiveHeight,
    shadeAngle: Number(shadeAngle.toFixed(1)),
    minDist: Number(minDist.toFixed(1)),
    isCritical,
    shadeLoss: Number(shadeLoss.toFixed(1)),
    directionLabel: dirLabel,
    directionFactor
  };
}

/**
 * Analyze all obstacles and return results
 * @param {Array} obstacles - Array of obstacle objects
 * @param {number} parapetHeight - Parapet height in feet
 * @returns {Array} Analysis results for all obstacles
 */
export function analyzeAllObstacles(obstacles, parapetHeight = 3) {
  return obstacles.map(obstacle => analyzeObstacle(obstacle, parapetHeight));
}

/**
 * Calculate total shading impact summary
 * @param {Array} analysisResults - Results from analyzeAllObstacles
 * @returns {Object} Summary of shading impact
 */
export function calculateShadingSummary(analysisResults) {
  if (!analysisResults.length) {
    return {
      totalLoss: 0,
      criticalCount: 0,
      maxLoss: 0,
      recommendation: 'No obstacles detected - optimal solar conditions'
    };
  }
  
  // Calculate combined shading loss (not simply additive)
  const totalLoss = analysisResults.reduce((sum, result) => {
    return sum + result.shadeLoss * 0.8; // Reduced factor for combined effect
  }, 0);
  
  const criticalCount = analysisResults.filter(r => r.isCritical).length;
  const maxLoss = Math.max(...analysisResults.map(r => r.shadeLoss));
  
  // eslint-disable-next-line no-useless-assignment
  let recommendation = '';
  if (totalLoss < 5) {
    recommendation = 'Minor shading impact - proceed with installation';
  } else if (totalLoss < 15) {
    recommendation = 'Moderate shading - consider obstacle mitigation';
  } else {
    recommendation = 'Significant shading - redesign layout or remove obstacles';
  }
  
  return {
    totalLoss: Number(totalLoss.toFixed(1)),
    criticalCount,
    maxLoss,
    recommendation
  };
}

/**
 * Validate obstacle data
 * @param {Object} obstacle - Obstacle to validate
 * @returns {Object} Validation result
 */
export function validateObstacle(obstacle) {
  const errors = [];
  
  if (!obstacle.name || obstacle.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!obstacle.height || obstacle.height < 1) {
    errors.push('Height must be at least 1 foot');
  }
  
  if (!obstacle.width || obstacle.width < 1) {
    errors.push('Width must be at least 1 foot');
  }
  
  if (!obstacle.depth || obstacle.depth < 1) {
    errors.push('Depth must be at least 1 foot');
  }
  
  if (!obstacle.distance || obstacle.distance < 1) {
    errors.push('Distance must be at least 1 foot');
  }
  
  if (obstacle.rotation < 0 || obstacle.rotation > 360) {
    errors.push('Rotation must be between 0-360 degrees');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get obstacle direction options for select dropdown
 * @returns {Array} Array of direction options
 */
export function getDirectionOptions() {
  return DIRS8.map(dir => ({
    value: dir.deg,
    label: `${dir.label} (${dir.deg}°)`
  }));
}

// Export all functions as a service object too
export const ObstacleService = {
  DIRS8,
  drawCompass,
  createNewObstacle,
  calculateShadingAngle,
  calculateMinClearDistance,
  analyzeObstacle,
  analyzeAllObstacles,
  calculateShadingSummary,
  validateObstacle,
  getDirectionOptions
};