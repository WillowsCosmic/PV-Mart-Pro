import { useState } from 'react'

const NavBar = () => {
    const [progress] = useState(14) // Initial progress at 14%

    const handleDownloadPDF = () => {
        // TODO: Implement PDF download functionality
        console.log('Download PDF clicked')
    }

    const handleNavClick = (stepId) => {
        // TODO: Implement navigation logic or connect to router
        console.log('Navigate to:', stepId)
    }

    return (
        <header className="topnav">
            <div className="tn-inner">
                <div className="tn-logo">
                    <svg width="30" height="30" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="6" fill="#E87722" />
                        <line x1="16" y1="2" x2="16" y2="0" stroke="#E87722" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="16" y1="32" x2="16" y2="30" stroke="#E87722" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="2" y1="16" x2="0" y2="16" stroke="#E87722" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="32" y1="16" x2="30" y2="16" stroke="#E87722" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <span>PV<b>MART</b> <em>PRO</em></span>
                </div>
                <nav>
                    <a href="#s1" onClick={() => handleNavClick('s1')}>① Site</a>
                    <a href="#s2" onClick={() => handleNavClick('s2')}>② Obstacles</a>
                    <a href="#s5" onClick={() => handleNavClick('s5')}>③ Products</a>
                    <a href="#s3" onClick={() => handleNavClick('s3')}>④ 3D Model</a>
                    <a href="#s4" onClick={() => handleNavClick('s4')}>⑤ Diagrams</a>
                    <a href="#s-sim" onClick={() => handleNavClick('s-sim')}>⑥ Simulation</a>
                    <a href="#s6" onClick={() => handleNavClick('s6')}>⑦ Analysis</a>
                    <a href="#s7" onClick={() => handleNavClick('s7')}>⑧ Report</a>
                </nav>
                <button className="btn-or" onClick={handleDownloadPDF}>📄 PDF Report</button>
            </div>
            <div className="prog-track">
                <div id="prog" style={{ width: `${progress}%` }}></div>
            </div>
        </header>
    )
}

export default NavBar